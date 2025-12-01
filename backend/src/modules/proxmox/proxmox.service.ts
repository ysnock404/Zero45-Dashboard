import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { configManager } from '../../shared/config/config';
import { logger } from '../../shared/utils/logger';
import { ProxmoxMetricPoint, ProxmoxResource } from './proxmox.types';

class ProxmoxService {
    private client: AxiosInstance;

    constructor() {
        this.client = this.createClient();
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

    private createClient() {
        const proxmox = this.resolveConfig();

        logger.info(
            `Proxmox client configured for ${proxmox.baseUrl} (verifySsl=${proxmox.verifySsl ? 'true' : 'false'})`
        );

        return axios.create({
            baseURL: `${proxmox.baseUrl.replace(/\/+$/, '')}/api2/json`,
            headers: {
                Authorization: `PVEAPIToken=${proxmox.tokenId}=${proxmox.tokenSecret}`,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: proxmox.verifySsl,
            }),
        });
    }

    private async get<T>(path: string): Promise<T> {
        try {
            const response = await this.client.get(path);
            return response.data.data as T;
        } catch (error: any) {
            const reason = error?.response?.data?.errors || error?.message;
            logger.error(`Proxmox GET ${path} failed`, reason);
            throw error;
        }
    }

    async getClusterResources(): Promise<ProxmoxResource[]> {
        return this.get<ProxmoxResource[]>('/cluster/resources');
    }

    async getNodes() {
        return this.get<any[]>('/nodes');
    }

    async getNodeStatus(node: string) {
        return this.get<any>(`/nodes/${encodeURIComponent(node)}/status`);
    }

    async getQemuVms(node: string) {
        return this.get<any[]>(`/nodes/${encodeURIComponent(node)}/qemu`);
    }

    async getQemuVmStatus(node: string, vmid: string | number) {
        return this.get<any>(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/current`);
    }

    async getLxcContainers(node: string) {
        return this.get<any[]>(`/nodes/${encodeURIComponent(node)}/lxc`);
    }

    async getLxcContainerStatus(node: string, vmid: string | number) {
        return this.get<any>(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/current`);
    }

    async getNodeMetrics(node: string, timeframe: string = 'hour') {
        return this.get<ProxmoxMetricPoint[]>(
            `/nodes/${encodeURIComponent(node)}/rrddata?timeframe=${encodeURIComponent(timeframe)}`
        );
    }

    async getQemuMetrics(node: string, vmid: string | number, timeframe: string = 'hour') {
        return this.get<ProxmoxMetricPoint[]>(
            `/nodes/${encodeURIComponent(node)}/qemu/${vmid}/rrddata?timeframe=${encodeURIComponent(timeframe)}`
        );
    }

    async getLxcMetrics(node: string, vmid: string | number, timeframe: string = 'hour') {
        return this.get<ProxmoxMetricPoint[]>(
            `/nodes/${encodeURIComponent(node)}/lxc/${vmid}/rrddata?timeframe=${encodeURIComponent(timeframe)}`
        );
    }

    async startVm(node: string, vmid: string | number) {
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/start`);
        return response.data.data;
    }

    async stopVm(node: string, vmid: string | number) {
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/stop`);
        return response.data.data;
    }

    async rebootVm(node: string, vmid: string | number) {
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/reboot`);
        return response.data.data;
    }

    async startContainer(node: string, vmid: string | number) {
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/start`);
        return response.data.data;
    }

    async stopContainer(node: string, vmid: string | number) {
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/stop`);
        return response.data.data;
    }

    async rebootContainer(node: string, vmid: string | number) {
        const response = await this.client.post(`/nodes/${encodeURIComponent(node)}/lxc/${vmid}/status/reboot`);
        return response.data.data;
    }
}

export const proxmoxService = new ProxmoxService();
