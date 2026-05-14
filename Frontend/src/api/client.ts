import axios from 'axios';

const API_URL = 'http://localhost:5172/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: {
    firstName: string;
    lastName: string;
    email: string;
    monthlyIncome: number;
  }) => api.put('/auth/profile', data),
  updatePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => api.put('/auth/password', data),
};

// ── Transactions ──────────────────────────────────────────────────────────────

export const transactionAPI = {
  getAll: () => api.get('/transactions'),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

// ── Budgets ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  alertThreshold: number;
  alertEnabled: boolean;
  percentUsed: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export const budgetsAPI = {
  getAll: () => api.get<Budget[]>('/budgets'),
  create: (data: {
    category: string;
    allocatedAmount: number;
    alertThreshold: number;
    alertEnabled: boolean;
  }) => api.post('/budgets', data),
  update: (id: string, data: {
    category: string;
    allocatedAmount: number;
    alertThreshold: number;
    alertEnabled: boolean;
  }) => api.put(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardAPI = {
  get: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year !== undefined) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    const query = params.toString();
    return api.get(`/dashboard${query ? '?' + query : ''}`);
  },
  getAvailableYears: () => api.get<number[]>('/dashboard/available-years'),
};

// ── Predictions ───────────────────────────────────────────────────────────────

export interface CategoryPrediction {
  category: string;
  predictedAmount: number;
  lastMonthAmount: number;
  twoMonthsAgoAmount: number;
  threeMonthsAgoAmount: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  dataPointsCount: number;
}

export interface PredictionsResponse {
  totalPredictedExpenses: number;
  totalLastMonthExpenses: number;
  categories: CategoryPrediction[];
}

export const predictionsAPI = {
  get: () => api.get<PredictionsResponse>('/predictions'),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface MonthlyData {
  year: number;
  month: number;
  monthName: string;
  income: number;
  expenses: number;
  netBalance: number;
  savingsRate: number;
}

export interface CategoryTrend {
  category: string;
  total: number;
  average: number;
  monthlyAmounts: number[];
}

export interface AnalyticsResponse {
  monthlyData: MonthlyData[];
  monthLabels: string[];
  categoryTrends: CategoryTrend[];
  totalIncome: number;
  totalExpenses: number;
  totalSaved: number;
  averageSavingsRate: number;
  bestMonth: string;
  worstMonth: string;
}

export const analyticsAPI = {
  get: (months: number = 12) =>
      api.get<AnalyticsResponse>(`/analytics?months=${months}`),
};

// ── Insights ──────────────────────────────────────────────────────────────────

export interface InsightItem {
  type: 'positive' | 'warning' | 'info' | 'anomaly';
  title: string;
  message: string;
}

export interface InsightsResponse {
  insights: InsightItem[];
  summary: string;
  generatedAt: string;
}

export const insightsAPI = {
  get: (months: number = 1) =>
      api.get<InsightsResponse>(`/insights?months=${months}`),
};