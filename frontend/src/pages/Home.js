import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown, Shield, Award, Clock, Headphones, Car, Truck, Navigation, Zap, Bus, PackageOpen } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VehicleCard from '../components/VehicleCard';
import ExitIntentPopup from '../components/ExitIntentPopup';
import { Helmet } from 'react-helmet-async';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';
const HERO_IMAGE = 'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80';

const CATEGORIES = [
  { label: 'Trucks', query: 'Truck', icon: Truck, desc: 'Power & Towing' },
  { label: 'SUVs', query: 'SUV', icon: Navigation, desc: 'Space & Comfort' },
  { label: 'Sedans', query: 'Sedan', icon: Car, desc: 'Refined Daily Drive' },
  { label: 'Coupes', query: 'Coupe', icon: Car, desc: 'Pure Performance' },
  { label: 'Hybrid / EV', query: 'Hybrid', icon: Zap, desc: 'Eco Forward' },
  { label: 'Commercial', query: 'Cargo Van', icon: PackageOpen, desc: 'Work Ready' },
];

const STATS = [
  { value: '500+', label: 'Vehicles Sold' },
  { value: '12+', label: 'Years Serving Edmonton' },
  { value: '4.9', label: 'Google Rating' },
  { value: '$0', label: 'Dealer Fees' },
];

const WHY_US = [
  { icon: Shield, title: '150-Point Inspection', desc: 'Every pre-owned vehicle passes our comprehensive certification before it reaches you.' },
  { icon: Award, title: 'Price Match Guarantee', desc: 'Find a lower price elsewhere? We will match it — no questions asked.' },
  { icon: Clock, title: '10-Minute Approval', desc: 'Our finance team works with all credit profiles. Get approved faster than anywhere else.' },
  { icon: Headphones, title: 'Lifetime Support', desc: 'From purchase to service, our team is available 7 days a week to assist you.' },
];

