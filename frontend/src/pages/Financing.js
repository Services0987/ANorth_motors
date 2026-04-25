import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Check, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

export default function Financing() {
  const [calc, setCalc] = useState({ price: 35000, down: 5000, term: 60, rate: 6.99 });
  const [form, setForm] = useState({ name: '', email: '', phone: '', employment: '', annual_income: '', down_payment: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const principal = Math.max(0, calc.price - calc.down);
  const monthlyRate = calc.rate / 100 / 12;
  const monthlyPayment = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, calc.term)) / (Math.pow(1 + monthlyRate, calc.term) - 1)
    : principal / calc.term;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await axios.post(`${API}/leads`, {
        lead_type: 'financing',
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: `Employment: ${form.employment}. Annual income: $${form.annual_income}`,
        down_payment: form.down_payment ? parseFloat(form.down_payment) : undefined,
      });
      setSubmitted(true);
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  return (
    <>
      <Helmet>
        <title>Vehicle Financing & Auto Loans Edmonton | AutoNorth Motors</title>
        <meta name="description" content="Get pre-approved for a car loan in Edmonton today. AutoNorth Motors offers competitive financing rates for all credit profiles in Alberta. Low APR, flexible terms, and instant decisions." />
        <meta name="keywords" content="car loans Edmonton, auto financing Alberta, bad credit car loans Edmonton, vehicle finance rates Canada, AutoNorth Motors financing" />
      </Helmet>

      <div className="bg-[#050505] min-h-screen" data-testid="financing-page">
      <Navbar />
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 md:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-3">Financing</p>
          <h1 className="font-heading text-4xl md:text-5xl font-light text-white tracking-tight mb-4">
            Your Road to <span className="gradient-text">Ownership</span>
          </h1>
              <p className="text-white/50 font-body text-lg max-w-xl leading-relaxed mb-8">
                Fast approvals, competitive rates, and flexible terms. We work with all credit profiles.
              </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Calculator */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="glass-card p-8 mb-6" data-testid="financing-calculator">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  {SAFE_ICON(Calculator, { size: 18, className: "text-[#D4AF37]" })}
                </div>
                <h2 className="font-heading text-xl font-semibold text-white">Payment Calculator</h2>
              </div>

              {[
                { label: 'Vehicle Price', key: 'price', min: 5000, max: 200000, step: 1000, prefix: '$', value: calc.price },
                { label: 'Down Payment', key: 'down', min: 0, max: calc.price, step: 500, prefix: '$', value: calc.down },
                { label: 'Loan Term', key: 'term', min: 12, max: 96, step: 12, suffix: 'months', value: calc.term },
                { label: 'Interest Rate', key: 'rate', min: 1, max: 30, step: 0.25, suffix: '%', value: calc.rate },
              ].map((item) => (
                <div key={item.key} className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-white/50 text-sm font-body tracking-wider uppercase">{item.label}</label>
                    <span className="text-white font-heading text-base font-semibold">
                      {item.prefix}{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}{item.suffix}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={item.value}
                    onChange={(e) => setCalc({ ...calc, [item.key]: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 appearance-none cursor-pointer"
                    style={{ accentColor: '#D4AF37' }}
                    data-testid={`calc-${item.key}`}
                  />
                  <div className="flex justify-between text-white/20 text-xs font-body mt-1">
                    <span>{item.prefix}{item.min.toLocaleString()}{item.suffix}</span>
                    <span>{item.prefix}{item.max.toLocaleString()}{item.suffix}</span>
                  </div>
                </div>
              ))}

              <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-6 text-center">
                <p className="text-white/40 text-xs tracking-widest uppercase font-heading mb-2">Estimated Monthly Payment</p>
                <p className="font-heading text-5xl font-bold text-[#D4AF37]" data-testid="monthly-payment">
                  ${isNaN(monthlyPayment) ? '0' : monthlyPayment.toFixed(0)}
                </p>
                <p className="text-white/40 text-sm font-body mt-2">/month for {calc.term} months</p>
                <p className="text-white/25 text-xs font-body mt-1">Principal: ${principal.toLocaleString()} · Rate: {calc.rate}% APR</p>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-heading text-base font-semibold text-white mb-4">Why Finance with AutoNorth?</h3>
              <ul className="space-y-3">
                {['Competitive rates from 3.99% APR', 'Quick 10-minute pre-approval', 'All credit profiles welcome', 'Flexible terms 12-96 months', 'Trade-in accepted towards down payment'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/55 font-body text-base">
                    {SAFE_ICON(Check, { size: 14, className: "text-[#D4AF37] flex-shrink-0" })}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Pre-Approval Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="glass-card p-8" data-testid="pre-approval-form">
              <h2 className="font-heading text-2xl font-semibold text-white mb-2">Get Pre-Approved Today</h2>
              <p className="text-white/45 font-body text-base mb-8">Complete the form below and receive a decision within hours.</p>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
                    {SAFE_ICON(Check, { size: 24, className: "text-[#D4AF37]" })}
                  </div>
                  <h3 className="font-heading text-xl text-white mb-2">Application Received!</h3>
                  <p className="text-white/40 text-sm font-body">Our finance team will contact you within 2-4 hours with your approval decision.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="finance-name" />
                    </div>
                    <input type="email" className="input-dark px-4 py-3 text-sm font-body" placeholder="Email Address *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="finance-email" />
                    <input type="tel" className="input-dark px-4 py-3 text-sm font-body" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="finance-phone" />
                  </div>

                  <select className="input-dark w-full px-4 py-3 text-sm font-body" value={form.employment} onChange={(e) => setForm({ ...form, employment: e.target.value })} data-testid="finance-employment">
                    <option value="">Employment Status</option>
                    {['Full-Time Employed', 'Part-Time Employed', 'Self-Employed', 'Retired', 'Student', 'Other'].map((opt) => <option key={opt}>{opt}</option>)}
                  </select>

                  <input type="number" className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Annual Income ($)" value={form.annual_income} onChange={(e) => setForm({ ...form, annual_income: e.target.value })} data-testid="finance-income" />

                  <input type="number" className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Down Payment Amount ($)" value={form.down_payment} onChange={(e) => setForm({ ...form, down_payment: e.target.value })} data-testid="finance-down" />

                  <button type="submit" disabled={sending} className="btn-gold w-full py-4 text-sm flex items-center justify-center gap-2" data-testid="finance-submit">
                    {sending ? 'Processing...' : 'Submit Pre-Approval Application'} {!sending && SAFE_ICON(ChevronRight, { size: 16 })}
                  </button>

                  <p className="text-white/25 text-xs font-body text-center">By submitting, you agree to be contacted by our finance team. Your information is secure and never shared.</p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
    </>
  );
}
