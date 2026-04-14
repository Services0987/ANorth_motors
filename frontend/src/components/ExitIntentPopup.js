import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('exitShown')) return;

    const handleMouseLeave = (e) => {
      if (e.clientY < 0) {
        setShow(true);
        sessionStorage.setItem('exitShown', 'true');
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 15000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLoading(true);
    try {
      await axios.post(`${API}/leads`, {
        lead_type: 'exit_intent',
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: 'Exit intent capture - visitor was about to leave',
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="glass-card max-w-md w-full p-8 relative"
            data-testid="exit-intent-popup"
          >
            <button
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              data-testid="exit-popup-close"
            >
              <X size={20} />
            </button>

            {!submitted ? (
              <>
                <div className="mb-6">
                  <span className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-heading">Wait!</span>
                  <h2 className="font-heading text-2xl font-light text-white mt-2 leading-tight">
                    Get Our Best Deal<br />
                    <span className="gradient-text font-medium">Before You Leave</span>
                  </h2>
                  <p className="text-white/50 text-sm font-body mt-3 leading-relaxed">
                    Leave your details and our specialist will reach out with an exclusive offer tailored just for you.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    className="input-dark w-full px-4 py-3 text-sm font-body"
                    placeholder="Your Name *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    data-testid="exit-popup-name"
                  />
                  <input
                    type="email"
                    className="input-dark w-full px-4 py-3 text-sm font-body"
                    placeholder="Email Address *"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    data-testid="exit-popup-email"
                  />
                  <input
                    type="tel"
                    className="input-dark w-full px-4 py-3 text-sm font-body"
                    placeholder="Phone Number (optional)"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    data-testid="exit-popup-phone"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold w-full py-3 text-sm"
                    data-testid="exit-popup-submit"
                  >
                    {loading ? 'Sending...' : 'Get My Exclusive Deal'}
                  </button>
                  <button type="button" onClick={() => setShow(false)} className="w-full text-white/30 text-xs font-body hover:text-white/50 transition-colors">
                    No thanks, I'll pass
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#D4AF37] text-2xl">✓</span>
                </div>
                <h3 className="font-heading text-xl text-white mb-2">You're on the list!</h3>
                <p className="text-white/50 text-sm font-body">Our specialist will contact you shortly with your personalized deal.</p>
                <button onClick={() => setShow(false)} className="mt-6 btn-outline px-6 py-2 text-xs">
                  Continue Browsing
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
