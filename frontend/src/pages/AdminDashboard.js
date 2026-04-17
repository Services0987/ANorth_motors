import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, Users, TrendingUp, DollarSign, Plus, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const STATUS_STYLES = {
  new: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  contacted: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  qualified: 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30',
  closed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

const TYPE_LABELS = { contact: 'Contact', test_drive: 'Test Drive', financing: 'Financing', trade_in: 'Trade-In', exit_intent: 'Exit Intent' };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/stats`, { withCredentials: true })
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Vehicles', value: stats.total_vehicles, icon: Car, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', link: '/admin/inventory' },
    { label: 'Available', value: stats.available, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/admin/inventory' },
    { label: 'Sold', value: stats.sold, icon: XCircle, color: 'text-white/40', bg: 'bg-white/5', link: '/admin/leads' },
    { label: 'Total Leads', value: stats.total_leads, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/admin/leads' },
    { label: 'New Leads', value: stats.new_leads, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', link: '/admin/leads' },
    { label: 'Featured', value: stats.featured, icon: DollarSign, color: 'text-pink-400', bg: 'bg-pink-500/10', link: '/admin/inventory' },
  ] : [];

  return (
    <AdminLayout title="Operations Hub">
      <div className="space-y-8" data-testid="admin-dashboard">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading ? (
            [...Array(6)].map((_, i) => <div key={i} className="h-28 bg-[#0A0A0A] border border-white/[0.05] animate-pulse" />)
          ) : (
            statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="relative group cursor-pointer"
              >
                <Link to={card.link} className="block bg-[#0A0A0A] border border-white/[0.05] hover:border-[#D4AF37]/30 p-5 transition-all duration-300">
                  <div className={`w-9 h-9 ${card.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                    <card.icon size={18} className={card.color} />
                  </div>
                  <p className={`font-heading text-3xl font-bold ${card.color} mb-1 tracking-tight`}>{card.value}</p>
                  <p className="text-white/35 text-[10px] font-heading uppercase tracking-widest">{card.label}</p>
                </Link>
              </motion.div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/inventory" className="bg-[#0A0A0A] border border-white/[0.05] hover:border-[#D4AF37]/30 p-6 flex items-center justify-between transition-all duration-200 group" data-testid="quick-action-inventory">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#D4AF37]/10 flex items-center justify-center"><Car size={18} className="text-[#D4AF37]" /></div>
              <div><p className="font-heading text-white text-sm font-medium">Manage Inventory</p><p className="text-white/30 text-xs font-body">Add, edit or remove vehicles</p></div>
            </div>
            <ArrowRight size={16} className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
          </Link>

          <Link to="/admin/leads" className="bg-[#0A0A0A] border border-white/[0.05] hover:border-blue-500/30 p-6 flex items-center justify-between transition-all duration-200 group" data-testid="quick-action-leads">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center"><Users size={18} className="text-blue-400" /></div>
              <div><p className="font-heading text-white text-sm font-medium">View Leads</p><p className="text-white/30 text-xs font-body">{stats?.new_leads || 0} new leads waiting</p></div>
            </div>
            <ArrowRight size={16} className="text-white/20 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link to="/" target="_blank" className="bg-[#0A0A0A] border border-white/[0.05] hover:border-emerald-500/30 p-6 flex items-center justify-between transition-all duration-200 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={18} className="text-emerald-400" /></div>
              <div><p className="font-heading text-white text-sm font-medium">View Website</p><p className="text-white/30 text-xs font-body">See live public site</p></div>
            </div>
            <ArrowRight size={16} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
          </Link>
        </div>

        {/* Recent Leads */}
        <div className="bg-[#0A0A0A] border border-white/[0.05]">
          <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <h2 className="font-heading text-sm font-medium text-white">Recent Leads</h2>
            <Link to="/admin/leads" className="text-xs font-body text-white/30 hover:text-white transition-colors flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-white/30 font-body text-sm">Loading...</div>
          ) : !stats?.recent_leads?.length ? (
            <div className="p-8 text-center text-white/30 font-body text-sm">No leads yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {stats.recent_leads.map((lead) => (
                <div key={lead.id} className="px-6 py-4 flex items-center gap-4" data-testid={`recent-lead-${lead.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-white text-sm font-medium truncate">{lead.name}</p>
                    <p className="text-white/30 text-xs font-body">{lead.email}</p>
                  </div>
                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="text-white/50 text-xs font-body truncate">{lead.vehicle_title || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-xs font-body hidden lg:block">{TYPE_LABELS[lead.lead_type] || lead.lead_type}</span>
                    <span className={`px-2 py-0.5 text-xs font-body rounded-none ${STATUS_STYLES[lead.status] || STATUS_STYLES.new}`}>{lead.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
