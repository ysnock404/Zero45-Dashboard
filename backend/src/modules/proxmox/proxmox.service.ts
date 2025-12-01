import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { execFile } from 'child_process';
import util from 'util';
import { configManager } from '../../shared/config/config';
import { logger } from '../../shared/utils/logger';
import { ProxmoxMetricPoint, ProxmoxResource } from './proxmox.types';

class ProxmoxService {
    private client: AxiosInstance | null = null;
    private useLocalCli = false;
    private pveCliPath = process.env.PROXMOX_PVECLI_PATH || 'pvesh';
    private execAsync = util.promisify(execFile);

    constructor() {
        this.recreateClient();
    }

    private resolveConfig() {
        const fileConfig = configManager.getProxmoxConfig();

        // Prefer env vars, otherwise fall back to config.json. If the default placeholder
        // host is still present, assume we are running on the Proxmox host itself.
        const baseUrl =
            process.env.PROXMOX_BASE_URL ||
            (fileConfig.baseUrl.includes('proxmox.example.com')
                ? 'https://127.0.0.1:8006'
                : fileConfig.baseUrl);

        const verifySsl =
            process.env.PROXMOX_VERIFY_SSL !== undefined
                ? process.env.PROXMOX_VERIFY_SSL === 'true'
                : fileConfig.verifySsl;

        return {
            baseUrl,
            tokenId: process.env.PROXMOX_TOKEN_ID || fileConfig.tokenId,
            tokenSecret: process.env.PROXMOX_TOKEN_SECRET || fileConfig.tokenSecret,
            verifySsl,
        };
    }

    private authHeader(config: { tokenId: string; tokenSecret: string }) {
        if (!config.tokenId || !config.tokenSecret || config.tokenSecret === 'replace-with-real-secret') {
            return null;
        }

        return `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`;
    }

    private createClient() {
        const proxmox = this.resolveConfig();
        const authorization = this.authHeader(proxmox);
        const localHost =
            proxmox.baseUrl.includes('127.0.0.1') ||
            proxmox.baseUrl.includes('localhost') ||
            proxmox.baseUrl.includes('::1');

        this.useLocalCli = !authorization && localHost;

        if (this.useLocalCli) {
            logger.info('Proxmox local mode: usando pvesh (sem token).');
            return null;
        }

        if (!authorization) {
            logger.error(
                'Proxmox token não configurado. Define PROXMOX_TOKEN_ID e PROXMOX_TOKEN_SECRET ou atualiza backend/config.json.'
            );
            return null;
        }

        logger.info(
            `Proxmox client configured for ${proxmox.baseUrl} (verifySsl=${proxmox.verifySsl ? 'true' : 'false'})`
        );

        return axios.create({
            baseURL: `${proxmox.baseUrl.replace(/\/+$/, '')}/api2/json`,
            headers: {
                Authorization: authorization,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: proxmox.verifySsl,
            }),
        });
    }

    private recreateClient() {
        this.client = this.createClient();
    }

    private ensureClient() {
        if (this.useLocalCli) {
            return;
        }

        if (!this.client) {
            this.recreateClient();
        }

        if (!this.client) {
            const error: any = new Error('Proxmox token not configured');
            error.response = {
                status: 401,
                data: {
                    message: 'Configura PROXMOX_TOKEN_ID/PROXMOX_TOKEN_SECRET ou backend/config.json',
                },
            };
            throw error;
        }
    }

    private async pveCli(path: string, params: Record<string, string | number> = {}, method: 'get' | 'create' = 'get') {
        const args = [method, path, '--output-format', 'json'];
        Object.entries(params).forEach(([key, value]) => {
            args.push(`--${key}`, String(value));
        });

        try {
            const { stdout } = await this.execAsync(this.pveCliPath, args, { timeout: 5000 });
            const parsed = JSON.parse(stdout || 'null');
            return parsed;
        } catch (error: any) {
            logger.error(`pvesh ${method} ${path} failed`, error?.stderr || error?.message);
            throw error;
        }
    }

    private async get<T>(path: string, retry = false): Promise<T> {
        this.ensureClient();

        try {
            const response = await this.client!.get(path);
            return response.data.data as T;
        } catch (error: any) {
            const status = error?.response?.status;

            if (status === 401 && !retry) {
                logger.warn('Proxmox respondeu 401, recarregando config e tentando novamente uma vez.');
                this.recreateClient();
                return this.get<T>(path, true);
            }

            const reason = error?.response?.data?.errors || error?.message;
            logger.error(`Proxmox GET ${path} failed`, reason || status || 'unknown error');
            throw error;
        }
    }

    async getClusterResources(): Promise<ProxmoxResource[]> {
        if (this.useLocalCli) {
            return this.pveCli('/cluster/resources');
        }
        return this.get<ProxmoxResource[]>('/cluster/resources');
    }

    async getNodes() {
        if (this.useLocalCli) {
            return this.pveCli('/nodes');
        }
        return this.get<any[]>('/nodes');
    }

    async getNodeStatus(node: string) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/status`);
        }
        return this.get<any>(`/nodes/${encodeURIComponent(node)}/status`);
    }

    async getQemuVms(node: string) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/qemu`);
        }
        return this.get<any[]>(`/nodes/${encodeURIComponent(node)}/qemu`);
    }

    async getQemuVmStatus(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/current`);
        }
        return this.get<any>(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/current`);
    }

    async getLxcContainers(node: string) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/lxc`);
        }
        return this.get<any[]>(`/nodes/${encodeURIComponent(node)}/lxc`);
    }

    async getLxcContainerStatus(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/current`);
        }
        return this.get<any>(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/current`);
    }

    async getNodeMetrics(node: string, timeframe: string = 'hour') {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/rrddata`, { timeframe });
        }
        return this.get<ProxmoxMetricPoint[]>(
            `/nodes/${encodeURIComponent(node)}/rrddata?timeframe=${encodeURIComponent(timeframe)}`
        );
    }

    async getQemuMetrics(node: string, vmid: string | number, timeframe: string = 'hour') {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/rrddata`, { timeframe });
        }
        return this.get<ProxmoxMetricPoint[]>(
            `/nodes/${encodeURIComponent(node)}/qemu/${vmid}/rrddata?timeframe=${encodeURIComponent(timeframe)}`
        );
    }

    async getLxcMetrics(node: string, vmid: string | number, timeframe: string = 'hour') {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/rrddata`, { timeframe });
        }
        return this.get<ProxmoxMetricPoint[]>(
            `/nodes/${encodeURIComponent(node)}/lxc/${vmid}/rrddata?timeframe=${encodeURIComponent(timeframe)}`
        );
    }

    async startVm(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/start`, {}, 'create');
        }
        this.ensureClient();
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/start`);
        return response.data.data;
    }

    async stopVm(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/stop`, {}, 'create');
        }
        this.ensureClient();
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/stop`);
        return response.data.data;
    }

    async rebootVm(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/reboot`, {}, 'create');
        }
        this.ensureClient();
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/reboot`);
        return response.data.data;
    }

    async startContainer(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/start`, {}, 'create');
        }
        this.ensureClient();
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/start`);
        return response.data.data;
    }

    async stopContainer(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/stop`, {}, 'create');
        }
        this.ensureClient();
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/stop`);
        return response.data.data;
    }

    async rebootContainer(node: string, vmid: string | number) {
        if (this.useLocalCli) {
            return this.pveCli(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/reboot`, {}, 'create');
        }
        this.ensureClient();
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/reboot`);
        return response.data.data;
    }
}

export const proxmoxService = new ProxmoxService();
