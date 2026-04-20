import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4" data-testid="admin-login-page">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-[#D4AF37]/5 blur-3xl top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute w-96 h-96 rounded-full bg-[#D4AF37]/3 blur-3xl bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#D4AF37] flex items-center justify-center font-heading font-bold text-black text-2xl mx-auto mb-4">AN</div>
          <h1 className="font-heading text-2xl font-medium text-white tracking-tight">Admin Portal</h1>
          <p className="text-white/40 font-body text-sm mt-1">AutoNorth Motors Management</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="admin-login-form">
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-heading block mb-2">Email Address</label>
              <input
                type="email"
                className="input-dark w-full px-4 py-3 text-sm font-body"
                placeholder="admin@autonorth.ca"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                data-testid="admin-email-input"
              />
            </div>

            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-heading block mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-dark w-full px-4 py-3 pr-12 text-sm font-body"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="admin-password-input"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                  {SAFE_ICON(showPwd ? EyeOff : Eye, { size: 16 })}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-body bg-red-500/10 border border-red-500/20 px-4 py-2" data-testid="login-error">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 text-sm mt-2"
              data-testid="admin-login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs font-body mt-6">
          AutoNorth Motors &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
