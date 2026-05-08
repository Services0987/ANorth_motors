import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Bot, Key, User, Save, CheckCircle, AlertCircle, RefreshCw, Smartphone, Globe, Monitor, LogOut } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../contexts/AuthContext';

const API = '/api';

export default function AdminSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sessions, setSessions] = useState([]);

  const [aiForm, setAiForm] = useState({
    ai_provider: 'local',
    ai_api_key: '',
    ai_model: ''
  });

  const [securityForm, setSecurityForm] = useState({
    email: user?.email || '',
    password: '',
    confirm: ''
  });

  const fetchData = async () => {
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/settings`, { withCredentials: true }),
        axios.get(`${API}/auth/sessions`, { withCredentials: true })
      ]);
      
      if (settingsRes.data) {
        setAiForm({
          ai_provider: settingsRes.data.ai_provider || 'local',
          ai_api_key: settingsRes.data.ai_api_key || '',
          ai_model: settingsRes.data.ai_model || ''
        });
      }
      setSessions(sessionsRes.data);
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(`${API}/settings`, aiForm, { withCredentials: true });
      setMessage({ type: 'success', text: 'AI Intelligence settings updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update AI settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    if (securityForm.password && securityForm.password !== securityForm.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API}/auth/profile`, {
        email: securityForm.email,
        password: securityForm.password || undefined
      }, { withCredentials: true });
      setMessage({ type: 'success', text: 'Security profile updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const terminateSession = async (id) => {
    try {
      await axios.post(`${API}/auth/sessions/terminate?session_id=${id}`, {}, { withCredentials: true });
      fetchData();
    } catch (err) { alert("Failed to terminate session"); }
  };

  if (loading) return (
    <AdminLayout title="Settings">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Control Center">
      <div className="max-w-6xl space-y-8">
        {message.text && (
          <div className={`p-4 flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Configuration */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-3">
                <Bot size={18} className="text-[#D4AF37]" />
                <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">AI Intelligence Engine</h2>
                </div>
                <form onSubmit={handleAiSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 font-heading">Provider</label>
                    <select 
                        className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none"
                        value={aiForm.ai_provider}
                        onChange={(e) => setAiForm({...aiForm, ai_provider: e.target.value})}
                    >
                        <option value="local">Local Synthesis (Basic)</option>
                        <option value="openrouter">OpenRouter (Multi-Model)</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="claude">Anthropic Claude</option>
                    </select>
                    </div>

                    {aiForm.ai_provider !== 'local' && (
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 font-heading">Preferred Model</label>
                        <input 
                        type="text"
                        placeholder={aiForm.ai_provider === 'openrouter' ? 'google/gemini-flash-1.5-free' : 'gemini-1.5-flash'}
                        className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none"
                        value={aiForm.ai_model}
                        onChange={(e) => setAiForm({...aiForm, ai_model: e.target.value})}
                        />
                    </div>
                    )}
                </div>

                {aiForm.ai_provider !== 'local' && (
                    <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 font-heading">API Key</label>
                    <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                        <input 
                        type="password"
                        placeholder="sk-..."
                        className="w-full bg-black border border-white/10 text-white pl-12 pr-4 py-3 text-sm focus:border-[#D4AF37] outline-none"
                        value={aiForm.ai_api_key}
                        onChange={(e) => setAiForm({...aiForm, ai_api_key: e.target.value})}
                        />
                    </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-gold w-full py-4 flex items-center justify-center gap-2"
                >
                    {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                    Apply Intelligence Changes
                </button>
                </form>
            </div>

            {/* Active Sessions */}
            <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-3">
                <Globe size={18} className="text-emerald-400" />
                <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Active Access Sessions</h2>
                </div>
                <div className="divide-y divide-white/[0.03]">
                    {sessions.map(s => (
                    <div key={s._id} className="p-5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 flex items-center justify-center text-white/30">
                            {s.user_agent?.toLowerCase().includes('mobile') ? <Smartphone size={18} /> : <Monitor size={18} />}
                        </div>
                        <div>
                            <p className="text-white text-sm font-medium">{s.ip}</p>
                            <p className="text-white/20 text-[10px] font-body truncate max-w-[250px]">{s.user_agent}</p>
                        </div>
                        </div>
                        <button 
                        onClick={() => terminateSession(s._id)}
                        className="text-red-400/40 hover:text-red-400 transition-colors"
                        title="Revoke Access"
                        >
                        <LogOut size={16} />
                        </button>
                    </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Right Column: Profile & System */}
          <div className="space-y-8">
            <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-3">
                <ShieldAlert size={18} className="text-blue-400" />
                <h2 className="font-heading text-sm font-medium text-white uppercase tracking-widest">Admin Profile</h2>
                </div>
                <form onSubmit={handleSecuritySubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 font-heading">Email Address</label>
                    <input 
                        type="email"
                        className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-blue-500 outline-none"
                        value={securityForm.email}
                        onChange={(e) => setSecurityForm({...securityForm, email: e.target.value})}
                    />
                </div>
                
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 font-heading">New Password</label>
                    <input 
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    value={securityForm.password}
                    onChange={(e) => setSecurityForm({...securityForm, password: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 font-heading">Confirm Password</label>
                    <input 
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    value={securityForm.confirm}
                    onChange={(e) => setSecurityForm({...securityForm, confirm: e.target.value})}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-heading text-[10px] font-bold uppercase tracking-widest py-4 transition-all flex items-center justify-center gap-2"
                >
                    Update Profile
                </button>
                </form>
            </div>

            <div className="bg-[#0A0A0A] border border-white/[0.05] p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white text-xs font-medium uppercase tracking-wider">Push Alerts</h3>
                        <p className="text-white/30 text-[10px]">Real-time lead notifications</p>
                    </div>
                    <button 
                        onClick={() => {
                            const current = localStorage.getItem('admin_alerts') !== 'false';
                            localStorage.setItem('admin_alerts', !current);
                            window.location.reload();
                        }}
                        className={`w-10 h-5 rounded-full transition-all relative ${localStorage.getItem('admin_alerts') !== 'false' ? 'bg-[#D4AF37]' : 'bg-white/10'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${localStorage.getItem('admin_alerts') !== 'false' ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>
                
                <div className="pt-4 border-t border-white/[0.05]">
                    <p className="text-[10px] text-white/20 italic font-body">AutoNorth Motors Admin Platform v0.1.1 (Production Ready)</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
