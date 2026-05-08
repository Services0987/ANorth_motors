import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Bot, Key, User, Shield, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = '/api';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon) return null;
  const Component = Icon;
  return <Component {...props} />;
};

export default function SecurityModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm: '',
    ai_provider: 'local',
    ai_api_key: '',
    ai_model: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      if (data) {
        setFormData(prev => ({
          ...prev,
          email: data.email || 'admin@autonorth.ca',
          ai_provider: data.ai_provider || 'local',
          ai_api_key: data.ai_api_key || '',
          ai_model: data.ai_model || ''
        }));
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Update AI Settings
      await axios.put(`${API}/settings`, {
        ai_provider: formData.ai_provider,
        ai_api_key: formData.ai_api_key,
        ai_model: formData.ai_model
      }, { withCredentials: true });

      // 2. Update Profile if email or password changed
      if (formData.password || formData.email) {
        await axios.put(`${API}/auth/profile`, {
          email: formData.email,
          password: formData.password || undefined
        }, { withCredentials: true });
      }

      setMessage({ type: 'success', text: 'All changes saved successfully.' });
      setTimeout(onClose, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0A0A0A] border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-bold text-white leading-tight">Security & AI Engine</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1 font-body">Manage credentials and provider intelligence</p>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            {SAFE_ICON(X, { size: 20 })}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {message.text && (
            <div className={`p-3 flex items-center gap-3 border text-[11px] ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <p>{message.text}</p>
            </div>
          )}

          {/* Admin Email */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-widest text-white/30 font-heading">Admin Email</label>
            <input 
              type="email"
              className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none font-body"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          {/* Password Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-widest text-white/30 font-heading">New Password</label>
              <input 
                type="password"
                placeholder="••••••••"
                className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none font-body"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-widest text-white/30 font-heading">Confirm</label>
              <input 
                type="password"
                placeholder="••••••••"
                className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none font-body"
                value={formData.confirm}
                onChange={(e) => setFormData({...formData, confirm: e.target.value})}
              />
            </div>
          </div>

          <div className="h-px bg-white/5 my-2" />

          {/* AI Engine Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-heading font-bold">AI Intelligence Engine</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[8px] text-white/40 uppercase tracking-widest font-heading">GlobalBrain Active</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-widest text-white/30 font-heading">Provider</label>
              <select 
                className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none font-heading appearance-none cursor-pointer"
                value={formData.ai_provider}
                onChange={(e) => setFormData({...formData, ai_provider: e.target.value})}
              >
                <option value="local">local</option>
                <option value="openrouter">openrouter</option>
                <option value="gemini">gemini</option>
                <option value="claude">claude</option>
              </select>
            </div>

            {formData.ai_provider !== 'local' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-widest text-white/30 font-heading">
                    {formData.ai_provider.toUpperCase()} API KEY
                  </label>
                  <input 
                    type="password"
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none font-mono"
                    value={formData.ai_api_key}
                    onChange={(e) => setFormData({...formData, ai_api_key: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-widest text-white/30 font-heading">Specific Model (Optional)</label>
                  <input 
                    type="text"
                    placeholder={formData.ai_provider === 'openrouter' ? 'google/gemini-flash-1.5-free' : 'gemini-1.5-flash'}
                    className="w-full bg-black border border-white/10 text-white px-4 py-3 text-sm focus:border-[#D4AF37] outline-none font-body"
                    value={formData.ai_model}
                    onChange={(e) => setFormData({...formData, ai_model: e.target.value})}
                  />
                </div>
              </>
            )}
            
            <p className="text-[8px] italic text-white/20 font-body">*Pulse: {new Date().toLocaleTimeString()}</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="py-4 border border-white/10 text-white/40 font-heading text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="py-4 bg-[#D4AF37] hover:bg-[#B8962D] text-black font-heading text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={14} /> : 'Save All Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
