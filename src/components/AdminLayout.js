import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, Users, LogOut, Menu, X, ChevronRight, Settings, Pencil, CheckCircle, BarChart3, ShieldAlert, Activity, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

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
  { to: '/admin/security', icon: ShieldAlert, label: 'Security' },
];

const SafeLink = ({ to, children, ...props }) => {
  if (typeof Link !== 'undefined') return <Link to={to} {...props}>{children}</Link>;
  return <a href={to} {...props}>{children}</a>;
};

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Security & AI State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityForm, setSecurityForm] = useState({ email: user?.email || '', password: '', confirm: '' });
  const [aiForm, setAiForm] = useState({ ai_provider: 'local', ai_api_key: '', ai_model: '' });
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState(false);

  const [aiHealth, setAiHealth] = useState({ status: 'online', error: '', last_active: null });

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
          
          // NATIVE OS NOTIFICATION (The 'Killer' Upgrade)
          if (Notification.permission === "granted") {
            new Notification("🚨 New AutoNorth Lead!", {
              body: `Incoming from: ${data[0].name || 'Visitor'}\nType: ${data[0].lead_type}`,
              icon: '/favicon.ico'
            });
          }

          // Audible Alert
          if (window.AudioContext) {
            const ctx = new AudioContext();
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

  // Request Notification Permission on Mount
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

  const fetchSettings = React.useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      if (data) {
        setAiForm({ 
          ai_provider: data.ai_provider || 'local', 
          ai_api_key: data.ai_api_key || '',
          ai_model: data.ai_model || '' 
        });
        setAiHealth({
          status: data.ai_health || 'online',
          error: data.ai_error || '',
          last_active: data.last_active
        });
      }
    } catch (err) { console.error(err); }
  }, []);

  React.useEffect(() => { if (showSecurityModal) fetchSettings(); }, [showSecurityModal, fetchSettings]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (securityForm.password && securityForm.password !== securityForm.confirm) {
      return setSecurityError("Passwords do not match");
    }
    setSecuritySaving(true); setSecurityError(''); setSecuritySuccess(false);
    try {
      await axios.put(`${API}/auth/profile`, { 
        email: securityForm.email, 
        password: securityForm.password || undefined 
      }, { withCredentials: true });
      
      await axios.put(`${API}/settings`, {
        ai_provider: aiForm.ai_provider,
        ai_api_key: aiForm.ai_api_key,
        ai_model: aiForm.ai_model
      }, { withCredentials: true });

      setSecuritySuccess(true);
      setTimeout(() => { setShowSecurityModal(false); setSecuritySuccess(false); }, 2000);
    } catch (err) { 
      setSecurityError(err.response?.data?.message || "Failed to update profile");
    } finally { setSecuritySaving(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  const Field = ({ label, children }) => (
    <div><label className="text-[10px] tracking-[0.15em] uppercase text-white/25 font-heading block mb-1.5">{label}</label>{children}</div>
  );
  const Input = ({ className = '', ...p }) => <input className={`bg-[#050505] border border-white/10 text-white w-full px-3 py-2.5 text-sm font-body focus:border-[#D4AF37]/50 outline-none transition-all ${className}`} {...p} />;
  const Sel = ({ options, ...p }) => (
    <div className="relative">
      <select className="bg-[#050505] border border-white/10 text-white w-full px-3 py-2.5 text-sm font-body appearance-none pr-8 focus:border-[#D4AF37]/50 outline-none transition-all" {...p}>
        {options.map(o => <option key={o} value={o} className="bg-[#0A0A0A]">{o}</option>)}
      </select>
      {SAFE_ICON(ChevronRight, { size: 12, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none rotate-90" })}
    </div>
  );

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
                    {active && SAFE_ICON(ChevronRight, { size: 14, className: "ml-auto" })}
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
              onClick={() => setShowSecurityModal(true)}
              className="text-white/20 hover:text-[#D4AF37] transition-colors p-1"
              title="Security & AI Settings"
            >
              {SAFE_ICON(Settings, { size: 16 })}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body text-white/40 hover:text-red-400 hover:bg-red-500/[0.05] transition-all duration-200"
            data-testid="admin-logout-btn"
          >
            {SAFE_ICON(LogOut, { size: 16, strokeWidth: 1.5 })}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-white/50">
              {sidebarOpen ? SAFE_ICON(X, { size: 20 }) : SAFE_ICON(Menu, { size: 20 })}
            </button>
            <h1 className="font-heading text-white font-medium text-lg tracking-tight">{title}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Live Alerts Toggle */}
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

        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>

        {/* Security & AI Modal */}
        <AnimatePresence>
          {showSecurityModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowSecurityModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#0A0A0A] border border-white/10 w-full max-w-md p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="font-heading text-xl font-semibold text-white tracking-tight">Security & AI Engine</h2>
                    <p className="text-white/35 text-xs font-body mt-1">Manage credentials and provider intelligence</p>
                  </div>
                  <button onClick={() => setShowSecurityModal(false)} className="text-white/20 hover:text-white transition-colors p-2">{SAFE_ICON(X, { size: 20 })}</button>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-6">
                  {securityError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body rounded-sm">{securityError}</div>}
                  {securitySuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-body rounded-sm">Settings updated successfully!</div>}
                  
                  <div className="space-y-4">
                    <Field label="Admin Email">
                      <Input type="email" value={securityForm.email} onChange={(e) => setSecurityForm({...securityForm, email: e.target.value})} placeholder="admin@autonorth.ca" required />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="New Password">
                        <Input type="password" value={securityForm.password} onChange={(e) => setSecurityForm({...securityForm, password: e.target.value})} placeholder="••••••••" />
                      </Field>
                      <Field label="Confirm">
                        <Input type="password" value={securityForm.confirm} onChange={(e) => setSecurityForm({...securityForm, confirm: e.target.value})} placeholder="••••••••" />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-white/[0.05]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-heading font-bold">AI Intelligence Engine</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${aiHealth.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : aiHealth.status === 'local' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className="text-[9px] text-white/40 uppercase tracking-tighter">
                          {aiHealth.status === 'online' ? 'Global Brain Active' : aiHealth.status === 'local' ? 'Local Intelligence' : 'System Error'}
                        </span>
                      </div>
                    </div>

                    {aiHealth.error && (
                      <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-sm mb-4">
                        <div className="flex gap-2">
                          {SAFE_ICON(Pencil, { size: 12, className: "text-red-400 mt-0.5" })}
                          <div>
                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight">Provider Error</p>
                            <p className="text-[9px] text-red-400/60 font-body mt-0.5">{aiHealth.error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Field label="Provider">
                      <Sel 
                        options={['local', 'gemini', 'claude', 'openrouter']} 
                        value={aiForm.ai_provider} 
                        onChange={(e) => setAiForm({...aiForm, ai_provider: e.target.value})} 
                      />
                    </Field>
                    {aiForm.ai_provider !== 'local' && (
                      <div className="space-y-4">
                        <Field label={`${aiForm.ai_provider.toUpperCase()} API Key`}>
                          <Input 
                            type="password" 
                            value={aiForm.ai_api_key} 
                            onChange={(e) => setAiForm({...aiForm, ai_api_key: e.target.value})} 
                            placeholder="Paste API Key here..." 
                          />
                        </Field>
                        <Field label="Specific Model (Optional)">
                          <Input 
                            type="text" 
                            value={aiForm.ai_model} 
                            onChange={(e) => setAiForm({...aiForm, ai_model: e.target.value})} 
                            placeholder={aiForm.ai_provider === 'openrouter' ? 'google/gemini-flash-1.5-free' : 'e.g. gpt-4, claude-3...'} 
                          />
                        </Field>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-white/15 font-body italic">
                        * Pulse: {aiHealth.last_active ? new Date(aiHealth.last_active).toLocaleTimeString() : 'No activity yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowSecurityModal(false)} className="flex-1 px-6 py-3 border border-white/10 text-white/40 text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                    <button type="submit" disabled={securitySaving} className="flex-2 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black px-8 py-3 text-[10px] font-bold uppercase tracking-widest transition-all">
                      {securitySaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
