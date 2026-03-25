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

export const brandApi = {
    getAll: () => api.get('/brands'),
    create: (data: any) => api.post('/brands', data),
    update: (id: string, data: any) => api.put(`/brands/${id}`, data),
    delete: (id: string) => api.delete(`/brands/${id}`),
};

export const dashboardApi = {
    getStats: () => api.get('/analytics/stats'),
};

export const influencerAdminApi = {
    getAll: () => api.get('/influencers/admin/all'),
    create: (data: any) => api.post('/influencers/create', data),
    update: (profileId: string, data: any) => api.put(`/influencers/${profileId}`, data),
    toggleActive: (profileId: string) => api.put(`/influencers/${profileId}/toggle-active`),

    getCommissions: (status?: string) =>
        api.get('/influencers/admin/commissions', { params: status ? { status_filter: status } : {} }),
    approveCommission: (id: string) => api.put(`/influencers/admin/commissions/${id}/approve`),
    cancelCommission: (id: string, reason?: string) => api.put(`/influencers/admin/commissions/${id}/cancel`, { reason }),
    bulkApproveCommissions: () => api.put('/influencers/admin/commissions/bulk-approve'),
    bulkApproveSelected: (ids: string[]) => api.put('/influencers/admin/commissions/bulk-approve-selected', { commission_ids: ids }),
    bulkCancelSelected: (ids: string[], reason?: string) => api.put('/influencers/admin/commissions/bulk-cancel-selected', { commission_ids: ids, reason }),

    createPayout: (influencerId: string, method: string) =>
        api.post('/influencers/admin/payouts', { influencer_id: influencerId, method }),
    completePayout: (payoutId: string) => api.put(`/influencers/admin/payouts/${payoutId}/complete`),
    getPayouts: (influencerId: string) => api.get(`/influencers/admin/payouts/${influencerId}`),
    bulkCreatePayouts: () => api.post('/influencers/admin/payouts/bulk'),
    bulkCompletePayouts: (influencerId: string) => api.put(`/influencers/admin/payouts/${influencerId}/bulk-complete`),

    getCoupons: () => api.get('/influencers/admin/coupons'),
    createCoupon: (data: any) => api.post('/influencers/admin/coupons', data),
    updateCoupon: (id: string, data: any) => api.put(`/influencers/admin/coupons/${id}`, data),
    deleteCoupon: (id: string) => api.delete(`/influencers/admin/coupons/${id}`),
};

export default api;
