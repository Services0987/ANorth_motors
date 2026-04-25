import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Phone, Check } from 'lucide-react';
import axios from 'axios';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const alreadySubmitted = sessionStorage.getItem('exitPopupSubmitted') === 'true';
    if (alreadySubmitted) return;

    const handleMouseLeave = (e) => {
      if (e.clientY < 10 && !hasShown) {
        setShow(true);
        setHasShown(true);
      }
    };

    timerRef.current = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 20000);

    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
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
      sessionStorage.setItem('exitPopupSubmitted', 'true');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem('exitPopupDismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-card max-w-md w-full p-8 relative overflow-hidden"
            data-testid="exit-intent-popup"
          >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#D4AF37]/5 rounded-full blur-2xl" />

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
              data-testid="exit-popup-close"
            >
              {SAFE_ICON(X, { size: 20 })}
            </button>

            {!submitted ? (
              <>
                <div className="mb-6 relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    {SAFE_ICON(Gift, { size: 20, className: "text-[#D4AF37]" })}
                    <span className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-heading">Exclusive Offer</span>
                  </div>
                  <h2 className="font-heading text-2xl font-light text-white mt-2 leading-tight">
                    Don't Miss Out<br />
                    <span className="gradient-text font-medium">on This Deal</span>
                  </h2>
                  <p className="text-white/50 text-sm font-body mt-3 leading-relaxed">
                    Get exclusive access to our best offers available in Edmonton. One of our vehicle specialists will contact you personally.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                  <input
                    className="input-dark w-full px-4 py-3 text-sm font-body"
                    placeholder="Your Name *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    data-testid="exit-popup-name"
                  />
                  <input
                    type="tel"
                    className="input-dark w-full px-4 py-3 text-sm font-body"
                    placeholder="Phone Number *"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    data-testid="exit-popup-phone"
                  />
                  <input
                    type="email"
                    className="input-dark w-full px-4 py-3 text-sm font-body"
                    placeholder="Email Address (Optional)"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    data-testid="exit-popup-email"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2"
                    data-testid="exit-popup-submit"
                  >
                    {SAFE_ICON(Phone, { size: 14 })}
                    {loading ? 'Sending...' : 'Get My Exclusive Offer'}
                  </button>
                  <button type="button" onClick={handleClose} className="w-full text-white/30 text-xs font-body hover:text-white/50 transition-colors">
                    Continue browsing
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
                  {SAFE_ICON(Check, { size: 24, className: "text-[#D4AF37]" })}
                </div>
                <h3 className="font-heading text-xl text-white mb-2">You're All Set!</h3>
                <p className="text-white/50 text-sm font-body">Our specialist will contact you shortly with your personalized deal.</p>
                <button onClick={handleClose} className="mt-6 btn-outline px-6 py-2 text-xs">
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
