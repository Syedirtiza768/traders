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
import PurchaseRequisitionDetailPage from './pages/PurchaseRequisitionDetailPage';
import SupplierQuotationsPage from './pages/SupplierQuotationsPage';
import SupplierQuotationDetailPage from './pages/SupplierQuotationDetailPage';
import CreatePurchaseInvoicePage from './pages/CreatePurchaseInvoicePage';
import CreatePurchaseOrderPage from './pages/CreatePurchaseOrderPage';
import CreatePurchaseRequisitionPage from './pages/CreatePurchaseRequisitionPage';
import CreateSupplierQuotationPage from './pages/CreateSupplierQuotationPage';
import CreatePurchaseReturnPage from './pages/CreatePurchaseReturnPage';
import CreatePurchaseReceiptPage from './pages/CreatePurchaseReceiptPage';
import InventoryPage from './pages/InventoryPage';
import InventoryItemDetailPage from './pages/InventoryItemDetailPage';
import CreateItemPage from './pages/CreateItemPage';
import ItemBundlesPage from './pages/ItemBundlesPage';
import WarehouseStockPage from './pages/WarehouseStockPage';
import StockMovementPage from './pages/StockMovementPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import EditCustomerPage from './pages/EditCustomerPage';
import CreateCustomerPage from './pages/CreateCustomerPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import EditSupplierPage from './pages/EditSupplierPage';
import CreateSupplierPage from './pages/CreateSupplierPage';
import FinancePage from './pages/FinancePage';
import JournalEntriesPage from './pages/JournalEntriesPage';
import JournalEntryDetailPage from './pages/JournalEntryDetailPage';
import CreateJournalEntryPage from './pages/CreateJournalEntryPage';
import PaymentEntriesPage from './pages/PaymentEntriesPage';
import PaymentEntryDetailPage from './pages/PaymentEntryDetailPage';
import CreatePaymentEntryPage from './pages/CreatePaymentEntryPage';
import OperationsPage from './pages/OperationsPage';
import DocumentPrintPage from './pages/DocumentPrintPage';
import GstSettingsPage from './pages/GstSettingsPage';
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
        <Route path="purchases/requisitions/:reqId" element={<PurchaseRequisitionDetailPage />} />
        <Route path="purchases/rfqs" element={<SupplierQuotationsPage />} />
        <Route path="purchases/rfqs/new" element={<CreateSupplierQuotationPage />} />
        <Route path="purchases/rfqs/:quotationId" element={<SupplierQuotationDetailPage />} />
        <Route path="purchases/:invoiceId" element={<PurchaseInvoiceDetailPage />} />

        {/* Inventory */}
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/items/new" element={<CreateItemPage />} />
        <Route path="inventory/items/:itemId" element={<InventoryItemDetailPage />} />
        <Route path="inventory/bundles" element={<ItemBundlesPage />} />
        <Route path="inventory/warehouse" element={<WarehouseStockPage />} />
        <Route path="inventory/movements" element={<StockMovementPage />} />
        <Route path="inventory/dispatches/new" element={<CreateSalesDispatchPage />} />

        {/* Customers */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/new" element={<CreateCustomerPage />} />
        <Route path="customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="customers/:customerId/edit" element={<EditCustomerPage />} />

        {/* Suppliers */}
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="suppliers/new" element={<CreateSupplierPage />} />
        <Route path="suppliers/:supplierId" element={<SupplierDetailPage />} />
        <Route path="suppliers/:supplierId/edit" element={<EditSupplierPage />} />

        {/* Finance */}
        <Route path="finance" element={<FinancePage />} />
        <Route path="finance/journals" element={<JournalEntriesPage />} />
        <Route path="finance/journals/new" element={<CreateJournalEntryPage />} />
        <Route path="finance/journals/:journalId" element={<JournalEntryDetailPage />} />
        <Route path="finance/payments" element={<PaymentEntriesPage />} />
        <Route path="finance/payments/new" element={<CreatePaymentEntryPage />} />
        <Route path="finance/payments/:paymentId" element={<PaymentEntryDetailPage />} />

        <Route path="operations" element={<OperationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/gst" element={<GstSettingsPage />} />
        <Route path="print" element={<DocumentPrintPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
