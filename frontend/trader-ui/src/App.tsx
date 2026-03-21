import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import SalesInvoiceDetailPage from './pages/SalesInvoiceDetailPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import SalesOrderDetailPage from './pages/SalesOrderDetailPage';
import QuotationsPage from './pages/QuotationsPage';
import QuotationDetailPage from './pages/QuotationDetailPage';
import CreateSalesInvoicePage from './pages/CreateSalesInvoicePage';
import CreateSalesOrderPage from './pages/CreateSalesOrderPage';
import CreateQuotationPage from './pages/CreateQuotationPage';
import CreateSalesReturnPage from './pages/CreateSalesReturnPage';
import CreateSalesDispatchPage from './pages/CreateSalesDispatchPage';
import PurchasesPage from './pages/PurchasesPage';
import PurchaseInvoiceDetailPage from './pages/PurchaseInvoiceDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import PurchaseRequisitionsPage from './pages/PurchaseRequisitionsPage';
import SupplierQuotationsPage from './pages/SupplierQuotationsPage';
import SupplierQuotationDetailPage from './pages/SupplierQuotationDetailPage';
import CreatePurchaseInvoicePage from './pages/CreatePurchaseInvoicePage';
import CreatePurchaseOrderPage from './pages/CreatePurchaseOrderPage';
import CreatePurchaseRequisitionPage from './pages/CreatePurchaseRequisitionPage';
import CreateSupplierQuotationPage from './pages/CreateSupplierQuotationPage';
import CreatePurchaseReturnPage from './pages/CreatePurchaseReturnPage';
import CreatePurchaseReceiptPage from './pages/CreatePurchaseReceiptPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import FinancePage from './pages/FinancePage';
import ReportsPage from './pages/ReportsPageNew';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
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
        <Route index element={<DashboardPage />} />

        {/* Sales */}
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/new" element={<CreateSalesInvoicePage />} />
        <Route path="sales/returns/new" element={<CreateSalesReturnPage />} />
        <Route path="sales/dispatches/new" element={<CreateSalesDispatchPage />} />
        <Route path="sales/orders" element={<SalesOrdersPage />} />
        <Route path="sales/orders/new" element={<CreateSalesOrderPage />} />
        <Route path="sales/orders/:orderId" element={<SalesOrderDetailPage />} />
        <Route path="sales/quotations" element={<QuotationsPage />} />
        <Route path="sales/quotations/new" element={<CreateQuotationPage />} />
        <Route path="sales/quotations/:quotationId" element={<QuotationDetailPage />} />
        <Route path="sales/:invoiceId" element={<SalesInvoiceDetailPage />} />

        {/* Purchases */}
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<CreatePurchaseInvoicePage />} />
        <Route path="purchases/returns/new" element={<CreatePurchaseReturnPage />} />
        <Route path="purchases/receipts/new" element={<CreatePurchaseReceiptPage />} />
        <Route path="purchases/orders" element={<PurchaseOrdersPage />} />
        <Route path="purchases/orders/new" element={<CreatePurchaseOrderPage />} />
        <Route path="purchases/orders/:orderId" element={<PurchaseOrderDetailPage />} />
        <Route path="purchases/requisitions" element={<PurchaseRequisitionsPage />} />
        <Route path="purchases/requisitions/new" element={<CreatePurchaseRequisitionPage />} />
        <Route path="purchases/rfqs" element={<SupplierQuotationsPage />} />
        <Route path="purchases/rfqs/new" element={<CreateSupplierQuotationPage />} />
        <Route path="purchases/rfqs/:quotationId" element={<SupplierQuotationDetailPage />} />
        <Route path="purchases/:invoiceId" element={<PurchaseInvoiceDetailPage />} />

        <Route path="inventory" element={<InventoryPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
