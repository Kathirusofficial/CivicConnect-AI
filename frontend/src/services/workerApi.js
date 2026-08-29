import axios from 'axios';
import { useWorkerAuthStore } from '../store/workerAuthStore';

const workerClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Worker token to outgoing requests
workerClient.interceptors.request.use((config) => {
  const { workerToken } = useWorkerAuthStore.getState();
  if (workerToken) {
    config.headers.Authorization = `Bearer ${workerToken}`;
  }
  return config;
});

// Auto handle 401 unauth
workerClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useWorkerAuthStore.getState().workerLogout();
    }
    return Promise.reject(error);
  }
);

export const workerApi = {
  // Auth
  login: (credentials) => workerClient.post('/auth/worker-login', credentials),

  // Dashboard & Tasks
  getDashboard: () => workerClient.get('/worker/dashboard'),
  getTasks: (params) => workerClient.get('/worker/tasks', { params }),
  getTaskById: (id) => workerClient.get(`/worker/tasks/${id}`),

  // Lifecycle transitions
  acceptTask: (id) => workerClient.patch(`/worker/tasks/${id}/accept`),
  startTask: (id) => workerClient.patch(`/worker/tasks/${id}/start`),
  uploadEvidence: (id, data) => workerClient.post(`/worker/tasks/${id}/evidence`, data),
  submitResolution: (id, data) => workerClient.patch(`/worker/tasks/${id}/submit-resolution`, data),

  // History & Profile
  getHistory: () => workerClient.get('/worker/history'),
  getProfile: () => workerClient.get('/worker/profile')
};
