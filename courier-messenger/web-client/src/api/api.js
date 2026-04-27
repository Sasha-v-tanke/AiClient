import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Интерцептор — добавляем токен
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор — обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Chat API
export const chatAPI = {
  getAll: () => api.get('/chats'),
  getById: (chatId) => api.get(`/chats/${chatId}`),
  create: (data) => api.post('/chats', data),
};

// Message API
export const messageAPI = {
  getByChat: (chatId, page = 1) =>
    api.get(`/messages/${chatId}?page=${page}`),
  send: (chatId, data) => api.post(`/messages/${chatId}`, data),
  markRead: (messageId) => api.put(`/messages/${messageId}/read`),
};

// Order API
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  create: (data) => api.post('/orders', data),
  assign: (orderId, courierId) =>
    api.put(`/orders/${orderId}/assign`, { courierId }),
  updateStatus: (orderId, data) =>
    api.put(`/orders/${orderId}/status`, data),
  getHistory: (orderId) => api.get(`/orders/${orderId}/history`),
};

// User API
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  updateLocation: (data) => api.put('/users/location', data),
  getOnlineCouriers: () => api.get('/users/couriers/online'),
};

export default api;
