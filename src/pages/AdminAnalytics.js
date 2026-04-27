import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { BarChart3, TrendingUp, MousePointerClick, Target, Eye, Activity } from 'lucide-react';

const API = '/api';

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics/summary`, { withCredentials: true })
      .then(res => setSummary(res.data))
      .catch(err => console.error("Analytics fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    window.location.href = `${API}/analytics/export`;
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure? This will permanently clear all tracking data for a fresh start.")) return;
    try {
      await axios.post(`${API}/analytics/reset`, {}, { withCredentials: true });
      window.location.reload();
    } catch (err) { alert("Failed to reset"); }
  };

  if (loading) return <AdminLayout title="Intelligence"><div className="animate-pulse space-y-4"><div className="h-40 bg-white/5" /><div className="h-80 bg-white/5" /></div></AdminLayout>;

  return (
    <AdminLayout title="Intelligence Engine">
      <div className="space-y-8">
        {/* Actions Bar */}
        <div className="flex justify-end gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#D4AF37]/50 text-[10px] font-heading uppercase tracking-widest transition-all"
          >
            Download CSV Report
          </button>
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-heading uppercase tracking-widest transition-all"
          >
            Reset Intelligence Data
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0A] border border-white/[0.05] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Eye size={20} />
              </div>
              <p className="text-white/35 text-[10px] font-heading uppercase tracking-widest">Global Reach</p>
            </div>
            <h3 className="text-white font-heading text-4xl font-bold">{summary?.total_views || 0}</h3>
            <p className="text-white/20 text-xs mt-2">Total vehicle impressions</p>
          </div>

          <div className="bg-[#0A0A0A] border border-white/[0.05] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-500/10 flex items-center justify-center text-pink-400">
                <MousePointerClick size={20} />
              </div>
              <p className="text-white/35 text-[10px] font-heading uppercase tracking-widest">Engagement</p>
            </div>
            <h3 className="text-white font-heading text-4xl font-bold">{(summary?.total_views > 0 ? (summary.top_vehicles.reduce((a,b)=>a+b.count,0) / summary.total_views * 100) : 0).toFixed(1)}%</h3>
            <p className="text-white/20 text-xs mt-2">Interaction click-through rate</p>
          </div>

          <div className="bg-[#0A0A0A] border border-white/[0.05] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <Target size={20} />
              </div>
              <p className="text-white/35 text-[10px] font-heading uppercase tracking-widest">Conversion</p>
            </div>
            <h3 className="text-white font-heading text-4xl font-bold">{(summary?.conversion_rate || 0).toFixed(1)}%</h3>
            <p className="text-white/20 text-xs mt-2">Leads generated per 100 views</p>
          </div>
        </div>

        {/* Top Vehicles Heatmap */}
        <div className="bg-[#0A0A0A] border border-white/[0.05]">
          <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">"Most Wanted" Inventory (Top Views)</h2>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-white/30 uppercase tracking-tighter">Live Heatmap</span>
            </div>
          </div>
          <div className="p-6">
            {!summary?.top_vehicles.length ? (
              <div className="text-center py-12 text-white/20 font-body text-sm italic">Awaiting more traffic data...</div>
            ) : (
              <div className="space-y-6">
                {summary.top_vehicles.map((v, i) => (
                  <div key={v._id} className="space-y-2 group">
                    <div className="flex justify-between items-end text-xs">
                      <div className="flex flex-col">
                        <span className="text-white font-heading font-medium text-sm group-hover:text-[#D4AF37] transition-colors">{v.title}</span>
                        <span className="text-white/30 font-body text-[10px] uppercase tracking-wider">VIN: {v.vin}</span>
                      </div>
                      <span className="text-[#D4AF37] font-heading font-bold">{v.count} Views</span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-none overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(v.count / summary.top_vehicles[0].count) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full bg-gradient-to-r from-[#D4AF37]/40 to-[#D4AF37]" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/10 flex gap-4 items-start">
            <Activity className="text-[#D4AF37] shrink-0 mt-0.5" size={16} />
            <div>
                <p className="text-[#D4AF37] font-heading text-[10px] uppercase font-bold tracking-widest">Strategy Insight</p>
                <p className="text-white/60 text-xs font-body mt-1 leading-relaxed">
                    Vehicles at the top of this list are your "hooks." Consider highlighting them on your homepage or using them as hero assets for better conversion. If a vehicle has high views but zero leads, check the pricing or image quality on its detail page.
                </p>
            </div>
        </div>
      </div>
    </AdminLayout>
  );
}
