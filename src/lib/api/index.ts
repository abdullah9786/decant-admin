import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor for Auth tokens
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const storage = localStorage.getItem('admin-storage');
        if (storage) {
            try {
                const parsed = JSON.parse(storage);
                const token = parsed.state.token;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (e) {
                console.error("Error parsing admin token", e);
            }
        }
    }
    return config;
});

export const authApi = {
    login: (data: any) => api.post('/auth/login', data),
};

export const productApi = {
    getAll: (params?: any) => api.get('/products', { params }),
    getOne: (id: string) => api.get(`/products/${id}`),
    create: (data: any) => api.post('/products', data),
    update: (id: string, data: any) => api.put(`/products/${id}`, data),
    delete: (id: string) => api.delete(`/products/${id}`),
};

export const orderApi = {
    getAll: (params?: any) => api.get('/orders', { params }),
    getOne: (id: string) => api.get(`/orders/${id}`),
    updateStatus: (id: string, status: string, items?: any[]) => api.put(`/orders/${id}`, { status, items }),
};

export const userApi = {
    getAll: () => api.get('/users'),
    delete: (id: string) => api.delete(`/users/${id}`),
    toggleAdmin: (id: string) => api.post(`/users/${id}/toggle-admin`),
    createAdmin: (data: any) => api.post('/users/create-admin', data),
};

export const categoryApi = {
    getAll: () => api.get('/categories'),
    create: (data: any) => api.post('/categories', data),
    update: (id: string, data: any) => api.put(`/categories/${id}`, data),
    delete: (id: string) => api.delete(`/categories/${id}`),
};

export const dashboardApi = {
    getStats: () => api.get('/analytics/stats'),
};

export default api;
