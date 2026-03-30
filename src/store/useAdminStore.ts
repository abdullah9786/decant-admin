import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
    admin: any | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    setAuth: (admin: any, token: string, refreshToken: string) => void;
    logout: () => void;
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            admin: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            setAuth: (admin: any, token: string, refreshToken: string) =>
                set({ admin, token, refreshToken, isAuthenticated: true }),
            logout: () =>
                set({
                    admin: null,
                    token: null,
                    refreshToken: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: 'admin-storage',
        }
    )
);
