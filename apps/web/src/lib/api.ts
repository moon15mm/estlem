import axios from 'axios';

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('estlem_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('estlem_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            { refreshToken },
          );
          const { accessToken } = res.data.data;
          localStorage.setItem('estlem_access_token', accessToken);
          err.config.headers.Authorization = `Bearer ${accessToken}`;
          return api.request(err.config);
        } catch {
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(err);
  },
);
