import axios from 'axios';

// Determine API base URL — always use the new VPS for any production domain
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return 'https://api.aljaroshi.tech';
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
}

const API_BASE = getApiBaseUrl();
console.log('[API] Using base URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 45000
    : 15000,
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
