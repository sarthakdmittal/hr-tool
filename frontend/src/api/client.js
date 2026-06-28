import axios from 'axios';

// In production (Vercel) VITE_API_URL = https://your-app.onrender.com
// In local dev the Vite proxy rewrites /api → http://localhost:5000/api
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    // Only clear session for genuine auth failures (token invalid/expired/missing)
    // Do NOT clear on 503 (server/DB unavailable) — that would wrongly log the user out
    if (err.response?.status === 401) {
      const msg = err.response?.data?.error || '';
      const isAuthError = msg.includes('token') || msg.includes('Token') || msg.includes('No token');
      if (isAuthError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
