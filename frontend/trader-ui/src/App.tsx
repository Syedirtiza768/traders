import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AccessDenied from './components/AccessDenied';
import { hasCapability, type AppCapability } from './lib/permissions';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import CreateSalesInvoicePage from './pages/CreateSalesInvoicePage';
import CreateSalesReturnPage from './pages/CreateSalesReturnPage';
import CreateSalesDispatchPage from './pages/CreateSalesDispatchPage';
import SalesInvoiceDetailPage from './pages/SalesInvoiceDetailPage';
import QuotationsPage from './pages/QuotationsPage';
import QuotationDetailPage from './pages/QuotationDetailPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import CreateSalesOrderPage from './pages/CreateSalesOrderPage';
import SalesOrderDetailPage from './pages/SalesOrderDetailPage';
import PurchasesPage from './pages/PurchasesPage';
import CreatePurchaseInvoicePage from './pages/CreatePurchaseInvoicePage';
import CreatePurchaseReceiptPage from './pages/CreatePurchaseReceiptPage';
import PurchaseInvoiceDetailPage from './pages/PurchaseInvoiceDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseRequisitionsPage from './pages/PurchaseRequisitionsPage';
import CreatePurchaseOrderPage from './pages/CreatePurchaseOrderPage';
import CreatePurchaseRequisitionPage from './pages/CreatePurchaseRequisitionPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import SupplierQuotationsPage from './pages/SupplierQuotationsPage';
import CreateSupplierQuotationPage from './pages/CreateSupplierQuotationPage';
import SupplierQuotationDetailPage from './pages/SupplierQuotationDetailPage';
import InventoryPage from './pages/InventoryPage';
import InventoryItemDetailPage from './pages/InventoryItemDetailPage';
import WarehouseStockPage from './pages/WarehouseStockPage';
import StockMovementPage from './pages/StockMovementPage';
import CustomerOutstandingPage from './pages/CustomerOutstandingPage';
import CustomerAgingPage from './pages/CustomerAgingPage';
import CustomersPage from './pages/CustomersPage';
import CreateCustomerPage from './pages/CreateCustomerPage';
import SuppliersPage from './pages/SuppliersPage';
import CreateSupplierPage from './pages/CreateSupplierPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import FinancePage from './pages/FinancePage';
import OperationsPage from './pages/OperationsPage';
import PaymentEntriesPage from './pages/PaymentEntriesPage';
import PaymentEntryDetailPage from './pages/PaymentEntryDetailPage';
import CreatePaymentEntryPage from './pages/CreatePaymentEntryPage';
import JournalEntriesPage from './pages/JournalEntriesPage';
import CreateJournalEntryPage from './pages/CreateJournalEntryPage';
import JournalEntryDetailPage from './pages/JournalEntryDetailPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import EditCustomerPage from './pages/EditCustomerPage';
import EditSupplierPage from './pages/EditSupplierPage';
import CreateQuotationPage from './pages/CreateQuotationPage';
import CreateItemPage from './pages/CreateItemPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="spinner" />
          Restoring your session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function CapabilityRoute({ children, capability }: { children: React.ReactNode; capability: AppCapability }) {
  const roles = useAuthStore((state) => state.roles);

  if (!hasCapability(roles, capability)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

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
        <Route index element={<CapabilityRoute capability="dashboard:view"><DashboardPage /></CapabilityRoute>} />
        <Route path="sales" element={<CapabilityRoute capability="sales:view"><SalesPage /></CapabilityRoute>} />
        <Route path="sales/quotations" element={<CapabilityRoute capability="sales:view"><QuotationsPage /></CapabilityRoute>} />
        <Route path="sales/quotations/new" element={<CapabilityRoute capability="sales:view"><CreateQuotationPage /></CapabilityRoute>} />
        <Route path="sales/quotations/:quotationId" element={<CapabilityRoute capability="sales:view"><QuotationDetailPage /></CapabilityRoute>} />
        <Route path="sales/orders" element={<CapabilityRoute capability="sales:view"><SalesOrdersPage /></CapabilityRoute>} />
        <Route path="sales/orders/new" element={<CapabilityRoute capability="sales:view"><CreateSalesOrderPage /></CapabilityRoute>} />
        <Route path="sales/orders/:orderId" element={<CapabilityRoute capability="sales:view"><SalesOrderDetailPage /></CapabilityRoute>} />
        <Route path="sales/new" element={<CapabilityRoute capability="sales:view"><CreateSalesInvoicePage /></CapabilityRoute>} />
  <Route path="sales/returns/new" element={<CapabilityRoute capability="sales:view"><CreateSalesReturnPage /></CapabilityRoute>} />
        <Route path="sales/:invoiceId" element={<CapabilityRoute capability="sales:view"><SalesInvoiceDetailPage /></CapabilityRoute>} />
        <Route path="purchases" element={<CapabilityRoute capability="purchases:view"><PurchasesPage /></CapabilityRoute>} />
  <Route path="purchases/requisitions" element={<CapabilityRoute capability="purchases:view"><PurchaseRequisitionsPage /></CapabilityRoute>} />
  <Route path="purchases/requisitions/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseRequisitionPage /></CapabilityRoute>} />
        <Route path="purchases/orders" element={<CapabilityRoute capability="purchases:view"><PurchaseOrdersPage /></CapabilityRoute>} />
        <Route path="purchases/orders/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseOrderPage /></CapabilityRoute>} />
        <Route path="purchases/orders/:orderId" element={<CapabilityRoute capability="purchases:view"><PurchaseOrderDetailPage /></CapabilityRoute>} />
  <Route path="purchases/rfqs" element={<CapabilityRoute capability="purchases:view"><SupplierQuotationsPage /></CapabilityRoute>} />
  <Route path="purchases/rfqs/new" element={<CapabilityRoute capability="purchases:view"><CreateSupplierQuotationPage /></CapabilityRoute>} />
  <Route path="purchases/rfqs/:rfqId" element={<CapabilityRoute capability="purchases:view"><SupplierQuotationDetailPage /></CapabilityRoute>} />
        <Route path="purchases/new" element={<CapabilityRoute capability="purchases:view"><CreatePurchaseInvoicePage /></CapabilityRoute>} />
        <Route path="purchases/:invoiceId" element={<CapabilityRoute capability="purchases:view"><PurchaseInvoiceDetailPage /></CapabilityRoute>} />
        <Route path="inventory" element={<CapabilityRoute capability="inventory:view"><InventoryPage /></CapabilityRoute>} />
        <Route path="inventory/items/new" element={<CapabilityRoute capability="inventory:execute"><CreateItemPage /></CapabilityRoute>} />
        <Route path="inventory/items/:itemId" element={<CapabilityRoute capability="inventory:view"><InventoryItemDetailPage /></CapabilityRoute>} />
        <Route path="inventory/warehouses/:warehouseId" element={<CapabilityRoute capability="inventory:view"><WarehouseStockPage /></CapabilityRoute>} />
        <Route path="inventory/movements" element={<CapabilityRoute capability="inventory:view"><StockMovementPage /></CapabilityRoute>} />
  <Route path="inventory/dispatches/new" element={<CapabilityRoute capability="inventory:execute"><CreateSalesDispatchPage /></CapabilityRoute>} />
  <Route path="inventory/receipts/new" element={<CapabilityRoute capability="inventory:execute"><CreatePurchaseReceiptPage /></CapabilityRoute>} />
        <Route path="finance/customer-outstanding" element={<CapabilityRoute capability="finance:view"><CustomerOutstandingPage /></CapabilityRoute>} />
        <Route path="finance/customer-aging" element={<CapabilityRoute capability="finance:view"><CustomerAgingPage /></CapabilityRoute>} />
        <Route path="finance/payments" element={<CapabilityRoute capability="finance:view"><PaymentEntriesPage /></CapabilityRoute>} />
        <Route path="finance/payments/new" element={<CapabilityRoute capability="finance:view"><CreatePaymentEntryPage /></CapabilityRoute>} />
        <Route path="finance/payments/:paymentId" element={<CapabilityRoute capability="finance:view"><PaymentEntryDetailPage /></CapabilityRoute>} />
        <Route path="finance/journals" element={<CapabilityRoute capability="finance:view"><JournalEntriesPage /></CapabilityRoute>} />
        <Route path="finance/journals/new" element={<CapabilityRoute capability="finance:view"><CreateJournalEntryPage /></CapabilityRoute>} />
        <Route path="finance/journals/:journalId" element={<CapabilityRoute capability="finance:view"><JournalEntryDetailPage /></CapabilityRoute>} />
        <Route path="customers" element={<CapabilityRoute capability="customers:view"><CustomersPage /></CapabilityRoute>} />
        <Route path="customers/new" element={<CapabilityRoute capability="customers:view"><CreateCustomerPage /></CapabilityRoute>} />
        <Route path="customers/:customerId/edit" element={<CapabilityRoute capability="customers:view"><EditCustomerPage /></CapabilityRoute>} />
        <Route path="customers/:customerId" element={<CapabilityRoute capability="customers:view"><CustomerDetailPage /></CapabilityRoute>} />
        <Route path="suppliers" element={<CapabilityRoute capability="suppliers:view"><SuppliersPage /></CapabilityRoute>} />
        <Route path="suppliers/new" element={<CapabilityRoute capability="suppliers:view"><CreateSupplierPage /></CapabilityRoute>} />
        <Route path="suppliers/:supplierId/edit" element={<CapabilityRoute capability="suppliers:view"><EditSupplierPage /></CapabilityRoute>} />
        <Route path="suppliers/:supplierId" element={<CapabilityRoute capability="suppliers:view"><SupplierDetailPage /></CapabilityRoute>} />
        <Route path="finance" element={<CapabilityRoute capability="finance:view"><FinancePage /></CapabilityRoute>} />
        <Route path="operations" element={<CapabilityRoute capability="operations:view"><OperationsPage /></CapabilityRoute>} />
        <Route path="reports" element={<CapabilityRoute capability="reports:view"><ReportsPage /></CapabilityRoute>} />
        <Route path="settings" element={<CapabilityRoute capability="settings:view"><SettingsPage /></CapabilityRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
