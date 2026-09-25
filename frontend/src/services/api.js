import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 = não autorizado → volta pro login
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    // Sem resposta do servidor → sistema caiu
    if (!err.response) {
      // Redireciona para a página de manutenção
      if (!window.location.pathname.includes('manutencao')) {
        window.location.href = '/manutencao.html';
      }
      return Promise.reject(err);
    }

    // Timeout também indica problema
    if (err.code === 'ECONNABORTED') {
      if (!window.location.pathname.includes('manutencao')) {
        window.location.href = '/manutencao.html';
      }
      return Promise.reject(err);
    }

    return Promise.reject(err);
  }
);

export const API_URL = api.defaults.baseURL;
export default api;