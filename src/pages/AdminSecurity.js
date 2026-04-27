import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { ShieldAlert, Smartphone, Monitor, Globe, X, Ban, ShieldCheck, Clock } from 'lucide-react';

const API = '/api';

export default function AdminSecurity() {
  const [sessions, setSessions] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockIp, setBlockIp] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const fetchData = async () => {
    try {
      const [sessRes, blackRes] = await Promise.all([
        axios.get(`${API}/auth/sessions`, { withCredentials: true }),
        axios.get(`${API}/security/blacklist`, { withCredentials: true })
      ]);
      setSessions(sessRes.data);
      setBlacklist(blackRes.data);
    } catch (err) { console.error("Security fetch failed:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const terminateSession = async (id) => {
    try {
      await axios.post(`${API}/auth/sessions/terminate?session_id=${id}`, {}, { withCredentials: true });
      fetchData();
    } catch (err) { alert("Failed to terminate session"); }
  };

  const handleBlock = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/security/blacklist`, { ip: blockIp, reason: blockReason }, { withCredentials: true });
      setBlockIp(''); setBlockReason('');
      fetchData();
    } catch (err) { alert("Failed to block IP"); }
  };

  if (loading) return <AdminLayout title="Security"><div className="animate-pulse space-y-4"><div className="h-40 bg-white/5" /><div className="h-40 bg-white/5" /></div></AdminLayout>;

  return (
    <AdminLayout title="Security Guard">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Active Sessions */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="text-emerald-400" size={18} />
            <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Active Admin Sessions</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/[0.05] divide-y divide-white/[0.03]">
            {sessions.map(s => (
              <div key={s._id} className="p-5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 flex items-center justify-center text-white/30">
                    {s.user_agent.toLowerCase().includes('mobile') ? <Smartphone size={18} /> : <Monitor size={18} />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium font-body">{s.ip}</p>
                    <p className="text-white/20 text-[10px] font-body truncate max-w-[200px]">{s.user_agent}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Clock size={10} className="text-white/20" />
                        <span className="text-white/20 text-[9px] uppercase tracking-tighter">Login: {new Date(s.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => terminateSession(s._id)}
                  className="px-3 py-1.5 border border-red-500/20 text-red-400 text-[10px] font-heading uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  Logout
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* IP Blacklist Form */}
          <div className="bg-[#0A0A0A] border border-white/[0.05] p-6">
            <div className="flex items-center gap-3 mb-6">
                <Ban className="text-red-400" size={18} />
                <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Block suspicious IP</h2>
            </div>
            <form onSubmit={handleBlock} className="space-y-4">
              <input 
                className="w-full bg-black border border-white/10 px-4 py-3 text-sm text-white font-body focus:border-red-500/50 outline-none transition-all" 
                placeholder="Enter IP Address (e.g. 192.168.1.1)" 
                value={blockIp}
                onChange={e => setBlockIp(e.target.value)}
                required
              />
              <input 
                className="w-full bg-black border border-white/10 px-4 py-3 text-sm text-white font-body focus:border-red-500/50 outline-none transition-all" 
                placeholder="Reason for blocking" 
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
              />
              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-heading font-bold text-[10px] uppercase tracking-widest py-3 transition-all">
                Add to Blacklist
              </button>
            </form>
          </div>

          {/* Current Blacklist */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-white/30" size={18} />
              <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Blacklisted IPs ({blacklist.length})</h2>
            </div>
            {!blacklist.length ? (
              <div className="p-8 border border-dashed border-white/10 text-center text-white/20 text-xs">No IPs currently blocked.</div>
            ) : (
              <div className="bg-[#0A0A0A] border border-white/[0.05] divide-y divide-white/[0.03]">
                {blacklist.map(item => (
                  <div key={item._id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium font-body">{item.ip}</p>
                      <p className="text-white/25 text-[10px] font-body mt-0.5">{item.reason || "No reason specified"}</p>
                    </div>
                    <button className="text-white/20 hover:text-white p-2 transition-colors"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
