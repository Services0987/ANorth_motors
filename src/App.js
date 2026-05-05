import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { PersonalizationProvider } from './contexts/PersonalizationProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ChatBot from './components/ChatBot';

// Lazy load pages for maximum performance (SEO Interactivity)
const Home = lazy(() => import('./pages/Home'));
const Inventory = lazy(() => import('./pages/Inventory'));
const VehicleDetail = lazy(() => import('./pages/VehicleDetail'));
const Financing = lazy(() => import('./pages/Financing'));
const Contact = lazy(() => import('./pages/Contact'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminInventory = lazy(() => import('./pages/AdminInventory'));
const AdminLeads = lazy(() => import('./pages/AdminLeads'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminSecurity = lazy(() => import('./pages/AdminSecurity'));
const Showroom = lazy(() => import('./components/Showroom'));

// Loading fallback with premium aesthetic
const PageLoader = () => (
  <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[9999]">
    <div className="flex flex-col items-center gap-6">
      <div className="w-12 h-12 border-t-2 border-[#D4AF37] border-r-2 border-transparent rounded-full animate-spin" />
      <span className="text-[#D4AF37] font-heading text-[10px] uppercase tracking-[0.4em] animate-pulse">Initializing Excellence</span>
    </div>
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  return (
    <>
      <ScrollToTop />
      {!isAdmin && <ChatBot />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/vehicle/:id" element={<VehicleDetail />} />
          <Route path="/financing" element={<Financing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/showroom" element={<Showroom />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute><AdminInventory /></ProtectedRoute>} />
          <Route path="/admin/leads" element={<ProtectedRoute><AdminLeads /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/security" element={<ProtectedRoute><AdminSecurity /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <PersonalizationProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </PersonalizationProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
