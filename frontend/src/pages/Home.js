import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, ChevronDown, Shield, Award, Clock,
  Headphones, Car, Truck, Navigation, Zap, PackageOpen,
} from 'lucide-react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VehicleCard from '../components/VehicleCard';
import ExitIntentPopup from '../components/ExitIntentPopup';
import AnimatedLogo from '../components/AnimatedLogo';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';
const HERO_IMAGE =
  'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80';

const CATEGORIES = [
  { label: 'Trucks',      query: 'Truck',     icon: Truck,        desc: 'Power & Towing' },
  { label: 'SUVs',        query: 'SUV',        icon: Navigation,   desc: 'Space & Comfort' },
  { label: 'Sedans',      query: 'Sedan',      icon: Car,          desc: 'Refined Daily Drive' },
  { label: 'Coupes',      query: 'Coupe',      icon: Car,          desc: 'Pure Performance' },
  { label: 'Hybrid / EV', query: 'Hybrid',     icon: Zap,          desc: 'Eco Forward' },
  { label: 'Commercial',  query: 'Cargo Van',  icon: PackageOpen,  desc: 'Work Ready' },
];

const STATS = [
  { value: '500+', label: 'Vehicles Sold' },
  { value: '12+',  label: 'Years Serving Edmonton' },
  { value: '4.9',  label: 'Google Rating' },
  { value: '$0',   label: 'Dealer Fees' },
];

const WHY_US = [
  { icon: Shield,     title: '150-Point Inspection',   desc: 'Every pre-owned vehicle passes our comprehensive certification before it reaches you.' },
  { icon: Award,      title: 'Price Match Guarantee',  desc: 'Find a lower price elsewhere? We will match it — no questions asked.' },
  { icon: Clock,      title: '10-Minute Approval',     desc: 'Our finance team works with all credit profiles. Get approved faster than anywhere else.' },
  { icon: Headphones, title: 'Lifetime Support',       desc: 'From purchase to service, our team is available 7 days a week to assist you.' },
];

const TESTIMONIALS = [
  { name: 'James Okafor',  role: 'Business Owner',    text: 'AutoNorth made buying my F-150 effortless. No pressure, transparent pricing — exceptional dealership.',          vehicle: '2024 Ford F-150 XLT',  rating: 5, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80' },
  { name: 'Sarah Mitchell', role: 'Real Estate Agent', text: 'After visiting 5 dealers, AutoNorth gave me the best price with zero games. The AI chat narrowed it instantly.', vehicle: '2023 Ford Explorer ST', rating: 5, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80' },
  { name: 'Priya Sharma',   role: 'Engineer',          text: 'Got pre-approved in minutes, picked up my Mustang the same day. AutoNorth raised the bar in Edmonton.',         vehicle: '2024 Ford Mustang GT', rating: 5, img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80' },
];

const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function GridFloor() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-2/5 overflow-hidden pointer-events-none" style={{ perspective: '600px' }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(212,175,55,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.07) 1px,transparent 1px)',
          backgroundSize: '70px 70px',
          transform: 'rotateX(65deg) translateZ(-20px)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 100%)',
        }}
      />
    </div>
  );
}

function DrawingLines() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-20">
      <motion.svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <motion.path d="M 0 300 Q 400 -100 800 300 T 2000 300" fill="transparent" stroke="#D4AF37" strokeWidth="1.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }} />
        <motion.path d="M 2000 500 Q 1500 200 1000 500 T 0 500" fill="transparent" stroke="white" strokeWidth="0.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', delay: 1 }} />
      </motion.svg>
    </div>
  );
}

