import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
    admin: any | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (admin: any, token: string) => void;
    logout: () => void;
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            admin: null,
            token: null,
            isAuthenticated: false,
            setAuth: (admin: any, token: string) => set({ admin, token, isAuthenticated: true }),
            logout: () => set({ admin: null, token: null, isAuthenticated: false }),
        }),
        {
            name: 'admin-storage',
        }
    )
);
