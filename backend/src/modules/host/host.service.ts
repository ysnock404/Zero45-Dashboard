import si from 'systeminformation';

type NetPrev = { rx: number; tx: number; ts: number };
type PowerPrev = { energy: number; ts: number };

class HostService {
    private netPrev: Record<string, NetPrev> = {};
    private powerPrev: PowerPrev | null = null;

    private calcNetDelta(current: { iface: string; rx_bytes: number; tx_bytes: number; ts: number }) {
        const prev = this.netPrev[current.iface];
        this.netPrev[current.iface] = { rx: current.rx_bytes, tx: current.tx_bytes, ts: current.ts };

        if (!prev) {
            return { rx_sec: null, tx_sec: null };
        }

        const dt = current.ts - prev.ts;
        if (dt <= 0) return { rx_sec: null, tx_sec: null };

        const rx_sec = (current.rx_bytes - prev.rx) / dt;
        const tx_sec = (current.tx_bytes - prev.tx) / dt;
        return { rx_sec: Math.max(0, rx_sec), tx_sec: Math.max(0, tx_sec) };
    }

    private async readPowerWatts(ts: number) {
        try {
            const energyRaw = await si.power(); // may return null/undefined on some systems
            if (energyRaw?.cpus?.length) {
                const avg = energyRaw.cpus.reduce((acc, c) => acc + (c.power || 0), 0) / energyRaw.cpus.length;
                if (avg > 0) return avg;
            }
        } catch (err) {
            // ignore, fallback to sysfs
        }

        try {
            const energyFile = '/sys/class/powercap/intel-rapl:0/energy_uj';
            const energyStr = await si.fsReadFile(energyFile);
            const energy = parseInt(energyStr.trim(), 10);
            if (!Number.isFinite(energy)) return null;
            const prev = this.powerPrev;
            this.powerPrev = { energy, ts };
            if (!prev) return null;
            const dt = ts - prev.ts;
            if (dt <= 0) return null;
            const deltaUj = energy >= prev.energy ? energy - prev.energy : 0;
            const watts = (deltaUj / 1_000_000) / dt; // microjoules to joules per second
            return watts;
        } catch (err) {
            return null;
        }
    }

    async getMetrics() {
        const [load, mem, fs, net, cpuTemp] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.networkStats(),
            si.cpuTemperature(),
        ]);

        const ts = Date.now() / 1000;

        const disks = (fs || [])
            .filter((d) => d.mount === '/' || d.mount === '/var' || d.size > 0)
            .map((d) => ({
                fs: d.fs,
                mount: d.mount,
                size: d.size,
                used: d.used,
                use: d.use,
            }));

        const netDetails = (net || []).map((n) => {
            const { rx_sec, tx_sec } = this.calcNetDelta({
                iface: n.iface,
                rx_bytes: n.rx_bytes,
                tx_bytes: n.tx_bytes,
                ts,
            });
            return {
                iface: n.iface,
                rx_total: n.rx_bytes,
                tx_total: n.tx_bytes,
                rx_sec,
                tx_sec,
            };
        });

        const agg = netDetails.reduce(
            (acc, n) => {
                acc.rx_sec += n.rx_sec || 0;
                acc.tx_sec += n.tx_sec || 0;
                return acc;
            },
            { rx_sec: 0, tx_sec: 0 }
        );

        const watts = await this.readPowerWatts(ts);
        const avgLoad =
            load?.currentLoad !== undefined && load?.currentLoad !== null
                ? load.currentLoad
                : (load?.cpus || []).reduce((acc, c) => acc + (c.load || 0), 0) / Math.max(1, load?.cpus?.length || 1);

        return {
            timestamp: ts,
            cpu: {
                load: avgLoad,
                cores: (load.cpus || []).map((c) => c.load),
                temp: cpuTemp?.main || null,
            },
            memory: {
                total: mem.total,
                used: mem.active || mem.used,
                free: mem.free,
                swapTotal: mem.swaptotal,
                swapUsed: mem.swapused,
            },
            disks,
            network: {
                interfaces: netDetails,
                aggregate: agg,
            },
            power: {
                watts: watts,
                temperature: cpuTemp?.main || null,
            },
        };
    }
}

export const hostService = new HostService();
