import { Router } from 'express';
import { proxmoxController } from './proxmox.controller';

export const proxmoxRouter = Router();

proxmoxRouter.get('/resources', proxmoxController.getClusterResources.bind(proxmoxController));
proxmoxRouter.get('/nodes', proxmoxController.getNodes.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/status', proxmoxController.getNodeStatus.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/vms', proxmoxController.getQemuVms.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/vms/:vmid/status', proxmoxController.getQemuVmStatus.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/containers', proxmoxController.getLxcContainers.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/containers/:vmid/status', proxmoxController.getLxcContainerStatus.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/metrics', proxmoxController.getNodeMetrics.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/vms/:vmid/metrics', proxmoxController.getQemuMetrics.bind(proxmoxController));
proxmoxRouter.get('/nodes/:node/containers/:vmid/metrics', proxmoxController.getLxcMetrics.bind(proxmoxController));
proxmoxRouter.post('/nodes/:node/vms/:vmid/start', proxmoxController.startVm.bind(proxmoxController));
proxmoxRouter.post('/nodes/:node/vms/:vmid/stop', proxmoxController.stopVm.bind(proxmoxController));
proxmoxRouter.post('/nodes/:node/vms/:vmid/reboot', proxmoxController.rebootVm.bind(proxmoxController));
proxmoxRouter.post('/nodes/:node/containers/:vmid/start', proxmoxController.startContainer.bind(proxmoxController));
proxmoxRouter.post('/nodes/:node/containers/:vmid/stop', proxmoxController.stopContainer.bind(proxmoxController));
proxmoxRouter.post('/nodes/:node/containers/:vmid/reboot', proxmoxController.rebootContainer.bind(proxmoxController));
