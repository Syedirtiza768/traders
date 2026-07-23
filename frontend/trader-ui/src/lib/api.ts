/**
 * Trader App — API Client
 *
 * Axios-based wrapper around the Frappe / ERPNext REST API.
 * All backend calls go through this module so every page can stay thin.
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('csrf_token='))
      ?.split('=')[1] || ''
  );
}

// ─── Axios Instance ──────────────────────────────────────────────

const http: AxiosInstance = axios.create({
  baseURL: '/',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  config.headers.set('X-Frappe-CSRF-Token', getCsrfToken());
  return config;
});

// On every response, grab the latest CSRF token if returned
http.interceptors.response.use(
  (res) => res,
  (err) => {
    // Session expired — redirect to login
    if (err.response?.status === 401) {
      window.location.href = '/login';
      return Promise.reject(err);
    }
    // CSRF token mismatch — refresh & retry once
    if (err.response?.status === 403 && !err.config._retried) {
      const token = getCsrfToken();
      if (token) {
        err.config._retried = true;
        err.config.headers.set('X-Frappe-CSRF-Token', token);
        return http.request(err.config);
      }
    }
    return Promise.reject(err);
  },
);

/** SPA is served without Frappe Desk — ping once so Guest session + CSRF cookie exist before login. */
async function frappeGuestBootstrap(): Promise<void> {
  if (getCsrfToken()) return;
  await http.get('/api/method/ping');
}

// ─── Generic Frappe call helper ──────────────────────────────────

/** Strip keys whose value is undefined — Frappe serialises them as the
 *  literal string "undefined" which causes 400 BAD REQUEST errors. */
let activeCompanyGetter: () => string | undefined = () => undefined;

/** Register active company from companyStore (called at app init). */
export function registerActiveCompanyGetter(fn: () => string | undefined): void {
  activeCompanyGetter = fn;
}

