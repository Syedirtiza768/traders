import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Frappe-CSRF-Token': getCsrfToken(),
  },
});

function getCsrfToken(): string {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='));
  return cookie ? cookie.split('=')[1] : '';
}

// Request interceptor to update CSRF token
api.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-Frappe-CSRF-Token'] = token;
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      // Redirect to login if session expired
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ AUTH API ============

export const authApi = {
  login: (usr: string, pwd: string) =>
    api.post('/method/login', { usr, pwd }),

  logout: () =>
    api.post('/method/logout'),

  getLoggedUser: () =>
    api.get('/method/frappe.auth.get_logged_user'),
};

// ============ DASHBOARD API ============

export const dashboardApi = {
  getKPIs: () =>
    api.get('/method/trader_app.api.dashboard.get_dashboard_kpis'),

  getSalesTrend: () =>
    api.get('/method/trader_app.api.dashboard.get_sales_trend'),

  getTopCustomers: (limit = 10) =>
    api.get(`/method/trader_app.api.dashboard.get_top_customers?limit=${limit}`),

  getRecentOrders: (limit = 20) =>
    api.get(`/method/trader_app.api.dashboard.get_recent_orders?limit=${limit}`),

  getSalesByItemGroup: () =>
    api.get('/method/trader_app.api.dashboard.get_sales_by_item_group'),

  getCashFlowSummary: () =>
    api.get('/method/trader_app.api.dashboard.get_cash_flow_summary'),
};

// ============ RESOURCE API ============

interface ListParams {
  doctype: string;
  fields?: string[];
  filters?: Record<string, any>[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export const resourceApi = {
  list: ({ doctype, fields, filters, orderBy, limit = 20, offset = 0 }: ListParams) => {
    const params = new URLSearchParams();
    if (fields) params.set('fields', JSON.stringify(fields));
    if (filters) params.set('filters', JSON.stringify(filters));
    if (orderBy) params.set('order_by', orderBy);
    params.set('limit_page_length', String(limit));
    params.set('limit_start', String(offset));
    return api.get(`/resource/${doctype}?${params.toString()}`);
  },

  get: (doctype: string, name: string) =>
    api.get(`/resource/${doctype}/${name}`),

  create: (doctype: string, data: Record<string, any>) =>
    api.post(`/resource/${doctype}`, data),

  update: (doctype: string, name: string, data: Record<string, any>) =>
    api.put(`/resource/${doctype}/${name}`, data),

  delete: (doctype: string, name: string) =>
    api.delete(`/resource/${doctype}/${name}`),

  count: (doctype: string, filters?: Record<string, any>[]) => {
    const params = new URLSearchParams();
    if (filters) params.set('filters', JSON.stringify(filters));
    return api.get(`/method/frappe.client.get_count?doctype=${doctype}&${params.toString()}`);
  },
};

// ============ INVENTORY API ============

export const inventoryApi = {
  getStockSummary: (warehouse?: string) => {
    const params = warehouse ? `?warehouse=${warehouse}` : '';
    return api.get(`/method/trader_app.api.inventory.get_stock_summary${params}`);
  },

  getLowStockItems: (limit = 50) =>
    api.get(`/method/trader_app.api.inventory.get_low_stock_items?limit=${limit}`),

  getWarehouseStock: (warehouse: string) =>
    api.get(`/method/trader_app.api.inventory.get_warehouse_stock?warehouse=${warehouse}`),
};

// ============ REPORTS API ============

export const reportsApi = {
  getAccountsReceivable: (limit = 50) =>
    api.get(`/method/trader_app.api.reports.get_accounts_receivable?limit=${limit}`),

  getAccountsPayable: (limit = 50) =>
    api.get(`/method/trader_app.api.reports.get_accounts_payable?limit=${limit}`),

  getProfitAndLoss: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    return api.get(`/method/trader_app.api.reports.get_profit_and_loss?${params.toString()}`);
  },

  getReceivableAgingSummary: () =>
    api.get('/method/trader_app.api.reports.get_receivable_aging_summary'),

  getMonthlySalesReport: (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return api.get(`/method/trader_app.api.reports.get_monthly_sales_report${params}`);
  },

  getSupplierBalances: (limit = 50) =>
    api.get(`/method/trader_app.api.reports.get_supplier_balances?limit=${limit}`),
};

export default api;
