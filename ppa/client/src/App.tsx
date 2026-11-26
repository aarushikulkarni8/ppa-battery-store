import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from './components/ui';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { SiteProvider, ShopOnly } from './context/SiteContext';
import { CustomerLayout } from './components/Layout';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Search from './pages/Search';
import ProductDetail from './pages/ProductDetail';
import Brands from './pages/Brands';
import BrandDetail from './pages/BrandDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Enquiry from './pages/Enquiry';
import Contact from './pages/Contact';
import Pcb from './pages/Pcb';
import NotFound from './pages/NotFound';
import AccountLayout, { MyBatteries, MyEnquiries, MyOrderDetail, MyOrders, Profile, PurchaseHistoryTab, WarrantyTab, ChangePassword } from './pages/Account';
import AdminLayout, { AdminProvider } from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Customers, { CustomerDetail } from './pages/admin/Customers';
import Orders, { OrderDetail } from './pages/admin/Orders';
import Products from './pages/admin/Products';
import ProductForm from './pages/admin/ProductForm';
import AdminBrands from './pages/admin/Brands';
import Import from './pages/admin/Import';
import BulkPhotos from './pages/admin/BulkPhotos';
import StoreSale from './pages/admin/StoreSale';
import Reminders from './pages/admin/Reminders';
import PcbOrders, { PcbOrderDetail } from './pages/admin/PcbOrders';
import Enquiries, { EnquiryDetail } from './pages/admin/Enquiries';

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));

export default function App() {
  return (
    <SiteProvider>
    <ToastProvider>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <AdminProvider>
              <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route element={<AdminLayout />}>
                  <Route index element={<Suspense fallback={<Spinner />}><Dashboard /></Suspense>} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:orderId" element={<OrderDetail />} />
                  <Route path="sales/new" element={<StoreSale />} />
                  <Route path="reminders" element={<Reminders />} />
                  <Route path="pcb-orders" element={<PcbOrders />} />
                  <Route path="pcb-orders/:id" element={<PcbOrderDetail />} />
                  <Route path="products" element={<Products />} />
                  <Route path="products/new" element={<ProductForm />} />
                  <Route path="products/:id" element={<ProductForm />} />
                  <Route path="brands" element={<AdminBrands />} />
                  <Route path="import" element={<Import />} />
                  <Route path="photos" element={<BulkPhotos />} />
                  <Route path="enquiries" element={<Enquiries />} />
                  <Route path="enquiries/:id" element={<EnquiryDetail />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
              </Routes>
            </AdminProvider>
          }
        />
        <Route
          path="/*"
          element={
            <AuthProvider>
              <CartProvider>
                <Routes>
                  <Route path="login" element={<Login />} />
                  <Route path="welcome" element={<Welcome />} />
                  <Route path="reset-password" element={<ResetPassword />} />
                  <Route element={<CustomerLayout />}>
                    <Route index element={<Home />} />
                    <Route path="search" element={<Search />} />
                    <Route path="product/:slug" element={<ProductDetail />} />
                    <Route path="find-my-battery" element={<Navigate to="/search?q=automotive" replace />} />
                    <Route path="brands" element={<Brands />} />
                    <Route path="brands/:slug" element={<BrandDetail />} />
                    <Route path="cart" element={<ShopOnly><Cart /></ShopOnly>} />
                    <Route path="checkout" element={<ShopOnly><Checkout /></ShopOnly>} />
                    <Route path="orders/:orderId/confirmed" element={<ShopOnly><OrderConfirmed /></ShopOnly>} />
                    <Route path="enquiry" element={<Enquiry />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="pcb" element={<Pcb />} />
                    <Route path="account" element={<AccountLayout />}>
                      <Route index element={<><Profile /><ChangePassword /></>} />
                      <Route path="orders" element={<MyOrders />} />
                      <Route path="orders/:orderId" element={<MyOrderDetail />} />
                      <Route path="purchases" element={<PurchaseHistoryTab />} />
                      <Route path="batteries" element={<MyBatteries />} />
                      <Route path="warranty" element={<WarrantyTab />} />
                      <Route path="enquiries" element={<MyEnquiries />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </CartProvider>
            </AuthProvider>
          }
        />
      </Routes>
    </ToastProvider>
    </SiteProvider>
  );
}
