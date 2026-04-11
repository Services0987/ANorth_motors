import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Check } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHOWROOM_IMAGE = 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=800&q=80';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await axios.post(`${API}/leads`, { ...form, lead_type: 'contact' });
      setSubmitted(true);
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="contact-page">
      <Navbar />
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 md:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-3">Get in Touch</p>
          <h1 className="font-heading text-4xl md:text-5xl font-light text-white tracking-tight">
            We're Here to <span className="gradient-text">Help</span>
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="relative overflow-hidden aspect-video mb-8">
              <img src={SHOWROOM_IMAGE} alt="AutoNorth Motors Showroom" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <p className="font-heading text-white text-lg font-medium">Visit Our Showroom</p>
                <p className="text-white/60 font-body text-sm">Edmonton, Alberta</p>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { icon: MapPin, label: 'Address', value: '3304 91 St
Edmonton, AB
T6N 1C1' },
                { icon: Phone, label: 'Phone', value: '825-605-5050', href: 'tel:+18256055050' },
                { icon: Mail, label: 'Email', value: 'autonorthab@gmail.com', href: 'mailto:autonorthab@gmail.com' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                    <item.icon size={16} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs font-body tracking-wider uppercase mb-1">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-white font-body text-base hover:text-[#D4AF37] transition-colors">{item.value}</a>
                    ) : (
                      <p className="text-white font-body text-base">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white/35 text-xs font-body tracking-wider uppercase mb-2">Hours</p>
                  <div className="space-y-1">
                    <p className="text-white font-body text-base">Mon – Fri: 9:00 AM – 8:00 PM</p>
                    <p className="text-white font-body text-base">Sat – Sun: 10:00 AM – 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="glass-card p-8">
              <h2 className="font-heading text-2xl font-semibold text-white mb-2">Send Us a Message</h2>
              <p className="text-white/45 font-body text-base mb-8">We respond to all inquiries within 2 business hours.</p>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
                    <Check size={22} className="text-[#D4AF37]" />
                  </div>
                  <h3 className="font-heading text-xl text-white mb-2">Message Sent!</h3>
                  <p className="text-white/40 text-sm font-body">Our team will get back to you within 2 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-white/30 hover:text-white text-xs font-body transition-colors">Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="contact-form">
                  <input className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="contact-name" />
                  <input type="email" className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Email Address *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="contact-email" />
                  <input type="tel" className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="contact-phone" />
                  <textarea className="input-dark w-full px-4 py-3 text-sm font-body resize-none" rows={5} placeholder="How can we help you? *" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required data-testid="contact-message" />
                  <button type="submit" disabled={sending} className="btn-gold w-full py-4 text-sm" data-testid="contact-submit">
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
