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

    private baseDiskName(raw: string | null | undefined) {
        if (!raw) return null;
        const name = raw.replace('/dev/', '').trim();
        const match = name.match(/(nvme\d+n\d+|sd[a-z]+|vd[a-z]+|hd[a-z]+|md\d+)/);
        return match ? match[1] : null;
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

    private async readLsblk() {
        try {
            const { stdout } = await this.execAsync('lsblk -J -b -o NAME,TYPE,PKNAME,MOUNTPOINT,MOUNTPOINTS,FSTYPE,SIZE', {
                timeout: 2000,
            });
            const parsed = JSON.parse(stdout || '{}');
            const devices: any[] = parsed?.blockdevices || [];

            const flat: Record<string, any> = {};
            const walk = (nodes: any[]) => {
                nodes.forEach((node) => {
                    flat[node.name] = {
                        type: node.type,
                        pkname: node.pkname || null,
                        size: Number(node.size) || 0,
                        mountpoint: node.mountpoint || null,
                        mountpoints: node.mountpoints || [],
                    };
                    if (Array.isArray(node.children)) walk(node.children);
                });
            };
            walk(devices);

            return { devices, flat };
        } catch (err) {
            logger.warn('lsblk failed, disk usage will be limited', err);
            return { devices: [], flat: {} as Record<string, any> };
        }
    }

    private async readLvmMaps() {
        try {
            const [pvsRaw, lvsRaw] = await Promise.all([
                this.execAsync(
                    'pvs --noheadings --separator "," -o pv_name,vg_name,pv_size --units b --nosuffix',
                    { timeout: 2000 }
                ),
                this.execAsync(
                    'lvs --noheadings --separator "," -o lv_name,vg_name,lv_size,data_percent,lv_attr --units b --nosuffix',
                    { timeout: 2000 }
                ),
            ]);

            const pvList = (pvsRaw.stdout || '')
                .trim()
                .split('\n')
                .map((line) => line.split(',').map((v) => v.trim()))
                .filter((parts) => parts.length >= 3 && parts[1])
                .map(([pvName, vgName, sizeStr]) => ({
                    pvName,
                    vgName,
                    size: Number(sizeStr) || 0,
                }));

            const lvList = (lvsRaw.stdout || '')
                .trim()
                .split('\n')
                .map((line) => line.split(',').map((v) => v.trim()))
                .filter((parts) => parts.length >= 5 && parts[1])
                .map(([lvName, vgName, lvSizeStr, dataPctStr, lvAttr]) => ({
                    lvName,
                    vgName,
                    lvSize: Number(lvSizeStr) || 0,
                    dataPercent: Number(dataPctStr),
                    lvAttr,
                }))
                .filter((lv) => lv.lvAttr?.startsWith('t') && Number.isFinite(lv.dataPercent));

            return { pvList, lvList };
        } catch (err) {
            logger.warn('pvs/lvs failed, LVM usage unavailable', err);
            return { pvList: [] as any[], lvList: [] as any[] };
        }
    }

    private async computePhysicalDiskUsage(fsList: any[]) {
        const [{ devices, flat }, { pvList, lvList }] = await Promise.all([this.readLsblk(), this.readLvmMaps()]);

        const disks = (devices || []).filter((d) => d.type === 'disk');
        const diskUsage: Record<string, { name: string; size: number; used: number }> = {};
        disks.forEach((disk: any) => {
            diskUsage[disk.name] = { name: disk.name, size: Number(disk.size) || 0, used: 0 };
        });

        const findRootDisk = (name: string | null | undefined): string | null => {
            if (!name) return null;
            let current = name;
            const safety = new Set<string>();
            while (current && !safety.has(current)) {
                safety.add(current);
                const info = flat[current];
                if (!info) break;
                if (info.type === 'disk') return current;
                current = info.pkname || null;
            }
            return this.baseDiskName(current);
        };

        const mountToDevice: Record<string, string> = {};
        Object.entries(flat).forEach(([name, info]: [string, any]) => {
            const points = [];
            if (info.mountpoint) points.push(info.mountpoint);
            if (Array.isArray(info.mountpoints)) points.push(...info.mountpoints.filter(Boolean));
            points.forEach((mp) => {
                if (!mountToDevice[mp]) mountToDevice[mp] = name;
            });
        });

        (fsList || []).forEach((entry) => {
            const mount = entry?.mount;
            const fsDevice = entry?.fs ? String(entry.fs).replace('/dev/', '') : null;
            const fromMount = mount ? mountToDevice[mount] : null;
            const deviceName = fromMount || fsDevice;
            const disk = findRootDisk(deviceName || null);
            if (disk && diskUsage[disk]) {
                diskUsage[disk].used += Number(entry.used) || 0;
            }
        });

        const vgToPvs: Record<string, { disk: string; size: number }[]> = {};
        pvList.forEach((pv) => {
            const disk = findRootDisk(this.baseDiskName(pv.pvName));
            if (!disk) return;
            if (!vgToPvs[pv.vgName]) vgToPvs[pv.vgName] = [];
            vgToPvs[pv.vgName].push({ disk, size: pv.size });
        });

        lvList.forEach((lv) => {
            const pvs = vgToPvs[lv.vgName];
            if (!pvs || pvs.length === 0) return;

            const poolUsed = (lv.lvSize * lv.dataPercent) / 100;
            const totalPvSize = pvs.reduce((acc, pv) => acc + (pv.size || 0), 0);

            pvs.forEach((pv) => {
                const share = totalPvSize > 0 ? (poolUsed * pv.size) / totalPvSize : 0;
                if (diskUsage[pv.disk]) {
                    diskUsage[pv.disk].used += share;
                }
            });
        });

        return Object.values(diskUsage).map((d) => {
            const used = d.size > 0 ? Math.min(d.used, d.size) : d.used;
            return {
                name: d.name,
                size: d.size,
                used,
                usePct: d.size > 0 ? +(((used || 0) / d.size) * 100).toFixed(2) : null,
            };
        });
    }

    private async collectSample() {
        const [load, mem, fsList, net, cpuTemp] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.networkStats(),
            si.cpuTemperature(),
        ]);

        const ts = Date.now() / 1000;

        const disks = (fsList || [])
            .filter((d) => d.mount === '/' || d.mount === '/var' || d.size > 0)
            .map((d) => ({
                fs: d.fs,
                mount: d.mount,
                size: d.size,
                used: d.used,
                use: d.use,
            }));

        const diskUsage = await this.computePhysicalDiskUsage(fsList || []);

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
            diskUsage,
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
