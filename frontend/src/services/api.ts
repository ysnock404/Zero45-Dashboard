import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:9031`;

const apiClient = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
        const { state } = JSON.parse(authStore);
        if (state?.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
        }
    }
    return config;
});

// SSH API
export const sshApi = {
    getServers: async () => {
        const response = await apiClient.get('/ssh/servers');
        return response.data.data;
    },

    getServer: async (id: string) => {
        const response = await apiClient.get(`/ssh/servers/${id}`);
        return response.data.data;
    },

    createServer: async (data: {
        name: string;
        host: string;
        port: number;
        username: string;
        password?: string;
        privateKey?: string;
        tags?: string[];
    }) => {
        const response = await apiClient.post('/ssh/servers', data);
        return response.data.data;
    },

    updateServer: async (id: string, data: any) => {
        const response = await apiClient.put(`/ssh/servers/${id}`, data);
        return response.data.data;
    },

    deleteServer: async (id: string) => {
        const response = await apiClient.delete(`/ssh/servers/${id}`);
        return response.data;
    },

    testConnection: async (id: string) => {
        const response = await apiClient.post(`/ssh/servers/${id}/test`);
        return response.data.data;
    },

    getActiveSessions: async () => {
        const response = await apiClient.get('/ssh/sessions/active');
        return response.data.data;
    },
};

// RDP API
export const rdpApi = {
    getServers: async () => {
        const response = await apiClient.get('/rdp/servers');
        return response.data.data;
    },

    getServer: async (id: string) => {
        const response = await apiClient.get(`/rdp/servers/${id}`);
        return response.data.data;
    },

    createServer: async (data: {
        name: string;
        host: string;
        port: number;
        username: string;
        password?: string;
        domain?: string;
        tags?: string[];
    }) => {
        const response = await apiClient.post('/rdp/servers', data);
        return response.data.data;
    },

    updateServer: async (id: string, data: any) => {
        const response = await apiClient.put(`/rdp/servers/${id}`, data);
        return response.data.data;
    },

    deleteServer: async (id: string) => {
        const response = await apiClient.delete(`/rdp/servers/${id}`);
        return response.data;
    },

    testConnection: async (id: string) => {
        const response = await apiClient.post(`/rdp/servers/${id}/test`);
        return response.data.data;
    },

    getGuacToken: async (id: string, params?: { width?: number; height?: number; dpi?: number }) => {
        const response = await apiClient.get(`/rdp/servers/${id}/token`, { params });
        return response.data.data;
    },

    downloadRDPFile: async (id: string) => {
        const response = await apiClient.get(`/rdp/servers/${id}/rdp-file`, {
            responseType: 'blob',
        });
        return response.data as Blob;
    },

    getActiveSessions: async () => {
        const response = await apiClient.get('/rdp/sessions/active');
        return response.data.data;
    },
};

// Proxmox API
export const proxmoxApi = {
    getClusterResources: async () => {
        const response = await apiClient.get('/proxmox/resources');
        return response.data.data;
    },
    getNodes: async () => {
        const response = await apiClient.get('/proxmox/nodes');
        return response.data.data;
    },
    getNodeStatus: async (node: string) => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/status`);
        return response.data.data;
    },
    getQemuVms: async (node: string) => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/vms`);
        return response.data.data;
    },
    getQemuVmStatus: async (node: string, vmid: string | number) => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/vms/${vmid}/status`);
        return response.data.data;
    },
    getLxcContainers: async (node: string) => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/containers`);
        return response.data.data;
    },
    getLxcContainerStatus: async (node: string, vmid: string | number) => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/containers/${vmid}/status`);
        return response.data.data;
    },
    getNodeMetrics: async (node: string, timeframe: string = 'hour') => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/metrics`, { params: { timeframe } });
        return response.data.data;
    },
    getQemuMetrics: async (node: string, vmid: string | number, timeframe: string = 'hour') => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/vms/${vmid}/metrics`, { params: { timeframe } });
        return response.data.data;
    },
    getLxcMetrics: async (node: string, vmid: string | number, timeframe: string = 'hour') => {
        const response = await apiClient.get(`/proxmox/nodes/${node}/containers/${vmid}/metrics`, {
            params: { timeframe },
        });
        return response.data.data;
    },
    startVm: async (node: string, vmid: string | number) => {
        const response = await apiClient.post(`/proxmox/nodes/${node}/vms/${vmid}/start`);
        return response.data.data;
    },
    stopVm: async (node: string, vmid: string | number) => {
        const response = await apiClient.post(`/proxmox/nodes/${node}/vms/${vmid}/stop`);
        return response.data.data;
    },
    rebootVm: async (node: string, vmid: string | number) => {
        const response = await apiClient.post(`/proxmox/nodes/${node}/vms/${vmid}/reboot`);
        return response.data.data;
    },
    startContainer: async (node: string, vmid: string | number) => {
        const response = await apiClient.post(`/proxmox/nodes/${node}/containers/${vmid}/start`);
        return response.data.data;
    },
    stopContainer: async (node: string, vmid: string | number) => {
        const response = await apiClient.post(`/proxmox/nodes/${node}/containers/${vmid}/stop`);
        return response.data.data;
    },
    rebootContainer: async (node: string, vmid: string | number) => {
        const response = await apiClient.post(`/proxmox/nodes/${node}/containers/${vmid}/reboot`);
        return response.data.data;
    },
};

export const hostApi = {
    getMetrics: async () => {
        const response = await apiClient.get('/host/metrics');
        return response.data.data;
    },
};

// Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data.data;
    },

    register: async (email: string, password: string, name: string) => {
        const response = await apiClient.post('/auth/register', { email, password, name });
        return response.data.data;
    },

    refreshToken: async (refreshToken: string) => {
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        return response.data.data;
    },

    getMe: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data.data;
    },

    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    },
};

export default apiClient;
