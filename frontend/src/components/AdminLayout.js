import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, Users, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon) return null;
  try {
    return <Icon {...props} />;
  } catch (e) {
    return null;
  }
};

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/inventory', icon: Car, label: 'Inventory' },
  { to: '/admin/leads', icon: Users, label: 'Leads' },
];

export default function AdminLayout({ children, title }) {
  const auth = useAuth() || {};
  const { user, logout } = auth;
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    if (logout) await logout();
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
              <p className="text-white/30 text-[10px] tracking-widest uppercase">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-all duration-200 ${
                      isActive ? 'text-[#D4AF37] bg-[#D4AF37]/5' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {SAFE_ICON(item.icon, { size: 16 })}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/[0.05]">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body text-white/40 hover:text-red-400 transition-all">
            {SAFE_ICON(LogOut, { size: 16 })}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-white/50" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? SAFE_ICON(X, { size: 20 }) : SAFE_ICON(Menu, { size: 20 })}
            </button>
            <h1 className="font-heading text-white font-medium text-lg">{title}</h1>
          </div>
          <Link to="/" className="text-white/30 hover:text-white text-xs uppercase tracking-widest">Site</Link>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
