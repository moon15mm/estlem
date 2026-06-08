import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://api.estlem.store/api/v1';

// Callback to notify auth store when session is invalidated
let _onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: () => void) {
  _onSessionExpired = cb;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('estlem_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  async (err) => {
    if (err.response?.status === 401) {
      // Don't retry auth endpoints
      const url = err.config?.url ?? '';
      if (url.includes('/auth/')) {
        return Promise.reject(err);
      }

      const refreshToken = await SecureStore.getItemAsync('estlem_refresh_token');
      if (refreshToken && !err.config._retried) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const newToken = res.data?.data?.accessToken ?? res.data?.accessToken;
          if (newToken) {
            await SecureStore.setItemAsync('estlem_token', newToken);
            err.config._retried = true;
            err.config.headers.Authorization = `Bearer ${newToken}`;
            return api.request(err.config);
          }
        } catch {
          // Refresh failed — session is dead
        }
      }

      // Clear everything and notify
      await SecureStore.deleteItemAsync('estlem_token');
      await SecureStore.deleteItemAsync('estlem_refresh_token');
      await SecureStore.deleteItemAsync('estlem_session');
      _onSessionExpired?.();
    }
    return Promise.reject(err);
  },
);
