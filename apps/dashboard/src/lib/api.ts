import axios from 'axios';

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('estlem_staff_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => Promise.reject(err),
);
