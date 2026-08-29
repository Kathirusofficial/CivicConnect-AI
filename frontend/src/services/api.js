import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civicconnect-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = "An unexpected error occurred.";
    if (error.response) {
      // If 401 on protected requests (not /auth/login or /auth/register)
      const isAuthUrl = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (error.response.status === 401 && !isAuthUrl) {
        localStorage.removeItem('civicconnect-token');
        localStorage.removeItem('civicconnect-user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
      errorMessage = error.response.data?.message || error.response.data?.error || "Server Error";
    } else if (error.request) {
      errorMessage = "Network Error - Backend server is unreachable at http://localhost:5000.";
    } else {
      errorMessage = error.message;
    }
    
    // Create an error object with response data attached
    const customError = new Error(errorMessage);
    customError.response = error.response;
    customError.status = error.response?.status;
    return Promise.reject(customError);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data),
  uploadAvatar: (formData) => api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const complaintAPI = {
  getAll: () => api.get('/complaints'),
  getMyComplaints: () => api.get('/complaints/my'),
  getById: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data),
  update: (id, data) => api.put(`/complaints/${id}`, data),
  delete: (id) => api.delete(`/complaints/${id}`),
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const aiAPI = {
  classifyComplaint: (data) => api.post('/ai/classify-complaint', data),
  checkDuplicate: (data) => api.post('/ai/check-duplicate', data),
};

export const feedbackAPI = {
  submitFeedback: (complaintId, data) => api.post(`/feedback/${complaintId}`, data),
  getFeedback: (complaintId) => api.get(`/feedback/${complaintId}`),
};

export default api;
