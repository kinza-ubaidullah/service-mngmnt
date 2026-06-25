import axios from 'axios';
import { resolveApiUrl } from '../utils/apiConfig';

const api = axios.create({
  baseURL: resolveApiUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    if (status === 401) {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      const onLogin = typeof window !== 'undefined' && window.location.pathname.startsWith('/login');
      const isAuthBootstrap = url.includes('/auth/me');
      if (!onLogin && !isAuthBootstrap) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
