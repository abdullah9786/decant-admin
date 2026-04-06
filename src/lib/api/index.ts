import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAdminStore } from '@/store/useAdminStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const rawAuthClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let refreshPromise: Promise<string> | null = null;

function skipRefreshForUrl(url: string | undefined): boolean {
    if (!url) return true;
    const paths = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
    return paths.some((p) => url.includes(p));
}

export function revokeRefreshOnServer(refreshToken: string | null | undefined) {
    if (!refreshToken) return Promise.resolve();
    return rawAuthClient.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = useAdminStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retryRefresh?: boolean };
        if (!original || original._retryRefresh) return Promise.reject(error);
        if (error.response?.status !== 401) return Promise.reject(error);
        if (skipRefreshForUrl(original.url)) return Promise.reject(error);

        const refresh = useAdminStore.getState().refreshToken;
        if (!refresh) {
            useAdminStore.getState().logout();
            if (typeof window !== 'undefined') {
                window.location.assign('/login?session=expired');
            }
            return Promise.reject(error);
        }

        try {
            if (!refreshPromise) {
                refreshPromise = rawAuthClient
                    .post('/auth/refresh', { refresh_token: refresh })
                    .then((res) => {
                        const { access_token, refresh_token, user } = res.data;
                        useAdminStore.getState().setAuth(user, access_token, refresh_token);
                        return access_token as string;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }
            const newAccess = await refreshPromise;
            original.headers = original.headers || {};
            (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
            original._retryRefresh = true;
            return api(original);
        } catch {
            useAdminStore.getState().logout();
            if (typeof window !== 'undefined') {
                window.location.assign('/login?session=expired');
            }
            return Promise.reject(error);
        }
    }
);

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
    getAbandonedCheckouts: () => api.get('/orders/abandoned-checkouts'),
    deleteAbandonedCheckout: (id: string) => api.delete(`/orders/abandoned-checkouts/${id}`),
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
