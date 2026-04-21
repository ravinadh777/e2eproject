// frontend/src/utils/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '';

const createClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({ baseURL, timeout: 30000 });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          try {
            const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken: refresh });
            localStorage.setItem('access_token', data.accessToken);
            localStorage.setItem('refresh_token', data.refreshToken);
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${data.accessToken}`;
              return client(error.config);
            }
          } catch {
            localStorage.clear();
            window.location.href = '/login';
          }
        } else {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
  return client;
};

export const authAPI      = createClient(`${API_BASE}/api/auth`);
export const workspaceAPI = createClient(`${API_BASE}/api/workspace`);
export const aiAPI        = createClient(`${API_BASE}/api/ai`);
export const billingAPI   = createClient(`${API_BASE}/api/billing`);
export const analyticsAPI = createClient(`${API_BASE}/api/analytics`);
export const notifyAPI    = createClient(`${API_BASE}/api/notify`);

// Typed API helpers
export const api = {
  auth: {
    login:    (email: string, password: string) => authAPI.post('/login', { email, password }),
    register: (data: { email: string; password: string; name: string }) => authAPI.post('/register', data),
    logout:   (refreshToken: string) => authAPI.post('/logout', { refreshToken }),
    me:       () => authAPI.get('/me'),
    resetPasswordRequest: (email: string) => authAPI.post('/password/reset-request', { email }),
    resetPassword: (token: string, newPassword: string) => authAPI.post('/password/reset', { token, newPassword }),
  },
  workspace: {
    list:   ()         => workspaceAPI.get('/'),
    create: (data: any) => workspaceAPI.post('/', data),
    get:    (id: string) => workspaceAPI.get(`/${id}`),
    update: (id: string, data: any) => workspaceAPI.put(`/${id}`, data),
    invite: (id: string, email: string, role: string) => workspaceAPI.post(`/${id}/invite`, { email, role }),
    members:(id: string) => workspaceAPI.get(`/${id}/members`),
  },
  documents: {
    list:   (wsId: string) => workspaceAPI.get(`/${wsId}/documents`),
    upload: (wsId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return workspaceAPI.post(`/${wsId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    get:    (wsId: string, docId: string) => workspaceAPI.get(`/${wsId}/documents/${docId}`),
    delete: (wsId: string, docId: string) => workspaceAPI.delete(`/${wsId}/documents/${docId}`),
  },
  ai: {
    chat:              (data: any) => aiAPI.post('/chat', data),
    listConversations: (workspaceId?: string) => aiAPI.get('/conversations', { params: { workspaceId } }),
    getConversation:   (id: string) => aiAPI.get(`/conversations/${id}`),
    getUsage:          () => aiAPI.get('/usage'),
    suggestPrompts:    (documentContent: string) => aiAPI.post('/suggest-prompts', { documentContent }),
  },
  billing: {
    getPlans:      ()     => billingAPI.get('/plans'),
    getSubscription: (wsId: string) => billingAPI.get(`/${wsId}`),
    changePlan:    (wsId: string, plan: string) => billingAPI.post(`/${wsId}/change-plan`, { plan }),
    listInvoices:  (wsId: string) => billingAPI.get(`/${wsId}/invoices`),
    cancel:        (wsId: string) => billingAPI.post(`/${wsId}/cancel`),
  },
  analytics: {
    dashboard:          () => analyticsAPI.get('/dashboard'),
    workspaceDashboard: (wsId: string, days = 30) => analyticsAPI.get(`/workspace/${wsId}?days=${days}`),
    apiStats:           (wsId?: string) => analyticsAPI.get('/api-stats', { params: { workspaceId: wsId } }),
  },
};
