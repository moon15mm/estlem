import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SuperAdmin } from '@estlem/shared';

interface AdminAuthStore {
  admin: SuperAdmin | null;
  token: string | null;
  login: (admin: SuperAdmin, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminAuth = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      login: (admin, token) => {
        localStorage.setItem('estlem_admin_token', token);
        set({ admin, token });
      },
      logout: () => {
        localStorage.removeItem('estlem_admin_token');
        set({ admin: null, token: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'estlem-admin-auth' },
  ),
);
