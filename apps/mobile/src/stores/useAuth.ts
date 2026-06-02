import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api } from '../lib/api';

export type UserType = 'customer' | 'staff' | 'superadmin';

type CustomerUser = {
  id: string;
  mobile: string;
  fullName?: string | null;
};

type StaffUser = {
  id: string;
  name: string;
  mobile: string;
  role: string;
  tenantId: string;
  storeId: string;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  type: UserType;
  accessToken: string;
  refreshToken?: string;
  user: CustomerUser | StaffUser | AdminUser;
};

type AuthState = {
  session: AuthSession | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  sendCustomerOtp: (mobile: string) => Promise<void>;
  verifyCustomerOtp: (mobile: string, otp: string) => Promise<void>;
  loginCustomerLocal: (mobile: string) => Promise<void>;
  loginStaff: (mobile: string, secret: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SESSION_KEY = 'estlem_session';
const ACCESS_TOKEN_KEY = 'estlem_token';
const REFRESH_TOKEN_KEY = 'estlem_refresh_token';

async function saveSession(session: AuthSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken);
  if (session.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(SESSION_KEY);
      set({ session: stored ? JSON.parse(stored) as AuthSession : null, hydrated: true });
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      set({ session: null, hydrated: true });
    }
  },

  sendCustomerOtp: async (mobile) => {
    await api.post('/auth/otp/send', { mobile });
  },

  verifyCustomerOtp: async (mobile, otp) => {
    const data = await api.post('/auth/otp/verify', { mobile, otp }) as {
      customer: CustomerUser;
      accessToken: string;
      refreshToken: string;
    };
    const session: AuthSession = {
      type: 'customer',
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.customer,
    };
    await saveSession(session);
    set({ session });
  },

  loginCustomerLocal: async (mobile) => {
    const cleanMobile = mobile.trim();
    const session: AuthSession = {
      type: 'customer',
      accessToken: '',
      user: {
        id: `local-${cleanMobile}`,
        mobile: cleanMobile,
      },
    };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ session });
  },

  loginStaff: async (mobile, secret) => {
    const usePin = /^\d{4,6}$/.test(secret);
    const data = await api.post('/auth/staff/login', {
      mobile,
      ...(usePin ? { pin: secret } : { password: secret }),
    }) as {
      staff: StaffUser;
      accessToken: string;
      refreshToken: string;
    };
    const session: AuthSession = {
      type: 'staff',
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.staff,
    };
    await saveSession(session);
    set({ session });
  },

  loginAdmin: async (email, password) => {
    const data = await api.post('/auth/admin/login', { email, password }) as {
      admin: AdminUser;
      accessToken: string;
    };
    const session: AuthSession = {
      type: 'superadmin',
      accessToken: data.accessToken,
      user: data.admin,
    };
    await saveSession(session);
    set({ session });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ session: null });
  },
}));