const TESTIMONIALS = [
  { name: 'James Okafor', role: 'Business Owner', text: 'AutoNorth made buying my F-150 effortless. No pressure, transparent pricing, and they handled all the paperwork in under 2 hours. Exceptional dealership.', vehicle: '2024 Ford F-150 XLT', rating: 5, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80' },
  { name: 'Sarah Mitchell', role: 'Real Estate Agent', text: 'I found my Explorer ST here after visiting 5 other dealers. AutoNorth gave me the best price with zero games. The AI chat helped me narrow it down before I even visited.', vehicle: '2023 Ford Explorer ST', rating: 5, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80' },
  { name: 'Priya Sharma', role: 'Engineer', text: 'The financing process was incredibly smooth. Got pre-approved in minutes, picked up my Mustang the same day. AutoNorth has raised the bar for every dealership in Edmonton.', vehicle: '2024 Ford Mustang GT', rating: 5, img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80' },
];

const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function SelfDrawingLines() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-25">
      <motion.svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M 0 300 Q 400 -100 800 300 T 2000 300"
          fill="transparent"
          stroke="#D4AF37"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M 2000 500 Q 1500 200 1000 500 T 0 500"
          fill="transparent"
          stroke="white"
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 1 }}
        />
      </motion.svg>
    </div>
  );
}

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' });
  const [leadSent, setLeadSent] = useState(false);
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  useEffect(() => {
    setLoading(true);
    const fetchVehicles = async () => {
      try {
        const res = await axios.get(`${API}/vehicles?featured=true&limit=4`);
        setFeatured(res.data?.vehicles || []);
      } catch (err) {
        console.error("Home: Failed to fetch vehicles", err);
        setFeatured([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API}/leads`, { ...leadForm, lead_type: 'contact', message: 'Homepage lead form' }); setLeadSent(true); }
    catch (err) { console.error(err); }
  };

  return (
    <>
      <Helmet>
        <title>AutoNorth Motors | Premium New & Used Vehicles Edmonton, Alberta</title>
        <title>AutoNorth Motors | Premium New & Used Vehicles in Edmonton, Alberta</title>
        <meta name="description" content="Discover premium new and used vehicles at AutoNorth Motors, Edmonton's leading dealership. Serving Alberta with the best deals on Ford trucks, SUVs, and luxury cars. National shipping available across Canada." />
        <meta name="keywords" content="Ford dealer Edmonton, used cars Edmonton, new cars Edmonton, trucks for sale Alberta, car dealership Edmonton, best used cars Alberta, buy car Canada, AutoNorth Motors Edmonton, Ford F-150 Edmonton" />
        <link rel="canonical" href="https://www.autonorth.ca" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          "name": "AutoNorth Motors",
          "url": "https://www.autonorth.ca",
          "telephone": "+18256055050",
          "address": { "@type": "PostalAddress", "streetAddress": "9104 91 St NW", "addressLocality": "Edmonton", "addressRegion": "AB", "postalCode": "T6C 3P6", "addressCountry": "CA" },
          "openingHours": ["Mo-Fr 09:00-20:00", "Sa-Su 10:00-18:00"],
          "priceRange": "$$",
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "312" }
        })}</script>
      </Helmet>

      <div className="bg-[#050505] min-h-screen font-body selection:bg-[#D4AF37]/30" data-testid="home-page">
        <Navbar />
        <ExitIntentPopup />

        {/* ── Hero ── */}
        <section className="relative min-h-screen flex items-center overflow-hidden" data-testid="hero-section">
          {/* BG image with parallax */}
          <motion.div className="absolute inset-0" style={{ y: heroY }}>
            <img src={HERO_IMAGE} alt="AutoNorth Motors Premium Vehicles" className="w-full h-full object-cover scale-110" />
          </motion.div>

          {/* Layered overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/30" />

          {/* 3D perspective grid floor */}
          <div className="absolute bottom-0 left-0 right-0 h-2/5 overflow-hidden" style={{ perspective: '600px' }}>
            <div className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(212,175,55,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.07) 1px, transparent 1px)',
                backgroundSize: '70px 70px',
                transform: 'rotateX(65deg) translateZ(-20px)',
                transformOrigin: 'bottom center',
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
              }}
            />
          </div>

          <SelfDrawingLines />

          {/* Floating ambient particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i}
                className="absolute w-1 h-1 bg-[#D4AF37] rounded-full opacity-40"
                style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
                animate={{ y: [-10, 10, -10], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-32">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.p variants={fadeUp} className="text-xs tracking-[0.4em] uppercase text-[#D4AF37] font-heading mb-6 flex items-center gap-3">
                <span className="w-8 h-px bg-[#D4AF37]" />
                Edmonton, Alberta · Est. 2012
              </motion.p>

              <motion.h1 variants={fadeUp} className="font-heading text-5xl md:text-7xl lg:text-[5.5rem] font-light text-white leading-[0.95] tracking-tighter mb-6">
                Drive Your<br />
                <span className="gradient-text font-semibold">Ambition.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/60 font-body text-xl md:text-2xl max-w-lg leading-relaxed mb-10">
                Edmonton's most trusted destination for premium new and pre-owned vehicles. Zero dealer fees. Best price guaranteed.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-16">
                <Link to="/inventory" className="btn-gold px-8 py-4 text-xs tracking-[0.15em] flex items-center gap-3" data-testid="hero-browse-btn">
                  Browse Inventory {SAFE_ICON(ArrowRight, { size: 15 })}
                </Link>
                <Link to="/financing" className="btn-outline px-8 py-4 text-xs tracking-[0.15em]" data-testid="hero-financing-btn">
                  Get Pre-Approved
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 items-center">
                {['OMVIC Certified', 'CARFAX Verified', 'Price Match Guarantee', 'No Dealer Fees'].map((badge) => (
                  <div key={badge} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
                    <span className="text-white/40 text-xs font-body tracking-wider">{badge}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-white/20 text-[10px] font-body tracking-[0.3em] uppercase">Scroll</span>
            {SAFE_ICON(ChevronDown, { size: 16, className: "text-white/20 animate-bounce" })}
          </motion.div>
        </section>

        {/* ── Stats Bar ── */}
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

        {/* ── Featured Vehicles ── */}
        <section className="py-24 md:py-32" data-testid="featured-section">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-12">
              <motion.p variants={fadeUp} className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-3">Curated For You</motion.p>
              <div className="flex items-end justify-between">
                <motion.h2 variants={fadeUp} className="font-heading text-3xl md:text-5xl font-light text-white tracking-tight">
                  Featured <span className="gradient-text">Vehicles</span>
                </motion.h2>
                <motion.div variants={fadeUp}>
                  <Link to="/inventory" className="text-white/30 hover:text-[#D4AF37] text-sm font-body tracking-widest uppercase flex items-center gap-2 transition-colors">
                    All Inventory {SAFE_ICON(ArrowRight, { size: 14 })}
                  </Link>
                </motion.div>
              </div>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="featured-grid">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card aspect-[4/5] animate-pulse rounded-none border-white/5 bg-white/5" />
                ))
              ) : featured?.length === 0 ? (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-none">
                  <p className="text-white/30 font-body">No featured vehicles found.</p>
                </div>
              ) : (
                featured?.map((v, i) => <VehicleCard key={v._id || v.id || i} vehicle={v} index={i} />)
              )}
            </div>
          </div>
        </section>

        {/* ── 3D Perspective Showroom ── */}
        <section className="py-20 relative overflow-hidden" style={{ background: '#030303' }}>
          {/* Perspective floor grid */}
          <div className="absolute inset-x-0 bottom-0 h-3/4 pointer-events-none" style={{ perspective: '500px' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(212,175,55,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.09) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
              transform: 'rotateX(72deg) translateZ(-30px) scale(3)',
              transformOrigin: 'bottom center',
              maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 80%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 80%)',
            }} />
          </div>

          {/* Ambient center spotlight */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(212,175,55,0.07) 0%, transparent 70%)',
          }} />

          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <p className="text-xs tracking-[0.4em] uppercase text-[#D4AF37] font-heading mb-4 flex items-center justify-center gap-3">
                <span className="w-8 h-px bg-[#D4AF37]" /> The Experience <span className="w-8 h-px bg-[#D4AF37]" />
              </p>
              <h2 className="font-heading text-4xl md:text-6xl font-light text-white tracking-tight">
                Step Into the <span className="gradient-text">Showroom</span>
              </h2>
              <p className="text-white/45 font-body text-lg mt-4 max-w-xl mx-auto">
                Every vehicle is hand-selected and presented for you to explore in full detail.
              </p>
            </motion.div>

            {/* 3D staggered vehicle showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8" style={{ perspective: '900px' }}>
              {featured.slice(0, 3).map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, z: -200, y: 60 }}
                  whileInView={{ opacity: 1, z: 0, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.18, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <VehicleCard vehicle={v} index={0} />
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 }}
              className="text-center mt-12">
              <Link to="/inventory" className="btn-gold px-10 py-4 text-sm tracking-[0.15em] inline-flex items-center gap-3">
                View Full Collection {SAFE_ICON(ArrowRight, { size: 16 })}
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Browse by Category ── */}
        <section className="py-16 bg-[#080808] border-y border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
              <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-2">Our Fleet</p>
              <h2 className="font-heading text-2xl md:text-3xl font-light text-white">Shop by Vehicle Type</h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {CATEGORIES.map((cat, i) => (
                <motion.button key={cat.label}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -6, scale: 1.03 }}
                  onClick={() => navigate(`/inventory?body_type=${encodeURIComponent(cat.query)}`)}
                  className="group glass-card p-6 flex flex-col items-center text-center hover:border-[#D4AF37]/30 transition-all duration-300"
                  data-testid={`category-${cat.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-12 h-12 border border-[#D4AF37]/20 flex items-center justify-center mb-4 group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 transition-all">
                    {SAFE_ICON(cat.icon, { size: 22, className: "text-[#D4AF37]", strokeWidth: 1.5 })}
                  </div>
                  <p className="font-heading text-white text-sm font-medium mb-1 group-hover:text-[#D4AF37] transition-colors">{cat.label}</p>
                  <p className="text-white/30 text-xs font-body">{cat.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why AutoNorth ── */}
        <section className="py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4">Why AutoNorth</p>
                <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-light text-white leading-tight mb-6">
                  A Different Kind<br />of <span className="gradient-text">Dealership</span>
                </h2>
                <p className="text-white/55 font-body text-lg leading-relaxed mb-8">
                  We built AutoNorth on one principle: treat every customer the way we'd want to be treated. No games, no hidden fees, no pressure. Just expert guidance and the best prices in Edmonton.
                </p>
                <Link to="/inventory" className="btn-gold px-8 py-4 text-xs tracking-[0.15em] inline-flex items-center gap-3">
                  Explore Our Inventory {SAFE_ICON(ArrowRight, { size: 15 })}
                </Link>
              </motion.div>

              <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="grid grid-cols-2 gap-4">
                {WHY_US.map((item, i) => (
                  <motion.div key={i} variants={fadeUp}
                    className="glass-card p-6 hover:border-[#D4AF37]/25 transition-all duration-300 group"
                    whileHover={{ y: -4 }}>
                    <div className="w-10 h-10 bg-[#D4AF37]/8 border border-[#D4AF37]/20 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/15 transition-colors">
                      {SAFE_ICON(item.icon, { size: 18, className: "text-[#D4AF37]", strokeWidth: 1.5 })}
                    </div>
                    <h3 className="font-heading text-white text-base font-semibold mb-2">{item.title}</h3>
                    <p className="text-white/40 text-sm font-body leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── AI Showcase ── */}
        <section className="py-20 bg-gradient-to-b from-[#080808] to-[#050505] border-y border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4">Powered by AI</p>
                <h2 className="font-heading text-3xl md:text-4xl font-light text-white mb-4">
                  Your Intelligent<br /><span className="gradient-text">Vehicle Expert</span>
                </h2>
                <p className="text-white/50 font-body leading-relaxed mb-8">
                  Our AI specialist knows every vehicle in our inventory, every financing option, and every detail you need to make the right decision — available instantly, 24/7.
                </p>
                <div className="space-y-3">
                  {['Find vehicles matching your budget and lifestyle', 'Answer detailed spec and comparison questions', 'Calculate financing and monthly payments', 'Book a test drive in under 60 seconds'].map((feat) => (
                    <div key={feat} className="flex items-center gap-3 text-white/60 font-body text-sm">
                      <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full flex-shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <div className="glass-card p-6" style={{ border: '1px solid rgba(212,175,55,0.15)' }}>
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
                    <div className="w-8 h-8 bg-[#D4AF37] flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </div>
                    <div>
                      <p className="font-heading text-white text-xs font-medium">AI Vehicle Specialist</p>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /><span className="text-emerald-400 text-[10px] font-body">Online now</span></div>
                    </div>
                  </div>
                  {[
                    { role: 'ai', text: "I'm looking for a family SUV under $65k. Must have 7 seats and all-wheel drive." },
                    { role: 'user', text: "Perfect. I have the 2023 Explorer ST in stock — 7 seats, AWD, 400hp, at $62,500. Would you like to see the full specs or book a test drive?" },
                    { role: 'ai', text: "Yes! Can I test drive it this Saturday?" },
                    { role: 'user', text: "Absolutely. Just share your name and email and I'll get that booked for you right now." },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                      <div className={`px-3 py-2 text-xs font-body leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20' : 'bg-white/[0.04] text-white/70 border border-white/[0.06]'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-white/20 text-xs font-body mt-3 tracking-wider">↑ Real AI conversation sample ↑</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-3">Client Stories</p>
              <h2 className="font-heading text-3xl md:text-4xl font-light text-white">What Our Customers Say</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="glass-card p-8 hover:border-[#D4AF37]/20 transition-all duration-300">
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(t.rating)].map((_, j) => <span key={j} className="text-[#D4AF37] text-base">★</span>)}
                  </div>
                  <p className="text-white/55 font-body text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-5 border-t border-white/[0.05]">
                    <img src={t.img} alt={t.name} className="w-10 h-10 object-cover grayscale" onError={(e) => { e.target.style.display = 'none'; }} />
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

        {/* ── Lead Capture CTA ── */}
        <section className="py-20 relative overflow-hidden border-t border-white/[0.05]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 via-transparent to-[#D4AF37]/3" />
          <div className="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4">Ready to Begin?</p>
              <h2 className="font-heading text-3xl md:text-4xl font-light text-white mb-4">
                Your Perfect Vehicle<br />Is Waiting for You
              </h2>
              <p className="text-white/45 font-body mb-10">Leave your details and our specialist will reach out with a personalized vehicle match within the hour.</p>
              {!leadSent ? (
                <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="homepage-lead-form">
                  <input className="input-dark px-4 py-3.5 text-sm font-body" placeholder="Your Name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required data-testid="lead-form-name" />
                  <input type="email" className="input-dark px-4 py-3.5 text-sm font-body" placeholder="Email Address" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} required data-testid="lead-form-email" />
                  <button type="submit" className="btn-gold py-3.5 text-xs tracking-[0.15em] flex items-center justify-center gap-2" data-testid="lead-form-submit">
                    Get Matched {SAFE_ICON(ArrowRight, { size: 15 })}
                  </button>
                </form>
              ) : (
                <div className="glass-card p-8" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
                  <p className="text-[#D4AF37] font-heading text-xl mb-2">You're on our radar.</p>
                  <p className="text-white/45 font-body text-sm">Our specialist will be in touch within the hour with your personalized recommendation.</p>
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
