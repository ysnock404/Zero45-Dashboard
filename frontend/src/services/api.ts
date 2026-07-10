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
        if (state?.accessToken) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
    }
    return config;
});

// Handle token refresh on 401 errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const authStore = localStorage.getItem('auth-storage');
            if (authStore) {
                const { state } = JSON.parse(authStore);
                if (state?.refreshToken) {
                    try {
                        // Try to refresh the token
                        const response = await apiClient.post('/auth/refresh', {
                            refreshToken: state.refreshToken,
                        });

                        const { accessToken } = response.data.data;

                        // Update stored access token
                        state.accessToken = accessToken;
                        localStorage.setItem('auth-storage', JSON.stringify({ state }));

                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return apiClient(originalRequest);
                    } catch (refreshError) {
                        // Refresh failed, clear auth and redirect to login
                        localStorage.removeItem('auth-storage');
                        window.location.href = '/login';
                        return Promise.reject(refreshError);
                    }
                }
            }

            // No refresh token, redirect to login
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

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

// Agency Cashflow API
const qs = (params?: Record<string, any>) => {
    if (!params) return '';
    const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const s = new URLSearchParams(clean as any).toString();
    return s ? `?${s}` : '';
};

export const agencyApi = {
    getSummary: async (year?: number) =>
        (await apiClient.get(`/agency/summary${qs({ year })}`)).data.data,
    getCashflow: async (year?: number) =>
        (await apiClient.get(`/agency/cashflow${qs({ year })}`)).data.data,
    getForecast: async (months?: number) =>
        (await apiClient.get(`/agency/forecast${qs({ months })}`)).data.data,
    getReports: async (filters?: Record<string, any>) =>
        (await apiClient.get(`/agency/reports${qs(filters)}`)).data.data,

    getConfig: async () => (await apiClient.get('/agency/config')).data.data,
    updateConfig: async (data: any) => (await apiClient.put('/agency/config', data)).data.data,

    listProjects: async () => (await apiClient.get('/agency/projects')).data.data,
    createProject: async (data: any) => (await apiClient.post('/agency/projects', data)).data.data,
    updateProject: async (id: string, data: any) =>
        (await apiClient.put(`/agency/projects/${id}`, data)).data.data,
    deleteProject: async (id: string) =>
        (await apiClient.delete(`/agency/projects/${id}`)).data.data,

    listTransactions: async (filters?: Record<string, any>) =>
        (await apiClient.get(`/agency/transactions${qs(filters)}`)).data.data,
    createTransaction: async (data: any) =>
        (await apiClient.post('/agency/transactions', data)).data.data,
    updateTransaction: async (id: string, data: any) =>
        (await apiClient.put(`/agency/transactions/${id}`, data)).data.data,
    deleteTransaction: async (id: string) =>
        (await apiClient.delete(`/agency/transactions/${id}`)).data.data,
    generateRecurring: async (upToDate?: string) =>
        (await apiClient.post('/agency/transactions/recurring/generate', { upToDate })).data.data,
    aiChat: async (messages: { role: string; content: string }[]) =>
        (await apiClient.post('/agency/ai/chat', { messages })).data.data,
    aiLogs: async (limit?: number) =>
        (await apiClient.get(`/agency/ai/logs${qs({ limit })}`)).data.data,
    exportCSV: async (filters?: Record<string, any>) => {
        const response = await apiClient.get(`/agency/transactions/export${qs(filters)}`, {
            responseType: 'blob',
        });
        return response.data as Blob;
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
    login: async (username: string, password: string) => {
        const response = await apiClient.post('/auth/login', { username, password });
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

    changePassword: async (currentPassword: string, newPassword: string) => {
        const response = await apiClient.post('/auth/change-password', {
            currentPassword,
            newPassword,
        });
        return response.data;
    },
};

export default apiClient;
