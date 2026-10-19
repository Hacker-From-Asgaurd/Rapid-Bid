import axios from 'axios';

const envApiUrl = import.meta.env.VITE_API_URL;
const rawApiUrl = envApiUrl || (import.meta.env.PROD ? '/api' : 'http://localhost:8000');
const API_BASE = rawApiUrl === '/api' || rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('dqp_token') || localStorage.getItem('damper_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for 401 logout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('dqp_token');
      localStorage.removeItem('dqp_user');
      localStorage.removeItem('damper_token');
      localStorage.removeItem('damper_user');
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authApi = {
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  changePassword: async (current_password, new_password) => {
    const res = await apiClient.post('/auth/change-password', {
      current_password,
      new_password,
    });
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('dqp_token');
    localStorage.removeItem('dqp_user');
    localStorage.removeItem('damper_token');
    localStorage.removeItem('damper_user');
  },
};

// Dashboard Service
export const dashboardApi = {
  getSummary: async () => {
    const res = await apiClient.get('/dashboard/summary');
    return res.data;
  },
};

// Quotes Service
export const quotesApi = {
  calculate: async (payload) => {
    const res = await apiClient.post('/quotes/calculate', payload);
    return res.data;
  },
  saveQuote: async (payload) => {
    const res = await apiClient.post('/quotes', payload);
    return res.data;
  },
  list: async (params = {}) => {
    const res = await apiClient.get('/quotes', { params });
    return res.data;
  },
  getDetail: async (quoteId) => {
    const res = await apiClient.get(`/quotes/${quoteId}`);
    return res.data;
  },
  revise: async (quoteId, payload) => {
    const res = await apiClient.post(`/quotes/${quoteId}/revise`, payload);
    return res.data;
  },
  getRevisions: async (quoteId) => {
    const res = await apiClient.get(`/quotes/${quoteId}/revisions`);
    return res.data;
  },
  restoreRevision: async (quoteId, revisionId) => {
    const res = await apiClient.post(`/quotes/${quoteId}/revisions/${revisionId}/restore`);
    return res.data;
  },
  duplicate: async (quoteId) => {
    const res = await apiClient.post(`/quotes/${quoteId}/duplicate`);
    return res.data;
  },
  changeStatus: async (quoteId, status, confirmStale = false, comment = null) => {
    const res = await apiClient.patch(`/quotes/${quoteId}/status`, { status, confirm_stale: confirmStale, comment });
    return res.data;
  },
  submitApproval: async (quoteId) => {
    const res = await apiClient.post(`/quotes/${quoteId}/submit-approval`);
    return res.data;
  },
  approve: async (quoteId, comment = '') => {
    const res = await apiClient.post(`/quotes/${quoteId}/approve`, { status: 'Approved', comment });
    return res.data;
  },
  reject: async (quoteId, comment = '') => {
    const res = await apiClient.post(`/quotes/${quoteId}/reject`, { status: 'Draft', comment });
    return res.data;
  },
  getPendingApprovalsCount: async () => {
    const res = await apiClient.get('/quotes/approvals/pending-count');
    return res.data;
  },
  getImpactMetrics: async () => {
    const res = await apiClient.get('/quotes/impact');
    return res.data;
  },
  parseRfq: async (text) => {
    const res = await apiClient.post('/quotes/rfq/parse', { text });
    return res.data;
  },
  getRfqSamples: async () => {
    const res = await apiClient.get('/quotes/rfq/samples');
    return res.data;
  },
  deleteDraft: async (quoteId) => {
    const res = await apiClient.delete(`/quotes/${quoteId}`);
    return res.data;
  },
  getSettings: async () => {
    const res = await apiClient.get('/company-settings');
    return res.data;
  },
  getActiveRates: async () => {
    const res = await apiClient.get('/rates/active');
    return res.data;
  },
  downloadCustomerPdf: (quoteIdOrData) => {
    if (typeof quoteIdOrData === 'object' && quoteIdOrData !== null) {
      return apiClient.post('/quotes/export-pdf?type=customer', quoteIdOrData, { responseType: 'blob' }).then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        const qNum = quoteIdOrData.quote_number || 'Quotation';
        link.setAttribute('download', `${qNum}_Customer.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    }
    return apiClient.get(`/quotes/${quoteIdOrData}/customer-pdf`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quote_${quoteIdOrData}_Customer.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },
  downloadCostSheetPdf: (quoteIdOrData) => {
    if (typeof quoteIdOrData === 'object' && quoteIdOrData !== null) {
      return apiClient.post('/quotes/export-pdf?type=cost_sheet', quoteIdOrData, { responseType: 'blob' }).then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        const qNum = quoteIdOrData.quote_number || 'CostSheet';
        link.setAttribute('download', `${qNum}_CostSheet.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    }
    return apiClient.get(`/quotes/${quoteIdOrData}/cost-sheet-pdf`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quote_${quoteIdOrData}_CostSheet.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },
  downloadPdf: (quoteIdOrData, type = 'customer') => {
    if (type === 'cost_sheet') {
      return quotesApi.downloadCostSheetPdf(quoteIdOrData);
    }
    return quotesApi.downloadCustomerPdf(quoteIdOrData);
  },
  downloadExcel: (quoteIdOrData, isAdmin = false) => {
    if (typeof quoteIdOrData === 'object' && quoteIdOrData !== null) {
      const payload = {
        ...quoteIdOrData,
        is_admin: quoteIdOrData.is_admin !== undefined ? quoteIdOrData.is_admin : isAdmin,
      };
      return apiClient.post('/quotes/export-excel', payload, { responseType: 'blob' }).then((res) => {
        const url = window.URL.createObjectURL(
          new Blob([res.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
        );
        const link = document.createElement('a');
        link.href = url;
        const qNum = quoteIdOrData.quote_number || 'Live_CostSheet';
        link.setAttribute('download', `CostSheet_${qNum}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    }
    return apiClient.get(`/quotes/${quoteIdOrData}/excel?is_admin=${isAdmin}`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CostSheet_${quoteIdOrData}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },
};

export const demoApi = {
  loadDemoData: async () => {
    const res = await apiClient.post('/demo/load');
    return res.data;
  },
};

// Rates Service
export const ratesApi = {
  getCurrentRates: async () => {
    const res = await apiClient.get('/rates/current');
    return res.data;
  },
  updateRates: async (payload) => {
    const res = await apiClient.post('/rates/update', payload);
    return res.data;
  },
  getHistory: async () => {
    const res = await apiClient.get('/rates/history');
    return res.data;
  },
  simulateWhatIf: async (payload) => {
    const res = await apiClient.post('/rates/what-if', payload);
    return res.data;
  },
  exportRates: (format = 'csv') => {
    return apiClient.get(`/rates/export/${format}`, { responseType: 'blob' }).then((res) => {
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const type =
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv';
      const url = window.URL.createObjectURL(new Blob([res.data], { type }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DamperQuotePro_Rates_Export.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },
  previewImport: async (formData) => {
    const res = await apiClient.post('/rates/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  confirmImport: async (formData) => {
    const res = await apiClient.post('/rates/import/confirm', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

// Company Settings Service
export const companySettingsApi = {
  getSettings: async () => {
    const res = await apiClient.get('/company-settings');
    return res.data;
  },
  updateSettings: async (payload) => {
    const res = await apiClient.put('/company-settings', payload);
    return res.data;
  },
};

export const damperAdminApi = {
  getSizeLimits: async () => (await apiClient.get('/admin/size-limits')).data,
  getScalingRules: async () => (await apiClient.get('/admin/scaling-rules')).data,
  previewScaling: async (payload) => (await apiClient.post('/admin/scaling-rules/preview', payload)).data,
  getVerifiedSizes: async () => (await apiClient.get('/admin/verified-sizes')).data,
};

// Multi-Blade Admin API
export const multiBladeApi = {
  getRuleTables: async () => (await apiClient.get('/admin/multi-blade/rule-tables')).data,
  updateRuleTable: async (tableName, payload) => (await apiClient.put(`/admin/multi-blade/rule-tables/${tableName}`, payload)).data,
  toggleVerify: async (verified) => (await apiClient.post(`/admin/multi-blade/verify-toggle?verified=${verified}`)).data,
  getChecklist: async () => (await apiClient.get('/admin/multi-blade/checklist')).data,
  updateChecklistItem: async (itemKey, payload) => (await apiClient.put(`/admin/multi-blade/checklist/${itemKey}`, payload)).data,
  getRates: async () => (await apiClient.get('/admin/multi-blade/rates')).data,
  updateRates: async (payload) => (await apiClient.put('/admin/multi-blade/rates', payload)).data,
  previewImport: async (tableName, formData) => (await apiClient.post(`/admin/multi-blade/rule-tables/import/preview?table_name=${tableName}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
};

export default apiClient;

