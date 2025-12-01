import { Request, Response } from 'express';
import { proxmoxService } from './proxmox.service';
import { logger } from '../../shared/utils/logger';

class ProxmoxController {
    private handleError(res: Response, error: any, message: string) {
        const status = error?.response?.status || 500;
        const detail = error?.response?.data?.errors || error?.response?.data?.message || error?.message;
        logger.error(message, detail);
        res.status(status).json({ status: 'error', message: detail || message });
    }

    async getClusterResources(req: Request, res: Response) {
        try {
            const data = await proxmoxService.getClusterResources();
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox cluster resources');
        }
    }

    async getNodes(req: Request, res: Response) {
        try {
            const data = await proxmoxService.getNodes();
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox nodes');
        }
    }

    async getNodeStatus(req: Request, res: Response) {
        try {
            const { node } = req.params;
            const data = await proxmoxService.getNodeStatus(node);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox node status');
        }
    }

    async getQemuVms(req: Request, res: Response) {
        try {
            const { node } = req.params;
            const data = await proxmoxService.getQemuVms(node);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox VMs');
        }
    }

    async getQemuVmStatus(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.getQemuVmStatus(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox VM status');
        }
    }

    async getLxcContainers(req: Request, res: Response) {
        try {
            const { node } = req.params;
            const data = await proxmoxService.getLxcContainers(node);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox containers');
        }
    }

    async getLxcContainerStatus(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.getLxcContainerStatus(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox container status');
        }
    }

    async getNodeMetrics(req: Request, res: Response) {
        try {
            const { node } = req.params;
            const timeframe = (req.query.timeframe as string) || 'hour';
            const data = await proxmoxService.getNodeMetrics(node, timeframe);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox node metrics');
        }
    }

    async getQemuMetrics(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const timeframe = (req.query.timeframe as string) || 'hour';
            const data = await proxmoxService.getQemuMetrics(node, vmid, timeframe);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox VM metrics');
        }
    }

    async getLxcMetrics(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const timeframe = (req.query.timeframe as string) || 'hour';
            const data = await proxmoxService.getLxcMetrics(node, vmid, timeframe);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error fetching Proxmox container metrics');
        }
    }

    async startVm(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.startVm(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error starting Proxmox VM');
        }
    }

    async stopVm(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.stopVm(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error stopping Proxmox VM');
        }
    }

    async rebootVm(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.rebootVm(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error rebooting Proxmox VM');
        }
    }

    async startContainer(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.startContainer(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error starting Proxmox container');
        }
    }

    async stopContainer(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.stopContainer(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error stopping Proxmox container');
        }
    }

    async rebootContainer(req: Request, res: Response) {
        try {
            const { node, vmid } = req.params;
            const data = await proxmoxService.rebootContainer(node, vmid);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(res, error, 'Error rebooting Proxmox container');
        }
    }
}

export const proxmoxController = new ProxmoxController();
