import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const getAdminToken = () => localStorage.getItem('admin-token');

const adminApi = axios.create({ baseURL: BASE_URL });

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin-token');
      window.location.href = '/government/login';
    }
    return Promise.reject(err);
  }
);

// AUTH
export const adminAuthApi = {
  login: (data) => axios.post(`${BASE_URL}/auth/login`, data),
  getMe: () => adminApi.get('/auth/me'),
};

// DASHBOARD
export const dashboardApi = {
  getStats: () => adminApi.get('/admin/stats'),
  getRecentComplaints: () => adminApi.get('/admin/complaints?limit=6&sort=-createdAt'),
};

// COMPLAINTS
export const complaintsAdminApi = {
  getAll: (params) => adminApi.get('/admin/complaints', { params }),
  getById: (id) => adminApi.get(`/admin/complaints/${id}`),
  update: (id, data) => adminApi.patch(`/admin/complaints/${id}`, data),
  delete: (id) => adminApi.delete(`/admin/complaints/${id}`),
  approveResolution: (id) => adminApi.patch(`/admin/complaints/${id}/approve-resolution`),
  rejectResolution: (id, data) => adminApi.patch(`/admin/complaints/${id}/reject-resolution`, data),
};

// DEPARTMENTS
export const departmentsAdminApi = {
  getAll: () => adminApi.get('/admin/departments'),
  getById: (id) => adminApi.get(`/admin/departments/${id}`),
  create: (data) => adminApi.post('/admin/departments', data),
  update: (id, data) => adminApi.put(`/admin/departments/${id}`, data),
};

// WORKERS
export const workersAdminApi = {
  getAll: (params) => adminApi.get('/admin/workers', { params }),
  create: (data) => adminApi.post('/admin/workers', data),
  update: (id, data) => adminApi.put(`/admin/workers/${id}`, data),
  delete: (id) => adminApi.delete(`/admin/workers/${id}`),
};

// USERS
export const usersAdminApi = {
  getAll: (params) => adminApi.get('/admin/users', { params }),
  getById: (id) => adminApi.get(`/admin/users/${id}`),
};

// NOTIFICATIONS
export const notificationsAdminApi = {
  getAll: () => adminApi.get('/admin/notifications'),
  markRead: (id) => adminApi.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => adminApi.patch('/admin/notifications/read-all'),
};

// ANALYTICS
export const analyticsAdminApi = {
  getData: () => adminApi.get('/admin/analytics'),
};

// MAP
export const mapAdminApi = {
  getComplaints: () => adminApi.get('/admin/map-complaints'),
};

// AI DECISION SUPPORT & PRIORITIZATION
export const decisionSupportAdminApi = {
  calculate: (complaintId) => adminApi.post(`/decision-support/calculate/${complaintId}`),
  recalculate: () => adminApi.post('/decision-support/recalculate'),
  getActionCenter: () => adminApi.get('/decision-support/action-center'),
  getTopPriority: () => adminApi.get('/decision-support/top-priority'),
};

// AI PREDICTIVE CIVIC RISK & MUNICIPAL PLANNING
export const predictiveAdminApi = {
  getDashboard: () => adminApi.get('/predictive/dashboard'),
  getHotspots: (params) => adminApi.get('/predictive/hotspots', { params }),
  getCategoryTrends: (params) => adminApi.get('/predictive/category-trends', { params }),
  getDepartmentRisks: () => adminApi.get('/predictive/department-risks'),
  getEmergingIssues: () => adminApi.get('/predictive/emerging-issues'),
  getForecast: () => adminApi.get('/predictive/forecast'),
  recalculate: () => adminApi.post('/predictive/recalculate'),
};

// PHASE 7: SLA MONITORING & COMPLIANCE
export const slaAdminApi = {
  getDashboard: () => adminApi.get('/sla/dashboard'),
  getBreached: () => adminApi.get('/sla/breached'),
  getAtRisk: () => adminApi.get('/sla/at-risk'),
  recalculate: () => adminApi.post('/sla/recalculate'),
};

// PHASE 7: MUNICIPAL PERFORMANCE INTELLIGENCE & CITIZEN OUTCOME
export const performanceAdminApi = {
  getOverview: () => adminApi.get('/performance/overview'),
  getDepartments: () => adminApi.get('/performance/departments'),
  getWorkers: () => adminApi.get('/performance/workers'),
  getCategories: () => adminApi.get('/performance/categories'),
};

// PHASE 8: AI PREDICTIVE CIVIC PLANNING & PREVENTIVE GOVERNANCE
export const predictionsAdminApi = {
  getOverview: () => adminApi.get('/predictions/overview'),
  getHotspots: (params) => adminApi.get('/predictions/hotspots', { params }),
  getForecast: (params) => adminApi.get('/predictions/forecast', { params }),
  getDepartments: () => adminApi.get('/predictions/departments'),
  getPreventiveActions: () => adminApi.get('/predictions/preventive-actions'),
  updateActionStatus: (id, status) => adminApi.patch(`/predictions/preventive-actions/${id}/status`, { status }),
  getWarnings: () => adminApi.get('/predictions/warnings'),
  acknowledgeWarning: (id) => adminApi.patch(`/predictions/warnings/${id}/acknowledge`),
  simulate: (data) => adminApi.post('/predictions/simulate', data),
  recalculate: () => adminApi.post('/predictions/recalculate'),
};

// PHASE 9: AI GOVERNANCE COMMAND CENTER & AUTONOMOUS CIVIC RESPONSE
export const governanceAdminApi = {
  getOverview: () => adminApi.get('/governance/overview'),
  getIncidents: (params) => adminApi.get('/governance/incidents', { params }),
  getIncidentById: (id) => adminApi.get(`/governance/incidents/${id}`),
  recalculate: () => adminApi.post('/governance/recalculate'),
  acknowledgeIncident: (id) => adminApi.post(`/governance/incidents/${id}/acknowledge`),
  createActionPlan: (id, data) => adminApi.post(`/governance/incidents/${id}/action-plan`, data),
  dispatchIncident: (id, data) => adminApi.post(`/governance/incidents/${id}/dispatch`, data),
  closeIncident: (id, data) => adminApi.post(`/governance/incidents/${id}/close`, data),
  getActionCenter: () => adminApi.get('/governance/action-center'),
  getExecutiveReport: () => adminApi.get('/governance/executive-report'),
};

export default adminApi;
