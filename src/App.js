import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatBot from './components/ChatBot';

import Home from './pages/Home';
import Inventory from './pages/Inventory';
import VehicleDetail from './pages/VehicleDetail';
import Financing from './pages/Financing';
import Contact from './pages/Contact';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminInventory from './pages/AdminInventory';
import AdminLeads from './pages/AdminLeads';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminSecurity from './pages/AdminSecurity';
import Showroom from './components/Showroom';

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
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
