import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const dashboard = () => api.get('/dashboard').then(r => r.data.data);
export const getAccounts = () => api.get('/accounts').then(r => r.data.data);
export const getAccount  = (id: string) => api.get(`/accounts/${id}`).then(r => r.data.data);
export const getResources = (params?: Record<string,string>) => api.get('/resources', { params }).then(r => r.data.data);
export const getResource  = (id: string) => api.get(`/resources/${id}`).then(r => r.data.data);
export const getBillingTrend = (hours = 48) => api.get('/billing/trend', { params: { hours } }).then(r => r.data.data);
export const getDeployments  = () => api.get('/deployments').then(r => r.data.data);
export const getDeployment   = (id: string) => api.get(`/deployments/${id}`).then(r => r.data.data);
export const getWorkloads    = (params?: Record<string,string>) => api.get('/workloads', { params }).then(r => r.data.data);
export const getWorkloadSummary = () => api.get('/workloads/summary').then(r => r.data.data);
export const getAnomalies = (params?: Record<string,string>) => api.get('/anomalies', { params }).then(r => r.data.data);
export const getAnomaly   = (id: string) => api.get(`/anomalies/${id}`).then(r => r.data.data);
export const updateAnomalyStatus = (id: string, status: string, reason?: string) => api.patch(`/anomalies/${id}/status`, { status, reason }).then(r => r.data.data);
export const getAlerts = () => api.get('/alerts').then(r => r.data.data);
export const acknowledgeAlert = (id: string) => api.patch(`/alerts/${id}/acknowledge`).then(r => r.data.data);
export const getAudit  = (params?: Record<string,string>) => api.get('/audit', { params }).then(r => r.data.data);
export const getChangeRequests = () => api.get('/change-requests').then(r => r.data.data);
export const getChangeRequest  = (id: string) => api.get(`/change-requests/${id}`).then(r => r.data.data);
export const createChangeRequest = (data: object) => api.post('/change-requests', data).then(r => r.data.data);
export const approveChangeRequest = (id: string, data: object) => api.patch(`/change-requests/${id}/approve`, data).then(r => r.data.data);
export const rejectChangeRequest  = (id: string, data: object) => api.patch(`/change-requests/${id}/reject`, data).then(r => r.data.data);
export const getRollbacks = () => api.get('/rollbacks').then(r => r.data.data);
export const executeRollback = (data: object) => api.post('/rollbacks', data).then(r => r.data.data);
export const getExperiments   = () => api.get('/experiments').then(r => r.data.data);
export const getFailureCases  = () => api.get('/experiments/failure-cases').then(r => r.data.data);
export const getFeedback       = () => api.get('/feedback').then(r => r.data.data);
export const submitFeedback    = (data: object) => api.post('/feedback', data).then(r => r.data.data);
export const getSimStatus      = () => api.get('/simulation/status').then(r => r.data.data);
export const startMonitoring   = () => api.post('/simulation/start').then(r => r.data.data);
export const pauseMonitoring   = () => api.post('/simulation/pause').then(r => r.data.data);
export const resetSimulation   = () => api.post('/simulation/reset').then(r => r.data.data);
export const triggerAnomaly    = (data?: object) => api.post('/simulation/trigger-anomaly', data || {}).then(r => r.data.data);
export const getSettings       = () => api.get('/settings').then(r => r.data.data);
export const updateSettings    = (data: object) => api.patch('/settings', data).then(r => r.data.data);