export default function Home() {
  const [featured, setFeatured]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [leadForm, setLeadForm]   = useState({ name: '', phone: '' });
  const [leadSent, setLeadSent]   = useState(false);
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY       = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  useEffect(() => {
    axios
      .get(`${API}/vehicles?featured=true&limit=4`)
      .then((res) => setFeatured(res.data?.vehicles || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/leads`, {
        ...leadForm,
        lead_type: 'contact',
        message: 'Homepage lead form',
      });
      setLeadSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Helmet>
        <title>AutoNorth Motors | Premium New &amp; Used Vehicles Edmonton, Alberta</title>
        <meta
          name="description"
          content="Discover premium new and used vehicles at AutoNorth Motors, Edmonton's leading dealership. Best deals on trucks, SUVs, and luxury cars. Zero dealer fees."
        />
        <meta
          name="keywords"
          content="Ford dealer Edmonton, used cars Edmonton, trucks for sale Alberta, AutoNorth Motors Edmonton"
        />
        <link rel="canonical" href="https://www.autonorth.ca" />
      </Helmet>

      <div className="bg-[#050505] min-h-screen font-body selection:bg-[#D4AF37]/30" data-testid="home-page">
        <Navbar />
        <ExitIntentPopup />

        {/* ── HERO ── */}
        <section className="relative min-h-screen flex items-center overflow-hidden" data-testid="hero-section">
          {/* BG */}
          <motion.div className="absolute inset-0" style={{ y: heroY }}>
            <img src={HERO_IMAGE} alt="AutoNorth Motors Edmonton" className="w-full h-full object-cover scale-110" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/30" />
          <GridFloor />
          <DrawingLines />

          {/* Ambient particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-[#D4AF37] rounded-full opacity-40"
                style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
                animate={{ y: [-10, 10, -10], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>

          {/* Content */}
          <motion.div
            style={{ opacity: heroOpacity }}
            className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-28 pb-32"
          >
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.p variants={fadeUp} className="text-xs tracking-[0.4em] uppercase text-[#D4AF37] font-heading mb-8 flex items-center gap-3">
                <span className="w-8 h-px bg-[#D4AF37]" /> Edmonton, Alberta · Est. 2012
              </motion.p>

              {/* ✦ ANIMATED LOGO ✦ */}
              <motion.div variants={fadeUp}>
                <AnimatedLogo size="large" className="mb-10" />
              </motion.div>

              <motion.p variants={fadeUp} className="text-white/60 font-body text-lg md:text-xl max-w-md leading-relaxed mb-10">
                Edmonton's most trusted destination for premium vehicles. Zero dealer fees. Best price guaranteed.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-14">
                <Link to="/inventory" className="btn-gold px-8 py-4 text-xs tracking-[0.15em] flex items-center gap-3" data-testid="hero-browse-btn">
                  Browse Inventory <ArrowRight size={15} />
                </Link>
                <Link to="/financing" className="btn-outline px-8 py-4 text-xs tracking-[0.15em]" data-testid="hero-financing-btn">
                  Get Pre-Approved
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 items-center">
                {['OMVIC Certified', 'CARFAX Verified', 'Price Match Guarantee', 'No Dealer Fees'].map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
                    <span className="text-white/40 text-xs font-body tracking-wider">{b}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-white/20 text-[10px] font-body tracking-[0.3em] uppercase">Scroll</span>
            <ChevronDown size={16} className="text-white/20 animate-bounce" />
          </motion.div>
        </section>

        {/* ── STATS ── */}
        <section className="bg-[#0A0A0A] border-y border-white/[0.05] py-8">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((s, i) => (
                <motion.div key={i} variants={fadeUp} className="text-center">
                  <p className="font-heading text-3xl md:text-4xl font-semibold text-[#D4AF37] mb-1">{s.value}</p>
                  <p className="text-white/40 text-sm font-body tracking-[0.15em] uppercase">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FEATURED VEHICLES ── */}
        <section className="py-24 md:py-32" data-testid="featured-section">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-12">
              <motion.p variants={fadeUp} className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-3">
                Curated For You
              </motion.p>
              <div className="flex items-end justify-between">
                <motion.h2 variants={fadeUp} className="font-heading text-3xl md:text-5xl font-light text-white tracking-tight">
                  Featured <span className="gradient-text">Vehicles</span>
                </motion.h2>
                <Link to="/inventory" className="text-white/30 hover:text-[#D4AF37] text-sm font-body tracking-widest uppercase flex items-center gap-2 transition-colors">
                  All Inventory <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="featured-grid">
              {loading
                ? [...Array(4)].map((_, i) => <div key={i} className="glass-card aspect-[4/5] animate-pulse rounded-none border-white/5 bg-white/5" />)
                : featured.length === 0
                ? <div className="col-span-full py-20 text-center border border-dashed border-white/10"><p className="text-white/30 font-body">No featured vehicles found.</p></div>
                : featured.map((v, i) => <VehicleCard key={v._id || v.id || i} vehicle={v} index={i} />)
              }
            </div>
          </div>
        </section>

        {/* ── BROWSE BY CATEGORY ── */}
        <section className="py-16 bg-[#080808] border-y border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="mb-10">
              <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-2">Our Fleet</p>
              <h2 className="font-heading text-2xl md:text-3xl font-light text-white">Shop by Vehicle Type</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {CATEGORIES.map((cat, i) => (
                <motion.button
                  key={cat.label}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -6, scale: 1.03 }}
                  onClick={() => navigate(`/inventory?body_type=${encodeURIComponent(cat.query)}`)}
                  className="group glass-card p-6 flex flex-col items-center text-center hover:border-[#D4AF37]/30 transition-all"
                  data-testid={`category-${cat.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-12 h-12 border border-[#D4AF37]/20 flex items-center justify-center mb-4 group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 transition-all">
                    <cat.icon size={22} className="text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                  <p className="font-heading text-white text-sm font-medium mb-1 group-hover:text-[#D4AF37] transition-colors">{cat.label}</p>
                  <p className="text-white/30 text-xs font-body">{cat.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY AUTONORTH ── */}
        <section className="py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4">Why AutoNorth</p>
                <h2 className="font-heading text-3xl md:text-5xl font-light text-white leading-tight mb-6">
                  A Different Kind<br />of <span className="gradient-text">Dealership</span>
                </h2>
                <p className="text-white/55 font-body text-lg leading-relaxed mb-8">
                  No games, no hidden fees, no pressure. Expert guidance and the best prices in Edmonton.
                </p>
                <Link to="/inventory" className="btn-gold px-8 py-4 text-xs tracking-[0.15em] inline-flex items-center gap-3">
                  Explore Our Inventory <ArrowRight size={15} />
                </Link>
              </motion.div>

              <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 gap-4">
                {WHY_US.map((item, i) => (
                  <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                    className="glass-card p-6 hover:border-[#D4AF37]/25 transition-all group">
                    <div className="w-10 h-10 bg-[#D4AF37]/8 border border-[#D4AF37]/20 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/15 transition-colors">
                      <item.icon size={18} className="text-[#D4AF37]" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-heading text-white text-base font-semibold mb-2">{item.title}</h3>
                    <p className="text-white/40 text-sm font-body leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-24 md:py-32 bg-[#080808]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-3">Client Stories</p>
              <h2 className="font-heading text-3xl md:text-4xl font-light text-white">What Our Customers Say</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }} whileHover={{ y: -6 }}
                  className="glass-card p-8 hover:border-[#D4AF37]/20 transition-all">
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(t.rating)].map((_, j) => <span key={j} className="text-[#D4AF37] text-base">★</span>)}
                  </div>
                  <p className="text-white/55 font-body text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-5 border-t border-white/[0.05]">
                    <img src={t.img} alt={t.name} className="w-10 h-10 object-cover grayscale"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                    <div>
                      <p className="font-heading text-white text-sm font-medium">{t.name}</p>
                      <p className="text-white/30 text-xs font-body">{t.role} · {t.vehicle}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LEAD CTA ── */}
        <section className="py-20 relative overflow-hidden border-t border-white/[0.05]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 via-transparent to-[#D4AF37]/3" />
          <div className="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4">Ready to Begin?</p>
              <h2 className="font-heading text-3xl md:text-4xl font-light text-white mb-4">
                Your Perfect Vehicle<br />Is Waiting for You
              </h2>
              <p className="text-white/45 font-body mb-10">
                Leave your number — our specialist will call you within the hour with a personalised match.
              </p>
              {!leadSent ? (
                <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="homepage-lead-form">
                  <input
                    className="input-dark px-4 py-3.5 text-sm font-body"
                    placeholder="Your Name"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    required
                    data-testid="lead-form-name"
                  />
                  <input
                    type="tel"
                    className="input-dark px-4 py-3.5 text-sm font-body"
                    placeholder="Phone Number *"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    required
                    data-testid="lead-form-phone"
                  />
                  <button type="submit" className="btn-gold py-3.5 text-xs tracking-[0.15em] flex items-center justify-center gap-2" data-testid="lead-form-submit">
                    Get Matched <ArrowRight size={15} />
                  </button>
                </form>
              ) : (
                <div className="glass-card p-8" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
                  <p className="text-[#D4AF37] font-heading text-xl mb-2">You're on our radar.</p>
                  <p className="text-white/45 font-body text-sm">Our specialist will be in touch within the hour.</p>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
