import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Users, TrendingUp, DollarSign, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};
const API = '/api';

const STATUS_STYLES = {
  new: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  contacted: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  qualified: 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30',
  closed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

const TYPE_LABELS = { contact: 'Contact', test_drive: 'Test Drive', financing: 'Financing', trade_in: 'Trade-In', exit_intent: 'Exit Intent' };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/stats`, { withCredentials: true }),
      axios.get(`${API}/leads`, { withCredentials: true })
    ]).then(([statsRes, leadsRes]) => {
      setStats(statsRes.data);
      const leads = Array.isArray(leadsRes.data) ? leadsRes.data.slice(0, 5) : [];
      setRecentLeads(leads);
    }).catch(err => console.error("Dashboard fetch failed:", err))
    .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Vehicles', value: stats.total_vehicles, icon: Car, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', link: '/admin/inventory' },
    { label: 'Available', value: stats.available, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/admin/inventory' },
    { label: 'Total Leads', value: stats.total_leads, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/admin/leads' },
    { label: 'Total Views', value: stats.total_views || 0, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/admin/analytics' },
    { label: 'Total Clicks', value: stats.total_clicks || 0, icon: DollarSign, color: 'text-pink-400', bg: 'bg-pink-500/10', link: '/admin/analytics' },
    { label: 'Recent Leads', value: stats.recent_leads, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', link: '/admin/leads' },
  ] : [];

  return (
    <AdminLayout title="Operations Hub">
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading ? (
            [...Array(6)].map((_, i) => <div key={i} className="h-28 bg-[#0A0A0A] border border-white/[0.05] animate-pulse" />)
          ) : (
            statCards.map((card, i) => (
              <div key={card.label} className="group">
                <Link to={card.link} className="block bg-[#0A0A0A] border border-white/[0.05] hover:border-[#D4AF37]/30 p-5 transition-all">
                  <div className={`w-9 h-9 ${card.bg} flex items-center justify-center mb-4`}>
                    {SAFE_ICON(card.icon, { size: 18, className: card.color })}
                  </div>
                  <p className={`font-heading text-3xl font-bold ${card.color} mb-1 tracking-tight`}>{card.value}</p>
                  <p className="text-white/35 text-[10px] font-heading uppercase tracking-widest">{card.label}</p>
                </Link>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/inventory" className="bg-[#0A0A0A] border border-white/[0.05] hover:border-[#D4AF37]/30 p-6 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#D4AF37]/10 flex items-center justify-center">{SAFE_ICON(Car, { size: 18, className: "text-[#D4AF37]" })}</div>
              <div><p className="font-heading text-white text-sm font-medium">Manage Inventory</p><p className="text-white/30 text-xs">Add/Edit listings</p></div>
            </div>
            {SAFE_ICON(ArrowRight, { size: 16, className: "text-white/20 group-hover:text-[#D4AF37]" })}
          </Link>

          <Link to="/admin/leads" className="bg-[#0A0A0A] border border-white/[0.05] hover:border-blue-500/30 p-6 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center">{SAFE_ICON(Users, { size: 18, className: "text-blue-400" })}</div>
              <div><p className="font-heading text-white text-sm font-medium">View Leads</p><p className="text-white/30 text-xs">{stats?.new_leads || 0} waiting</p></div>
            </div>
            {SAFE_ICON(ArrowRight, { size: 16, className: "text-white/20 group-hover:text-blue-400" })}
          </Link>
          
          <Link to="/" className="bg-[#0A0A0A] border border-white/[0.05] hover:border-emerald-500/30 p-6 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center">{SAFE_ICON(TrendingUp, { size: 18, className: "text-emerald-400" })}</div>
              <div><p className="font-heading text-white text-sm font-medium">Live Site</p><p className="text-white/30 text-xs">View public view</p></div>
            </div>
            {SAFE_ICON(ArrowRight, { size: 16, className: "text-white/20 group-hover:text-emerald-400" })}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#0A0A0A] border border-white/[0.05]">
            <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <h2 className="font-heading text-sm font-medium text-white">Recent Leads</h2>
              <Link to="/admin/leads" className="text-[10px] text-[#D4AF37] uppercase tracking-widest hover:underline">View All</Link>
            </div>
            {!recentLeads.length ? <div className="p-8 text-center text-white/30 text-xs">No leads yet.</div> : (
              <div className="divide-y divide-white/[0.03]">
                {recentLeads.map(lead => (
                  <div key={lead._id || lead.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex-1 truncate">
                      <p className="text-white text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-white/25 text-[10px] uppercase mt-0.5">{new Date(lead.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-[10px] uppercase font-heading">{TYPE_LABELS[lead.lead_type] || lead.lead_type}</span>
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-tighter ${STATUS_STYLES[lead.status] || STATUS_STYLES.new}`}>{lead.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0A0A0A] border border-white/[0.05]">
            <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Market Intelligence</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-white/20 uppercase">Live Trends</span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Top Searches */}
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-heading mb-4">Top Edmonton Searches</p>
                <div className="space-y-3">
                  {stats?.top_searches?.length > 0 ? stats.top_searches.map((s, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] uppercase tracking-tighter">
                        <span className="text-white/60">{s.term}</span>
                        <span className="text-[#D4AF37]">{s.count} hits</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(s.count / stats.top_searches[0].count) * 100}%` }}
                          className="h-full bg-[#D4AF37]"
                        />
                      </div>
                    </div>
                  )) : <p className="text-white/10 text-[10px] italic">No search data yet...</p>}
                </div>
              </div>

              {/* Top Vehicles */}
              <div className="pt-6 border-t border-white/[0.03]">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-heading mb-4">High-Interest Inventory</p>
                <div className="space-y-4">
                  {stats?.top_vehicles?.length > 0 ? stats.top_vehicles.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <div className="w-10 h-7 bg-white/5 overflow-hidden">
                        <img src={v.images?.[0] || '/coming-soon-placeholder.png'} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[11px] font-medium truncate">{v.title}</p>
                        <p className="text-white/20 text-[9px] uppercase tracking-tighter">${v.price?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-[11px] font-bold">{v.views || 0}</p>
                        <p className="text-white/15 text-[8px] uppercase tracking-tighter">Views</p>
                      </div>
                    </div>
                  )) : <p className="text-white/10 text-[10px] italic">No vehicle views yet...</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
