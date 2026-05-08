import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, Users, LogOut, Menu, X, ChevronRight, Settings, BarChart3, Bell, BellOff, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import SecurityModal from './SecurityModal';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon) return null;
  const Component = Icon;
  return <Component {...props} />;
};

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/inventory', icon: Car, label: 'Inventory' },
  { to: '/admin/leads', icon: Users, label: 'Leads' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Intelligence' },
  { to: '/admin/security', icon: Shield, label: 'Security' },
];

export const SafeLink = ({ to, children, ...props }) => {
  if (typeof Link !== 'undefined' && Link) return <Link to={to} {...props}>{children}</Link>;
  return <a href={to} {...props}>{children}</a>;
};

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Notifications State
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('admin_alerts') !== 'false');
  const [newLeadAlert, setNewLeadAlert] = useState(false);
  const [lastLeadId, setLastLeadId] = useState(() => localStorage.getItem('last_lead_id'));

  const API = '/api';

  // Lead Notification Engine
  const checkLeads = useCallback(async () => {
    if (!notificationsEnabled) return;
    try {
      const { data } = await axios.get(`${API}/leads`, { withCredentials: true });
      if (data && data.length > 0) {
        const latest = data[0]._id || data[0].id;
        if (latest !== lastLeadId) {
          setNewLeadAlert(true);
          setLastLeadId(latest);
          localStorage.setItem('last_lead_id', latest);
          
          if (Notification.permission === "granted") {
            new Notification("🚨 New AutoNorth Lead!", {
              body: `Incoming from: ${data[0].name || 'Visitor'}\nType: ${data[0].lead_type}`,
              icon: '/favicon.ico'
            });
          }

          if (window.AudioContext) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.connect(g); g.connect(ctx.destination);
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
          }
        }
      }
    } catch (err) { console.error('Lead sync error', err); }
  }, [lastLeadId, notificationsEnabled]);

  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(checkLeads, 30000);
    return () => clearInterval(timer);
  }, [checkLeads]);

  useEffect(() => {
    localStorage.setItem('admin_alerts', notificationsEnabled);
  }, [notificationsEnabled]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-white/[0.05] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#D4AF37] flex items-center justify-center font-heading font-bold text-black text-base">AN</div>
            <div>
              <p className="font-heading text-white text-xs tracking-widest uppercase font-semibold">AutoNorth</p>
              <p className="text-white/30 text-[10px] tracking-widest uppercase">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <SafeLink
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-all duration-200 ${
                      active
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-l-2 border-[#D4AF37]'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
                    }`}
                    data-testid={`admin-nav-${item.label.toLowerCase()}`}
                  >
                    {SAFE_ICON(item.icon, { size: 16, strokeWidth: 1.5 })}
                    <span>{item.label}</span>
                    {active && <ChevronRight size={14} className="ml-auto" />}
                  </SafeLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/[0.05]">
          <div className="flex items-center justify-between px-3 py-2 mb-2 group">
            <div className="overflow-hidden">
              <p className="text-white/50 text-xs font-body truncate">{user?.email}</p>
              <p className="text-white/20 text-[10px] font-body uppercase tracking-wider">Administrator</p>
            </div>
            <button 
              onClick={() => setSecurityModalOpen(true)}
              className="text-white/20 hover:text-[#D4AF37] transition-colors p-1"
              title="Intelligence & Security Engine"
            >
              <Settings size={16} />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body text-white/40 hover:text-red-400 hover:bg-red-500/[0.05] transition-all duration-200"
            data-testid="admin-logout-btn"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-white/50">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="font-heading text-white font-medium text-lg tracking-tight">{title}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 border-r border-white/5 pr-6">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-heading text-white/20 uppercase tracking-[0.2em] mb-0.5">Live Alerts</span>
                <span className={`text-[10px] font-heading font-bold uppercase tracking-widest ${notificationsEnabled ? 'text-emerald-400' : 'text-white/20'}`}>
                  {notificationsEnabled ? 'Active' : 'Muted'}
                </span>
              </div>
              <button 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`p-2.5 rounded-full transition-all duration-300 relative ${notificationsEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/20 border border-transparent hover:border-white/10'}`}
              >
                {SAFE_ICON(notificationsEnabled ? Bell : BellOff, { size: 18 })}
                {newLeadAlert && (
                  <motion.span 
                    animate={{ scale: [1, 1.4, 1] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black" 
                  />
                )}
              </button>
            </div>

            <SafeLink to="/" className="text-white/30 hover:text-white/60 text-xs font-body tracking-wider uppercase transition-colors">
              View Site
            </SafeLink>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

      <SecurityModal isOpen={securityModalOpen} onClose={() => setSecurityModalOpen(false)} />
    </div>
  );
}
