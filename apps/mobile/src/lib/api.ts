import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://estlem-api.onrender.com/api/v1';

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
      const refreshToken = await SecureStore.getItemAsync('estlem_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data.data;
          await SecureStore.setItemAsync('estlem_token', accessToken);
          err.config.headers.Authorization = `Bearer ${accessToken}`;
          return api.request(err.config);
        } catch {
          await SecureStore.deleteItemAsync('estlem_token');
          await SecureStore.deleteItemAsync('estlem_refresh_token');
        }
      }
    }
    return Promise.reject(err);
  },
);
