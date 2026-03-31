import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const authHeader = err.config?.headers?.Authorization || err.config?.headers?.authorization;
    const url = String(err.config?.url || '');
    // These routes legitimately return 401 (wrong password, wrong security answer, etc.)
    const isAuthPublic =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/security-question') ||
      url.includes('/auth/reset-password');
    if (status === 401 && authHeader && !isAuthPublic) {
      localStorage.removeItem('token');
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path && !path.startsWith('/login') && !path.startsWith('/register')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

