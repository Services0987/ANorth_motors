import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Monitor, Smartphone, LogOut, Trash2, ShieldAlert, RefreshCw, Globe, AlertTriangle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const API = '/api';

export default function AdminSecurity() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [blockForm, setBlockForm] = useState({ ip: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [sessionsRes, blacklistRes] = await Promise.all([
        axios.get(`${API}/auth/sessions`, { withCredentials: true }),
        axios.get(`${API}/auth/blacklist`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setSessions(sessionsRes.data || []);
      setBlacklist(blacklistRes.data || []);
    } catch (err) {
      console.error("Failed to fetch security data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const terminateSession = async (id) => {
    if (id === 'current') {
      alert("You cannot terminate your current session. Please use the logout button in the sidebar.");
      return;
    }
    try {
      await axios.post(`${API}/auth/sessions/terminate?session_id=${id}`, {}, { withCredentials: true });
      fetchData();
    } catch (err) { alert("Failed to terminate session"); }
  };

  const handleBlock = async (e) => {
    e.preventDefault();
    if (!blockForm.ip) return;
    setSaving(true);
    try {
      await axios.post(`${API}/auth/blacklist`, blockForm, { withCredentials: true });
      setBlockForm({ ip: '', reason: '' });
      fetchData();
    } catch (err) { alert("Failed to block IP"); }
    finally { setSaving(false); }
  };

  const unblockIp = async (ip) => {
    try {
      await axios.delete(`${API}/auth/blacklist?ip=${ip}`, { withCredentials: true });
      fetchData();
    } catch (err) { alert("Failed to unblock IP"); }
  };

  if (loading) return (
    <AdminLayout title="Security Guard">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Security Guard">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Active Sessions */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Globe size={18} className="text-emerald-400" />
            <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Active Admin Sessions</h2>
          </div>
          
          <div className="space-y-4">
            {sessions.map((s, idx) => (
              <div key={idx} className="bg-[#0A0A0A] border border-white/[0.05] p-5 flex items-center justify-between group hover:border-[#D4AF37]/20 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white/[0.03] flex items-center justify-center text-white/20">
                    {s.user_agent?.toLowerCase().includes('mobile') ? <Smartphone size={22} /> : <Monitor size={22} />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold font-heading mb-1">{s.ip}</p>
                    <p className="text-white/30 text-[10px] font-body truncate max-w-[200px] md:max-w-[300px] mb-1">{s.user_agent}</p>
                    <div className="flex items-center gap-1.5 text-[9px] text-white/20 uppercase tracking-wider">
                      <RefreshCw size={10} className="text-emerald-400/40" />
                      LOGIN: {new Date(s.created_at || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => terminateSession(s._id || s.id)}
                  className="px-4 py-2 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold font-heading uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="bg-[#0A0A0A] border border-white/[0.05] border-dashed p-12 flex flex-col items-center justify-center text-center">
                <Shield className="w-12 h-12 text-white/5 mb-4" />
                <p className="text-white/20 text-xs font-body uppercase tracking-widest">No active external sessions</p>
              </div>
            )}
          </div>
        </div>

        {/* IP Blocking & Blacklist */}
        <div className="space-y-8">
          {/* Block Form */}
          <div className="bg-[#0A0A0A] border border-white/[0.05] p-6 space-y-6">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-red-500" />
              <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Block Suspicious IP</h2>
            </div>
            
            <form onSubmit={handleBlock} className="space-y-4">
              <div>
                <input 
                  type="text"
                  placeholder="Enter IP Address (e.g. 192.168.1.1)"
                  className="w-full bg-black border border-white/10 text-white px-4 py-4 text-sm focus:border-red-500 outline-none font-body"
                  value={blockForm.ip}
                  onChange={(e) => setBlockForm({...blockForm, ip: e.target.value})}
                  required
                />
              </div>
              <div>
                <input 
                  type="text"
                  placeholder="Reason for blocking"
                  className="w-full bg-black border border-white/10 text-white px-4 py-4 text-sm focus:border-red-500 outline-none font-body"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({...blockForm, reason: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-heading text-[10px] font-bold uppercase tracking-widest py-5 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.2)]"
              >
                {saving ? <RefreshCw className="animate-spin" size={14} /> : 'Add to Blacklist'}
              </button>
            </form>
          </div>

          {/* Blacklisted IPs List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-white/20" />
                <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Blacklisted IPs ({blacklist.length})</h2>
              </div>
            </div>
            
            <div className="bg-[#0A0A0A] border border-white/[0.05] min-h-[150px] overflow-hidden">
              {blacklist.length > 0 ? (
                <div className="divide-y divide-white/[0.03]">
                  {blacklist.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between group hover:bg-white/[0.01]">
                      <div>
                        <p className="text-white font-heading text-xs font-bold mb-0.5">{item.ip}</p>
                        <p className="text-white/30 text-[10px] font-body italic">{item.reason || 'No reason provided'}</p>
                      </div>
                      <button 
                        onClick={() => unblockIp(item.ip)}
                        className="p-2 text-white/10 hover:text-red-500 transition-colors"
                        title="Remove from Blacklist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-center opacity-20">
                  <p className="text-[10px] uppercase tracking-widest font-heading mb-1">No IPs currently blocked</p>
                  <div className="w-12 h-0.5 bg-white/20" />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
