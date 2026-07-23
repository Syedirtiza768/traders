import { lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { hasCapability } from './lib/permissions';
import AccessDenied from './components/AccessDenied';
import GatedRoute from './components/GatedRoute';
import { TenantStatusGate } from './components/TenantBlockedPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import SuperAdminDashboardPage from './pages/superadmin/SuperAdminDashboardPage';
import TenantListPage from './pages/superadmin/TenantListPage';
import CreateTenantPage from './pages/superadmin/CreateTenantPage';
import TenantDetailPage from './pages/superadmin/TenantDetailPage';

/* ---------- lazy-loaded pages ---------- */
const SalesPage = lazy(() => import('./pages/SalesPage'));
const SalesInvoiceDetailPage = lazy(() => import('./pages/SalesInvoiceDetailPage'));
const SalesOrdersPage = lazy(() => import('./pages/SalesOrdersPage'));
const SalesOrderDetailPage = lazy(() => import('./pages/SalesOrderDetailPage'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const QuotationDetailPage = lazy(() => import('./pages/QuotationDetailPage'));
const CreateSalesInvoicePage = lazy(() => import('./pages/CreateSalesInvoicePage'));
const CreateSalesOrderPage = lazy(() => import('./pages/CreateSalesOrderPage'));
const CreateQuotationPage = lazy(() => import('./pages/CreateQuotationPage'));
const MakeQuotationPage = lazy(() => import('./pages/MakeQuotationPage'));
const CreateSalesReturnPage = lazy(() => import('./pages/CreateSalesReturnPage'));
const CreateSalesDispatchPage = lazy(() => import('./pages/CreateSalesDispatchPage'));
const CreateSalesDocumentHubPage = lazy(() => import('./pages/CreateSalesDocumentHubPage'));
const CreatePurchaseDocumentHubPage = lazy(() => import('./pages/CreatePurchaseDocumentHubPage'));
const CreateDeliveryChallanPage = lazy(() => import('./pages/CreateDeliveryChallanPage'));
const DeliveryChallansPage = lazy(() => import('./pages/DeliveryChallansPage'));
const DeliveryChallanDetailPage = lazy(() => import('./pages/DeliveryChallanDetailPage'));
const GroupedInvoicePage = lazy(() => import('./pages/GroupedInvoicePage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const PurchaseInvoiceDetailPage = lazy(() => import('./pages/PurchaseInvoiceDetailPage'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'));
const PurchaseOrderDetailPage = lazy(() => import('./pages/PurchaseOrderDetailPage'));
const PurchaseRequisitionsPage = lazy(() => import('./pages/PurchaseRequisitionsPage'));
const PurchaseRequisitionDetailPage = lazy(() => import('./pages/PurchaseRequisitionDetailPage'));
const SupplierQuotationsPage = lazy(() => import('./pages/SupplierQuotationsPage'));
const SupplierQuotationDetailPage = lazy(() => import('./pages/SupplierQuotationDetailPage'));
const CreatePurchaseInvoicePage = lazy(() => import('./pages/CreatePurchaseInvoicePage'));
const CreatePurchaseOrderPage = lazy(() => import('./pages/CreatePurchaseOrderPage'));
const CreatePurchaseRequisitionPage = lazy(() => import('./pages/CreatePurchaseRequisitionPage'));
const CreateSupplierQuotationPage = lazy(() => import('./pages/CreateSupplierQuotationPage'));
const CreatePurchaseReturnPage = lazy(() => import('./pages/CreatePurchaseReturnPage'));
const CreatePurchaseReceiptPage = lazy(() => import('./pages/CreatePurchaseReceiptPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const InventoryItemDetailPage = lazy(() => import('./pages/InventoryItemDetailPage'));
const CreateItemPage = lazy(() => import('./pages/CreateItemPage'));
const ItemBundlesPage = lazy(() => import('./pages/ItemBundlesPage'));
const WarehouseStockPage = lazy(() => import('./pages/WarehouseStockPage'));
const StockMovementPage = lazy(() => import('./pages/StockMovementPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const CustomerStatementPage = lazy(() => import('./pages/CustomerStatementPage'));
const EditCustomerPage = lazy(() => import('./pages/EditCustomerPage'));
const CreateCustomerPage = lazy(() => import('./pages/CreateCustomerPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const SupplierDetailPage = lazy(() => import('./pages/SupplierDetailPage'));
const EditSupplierPage = lazy(() => import('./pages/EditSupplierPage'));
const CreateSupplierPage = lazy(() => import('./pages/CreateSupplierPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const JournalEntriesPage = lazy(() => import('./pages/JournalEntriesPage'));
const JournalEntryDetailPage = lazy(() => import('./pages/JournalEntryDetailPage'));
const CreateJournalEntryPage = lazy(() => import('./pages/CreateJournalEntryPage'));
const PaymentEntriesPage = lazy(() => import('./pages/PaymentEntriesPage'));
const PaymentEntryDetailPage = lazy(() => import('./pages/PaymentEntryDetailPage'));
const CreatePaymentEntryPage = lazy(() => import('./pages/CreatePaymentEntryPage'));
const OperationsPage = lazy(() => import('./pages/OperationsPage'));
const DocumentPrintPage = lazy(() => import('./pages/DocumentPrintPage'));
const GstSettingsPage = lazy(() => import('./pages/GstSettingsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TenantBusinessAuditPage = lazy(() => import('./pages/TenantBusinessAuditPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const RoleManagementPage = lazy(() => import('./pages/RoleManagementPage'));
const CompanySettingsAdminPage = lazy(() => import('./pages/CompanySettingsAdminPage'));
const FiscalYearPage = lazy(() => import('./pages/FiscalYearPage'));
const WarehouseManagementPage = lazy(() => import('./pages/WarehouseManagementPage'));
const AccountingSettingsPage = lazy(() => import('./pages/AccountingSettingsPage'));
const PosCheckoutPage = lazy(() => import('./pages/PosCheckoutPage'));

/* ---------- components-trading feature pages (flag-gated) ---------- */
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'));
const OpportunityDetailPage = lazy(() => import('./pages/OpportunityDetailPage'));
const DayBookPage = lazy(() => import('./pages/DayBookPage'));
const ReceivablesPage = lazy(() => import('./pages/ReceivablesPage'));
const PayablesPage = lazy(() => import('./pages/PayablesPage'));
const DayClosePage = lazy(() => import('./pages/DayClosePage'));
const ComponentCatalogPage = lazy(() => import('./pages/ComponentCatalogPage'));
const OpeningStockPage = lazy(() => import('./pages/OpeningStockPage'));
const StockValuationPage = lazy(() => import('./pages/StockValuationPage'));
const StockTakePage = lazy(() => import('./pages/StockTakePage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuthStore();
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized, roles } = useAuthStore();
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!hasCapability(roles, 'superadmin:view')) {
    return (
      <AccessDenied
        title="Super Admin access required"
        description="Your account does not have platform administration permissions."
      />
    );
  }
  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => { checkAuth(); }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<SuperAdminDashboardPage />} />
        <Route path="tenants" element={<TenantListPage />} />
        <Route path="tenants/new" element={<CreateTenantPage />} />
        <Route path="tenants/:tenantId" element={<TenantDetailPage />} />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <TenantStatusGate>
              <DashboardLayout />
            </TenantStatusGate>
          </ProtectedRoute>
        }
      >
        <Route index element={<GatedRoute capability="dashboard:view" module="dashboard"><DashboardPage /></GatedRoute>} />

        {/* Sales */}
        <Route path="sales" element={<GatedRoute capability="sales:view" module="sales"><SalesPage /></GatedRoute>} />
        <Route path="sales/pos" element={<GatedRoute capability="sales:view" module="pos"><PosCheckoutPage /></GatedRoute>} />
        <Route path="sales/documents/new" element={<GatedRoute capability="sales:view" module="sales"><CreateSalesDocumentHubPage /></GatedRoute>} />
        <Route path="sales/new" element={<GatedRoute capability="sales:view" module="sales"><CreateSalesInvoicePage /></GatedRoute>} />
        <Route path="sales/proforma/new" element={<GatedRoute capability="sales:view" module="sales"><CreateQuotationPage /></GatedRoute>} />
        <Route path="sales/challans" element={<GatedRoute capability="sales:view" module="sales"><DeliveryChallansPage /></GatedRoute>} />
        <Route path="sales/challans/new" element={<GatedRoute capability="sales:view" module="sales"><CreateDeliveryChallanPage /></GatedRoute>} />
        <Route path="sales/challans/:challanId" element={<GatedRoute capability="sales:view" module="sales"><DeliveryChallanDetailPage /></GatedRoute>} />
        <Route path="sales/challans/group-invoice" element={<GatedRoute capability="sales:view" module="sales"><GroupedInvoicePage /></GatedRoute>} />
        <Route path="sales/returns/new" element={<GatedRoute capability="sales:view" module="sales"><CreateSalesReturnPage /></GatedRoute>} />
        <Route path="sales/dispatches/new" element={<GatedRoute capability="sales:view" module="sales"><CreateSalesDispatchPage /></GatedRoute>} />
        <Route path="sales/orders" element={<GatedRoute capability="sales:view" module="sales"><SalesOrdersPage /></GatedRoute>} />
        <Route path="sales/orders/new" element={<GatedRoute capability="sales:view" module="sales"><CreateSalesOrderPage /></GatedRoute>} />
        <Route path="sales/orders/:orderId" element={<GatedRoute capability="sales:view" module="sales"><SalesOrderDetailPage /></GatedRoute>} />
        <Route path="sales/opportunities" element={<GatedRoute capability="sales:view" module="opportunity" requiresOpportunity navFeature="opportunities"><OpportunitiesPage /></GatedRoute>} />
        <Route path="sales/opportunities/:opportunityId" element={<GatedRoute capability="sales:view" module="opportunity" requiresOpportunity navFeature="opportunities"><OpportunityDetailPage /></GatedRoute>} />
        <Route path="sales/quotations" element={<GatedRoute capability="sales:view" module="sales"><QuotationsPage /></GatedRoute>} />
        <Route path="sales/quotations/new" element={<GatedRoute capability="sales:view" module="sales"><CreateQuotationPage /></GatedRoute>} />
        <Route path="sales/quotations/make" element={<GatedRoute capability="sales:view" module="sales"><MakeQuotationPage /></GatedRoute>} />
        <Route path="sales/quotations/:quotationId/edit" element={<GatedRoute capability="sales:view" module="sales"><MakeQuotationPage /></GatedRoute>} />
        <Route path="sales/quotations/:quotationId" element={<GatedRoute capability="sales:view" module="sales"><QuotationDetailPage /></GatedRoute>} />
        <Route path="sales/:invoiceId" element={<GatedRoute capability="sales:view" module="sales"><SalesInvoiceDetailPage /></GatedRoute>} />

        {/* Purchases */}
        <Route path="purchases" element={<GatedRoute capability="purchases:view" module="purchases"><PurchasesPage /></GatedRoute>} />
        <Route path="purchases/documents/new" element={<GatedRoute capability="purchases:view" module="purchases"><CreatePurchaseDocumentHubPage /></GatedRoute>} />
        <Route path="purchases/new" element={<GatedRoute capability="purchases:view" module="purchases"><CreatePurchaseInvoicePage /></GatedRoute>} />
        <Route path="purchases/returns/new" element={<GatedRoute capability="purchases:view" module="purchases"><CreatePurchaseReturnPage /></GatedRoute>} />
        <Route path="purchases/receipts/new" element={<GatedRoute capability="purchases:view" module="purchases"><CreatePurchaseReceiptPage /></GatedRoute>} />
        <Route path="purchases/orders" element={<GatedRoute capability="purchases:view" module="purchases"><PurchaseOrdersPage /></GatedRoute>} />
        <Route path="purchases/orders/new" element={<GatedRoute capability="purchases:view" module="purchases"><CreatePurchaseOrderPage /></GatedRoute>} />
        <Route path="purchases/orders/:orderId" element={<GatedRoute capability="purchases:view" module="purchases"><PurchaseOrderDetailPage /></GatedRoute>} />
        <Route path="purchases/requisitions" element={<GatedRoute capability="purchases:view" module="purchases"><PurchaseRequisitionsPage /></GatedRoute>} />
        <Route path="purchases/requisitions/new" element={<GatedRoute capability="purchases:view" module="purchases"><CreatePurchaseRequisitionPage /></GatedRoute>} />
        <Route path="purchases/requisitions/:reqId" element={<GatedRoute capability="purchases:view" module="purchases"><PurchaseRequisitionDetailPage /></GatedRoute>} />
        <Route path="purchases/rfqs" element={<GatedRoute capability="purchases:view" module="purchases"><SupplierQuotationsPage /></GatedRoute>} />
        <Route path="purchases/rfqs/new" element={<GatedRoute capability="purchases:view" module="purchases"><CreateSupplierQuotationPage /></GatedRoute>} />
        <Route path="purchases/rfqs/:quotationId" element={<GatedRoute capability="purchases:view" module="purchases"><SupplierQuotationDetailPage /></GatedRoute>} />
        <Route path="purchases/:invoiceId" element={<GatedRoute capability="purchases:view" module="purchases"><PurchaseInvoiceDetailPage /></GatedRoute>} />

        {/* Inventory */}
        <Route path="inventory" element={<GatedRoute capability="inventory:view" module="inventory"><InventoryPage /></GatedRoute>} />
        <Route path="inventory/items/new" element={<GatedRoute capability="inventory:view" module="inventory"><CreateItemPage /></GatedRoute>} />
        <Route path="inventory/items/:itemId" element={<GatedRoute capability="inventory:view" module="inventory"><InventoryItemDetailPage /></GatedRoute>} />
        <Route path="inventory/bundles" element={<GatedRoute capability="inventory:view" module="inventory"><ItemBundlesPage /></GatedRoute>} />
        <Route path="inventory/warehouse" element={<GatedRoute capability="inventory:view" module="inventory"><WarehouseStockPage /></GatedRoute>} />
        <Route path="inventory/movements" element={<GatedRoute capability="inventory:view" module="inventory"><StockMovementPage /></GatedRoute>} />
        <Route path="inventory/dispatches/new" element={<GatedRoute capability="inventory:view" module="inventory"><CreateSalesDispatchPage /></GatedRoute>} />
        <Route path="inventory/catalog" element={<GatedRoute capability="inventory:view" module="components" requiresComponents><ComponentCatalogPage /></GatedRoute>} />
        <Route path="inventory/opening-stock" element={<GatedRoute capability="inventory:view" module="components" requiresComponents><OpeningStockPage /></GatedRoute>} />
        <Route path="inventory/stock-valuation" element={<GatedRoute capability="inventory:view" module="components" requiresComponents><StockValuationPage /></GatedRoute>} />
        <Route path="inventory/stock-take" element={<GatedRoute capability="inventory:view" module="components" requiresComponents><StockTakePage /></GatedRoute>} />
        <Route path="components/catalog" element={<Navigate to="/inventory/catalog" replace />} />
        <Route path="components/opening-stock" element={<Navigate to="/inventory/opening-stock" replace />} />
        <Route path="components/stock-valuation" element={<Navigate to="/inventory/stock-valuation" replace />} />
        <Route path="components/stock-take" element={<Navigate to="/inventory/stock-take" replace />} />
        <Route path="components" element={<Navigate to="/inventory/catalog" replace />} />

        {/* Customers */}
        <Route path="customers" element={<GatedRoute capability="customers:view" module="customers"><CustomersPage /></GatedRoute>} />
        <Route path="customers/new" element={<GatedRoute capability="customers:view" module="customers"><CreateCustomerPage /></GatedRoute>} />
        <Route path="customers/:customerId" element={<GatedRoute capability="customers:view" module="customers"><CustomerDetailPage /></GatedRoute>} />
        <Route path="customers/:customerId/statement" element={<GatedRoute capability="customers:view" module="customers"><CustomerStatementPage /></GatedRoute>} />
        <Route path="customers/:customerId/edit" element={<GatedRoute capability="customers:view" module="customers"><EditCustomerPage /></GatedRoute>} />

        {/* Suppliers */}
        <Route path="suppliers" element={<GatedRoute capability="suppliers:view" module="suppliers"><SuppliersPage /></GatedRoute>} />
        <Route path="suppliers/new" element={<GatedRoute capability="suppliers:view" module="suppliers"><CreateSupplierPage /></GatedRoute>} />
        <Route path="suppliers/:supplierId" element={<GatedRoute capability="suppliers:view" module="suppliers"><SupplierDetailPage /></GatedRoute>} />
        <Route path="suppliers/:supplierId/edit" element={<GatedRoute capability="suppliers:view" module="suppliers"><EditSupplierPage /></GatedRoute>} />

        {/* Finance */}
        <Route path="finance" element={<GatedRoute capability="finance:view" module="finance"><FinancePage /></GatedRoute>} />
        <Route path="finance/journals" element={<GatedRoute capability="finance:view" module="finance"><JournalEntriesPage /></GatedRoute>} />
        <Route path="finance/journals/new" element={<GatedRoute capability="finance:view" module="finance"><CreateJournalEntryPage /></GatedRoute>} />
        <Route path="finance/journals/:journalId" element={<GatedRoute capability="finance:view" module="finance"><JournalEntryDetailPage /></GatedRoute>} />
        <Route path="finance/payments" element={<GatedRoute capability="finance:view" module="finance"><PaymentEntriesPage /></GatedRoute>} />
        <Route path="finance/payments/new" element={<GatedRoute capability="finance:view" module="finance"><CreatePaymentEntryPage /></GatedRoute>} />
        <Route path="finance/payments/:paymentId" element={<GatedRoute capability="finance:view" module="finance"><PaymentEntryDetailPage /></GatedRoute>} />
        <Route path="finance/day-book" element={<GatedRoute capability="finance:view" module="components" requiresComponents><DayBookPage /></GatedRoute>} />
        <Route path="finance/receivables" element={<GatedRoute capability="finance:view" module="components" requiresComponents><ReceivablesPage /></GatedRoute>} />
        <Route path="finance/payables" element={<GatedRoute capability="finance:view" module="components" requiresComponents><PayablesPage /></GatedRoute>} />
        <Route path="finance/day-close" element={<GatedRoute capability="finance:view" module="components" requiresComponents><DayClosePage /></GatedRoute>} />

        <Route path="operations" element={<GatedRoute capability="operations:view" module="operations"><OperationsPage /></GatedRoute>} />
        <Route path="reports" element={<GatedRoute capability="reports:view" module="reports"><ReportsPage /></GatedRoute>} />
        <Route path="settings" element={<GatedRoute capability="settings:view" module="settings"><SettingsPage /></GatedRoute>} />
        <Route path="settings/audit" element={<GatedRoute capability="settings:view" module="settings"><AuditLogPage /></GatedRoute>} />
        <Route path="settings/tenant-audit" element={<GatedRoute capability="settings:view" module="settings"><TenantBusinessAuditPage /></GatedRoute>} />
        <Route path="settings/gst" element={<GatedRoute capability="settings:view" module="settings"><GstSettingsPage /></GatedRoute>} />
        <Route path="settings/admin/users" element={<GatedRoute capability="settings:view" module="settings"><UserManagementPage /></GatedRoute>} />
        <Route path="settings/admin/roles" element={<GatedRoute capability="settings:view" module="settings"><RoleManagementPage /></GatedRoute>} />
        <Route path="settings/admin/company" element={<GatedRoute capability="settings:view" module="settings"><CompanySettingsAdminPage /></GatedRoute>} />
        <Route path="settings/admin/fiscal-year" element={<GatedRoute capability="settings:view" module="settings"><FiscalYearPage /></GatedRoute>} />
        <Route path="settings/admin/warehouses" element={<GatedRoute capability="settings:view" module="settings"><WarehouseManagementPage /></GatedRoute>} />
        <Route path="settings/admin/accounting" element={<GatedRoute capability="settings:view" module="settings"><AccountingSettingsPage /></GatedRoute>} />
        <Route path="print" element={<DocumentPrintPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
