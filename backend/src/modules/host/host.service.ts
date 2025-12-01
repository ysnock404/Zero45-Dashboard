import si from 'systeminformation';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import { logger } from '../../shared/utils/logger';

type NetPrev = { rx: number; tx: number; ts: number };

class HostService {
    private netPrev: Record<string, NetPrev> = {};
    private samples: any[] = [];
    private execAsync = util.promisify(exec);
    private readonly POWER_FACTOR = 1.7;
    private readonly POWER_OFFSET = 62.7;
    private readonly SAMPLE_INTERVAL_MS = 5000;

    constructor() {
        this.startBackgroundSampling();
    }

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

    private async readPowerWattsFromCommand() {
        const command =
            process.env.HOST_WATTS_COMMAND || process.env.PROXMOX_WATTS_COMMAND || process.env.WATTS_COMMAND;
        if (!command) return null;

        try {
            const { stdout } = await this.execAsync(command, { timeout: 2000 });
            const match = stdout.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (match) {
                const watts = parseFloat(match[1]);
                return Number.isFinite(watts) ? watts : null;
            }
        } catch (err) {
            return null;
        }

        return null;
    }

    private async readRaplWithEstimate() {
        try {
            const e1 = BigInt((await fs.readFile('/sys/class/powercap/intel-rapl:0/energy_uj', 'utf8')).trim());
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const e2 = BigInt((await fs.readFile('/sys/class/powercap/intel-rapl:0/energy_uj', 'utf8')).trim());

            const deltaUj = e2 >= e1 ? e2 - e1 : BigInt(0);
            const cpuWatts = Number(deltaUj) / 1_000_000; // microjoules to joules per second over 1s
            if (!Number.isFinite(cpuWatts)) return null;

            const totalWatts = cpuWatts * this.POWER_FACTOR + this.POWER_OFFSET;
            return Number.isFinite(totalWatts) ? +totalWatts.toFixed(1) : null;
        } catch {
            return null;
        }
    }

    private async readPowerWatts() {
        const fromCommand = await this.readPowerWattsFromCommand();
        if (fromCommand !== null) {
            return fromCommand;
        }

        const fromRapl = await this.readRaplWithEstimate();
        if (fromRapl !== null) {
            return fromRapl;
        }

        // Try lm-sensors output (e.g., "Package id 0: 35.00 W")
        try {
            const { stdout } = await this.execAsync('sensors', { timeout: 1500 });
            const match = stdout.match(/([0-9]+(?:\.[0-9]+)?)\s*W/);
            if (match) {
                const watts = parseFloat(match[1]);
                if (Number.isFinite(watts)) return watts;
            }
        } catch {
            // ignore and continue
        }

        // Try IPMI (common on servers)
        try {
            const { stdout } = await this.execAsync('ipmitool', ['sdr'], { timeout: 2000 });
            const match = stdout.match(/([0-9]+(?:\.[0-9]+)?)\s*Watts/i);
            if (match) {
                const watts = parseFloat(match[1]);
                if (Number.isFinite(watts)) return watts;
            }
        } catch {
            // ignore and continue
        }

        try {
            const energyRaw = await si.power(); // may return null/undefined on some systems
            if (energyRaw?.cpus?.length) {
                const avg = energyRaw.cpus.reduce((acc, c) => acc + (c.power || 0), 0) / energyRaw.cpus.length;
                if (avg > 0) return avg;
            }
        } catch (err) {
            return null;
        }
    }

    private async collectSample() {
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

        const watts = await this.readPowerWatts();
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

    private async collectAndStore() {
        try {
            const sample = await this.collectSample();
            if (sample) {
                this.samples.push(sample);
                this.samples = this.samples.slice(-720); // ~1h at 5s
            }
        } catch (err) {
            logger.error('Failed to collect host sample', err);
        }
    }

    private startBackgroundSampling() {
        // Prime first sample synchronously
        this.collectAndStore();
        setInterval(() => this.collectAndStore(), this.SAMPLE_INTERVAL_MS).unref();
    }

    async getMetrics() {
        if (this.samples.length === 0) {
            await this.collectAndStore();
        }

        return {
            latest: this.samples[this.samples.length - 1] || null,
            history: [...this.samples],
        };
    }
}

export const hostService = new HostService();