function clean(obj?: Record<string, any>): Record<string, any> | undefined {
  if (!obj) return undefined;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const COMPANY_EXEMPT_METHODS = new Set([
  'trader_app.api.company.get_companies',
  'trader_app.api.company.get_active_company',
  'trader_app.api.company.set_active_company',
  'trader_app.api.settings.get_settings',
  'trader_app.api.settings.save_settings',
  'trader_app.api.settings.get_current_user_roles',
  'trader_app.api.settings.get_trader_roles',
  'trader_app.api.reports.get_consolidated_company_summary',
  'trader_app.api.currency.get_currency_options',
  'trader_app.api.currency.get_exchange_rate_for_date',
  'trader_app.api.currency.get_currency_settings',
  'trader_app.api.currency.save_currency_settings',
  'trader_app.api.currency.save_exchange_rate',
  'trader_app.api.currency.delete_exchange_rate',
  // Admin methods resolve company internally via resolve_active_company()
  'trader_app.api.admin.get_users',
  'trader_app.api.admin.get_user_detail',
  'trader_app.api.admin.create_user',
  'trader_app.api.admin.update_user',
  'trader_app.api.admin.set_user_enabled',
  'trader_app.api.admin.get_all_roles',
  'trader_app.api.admin.get_role_users',
  'trader_app.api.admin.assign_role_to_user',
  'trader_app.api.admin.remove_role_from_user',
  'trader_app.api.admin.get_company_settings',
  'trader_app.api.admin.save_company_settings',
  'trader_app.api.admin.get_fiscal_years',
  'trader_app.api.admin.create_fiscal_year',
  'trader_app.api.admin.set_active_fiscal_year',
  'trader_app.api.admin.get_warehouses',
  'trader_app.api.admin.create_warehouse',
  'trader_app.api.admin.update_warehouse',
  'trader_app.api.admin.get_accounting_settings',
  'trader_app.api.admin.save_accounting_settings',
  'trader_app.api.tenant.get_multitenant_status',
  'trader_app.api.tenant.get_tenant_config',
  'trader_app.api.tenant.get_business_tenant_audit_log',
  'trader_app.api.super_admin.get_tenant_dashboard',
  'trader_app.api.super_admin.list_tenants',
  'trader_app.api.super_admin.get_tenant_detail',
  'trader_app.api.super_admin.create_tenant',
  'trader_app.api.super_admin.update_tenant',
  'trader_app.api.super_admin.set_tenant_status',
  'trader_app.api.super_admin.set_tenant_modules',
  'trader_app.api.super_admin.set_tenant_branding',
  'trader_app.api.super_admin.get_tenant_audit_log',
]);

function withCompany(method: string, params?: Record<string, any>): Record<string, any> | undefined {
  const base = clean(params) || {};
  if (COMPANY_EXEMPT_METHODS.has(method)) return Object.keys(base).length ? base : undefined;
  if (base.company !== undefined && base.company !== null && base.company !== '') return base;
  const company = activeCompanyGetter();
  if (!company || !method.startsWith('trader_app.api.')) return Object.keys(base).length ? base : undefined;
  return { ...base, company };
}

function call<T = any>(method: string, params?: Record<string, any>): Promise<AxiosResponse<{ message: T }>> {
  return http.post('/api/method/' + method, withCompany(method, params));
}

function get<T = any>(method: string, params?: Record<string, any>): Promise<AxiosResponse<{ message: T }>> {
  return http.get('/api/method/' + method, { params: withCompany(method, params) });
}

// ─── Company API ─────────────────────────────────────────────────

export const companyApi = {
  getCompanies: () =>
    get('trader_app.api.company.get_companies'),

  getActive: () =>
    get('trader_app.api.company.get_active_company'),

  setActive: (company: string) =>
    call('trader_app.api.company.set_active_company', { company }),
};

// ─── Tenant API ──────────────────────────────────────────────────

export const tenantApi = {
  getStatus: () =>
    get('trader_app.api.tenant.get_multitenant_status'),

  getConfig: () =>
    get('trader_app.api.tenant.get_tenant_config'),

  getBusinessAuditLog: (params?: { page?: number; page_size?: number }) =>
    get('trader_app.api.tenant.get_business_tenant_audit_log', params),
};

// ─── Super Admin API ─────────────────────────────────────────────

export const superAdminApi = {
  getDashboard: () =>
    get('trader_app.api.super_admin.get_tenant_dashboard'),

  listTenants: (params?: { search?: string; status?: string; page?: number; page_size?: number }) =>
    get('trader_app.api.super_admin.list_tenants', params),

  getTenant: (tenant: string) =>
    get('trader_app.api.super_admin.get_tenant_detail', { tenant }),

  createTenant: (data: Record<string, unknown>) =>
    call('trader_app.api.super_admin.create_tenant', { data }),

  updateTenant: (tenant: string, data: Record<string, unknown>) =>
    call('trader_app.api.super_admin.update_tenant', { tenant, data }),

  setTenantStatus: (tenant: string, status: string) =>
    call('trader_app.api.super_admin.set_tenant_status', { tenant, status }),

  setTenantModules: (tenant: string, modules: string[]) =>
    call('trader_app.api.super_admin.set_tenant_modules', { tenant, modules }),

  setTenantBranding: (tenant: string, branding: Record<string, unknown>, logo?: string) =>
    call('trader_app.api.super_admin.set_tenant_branding', { tenant, branding, logo }),

  setTenantNavProfile: (tenant: string, profile: 'standard' | 'components_daybook') =>
    call('trader_app.api.super_admin.set_tenant_nav_profile', { tenant, profile }),

  getTenantAuditLog: (tenant: string, params?: { page?: number; page_size?: number }) =>
    get('trader_app.api.super_admin.get_tenant_audit_log', { tenant, ...params }),
};

// ─── Auth API ────────────────────────────────────────────────────

export const authApi = {
  login: async (usr: string, pwd: string) => {
    await frappeGuestBootstrap();
    return http.post('/api/method/login', { usr, pwd });
  },

  logout: () =>
    http.get('/api/method/logout'),

  getLoggedUser: () =>
    http.get('/api/method/frappe.auth.get_logged_user'),

  getRoles: () =>
    get('trader_app.api.settings.get_current_user_roles'),
};

// ─── Dashboard API ───────────────────────────────────────────────

export const dashboardApi = {
  getKPIs: (company?: string) =>
    get('trader_app.api.dashboard.get_kpis', { company }),

  getSalesTrend: (company?: string, months?: number) =>
    get('trader_app.api.dashboard.get_sales_trend', { company, months }),

  getTopCustomers: (limit?: number, company?: string) =>
    get('trader_app.api.dashboard.get_top_customers', { company, limit }),

  getRecentOrders: (limit?: number, company?: string) =>
    get('trader_app.api.dashboard.get_recent_orders', { company, limit }),

  getCashFlowSummary: (company?: string, months?: number) =>
    get('trader_app.api.dashboard.get_cash_flow_summary', { company, months }),

  getInventorySummary: (company?: string) =>
    get('trader_app.api.dashboard.get_inventory_summary', { company }),
};

// ─── Sales API ───────────────────────────────────────────────────

export const salesApi = {
  getDocumentCatalog: () =>
    get('trader_app.api.sales.get_sales_document_catalog'),

  getInvoices: (params?: Record<string, any>) =>
    get('trader_app.api.sales.get_sales_invoices', params),

  getInvoiceDetail: (name: string) =>
    get('trader_app.api.sales.get_sales_invoice_detail', { name }),

  getOrders: (params?: Record<string, any>) =>
    get('trader_app.api.sales.get_sales_orders', params),

  getOrderDetail: (name: string) =>
    get('trader_app.api.sales.get_sales_order_detail', { name }),

  getQuotations: (params?: Record<string, any>) =>
    get('trader_app.api.sales.get_quotations', params),

  getQuotationDetail: (name: string) =>
    get('trader_app.api.sales.get_quotation_detail', { name }),

  getCustomerItemSalesHistory: (params: { customer: string; item_code: string; company?: string; limit?: number }) =>
    get('trader_app.api.sales.get_customer_item_sales_history', params),

  createInvoice: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_sales_invoice', data),

  createOrder: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_sales_order', data),

  createQuotation: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_quotation', data),

  submitInvoice: (name: string) =>
    call('trader_app.api.sales.submit_sales_invoice', { name }),

  submitOrder: (name: string) =>
    call('trader_app.api.sales.submit_sales_order', { name }),

  submitQuotation: (name: string) =>
    call('trader_app.api.sales.submit_quotation', { name }),

  cancelInvoice: (name: string) =>
    call('trader_app.api.sales.cancel_sales_invoice', { name }),

  cancelOrder: (name: string) =>
    call('trader_app.api.sales.cancel_sales_order', { name }),

  cancelQuotation: (name: string) =>
    call('trader_app.api.sales.cancel_quotation', { name }),

  createReturnInvoice: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_sales_invoice', { ...data, is_return: 1 }),

  getDeliveryNotes: (params?: Record<string, any>) =>
    get('trader_app.api.sales.get_delivery_notes', params),

  getDeliveryNoteDetail: (name: string) =>
    get('trader_app.api.sales.get_delivery_note_detail', { name }),

  createDeliveryNote: (data: Record<string, any>) =>
    call('trader_app.api.sales.create_delivery_note', data),

  submitDeliveryNote: (name: string) =>
    call('trader_app.api.sales.submit_delivery_note', { name }),

  cancelDeliveryNote: (name: string) =>
    call('trader_app.api.sales.cancel_delivery_note', { name }),

  createInvoiceFromChallan: (name: string) =>
    call('trader_app.api.grouped_invoicing.create_grouped_invoice', { delivery_notes: [name] }),

  getInvoiceableDeliveryNotes: (customer?: string) =>
    get('trader_app.api.grouped_invoicing.get_invoiceable_delivery_notes', customer ? { customer } : undefined),

  createGroupedInvoice: (deliveryNotes: string[], postingDate?: string, autoSubmit?: boolean) =>
    call('trader_app.api.grouped_invoicing.create_grouped_invoice', {
      delivery_notes: deliveryNotes,
      posting_date: postingDate,
      auto_submit: autoSubmit ? 1 : 0,
    }),

  getSummary: (company?: string) =>
    get('trader_app.api.sales.get_sales_summary', { company }),
};

// ─── Commercial Opportunity API (OPP) ────────────────────────────

export const opportunityApi = {
  getSettings: (company?: string) =>
    get('trader_app.api.opportunity.get_opportunity_settings', { company }),

  list: (params?: Record<string, any>) =>
    get('trader_app.api.opportunity.list_opportunities', params),

  get: (name: string, company?: string) =>
    get('trader_app.api.opportunity.get_opportunity', { name, company }),

  create: (data: Record<string, any>) =>
    call('trader_app.api.opportunity.create_opportunity', { data }),

  update: (name: string, data: Record<string, any>) =>
    call('trader_app.api.opportunity.update_opportunity', { name, data }),

  close: (name: string, close_stage: string) =>
    call('trader_app.api.opportunity.close_opportunity', { name, close_stage }),

  reopen: (name: string) =>
    call('trader_app.api.opportunity.reopen_opportunity', { name }),

  addComment: (name: string, comment: string) =>
    call('trader_app.api.opportunity.add_opportunity_comment', { name, comment }),

  addCustomerPo: (name: string, data: Record<string, any>) =>
    call('trader_app.api.opportunity.add_customer_po', { name, data }),

  linkDocument: (opportunity: string, doctype: string, document_name: string) =>
    call('trader_app.api.opportunity.link_document', { opportunity, doctype, document_name }),

  listSourceQuotations: (opportunity: string) =>
    get('trader_app.api.opportunity.list_source_quotations', { opportunity }),

  createQuotation: (opportunity: string, data?: Record<string, any>) =>
    call('trader_app.api.opportunity.create_quotation_for_opportunity', { opportunity, data }),

  getQuotationDefaults: (company?: string) =>
    get('trader_app.api.opportunity.get_quotation_defaults', { company }),

  getClauseRateSnapshot: (as_of?: string, company?: string) =>
    get('trader_app.api.commercial_totals.get_clause_rate_snapshot', { as_of, company }),

  getCustomerCreditCheck: (customer: string, quote_amount?: number, company?: string) =>
    get('trader_app.api.commercial_totals.get_customer_credit_check', {
      customer,
      quote_amount,
      company,
    }),

  discardQuotationDraft: (name: string) =>
    call('trader_app.api.opportunity.discard_quotation_draft', { name }),

  saveQuotationOrderDetails: (name: string, data: Record<string, any>) =>
    call('trader_app.api.opportunity.save_quotation_order_details', { name, data }),

  createQuotationRevision: (name: string) =>
    call('trader_app.api.opportunity.create_quotation_revision', { name }),

  createOrderConfirmation: (params: {
    opportunity: string;
    source_quotation?: string;
    customer_po_no?: string;
  }) => call('trader_app.api.opportunity.create_order_confirmation', params),

  createDeliveryNote: (opportunity: string, source_oc?: string) =>
    call('trader_app.api.opportunity.create_delivery_note_for_opportunity', {
      opportunity,
      source_oc,
    }),

  listInvoiceableDeliveryNotes: (opportunity: string) =>
    get('trader_app.api.opportunity.list_invoiceable_delivery_notes_for_opportunity', { opportunity }),

  createInvoice: (params: {
    opportunity: string;
    delivery_notes?: string[];
    posting_date?: string;
    auto_submit?: 0 | 1;
  }) => call('trader_app.api.opportunity.create_invoice_for_opportunity', params),

  saveCommercialOptions: (doctype: string, name: string, commercial_options: unknown) =>
    call('trader_app.api.opportunity.save_commercial_options', {
      doctype,
      name,
      commercial_options,
    }),

  toggleFeature: (enabled: boolean, company?: string) =>
    call('trader_app.api.settings.toggle_opportunity_feature', { enabled: enabled ? 1 : 0, company }),
};

// ─── Customer AR API (AR-DOC) ────────────────────────────────────

export const arApi = {
  getSettings: (company?: string) =>
    get('trader_app.api.ar.get_ar_settings', { company }),

  listPrintPersonas: (doctype: string, company?: string) =>
    get('trader_app.api.ar.list_print_personas', { doctype, company }),

  resolvePrintPersona: (params: {
    doctype: string;
    persona?: string;
    company?: string;
    customer?: string;
    name?: string;
  }) => get('trader_app.api.ar.resolve_print_persona', params),

  toggleFeature: (enabled: boolean, company?: string) =>
    call('trader_app.api.settings.toggle_ar_feature', { enabled: enabled ? 1 : 0, company }),
};

// ─── Purchases API ───────────────────────────────────────────────

export const purchasesApi = {
  getDocumentCatalog: () =>
    get('trader_app.api.purchases.get_purchase_document_catalog'),

  getInvoices: (params?: Record<string, any>) =>
    get('trader_app.api.purchases.get_purchase_invoices', params),

  getInvoiceDetail: (name: string) =>
    get('trader_app.api.purchases.get_purchase_invoice_detail', { name }),

  getOrders: (params?: Record<string, any>) =>
    get('trader_app.api.purchases.get_purchase_orders', params),

  getOrderDetail: (name: string) =>
    get('trader_app.api.purchases.get_purchase_order_detail', { name }),

  getRequisitions: (params?: Record<string, any>) =>
    get('trader_app.api.purchases.get_material_requests', params),

  getRequisitionDetail: (name: string) =>
    get('trader_app.api.purchases.get_material_request_detail', { name }),

  submitRequisition: (name: string) =>
    call('trader_app.api.purchases.submit_material_request', { name }),

  getRfqs: (params?: Record<string, any>) =>
    get('trader_app.api.purchases.get_supplier_quotations', params),

  getRfqDetail: (name: string) =>
    get('trader_app.api.purchases.get_supplier_quotation_detail', { name }),

  createInvoice: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_purchase_invoice', data),

  createOrder: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_purchase_order', data),

  createRequisition: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_material_request', data),

  createRfq: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_supplier_quotation', data),

  createOrderFromRfq: (name: string) =>
    call('trader_app.api.purchases.create_purchase_order_from_supplier_quotation', { name }),

  submitInvoice: (name: string) =>
    call('trader_app.api.purchases.submit_purchase_invoice', { name }),

  submitOrder: (name: string) =>
    call('trader_app.api.purchases.submit_purchase_order', { name }),

  submitRfq: (name: string) =>
    call('trader_app.api.purchases.submit_supplier_quotation', { name }),

  cancelInvoice: (name: string) =>
    call('trader_app.api.purchases.cancel_purchase_invoice', { name }),

  cancelOrder: (name: string) =>
    call('trader_app.api.purchases.cancel_purchase_order', { name }),

  cancelMaterialRequest: (name: string) =>
    call('trader_app.api.purchases.cancel_material_request', { name }),

  cancelSupplierQuotation: (name: string) =>
    call('trader_app.api.purchases.cancel_supplier_quotation', { name }),

  createReturnInvoice: (data: Record<string, any>) =>
    call('trader_app.api.purchases.create_purchase_invoice', { ...data, is_return: 1 }),

  getSummary: (company?: string) =>
    get('trader_app.api.purchases.get_purchase_summary', { company }),
};

// ─── Inventory API ───────────────────────────────────────────────

export const inventoryApi = {
  getStockBalance: (params?: Record<string, any>) =>
    get('trader_app.api.inventory.get_stock_balance', params),

  getStockLedger: (params?: Record<string, any>) =>
    get('trader_app.api.inventory.get_stock_ledger', params),

  getItems: (params?: Record<string, any>) =>
    get('trader_app.api.inventory.get_items', params),

  getItemDetail: (itemCode: string) =>
    get('trader_app.api.inventory.get_item_detail', { item_code: itemCode }),

  getWarehouses: (company?: string) =>
    get('trader_app.api.inventory.get_warehouses', { company }),

  getWarehouseItemQty: (item_code: string, warehouse: string, company?: string) =>
    get('trader_app.api.inventory.get_warehouse_item_qty', { item_code, warehouse, company }),

  getItemsQoh: (item_codes: string[], warehouse: string, company?: string) =>
    get('trader_app.api.inventory.get_items_qoh', {
      item_codes: JSON.stringify(item_codes),
      warehouse,
      company,
    }),

  validateSerialForItem: (params: { item_code: string; serial_no: string; warehouse?: string; company?: string }) =>
    get('trader_app.api.inventory.validate_serial_for_item', params),

  validateItemsStock: (items: { item_code: string; warehouse: string; qty: number }[]) =>
    call('trader_app.api.inventory.validate_items_stock', { items }),

  validateSerialForPurchase: (params: { item_code: string; serial_no: string; company?: string }) =>
    get('trader_app.api.inventory.validate_serial_for_purchase', params),

  lookupByBarcode: (barcode: string, company?: string) =>
    get('trader_app.api.inventory.lookup_item_by_barcode', { barcode, company }),

  getSummary: (company?: string) =>
    get('trader_app.api.inventory.get_inventory_summary', { company }),

  getLowStockItems: (params?: Record<string, any>) =>
    get('trader_app.api.inventory.get_low_stock_items', params),

  getItemGroups: () =>
    get('trader_app.api.inventory.get_item_groups'),

  createItem: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_item', data),

  createStockEntry: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_stock_entry', data),

  createPurchaseReceipt: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_purchase_receipt', data),

  createSalesDispatch: (data: Record<string, any>) =>
    call('trader_app.api.inventory.create_sales_dispatch', data),
};

// ─── Customers API ───────────────────────────────────────────────

export const customersApi = {
  getList: (params?: Record<string, any>) =>
    get('trader_app.api.customers.get_customers', params),

  getDetail: (name: string) =>
    get('trader_app.api.customers.get_customer_detail', { name }),

  getGroups: () =>
    get('trader_app.api.customers.get_customer_groups'),

  getFormSetup: (company?: string) =>
    get('trader_app.api.customers.get_customer_form_setup', { company }),

  getTransactions: (customer: string, params?: Record<string, any>) =>
    get('trader_app.api.customers.get_customer_transactions', { customer, ...params }),
  create: (data: Record<string, any>) =>
    call('trader_app.api.customers.create_customer', data),

  update: (data: Record<string, any>) =>
    call('trader_app.api.customers.update_customer', data),

  addContact: (data: Record<string, any>) =>
    call('trader_app.api.customers.add_customer_contact', data),

  deleteContact: (name: string, customer: string) =>
    call('trader_app.api.customers.delete_customer_contact', { name, customer }),

  enable: (name: string) =>
    call('trader_app.api.customers.enable_customer', { name }),

  disable: (name: string) =>
    call('trader_app.api.customers.disable_customer', { name }),
};

export const customerPackApi = {
  getSettings: (company?: string) =>
    get('trader_app.api.customer_pack.get_customer_pack_settings', { company }),

  toggleFeature: (enabled: boolean, company?: string) =>
    call('trader_app.api.settings.toggle_customer_pack_feature', {
      enabled: enabled ? 1 : 0,
      company,
    }),
};

// ─── Suppliers API ───────────────────────────────────────────────

export const suppliersApi = {
  getList: (params?: Record<string, any>) =>
    get('trader_app.api.suppliers.get_suppliers', params),

  getDetail: (name: string) =>
    get('trader_app.api.suppliers.get_supplier_detail', { name }),

  getGroups: () =>
    get('trader_app.api.suppliers.get_supplier_groups'),

  getTransactions: (supplier: string, params?: Record<string, any>) =>
    get('trader_app.api.suppliers.get_supplier_transactions', { supplier, ...params }),
  create: (data: Record<string, any>) =>
    call('trader_app.api.suppliers.create_supplier', data),

  update: (data: Record<string, any>) =>
    call('trader_app.api.suppliers.update_supplier', data),

  enable: (name: string) =>
    call('trader_app.api.suppliers.enable_supplier', { name }),

  disable: (name: string) =>
    call('trader_app.api.suppliers.disable_supplier', { name }),};

// ─── Finance API ─────────────────────────────────────────────────

export const financeApi = {
  getPaymentEntries: (params?: Record<string, any>) =>
    get('trader_app.api.finance.get_payment_entries', params),

  getPaymentEntryDetail: (name: string) =>
    get('trader_app.api.finance.get_payment_entry_detail', { name }),

  getPaymentEntrySetup: (company?: string) =>
    get('trader_app.api.finance.get_payment_entry_setup', { company }),

  createPaymentEntry: (data: Record<string, any>) =>
    call('trader_app.api.finance.create_payment_entry', data),

  getOpenInvoicesForPayment: (party_type: string, party: string, company?: string) =>
    get('trader_app.api.finance.get_open_invoices_for_payment', { party_type, party, company }),

  recordInvoicePayment: (data: Record<string, any>) =>
    call('trader_app.api.finance.record_invoice_payment', data),

  submitPaymentEntry: (name: string) =>
    call('trader_app.api.finance.submit_payment_entry', { name }),

  cancelPaymentEntry: (name: string) =>
    call('trader_app.api.finance.cancel_payment_entry', { name }),

  getJournalEntries: (params?: Record<string, any>) =>
    get('trader_app.api.finance.get_journal_entries', params),

  getJournalEntryDetail: (name: string) =>
    get('trader_app.api.finance.get_journal_entry_detail', { name }),

  getAccounts: (params?: Record<string, any>) =>
    get('trader_app.api.finance.get_accounts', params),

  createJournalEntry: (data: Record<string, any>) =>
    call('trader_app.api.finance.create_journal_entry', data),

  submitJournalEntry: (name: string) =>
    call('trader_app.api.finance.submit_journal_entry', { name }),

  cancelJournalEntry: (name: string) =>
    call('trader_app.api.finance.cancel_journal_entry', { name }),

  getOutstandingSummary: (company?: string) =>
    get('trader_app.api.finance.get_outstanding_summary', { company }),
};

// ─── Reports API ─────────────────────────────────────────────────

export const reportsApi = {
  getSalesReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_sales_report', params),

  getPurchaseReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_purchase_report', params),

  getItemSalesReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_item_sales_report', params),

  getCustomerLedger: (customer: string, params?: Record<string, any>) =>
    get('trader_app.api.reports.get_customer_ledger', { customer, ...params }),

  getCustomerStatement: (customer: string, params?: Record<string, any>) =>
    get('trader_app.api.reports.get_customer_statement', { customer, ...params }),

  getSupplierLedger: (supplier: string, params?: Record<string, any>) =>
    get('trader_app.api.reports.get_supplier_ledger', { supplier, ...params }),

  getReceivableAgingSummary: () =>
    get('trader_app.api.reports.get_receivable_aging'),

  getReceivableAgingDetail: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_receivable_aging_detail', params),

  getAccountsPayable: () =>
    get('trader_app.api.reports.get_accounts_payable'),

  getProfitAndLoss: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_profit_and_loss', params),

  getGeneralLedger: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_general_ledger', params),

  // ─── Phase 1: New report endpoints ─────────────────────────────
  getSalesPerformanceReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_sales_performance_report', params),

  getCustomerProfitabilityReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_customer_profitability_report', params),

  getStockAgingReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_stock_aging_report', params),

  getInventoryMovementReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_inventory_movement_report', params),

  getReorderReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_reorder_report', params),

  getSupplierScorecardReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_supplier_scorecard_report', params),

  getPurchasePriceVarianceReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_purchase_price_variance_report', params),

  getReceivableAgingInvoiceDetail: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_receivable_aging_invoice_detail', params),

  getPayableAgingInvoiceDetail: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_payable_aging_invoice_detail', params),

  getTaxSummaryReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_tax_summary_report', params),

  getOpenPurchaseOrdersReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_open_purchase_orders_report', params),

  getCollectionEfficiencyReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_collection_efficiency_report', params),

  // ─── Phase 2: New report endpoints ─────────────────────────────
  getDailySalesReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_daily_sales_report', params),

  getSalesReturnReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_sales_return_report', params),

  getPurchaseReturnReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_purchase_return_report', params),

  getCashflowReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_cashflow_report', params),

  getProfitLossSummaryReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_profit_loss_summary_report', params),

  getStockBalanceReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_stock_balance_report', params),

  getSalespersonPerformanceReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_salesperson_performance_report', params),

  getItemPurchaseReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_item_purchase_report', params),

  getConsolidatedCompanySummary: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_consolidated_company_summary', params),

  getTrialBalanceReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_trial_balance_report', params),

  getBalanceSheetReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_balance_sheet_report', params),

  getSerialTraceReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_serial_trace_report', params),

  getFxGainLossReport: (params?: Record<string, any>) =>
    get('trader_app.api.reports.get_fx_gain_loss_report', params),
};

// ─── Audit API ─────────────────────────────────────────────────────

export const auditApi = {
  getLog: (params?: Record<string, any>) =>
    get('trader_app.api.audit.get_audit_log', params),
};

export default http;

// ─── Currency API ──────────────────────────────────────────────────

export const currencyApi = {
  getOptions: (company?: string) =>
    get('trader_app.api.currency.get_currency_options', { company }),

  getExchangeRate: (currency: string, posting_date?: string, transaction_type: 'selling' | 'buying' = 'selling') =>
    get('trader_app.api.currency.get_exchange_rate_for_date', {
      currency,
      posting_date,
      transaction_type,
    }),

  getSettings: (company?: string) =>
    get('trader_app.api.currency.get_currency_settings', { company }),

  saveSettings: (data: {
    base_currency?: string;
    multi_currency_enabled?: boolean | number;
    enabled_currencies?: string[];
    company?: string;
  }) => call('trader_app.api.currency.save_currency_settings', data),

  saveExchangeRate: (data: {
    from_currency: string;
    exchange_rate: number;
    to_currency?: string;
    date?: string;
    for_selling?: boolean | number;
    for_buying?: boolean | number;
    company?: string;
  }) => call('trader_app.api.currency.save_exchange_rate', data),

  deleteExchangeRate: (name: string) =>
    call('trader_app.api.currency.delete_exchange_rate', { name }),
};

// ─── POS API ───────────────────────────────────────────────────────

export const posApi = {
  getSetup: (company?: string) =>
    get('trader_app.api.pos.get_pos_setup', { company }),

  createSale: (data: Record<string, any>) =>
    call('trader_app.api.pos.create_pos_sale', {
      submit: 1,
      record_payment: 0,
      ...data,
    }),
};

// ─── Settings API ────────────────────────────────────────────────

export const settingsApi = {
  get: () =>
    get('trader_app.api.settings.get_settings'),

  save: (data: Record<string, any>) =>
    call('trader_app.api.settings.save_settings', { data }),

  getRoles: () =>
    get('trader_app.api.settings.get_current_user_roles'),

  getTraderRoles: () =>
    get('trader_app.api.settings.get_trader_roles'),
};

// ─── GST / Tax API ───────────────────────────────────────────────

export const gstApi = {
  getSettings: () =>
    get('trader_app.api.gst.get_gst_settings'),

  saveSettings: (data: Record<string, any>) =>
    call('trader_app.api.gst.save_gst_settings', data),

  seedTemplates: (company: string) =>
    call('trader_app.api.gst.seed_punjab_gst_templates', { company }),

  getTaxTemplates: (doctype_filter?: string) =>
    get('trader_app.api.gst.get_tax_templates', { doctype: doctype_filter }),
};

// ─── Bundling API ────────────────────────────────────────────────

export const bundlingApi = {
  getBundles: (params?: Record<string, any>) =>
    get('trader_app.api.bundling.get_item_bundles', params),

  getBundleDetail: (name: string) =>
    get('trader_app.api.bundling.get_item_bundle_detail', { name }),

  createBundle: (data: Record<string, any>) =>
    call('trader_app.api.bundling.create_item_bundle', data),

  updateBundle: (data: Record<string, any>) =>
    call('trader_app.api.bundling.update_item_bundle', data),

  deleteBundle: (name: string) =>
    call('trader_app.api.bundling.delete_item_bundle', { name }),

  expandBundle: (name: string) =>
    call('trader_app.api.bundling.expand_bundle', { name }),
};

// ─── Print API ───────────────────────────────────────────────────

export const printApi = {
  getPrintData: (doctype: string, name: string, viewMode?: string, format?: string) =>
    get('trader_app.api.printing.get_print_data', {
      doctype,
      name,
      view_mode: viewMode,
      doc_format: format || 'auto',
    }),
};

// ─── Catalog API (Components feature) ────────────────────────────

export const catalogApi = {
  getTaxonomy: (company?: string) =>
    get('trader_app.api.catalog.get_taxonomy', { company }),

  getItems: (params?: Record<string, any>) =>
    get('trader_app.api.catalog.get_catalog_items', params),

  findOrCreateSku: (data: {
    category: string;
    form_factor: string;
    capacity: string;
    grade: string;
    standard_rate?: number;
    company?: string;
  }) => call('trader_app.api.catalog.find_or_create_sku', data),

  resolveItem: (data: {
    item_code?: string;
    barcode?: string;
    template?: string;
    category?: string;
    form_factor?: string;
    capacity?: string;
    grade?: string;
    item_name?: string;
    item_group?: string;
    stock_uom?: string;
    standard_rate?: number;
    has_serial_no?: number;
    company?: string;
  }) => call('trader_app.api.catalog.resolve_item', data),

  ensureTaxonomyValues: (data: {
    category: string;
    form_factor?: string;
    capacity?: string;
    grade?: string;
    company?: string;
  }) => call('trader_app.api.catalog.ensure_taxonomy_values', data),

  saveSkuTaxonomy: (taxonomy: Record<string, unknown>, company?: string) =>
    call('trader_app.api.catalog.save_sku_taxonomy', { taxonomy, company }),

  getItemLineConfig: (params?: { company?: string; item_group?: string }) =>
    get('trader_app.api.catalog.get_item_line_config', params),

  saveItemGroupTemplates: (mapping: Record<string, unknown>, company?: string) =>
    call('trader_app.api.catalog.save_item_group_templates', { mapping, company }),

  saveCustomSkuTemplates: (templates: Record<string, unknown>, company?: string) =>
    call('trader_app.api.catalog.save_custom_sku_templates', { templates, company }),

  parseQuickEntry: (text: string, company?: string) =>
    call('trader_app.api.catalog.parse_quick_entry', { text, company }),

  importOpeningStock: (data: {
    items: { item_code: string; qty: number; rate: number; warehouse: string }[];
    warehouse: string;
    company?: string;
  }) => call('trader_app.api.catalog.import_opening_stock', data),

  getStockTakeItems: (params?: Record<string, any>) =>
    get('trader_app.api.catalog.get_stock_take_items', params),

  createStockTake: (data: {
    items: { item_code: string; counted_qty: number; warehouse: string }[];
    warehouse: string;
    company?: string;
  }) => call('trader_app.api.catalog.create_stock_take', data),

  toggleFeature: (enabled: boolean, company?: string) =>
    call('trader_app.api.settings.toggle_components_feature', { enabled: enabled ? 1 : 0, company }),
};

// ─── Admin API ───────────────────────────────────────────────────

export const adminApi = {
  // Users
  getUsers: (params?: Record<string, any>) =>
    get('trader_app.api.admin.get_users', params),
  getUserDetail: (user: string) =>
    get('trader_app.api.admin.get_user_detail', { user }),
  createUser: (data: Record<string, any>) =>
    call('trader_app.api.admin.create_user', { data }),
  updateUser: (data: Record<string, any>) =>
    call('trader_app.api.admin.update_user', { data }),
  setUserEnabled: (user: string, enabled: boolean) =>
    call('trader_app.api.admin.set_user_enabled', { user, enabled: enabled ? 1 : 0 }),

  // Roles
  getAllRoles: () =>
    get('trader_app.api.admin.get_all_roles'),
  getRoleUsers: (role: string) =>
    get('trader_app.api.admin.get_role_users', { role }),
  assignRoleToUser: (user: string, role: string) =>
    call('trader_app.api.admin.assign_role_to_user', { user, role }),
  removeRoleFromUser: (user: string, role: string) =>
    call('trader_app.api.admin.remove_role_from_user', { user, role }),

  // Company Settings
  getCompanySettings: (company?: string) =>
    get('trader_app.api.admin.get_company_settings', { company }),
  saveCompanySettings: (data: Record<string, any>) =>
    call('trader_app.api.admin.save_company_settings', { data }),

  // Fiscal Year
  getFiscalYears: () =>
    get('trader_app.api.admin.get_fiscal_years'),
  createFiscalYear: (data: Record<string, any>) =>
    call('trader_app.api.admin.create_fiscal_year', { data }),
  setActiveFiscalYear: (name: string) =>
    call('trader_app.api.admin.set_active_fiscal_year', { name }),

  // Warehouses
  getWarehouses: (company?: string) =>
    get('trader_app.api.admin.get_warehouses', { company }),
  createWarehouse: (data: Record<string, any>) =>
    call('trader_app.api.admin.create_warehouse', { data }),
  updateWarehouse: (data: Record<string, any>) =>
    call('trader_app.api.admin.update_warehouse', { data }),

  // Accounting Settings
  getAccountingSettings: () =>
    get('trader_app.api.admin.get_accounting_settings'),
  saveAccountingSettings: (data: Record<string, any>) =>
    call('trader_app.api.admin.save_accounting_settings', { data }),
};

// ─── Day-Book API (Components feature) ───────────────────────────

export const daybookApi = {
  getDayBook: (params?: Record<string, any>) =>
    get('trader_app.api.daybook.get_day_book', params),

  getDayCloseSummary: (params?: Record<string, any>) =>
    get('trader_app.api.daybook.get_day_close_summary', params),

  getStockValuation: (params?: Record<string, any>) =>
    get('trader_app.api.daybook.get_component_stock_valuation', params),

  getIncoming: (params?: Record<string, any>) =>
    get('trader_app.api.daybook.get_incoming', params),

  getOutgoing: (params?: Record<string, any>) =>
    get('trader_app.api.daybook.get_outgoing', params),

  settleParty: (data: {
    party_type: 'Customer' | 'Supplier';
    party: string;
    amount: number;
    mode_of_payment?: string;
    company?: string;
    posting_date?: string;
    settlement_account?: string;
    allocations?: { reference_name: string; allocated_amount: number }[];
  }) => call('trader_app.api.daybook.settle_party', data),

  getPartyOpenInvoices: (params: {
    party_type: 'Customer' | 'Supplier';
    party: string;
    company?: string;
  }) => get('trader_app.api.daybook.get_party_open_invoices', params),

  findOrCreateParty: (data: {
    party_type: 'Customer' | 'Supplier';
    party_name: string;
    short_code?: string;
    company?: string;
  }) => call('trader_app.api.daybook.find_or_create_party', data),

  postDayTransaction: (data: {
    tx_type: 'sale' | 'purchase' | 'payment_in' | 'payment_out';
    party: string;
    lines?: {
      item_code: string;
      qty: number;
      rate: number;
      warehouse?: string;
      serial_no?: string;
      description?: string;
    }[];
    amount?: number;
    mode_of_payment?: string;
    posting_date?: string;
    company?: string;
    record_payment?: number;
    payment_amount?: number;
    settlement_account?: string;
    invoice_type?: string;
    allocations?: { reference_name: string; allocated_amount: number }[];
  }) => call('trader_app.api.daybook.post_day_transaction', data),
};
