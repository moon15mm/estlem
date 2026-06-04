import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomerVehicle {
  id?: string;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  mobile: string;
  fullName?: string;
  vehicles?: CustomerVehicle[];
}

interface CustomerAuthStore {
  customer: CustomerProfile | null;
  token: string | null;
  refreshToken: string | null;
  login: (customer: CustomerProfile, token: string, refreshToken: string) => void;
  updateProfile: (data: Partial<CustomerProfile>) => void;
  setVehicles: (vehicles: CustomerVehicle[]) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useCustomerAuth = create<CustomerAuthStore>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      refreshToken: null,
      login: (customer, token, refreshToken) => {
        localStorage.setItem('estlem_access_token', token);
        localStorage.setItem('estlem_refresh_token', refreshToken);
        set({ customer, token, refreshToken });
      },
      updateProfile: (data) =>
        set((state) => ({
          customer: state.customer ? { ...state.customer, ...data } : null,
        })),
      setVehicles: (vehicles) =>
        set((state) => ({
          customer: state.customer ? { ...state.customer, vehicles } : null,
        })),
      logout: () => {
        localStorage.removeItem('estlem_access_token');
        localStorage.removeItem('estlem_refresh_token');
        set({ customer: null, token: null, refreshToken: null });
      },
      isLoggedIn: () => !!get().token,
    }),
    { name: 'estlem-customer-auth' },
  ),
);
