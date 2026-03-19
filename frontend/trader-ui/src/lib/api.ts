/**
 * Trader App — API Client
 *
 * Axios-based wrapper around the Frappe / ERPNext REST API.
 * All backend calls go through this module so every page can stay thin.
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

// ─── Axios Instance ──────────────────────────────────────────────

const http: AxiosInstance = axios.create({
  baseURL: '/',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Inject a fresh CSRF token on every outgoing request
http.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-Frappe-CSRF-Token'] = token;
  }
  return config;
});

// On 403, refresh token and retry once
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403) {
      const token = getCsrfToken();
      if (token) {
        err.config.headers['X-Frappe-CSRF-Token'] = token;
        return http.request(err.config);
      }
    }
    return Promise.reject(err);
  },
);

function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('csrf_token='))
      ?.split('=')[1] || ''
  );
}

// ─── Generic Frappe call helper ──────────────────────────────────

function call<T = any>(method: string, params?: Record<string, any>): Promise<AxiosResponse<{ message: T }>> {
  return http.post('/api/method/' + method, params);
}

function get<T = any>(method: string, params?: Record<string, any>): Promise<AxiosResponse<{ message: T }>> {
  return http.get('/api/method/' + method, { params });
}

function read<T = any>(method: string, params?: Record<string, any>): Promise<AxiosResponse<{ message: T }>> {
  return get(method, params);
}

// ─── Auth API ────────────────────────────────────────────────────

export const authApi = {
  login: (usr: string, pwd: string) =>
    http.post('/api/method/login', { usr, pwd }),

  logout: () =>
    http.get('/api/method/logout'),

  getLoggedUser: () =>
    http.post('/api/method/trader_app.api.settings.get_current_user_roles'),
};

// ─── Dashboard API ───────────────────────────────────────────────

export const dashboardApi = {
  getKPIs: (company?: string) =>
    read('trader_app.api.dashboard.get_kpis', { company }),

  getSalesTrend: (company?: string, months?: number) =>
    read('trader_app.api.dashboard.get_sales_trend', { company, months }),

  getTopCustomers: (limit?: number, company?: string) =>
    read('trader_app.api.dashboard.get_top_customers', { company, limit }),

  getRecentOrders: (limit?: number, company?: string) =>
    read('trader_app.api.dashboard.get_recent_orders', { company, limit }),

  getCashFlowSummary: (company?: string, months?: number) =>
    read('trader_app.api.dashboard.get_cash_flow_summary', { company, months }),

  getInventorySummary: (company?: string) =>
    read('trader_app.api.dashboard.get_inventory_summary', { company }),
};

// ─── Sales API ───────────────────────────────────────────────────

export const salesApi = {
  getInvoices: (params?: Record<string, any>) =>
    read('trader_app.api.sales.get_sales_invoices', params),

  getInvoiceDetail: (name: string) =>
    read('trader_app.api.sales.get_sales_invoice_detail', { name }),

  getQuotations: (params?: Record<string, any>) =>
    read('trader_app.api.sales.get_quotations', params),

  getQuotationDetail: (name: string) =>
    read('trader_app.api.sales.get_quotation_detail', { name }),

  getOrders: (params?: Record<string, any>) =>
    read('trader_app.api.sales.get_sales_orders', params),

  getOrderDetail: (name: string) =>
    read('trader_app.api.sales.get_sales_order_detail', { name }),

  createOrder: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_sales_order', data),

  submitOrder: (name: string) =>
    call('trader_app.api.sales.submit_sales_order', { name }),

  createInvoice: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_sales_invoice', data),

  createReturnInvoice: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_sales_invoice', {
      ...data,
      is_return: 1,
      update_stock: 1,
    }),

  submitInvoice: (name: string) =>
    call('trader_app.api.sales.submit_sales_invoice', { name }),

  cancelInvoice: (name: string) =>
    call('trader_app.api.sales.cancel_sales_invoice', { name }),

  cancelOrder: (name: string) =>
    call('trader_app.api.sales.cancel_sales_order', { name }),

  createQuotation: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_quotation', data),

  submitQuotation: (name: string) =>
    call('trader_app.api.sales.submit_quotation', { name }),

  getSummary: (company?: string) =>
    read('trader_app.api.sales.get_sales_summary', { company }),
};

// ─── Purchases API ───────────────────────────────────────────────

export const purchasesApi = {
  getInvoices: (params?: Record<string, any>) =>
    read('trader_app.api.purchases.get_purchase_invoices', params),

  getInvoiceDetail: (name: string) =>
    read('trader_app.api.purchases.get_purchase_invoice_detail', { name }),

  getOrders: (params?: Record<string, any>) =>
    read('trader_app.api.purchases.get_purchase_orders', params),

  getRequisitions: (params?: Record<string, any>) =>
    read('trader_app.api.purchases.get_material_requests', params),

  getRequisitionDetail: (name: string) =>
    read('trader_app.api.purchases.get_material_request_detail', { name }),

  getRfqs: (params?: Record<string, any>) =>
    read('trader_app.api.purchases.get_supplier_quotations', params),

  getRfqDetail: (name: string) =>
    read('trader_app.api.purchases.get_supplier_quotation_detail', { name }),

  getOrderDetail: (name: string) =>
    read('trader_app.api.purchases.get_purchase_order_detail', { name }),

  createOrder: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_purchase_order', data),

  createRequisition: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_material_request', data),

  createRfq: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_supplier_quotation', data),

  createOrderFromRfq: (name: string, data?: Record<string, any>) =>
    call('trader_app.api.purchases.create_purchase_order_from_supplier_quotation', { name, ...(data || {}) }),

  submitOrder: (name: string) =>
    call('trader_app.api.purchases.submit_purchase_order', { name }),

  submitRequisition: (name: string) =>
    call('trader_app.api.purchases.submit_material_request', { name }),

  submitRfq: (name: string) =>
    call('trader_app.api.purchases.submit_supplier_quotation', { name }),

  createInvoice: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_purchase_invoice', data),

  submitInvoice: (name: string) =>
    call('trader_app.api.purchases.submit_purchase_invoice', { name }),

  cancelInvoice: (name: string) =>
    call('trader_app.api.purchases.cancel_purchase_invoice', { name }),

  cancelOrder: (name: string) =>
    call('trader_app.api.purchases.cancel_purchase_order', { name }),

  getSummary: (company?: string) =>
    read('trader_app.api.purchases.get_purchase_summary', { company }),
};

// ─── Inventory API ───────────────────────────────────────────────

export const inventoryApi = {
  getStockBalance: (params?: Record<string, any>) =>
    read('trader_app.api.inventory.get_stock_balance', params),

  getStockLedger: (params?: Record<string, any>) =>
    read('trader_app.api.inventory.get_stock_ledger', params),

  getItems: (params?: Record<string, any>) =>
    read('trader_app.api.inventory.get_items', params),

  getWarehouses: (company?: string) =>
    read('trader_app.api.inventory.get_warehouses', { company }),

  getInventorySummary: (company?: string) =>
    read('trader_app.api.inventory.get_inventory_summary', { company }),

  getSummary: (company?: string) =>
    read('trader_app.api.inventory.get_inventory_summary', { company }),

  getLowStockItems: (params?: Record<string, any>) =>
    read('trader_app.api.inventory.get_low_stock_items', params),

  getItemGroups: () =>
    read('trader_app.api.inventory.get_item_groups'),

  getItemDetail: (item_code: string) =>
    read('trader_app.api.inventory.get_item_detail', { item_code }),

  createItem: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_item', data),

  updateItem: (data: Record<string, any>) =>
    call('trader_app.api.inventory.update_item', data),

  createStockEntry: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_stock_entry', data),

  createPurchaseReceipt: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_stock_entry', {
      purpose: 'Material Receipt',
      ...data,
    }),

  createSalesDispatch: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_stock_entry', {
      purpose: 'Material Issue',
      ...data,
    }),
};

// ─── Customers API ───────────────────────────────────────────────

export const customersApi = {
  getList: (params?: Record<string, any>) =>
    read('trader_app.api.customers.get_customers', params),

  getDetail: (name: string) =>
    read('trader_app.api.customers.get_customer_detail', { name }),

  getGroups: () =>
    read('trader_app.api.customers.get_customer_groups'),

  getTransactions: (customer: string, params?: Record<string, any>) =>
    read('trader_app.api.customers.get_customer_transactions', { customer, ...params }),

  create: (data: Record<string, any>) =>
    call('trader_app.api.customers.create_customer', data),

  update: (data: Record<string, any>) =>
    call('trader_app.api.customers.update_customer', data),

  disable: (name: string) =>
    call('trader_app.api.customers.disable_customer', { name }),

  enable: (name: string) =>
    call('trader_app.api.customers.enable_customer', { name }),
};

// ─── Suppliers API ───────────────────────────────────────────────

export const suppliersApi = {
  getList: (params?: Record<string, any>) =>
    read('trader_app.api.suppliers.get_suppliers', params),

  getDetail: (name: string) =>
    read('trader_app.api.suppliers.get_supplier_detail', { name }),

  getGroups: () =>
    read('trader_app.api.suppliers.get_supplier_groups'),

  getTransactions: (supplier: string, params?: Record<string, any>) =>
    read('trader_app.api.suppliers.get_supplier_transactions', { supplier, ...params }),

  create: (data: Record<string, any>) =>
    call('trader_app.api.suppliers.create_supplier', data),

  update: (data: Record<string, any>) =>
    call('trader_app.api.suppliers.update_supplier', data),

  disable: (name: string) =>
    call('trader_app.api.suppliers.disable_supplier', { name }),

  enable: (name: string) =>
    call('trader_app.api.suppliers.enable_supplier', { name }),
};

// ─── Settings API ────────────────────────────────────────────────

export const settingsApi = {
  get: () => read('trader_app.api.settings.get_settings'),

  save: (data: Record<string, any>) =>
    call('trader_app.api.settings.save_settings', { data }),
};

// ─── Finance API ─────────────────────────────────────────────────

export const financeApi = {
  getPaymentEntries: (params?: Record<string, any>) =>
    read('trader_app.api.finance.get_payment_entries', params),

  getPaymentEntryDetail: (name: string) =>
    read('trader_app.api.finance.get_payment_entry_detail', { name }),

  getPaymentEntrySetup: (company?: string) =>
    read('trader_app.api.finance.get_payment_entry_setup', { company }),

  getAccounts: (params?: Record<string, any>) =>
    read('trader_app.api.finance.get_accounts', params),

  createPaymentEntry: (data: Record<string, any>) =>
    call('trader_app.api.finance.create_payment_entry', data),

  submitPaymentEntry: (name: string) =>
    call('trader_app.api.finance.submit_payment_entry', { name }),

  cancelPaymentEntry: (name: string) =>
    call('trader_app.api.finance.cancel_payment_entry', { name }),

  getJournalEntries: (params?: Record<string, any>) =>
    read('trader_app.api.finance.get_journal_entries', params),

  getJournalEntryDetail: (name: string) =>
    read('trader_app.api.finance.get_journal_entry_detail', { name }),

  createJournalEntry: (data: Record<string, any>) =>
    call('trader_app.api.finance.create_journal_entry', data),

  submitJournalEntry: (name: string) =>
    call('trader_app.api.finance.submit_journal_entry', { name }),

  cancelJournalEntry: (name: string) =>
    call('trader_app.api.finance.cancel_journal_entry', { name }),

  getOutstandingSummary: (company?: string) =>
    read('trader_app.api.finance.get_outstanding_summary', { company }),
};
// ─── Bundling API ────────────────────────────────────────────

export const bundlingApi = {
  getBundles: (params?: Record<string, any>) =>
    read('trader_app.api.bundling.get_item_bundles', params),

  getBundleDetail: (name: string) =>
    read('trader_app.api.bundling.get_item_bundle_detail', { name }),

  createBundle: (data: Record<string, any>) =>
    call('trader_app.api.bundling.create_item_bundle', data),

  updateBundle: (data: Record<string, any>) =>
    call('trader_app.api.bundling.update_item_bundle', data),

  deleteBundle: (name: string) =>
    call('trader_app.api.bundling.delete_item_bundle', { name }),

  expandBundle: (name: string) =>
    read('trader_app.api.bundling.expand_bundle', { name }),
};

// ─── GST API ─────────────────────────────────────────────────

export const gstApi = {
  getSettings: (company?: string) =>
    read('trader_app.api.gst.get_gst_settings', { company }),

  saveSettings: (data: Record<string, any>) =>
    call('trader_app.api.gst.save_gst_settings', data),

  seedTemplates: (company?: string) =>
    call('trader_app.api.gst.seed_punjab_gst_templates', { company }),

  getTaxTemplates: (doctype?: string, company?: string) =>
    read('trader_app.api.gst.get_tax_templates', { doctype, company }),
};

// ─── Printing API ────────────────────────────────────────────

export const printApi = {
  getPrintData: (doctype: string, name: string, view_mode?: string, doc_format?: string) =>
    read('trader_app.api.printing.get_print_data', { doctype, name, view_mode, doc_format }),
};
// ─── Reports API ─────────────────────────────────────────────────

export const reportsApi = {
  getSalesReport: (params?: Record<string, any>) =>
    read('trader_app.api.reports.get_sales_report', params),

  getPurchaseReport: (params?: Record<string, any>) =>
    read('trader_app.api.reports.get_purchase_report', params),

  getItemSalesReport: (params?: Record<string, any>) =>
    read('trader_app.api.reports.get_item_sales_report', params),

  getCustomerLedger: (customer: string, params?: Record<string, any>) =>
    read('trader_app.api.reports.get_customer_ledger', { customer, ...params }),

  getSupplierLedger: (supplier: string, params?: Record<string, any>) =>
    read('trader_app.api.reports.get_supplier_ledger', { supplier, ...params }),

  getReceivableAgingSummary: () =>
    read('trader_app.api.reports.get_receivable_aging'),

  getReceivableAgingDetail: (params?: Record<string, any>) =>
    read('trader_app.api.reports.get_receivable_aging_detail', params),

  getAccountsPayable: () =>
    read('trader_app.api.reports.get_accounts_payable'),

  getProfitAndLoss: (params?: Record<string, any>) =>
    read('trader_app.api.reports.get_profit_and_loss', params),

  getGeneralLedger: (params?: Record<string, any>) =>
    read('trader_app.api.reports.get_general_ledger', params),
};

export default http;
