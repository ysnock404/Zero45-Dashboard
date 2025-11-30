import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
