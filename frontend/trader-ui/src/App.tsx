import { lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useCompanyStore } from './stores/companyStore';
import { hasCapability, type AppCapability } from './lib/permissions';
import AccessDenied from './components/AccessDenied';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

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
const CreateSalesReturnPage = lazy(() => import('./pages/CreateSalesReturnPage'));
const CreateSalesDispatchPage = lazy(() => import('./pages/CreateSalesDispatchPage'));
const CreateSalesDocumentHubPage = lazy(() => import('./pages/CreateSalesDocumentHubPage'));
const CreatePurchaseDocumentHubPage = lazy(() => import('./pages/CreatePurchaseDocumentHubPage'));
const CreateDeliveryChallanPage = lazy(() => import('./pages/CreateDeliveryChallanPage'));
const DeliveryChallansPage = lazy(() => import('./pages/DeliveryChallansPage'));
const DeliveryChallanDetailPage = lazy(() => import('./pages/DeliveryChallanDetailPage'));
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
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const PosCheckoutPage = lazy(() => import('./pages/PosCheckoutPage'));

/* ---------- components-trading feature pages (flag-gated) ---------- */
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

function CapabilityRoute({
  children,
  capability,
  requiresComponents = false,
}: {
  children: React.ReactNode;
  capability?: AppCapability;
  requiresComponents?: boolean;
}) {
  const roles = useAuthStore((s) => s.roles);
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);

  if (capability && !hasCapability(roles, capability)) {
    return <AccessDenied />;
  }
  if (requiresComponents && !componentsEnabled) {
    return (
      <AccessDenied
        title="Feature not enabled"
        description="The Components Trading feature is not enabled for this company. Enable it in Settings → Feature Flags."
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
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <CapabilityRoute capability="dashboard:view">
              <DashboardPage />
            </CapabilityRoute>
          }
        />

        {/* Sales */}
        <Route path="sales" element={<CapabilityRoute capability="sales:view"><SalesPage /></CapabilityRoute>} />
        <Route path="sales/pos" element={<CapabilityRoute capability="sales:view"><PosCheckoutPage /></CapabilityRoute>} />
        <Route path="sales/documents/new" element={<CapabilityRoute capability="sales:view"><CreateSalesDocumentHubPage /></CapabilityRoute>} />
        <Route path="sales/new" element={<CapabilityRoute capability="sales:view"><CreateSalesInvoicePage /></CapabilityRoute>} />
        <Route path="sales/proforma/new" element={<CapabilityRoute capability="sales:view"><CreateQuotationPage /></CapabilityRoute>} />
        <Route path="sales/challans" element={<CapabilityRoute capability="sales:view"><DeliveryChallansPage /></CapabilityRoute>} />
        <Route path="sales/challans/new" element={<CapabilityRoute capability="sales:view"><CreateDeliveryChallanPage /></CapabilityRoute>} />
        <Route path="sales/challans/:challanId" element={<CapabilityRoute capability="sales:view"><DeliveryChallanDetailPage /></CapabilityRoute>} />
        <Route path="sales/returns/new" element={<CapabilityRoute capability="sales:view"><CreateSalesReturnPage /></CapabilityRoute>} />
        <Route path="sales/dispatches/new" element={<CapabilityRoute capability="sales:view"><CreateSalesDispatchPage /></CapabilityRoute>} />
        <Route path="sales/orders" element={<CapabilityRoute capability="sales:view"><SalesOrdersPage /></CapabilityRoute>} />
        <Route path="sales/orders/new" element={<CapabilityRoute capability="sales:view"><CreateSalesOrderPage /></CapabilityRoute>} />
        <Route path="sales/orders/:orderId" element={<CapabilityRoute capability="sales:view"><SalesOrderDetailPage /></CapabilityRoute>} />
        <Route path="sales/quotations" element={<CapabilityRoute capability="sales:view"><QuotationsPage /></CapabilityRoute>} />
        <Route path="sales/quotations/new" element={<CapabilityRoute capability="sales:view"><CreateQuotationPage /></CapabilityRoute>} />
        <Route path="sales/quotations/:quotationId" element={<CapabilityRoute capability="sales:view"><QuotationDetailPage /></CapabilityRoute>} />
        <Route path="sales/:invoiceId" element={<CapabilityRoute capability="sales:view"><SalesInvoiceDetailPage /></CapabilityRoute>} />

        {/* Purchases */}
        <Route path="purchases" element={<CapabilityRoute capability="purchases:view"><PurchasesPage /></CapabilityRoute>} />
        <Route path="purchases/documents/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseDocumentHubPage /></CapabilityRoute>} />
        <Route path="purchases/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseInvoicePage /></CapabilityRoute>} />
        <Route path="purchases/returns/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseReturnPage /></CapabilityRoute>} />
        <Route path="purchases/receipts/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseReceiptPage /></CapabilityRoute>} />
        <Route path="purchases/orders" element={<CapabilityRoute capability="purchases:view"><PurchaseOrdersPage /></CapabilityRoute>} />
        <Route path="purchases/orders/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseOrderPage /></CapabilityRoute>} />
        <Route path="purchases/orders/:orderId" element={<CapabilityRoute capability="purchases:view"><PurchaseOrderDetailPage /></CapabilityRoute>} />
        <Route path="purchases/requisitions" element={<CapabilityRoute capability="purchases:view"><PurchaseRequisitionsPage /></CapabilityRoute>} />
        <Route path="purchases/requisitions/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseRequisitionPage /></CapabilityRoute>} />
        <Route path="purchases/requisitions/:reqId" element={<CapabilityRoute capability="purchases:view"><PurchaseRequisitionDetailPage /></CapabilityRoute>} />
        <Route path="purchases/rfqs" element={<CapabilityRoute capability="purchases:view"><SupplierQuotationsPage /></CapabilityRoute>} />
        <Route path="purchases/rfqs/new" element={<CapabilityRoute capability="purchases:view"><CreateSupplierQuotationPage /></CapabilityRoute>} />
        <Route path="purchases/rfqs/:quotationId" element={<CapabilityRoute capability="purchases:view"><SupplierQuotationDetailPage /></CapabilityRoute>} />
        <Route path="purchases/:invoiceId" element={<CapabilityRoute capability="purchases:view"><PurchaseInvoiceDetailPage /></CapabilityRoute>} />

        {/* Inventory */}
        <Route path="inventory" element={<CapabilityRoute capability="inventory:view"><InventoryPage /></CapabilityRoute>} />
        <Route path="inventory/items/new" element={<CapabilityRoute capability="inventory:view"><CreateItemPage /></CapabilityRoute>} />
        <Route path="inventory/items/:itemId" element={<CapabilityRoute capability="inventory:view"><InventoryItemDetailPage /></CapabilityRoute>} />
        <Route path="inventory/bundles" element={<CapabilityRoute capability="inventory:view"><ItemBundlesPage /></CapabilityRoute>} />
        <Route path="inventory/warehouse" element={<CapabilityRoute capability="inventory:view"><WarehouseStockPage /></CapabilityRoute>} />
        <Route path="inventory/movements" element={<CapabilityRoute capability="inventory:view"><StockMovementPage /></CapabilityRoute>} />
        <Route path="inventory/dispatches/new" element={<CapabilityRoute capability="inventory:view"><CreateSalesDispatchPage /></CapabilityRoute>} />
        <Route path="inventory/catalog" element={<CapabilityRoute capability="inventory:view" requiresComponents><ComponentCatalogPage /></CapabilityRoute>} />
        <Route path="inventory/opening-stock" element={<CapabilityRoute capability="inventory:view" requiresComponents><OpeningStockPage /></CapabilityRoute>} />
        <Route path="inventory/stock-valuation" element={<CapabilityRoute capability="inventory:view" requiresComponents><StockValuationPage /></CapabilityRoute>} />
        <Route path="inventory/stock-take" element={<CapabilityRoute capability="inventory:view" requiresComponents><StockTakePage /></CapabilityRoute>} />
        <Route path="components/catalog" element={<Navigate to="/inventory/catalog" replace />} />
        <Route path="components/opening-stock" element={<Navigate to="/inventory/opening-stock" replace />} />
        <Route path="components/stock-valuation" element={<Navigate to="/inventory/stock-valuation" replace />} />
        <Route path="components/stock-take" element={<Navigate to="/inventory/stock-take" replace />} />
        <Route path="components" element={<Navigate to="/inventory/catalog" replace />} />

        {/* Customers */}
        <Route path="customers" element={<CapabilityRoute capability="customers:view"><CustomersPage /></CapabilityRoute>} />
        <Route path="customers/new" element={<CapabilityRoute capability="customers:view"><CreateCustomerPage /></CapabilityRoute>} />
        <Route path="customers/:customerId" element={<CapabilityRoute capability="customers:view"><CustomerDetailPage /></CapabilityRoute>} />
        <Route path="customers/:customerId/edit" element={<CapabilityRoute capability="customers:view"><EditCustomerPage /></CapabilityRoute>} />

        {/* Suppliers */}
        <Route path="suppliers" element={<CapabilityRoute capability="suppliers:view"><SuppliersPage /></CapabilityRoute>} />
        <Route path="suppliers/new" element={<CapabilityRoute capability="suppliers:view"><CreateSupplierPage /></CapabilityRoute>} />
        <Route path="suppliers/:supplierId" element={<CapabilityRoute capability="suppliers:view"><SupplierDetailPage /></CapabilityRoute>} />
        <Route path="suppliers/:supplierId/edit" element={<CapabilityRoute capability="suppliers:view"><EditSupplierPage /></CapabilityRoute>} />

        {/* Finance */}
        <Route path="finance" element={<CapabilityRoute capability="finance:view"><FinancePage /></CapabilityRoute>} />
        <Route path="finance/journals" element={<CapabilityRoute capability="finance:view"><JournalEntriesPage /></CapabilityRoute>} />
        <Route path="finance/journals/new" element={<CapabilityRoute capability="finance:view"><CreateJournalEntryPage /></CapabilityRoute>} />
        <Route path="finance/journals/:journalId" element={<CapabilityRoute capability="finance:view"><JournalEntryDetailPage /></CapabilityRoute>} />
        <Route path="finance/payments" element={<CapabilityRoute capability="finance:view"><PaymentEntriesPage /></CapabilityRoute>} />
        <Route path="finance/payments/new" element={<CapabilityRoute capability="finance:view"><CreatePaymentEntryPage /></CapabilityRoute>} />
        <Route path="finance/payments/:paymentId" element={<CapabilityRoute capability="finance:view"><PaymentEntryDetailPage /></CapabilityRoute>} />

        {/* Components Trading — Finance sub-routes (feature + capability gated) */}
        <Route path="finance/day-book" element={<CapabilityRoute capability="finance:view" requiresComponents><DayBookPage /></CapabilityRoute>} />
        <Route path="finance/receivables" element={<CapabilityRoute capability="finance:view" requiresComponents><ReceivablesPage /></CapabilityRoute>} />
        <Route path="finance/payables" element={<CapabilityRoute capability="finance:view" requiresComponents><PayablesPage /></CapabilityRoute>} />
        <Route path="finance/day-close" element={<CapabilityRoute capability="finance:view" requiresComponents><DayClosePage /></CapabilityRoute>} />

        <Route path="operations" element={<CapabilityRoute capability="operations:view"><OperationsPage /></CapabilityRoute>} />
        <Route path="reports" element={<CapabilityRoute capability="reports:view"><ReportsPage /></CapabilityRoute>} />
        <Route path="settings" element={<CapabilityRoute capability="settings:view"><SettingsPage /></CapabilityRoute>} />
        <Route path="settings/audit" element={<CapabilityRoute capability="settings:view"><AuditLogPage /></CapabilityRoute>} />
        <Route path="settings/gst" element={<CapabilityRoute capability="settings:view"><GstSettingsPage /></CapabilityRoute>} />
        <Route path="print" element={<DocumentPrintPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
