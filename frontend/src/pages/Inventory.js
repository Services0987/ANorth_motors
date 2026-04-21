import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VehicleCard from '../components/VehicleCard';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';
const TYRE = '/tyre.png';

const MAKES      = ['All', 'Ford', 'Toyota', 'Honda', 'Chevrolet', 'BMW', 'Mercedes', 'Audi', 'Hyundai', 'Kia', 'Dodge', 'Jeep', 'RAM', 'GMC', 'Nissan', 'Mazda', 'Volvo'];
const BODY_TYPES = ['All', 'Truck', 'SUV', 'Sedan', 'Coupe', 'Hatchback', 'Wagon', 'Minivan', 'Cargo Van'];
const FUEL_TYPES = ['All', 'Gas', 'Diesel', 'Hybrid', 'Electric'];
const CONDITIONS = ['All', 'new', 'used'];

/* ─── Spinning‑Tyre "O" (only used on this page's hero) ─────────────────── */
function TyreO({ size = 120 }) {
  return (
    <span
      className="inline-flex items-center justify-center relative"
      style={{ width: size, height: size, verticalAlign: 'middle', marginLeft: 6, marginRight: 6 }}
    >
      <motion.img
        src={TYRE}
        alt="O"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 28px rgba(212,175,55,0.55)) brightness(1.15)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      {/* inner radial pulse */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.35) 25deg, transparent 50deg)',
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
      />
    </span>
  );
}

/* ─── 3-D card‑tilt hook ─────────────────────────────────────────────────── */
function use3DTilt(strength = 12) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [strength, -strength]), { stiffness: 400, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-strength, strength]), { stiffness: 400, damping: 30 });

  const handleMouse = useCallback((e) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    x.set((e.clientX - left) / width - 0.5);
    y.set((e.clientY - top) / height - 0.5);
  }, [x, y]);

  const handleLeave = useCallback(() => {
    x.set(0); y.set(0);
  }, [x, y]);

  return { ref, rotateX, rotateY, handleMouse, handleLeave };
}

/* ─── Filter select ──────────────────────────────────────────────────────── */
function FilterSelect({ label, value, options, onChange, testId }) {
  return (
    <div className="relative">
      <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-heading block mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-dark w-full px-3 py-2.5 text-sm font-body pr-8 appearance-none cursor-pointer"
          data-testid={testId}
        >
          {options.map((opt) => (
            <option key={opt} value={opt === 'All' ? '' : opt} className="bg-[#0A0A0A]">
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
      </div>
    </div>
  );
}

/* ─── Enhanced Vehicle Card Wrapper with 3-D tilt ────────────────────────── */
function BazaarCard({ vehicle, index }) {
  const { ref, rotateX, rotateY, handleMouse, handleLeave } = use3DTilt(8);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: '800px' }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }}
    >
      <VehicleCard vehicle={vehicle} index={index} />
    </motion.div>
  );
}

/* ─── Animated page numbers (max 7 visible) ─────────────────────────────── */
function Pagination({ page, totalPages, onPage }) {
  const pages = [];
  const delta = 2;
  const left  = Math.max(2, page - delta);
  const right = Math.min(totalPages - 1, page + delta);

  pages.push(1);
  if (left > 2) pages.push('…');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push('…');
  if (totalPages > 1) pages.push(totalPages);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-14 flex justify-center items-center gap-2 flex-wrap"
    >
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={`w-10 h-10 flex items-center justify-center border transition-all ${page <= 1 ? 'border-white/5 text-white/10 cursor-not-allowed' : 'border-white/15 text-white/50 hover:border-[#D4AF37] hover:text-[#D4AF37]'}`}
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-white/25 text-sm">…</span>
        ) : (
          <motion.button
            key={p}
            onClick={() => onPage(p)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className={`w-10 h-10 flex items-center justify-center border text-sm font-heading transition-all duration-200 ${
              p === page
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white'
            }`}
          >
            {p}
          </motion.button>
        )
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className={`w-10 h-10 flex items-center justify-center border transition-all ${page >= totalPages ? 'border-white/5 text-white/10 cursor-not-allowed' : 'border-white/15 text-white/50 hover:border-[#D4AF37] hover:text-[#D4AF37]'}`}
      >
        <ChevronRight size={15} />
      </button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredColor, setHoveredColor] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 40;

  const [filters, setFilters] = useState({
    search:    '',
    condition: searchParams.get('condition') || '',
    make:      searchParams.get('make')      || '',
    body_type: searchParams.get('body_type') || '',
    fuel_type: searchParams.get('fuel_type') || '',
    min_price: '',
    max_price: '',
  });

  /* ── Fetch ── */
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search)    params.append('search',    filters.search);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.make)      params.append('make',      filters.make);
      if (filters.body_type) params.append('body_type', filters.body_type);
      if (filters.fuel_type) params.append('fuel_type', filters.fuel_type);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      params.append('limit', limit.toString());
      params.append('skip',  ((page - 1) * limit).toString());

      const { data } = await axios.get(`${API}/vehicles?${params}`);
      setVehicles(data.vehicles || []);
      setTotal(data.total || 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', condition: '', make: '', body_type: '', fuel_type: '', min_price: '', max_price: '' });
    setPage(1);
  };

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const totalPages    = Math.ceil(total / limit);

  /* ── Hero parallax ── */
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 500], [0, 80]);

  /* ── compute hero tyre size from viewport ── */
  const [tyreSize, setTyreSize] = useState(120);
  useEffect(() => {
    const update = () => {
      setTyreSize(Math.min(160, Math.max(80, window.innerWidth * 0.09)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <>
      <Helmet>
        <title>Inventory | AutoNorth Motors Edmonton — Browse New &amp; Used Vehicles</title>
        <meta name="description" content="Browse our premium inventory of new and used trucks, SUVs and cars at AutoNorth Motors Edmonton. Best selection, best financing, Canada-wide shipping." />
        <meta name="keywords" content="used trucks Edmonton, SUVs for sale Alberta, Ford inventory Edmonton, AutoNorth Motors vehicles" />
      </Helmet>

      <div
        className="bg-[#050505] min-h-screen transition-colors duration-700"
        style={{ backgroundColor: hoveredColor || '#050505' }}
        data-testid="inventory-page"
      >
        <Navbar />

        {/* ══════════════════════════════════════════════════════
            HERO  —  Bazaar Cinematic Header (Inventory-only)
        ══════════════════════════════════════════════════════ */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        >
          {/* ── ambient glow blobs ── */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], rotate: [0, 30, 0], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [20, 0, 20], opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }}
          />

          {/* ── 3-D perspective grid floor ── */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 overflow-hidden pointer-events-none" style={{ perspective: '500px' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(212,175,55,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.08) 1px,transparent 1px)',
              backgroundSize: '80px 80px',
              transform: 'rotateX(72deg) translateZ(-30px) scale(3)',
              transformOrigin: 'bottom center',
              maskImage: 'linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 80%)',
              WebkitMaskImage: 'linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 80%)',
            }} />
          </div>

          {/* ── ambient particles ── */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div key={i}
                className="absolute rounded-full bg-[#D4AF37]"
                style={{ width: 2 + (i % 3), height: 2 + (i % 3), left: `${10 + i * 11}%`, top: `${15 + (i % 4) * 18}%` }}
                animate={{ y: [-12, 12, -12], opacity: [0.15, 0.55, 0.15] }}
                transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              />
            ))}
          </div>

          {/* ── hero content ── */}
          <motion.div
            style={{ y: heroY }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.1em' }}
              animate={{ opacity: 1, letterSpacing: '0.5em' }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="text-[10px] tracking-[0.5em] uppercase text-[#D4AF37] font-heading mb-8"
            >
              World Class Performance
            </motion.p>

            {/* ✦ THE GRAND AUTONORTH LOGO WITH SPINNING TYRE ✦ */}
            <div
              className="flex items-center justify-center flex-wrap leading-none mb-6"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(3.5rem, 10vw, 9rem)',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {/* AUTO — solid white */}
              {['A', 'U', 'T'].map((l, i) => (
                <motion.span
                  key={l}
                  className="text-white"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  {l}
                </motion.span>
              ))}
              {/* Spinning Tyre replaces 'O' */}
              <motion.span
                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, delay: 0.76, ease: [0.16, 1, 0.3, 1] }}
              >
                <TyreO size={tyreSize} />
              </motion.span>

              {/* Thin gold separator */}
              <motion.span
                className="mx-3 md:mx-5 self-stretch"
                style={{ width: 1.5, background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.6), transparent)' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              />

              {/* NORTH — outlined */}
              {['N', 'O', 'R', 'T', 'H'].map((l, i) => (
                <motion.span
                  key={`north-${l}`}
                  style={{
                    color: 'transparent',
                    WebkitTextStroke: '1.5px rgba(255,255,255,0.35)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  {l}
                </motion.span>
              ))}
            </div>

            {/* ── full‑logo light sweep ── */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              aria-hidden
            >
              <motion.div
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: '18%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
                  skewX: '-12deg',
                }}
                animate={{ x: ['-30%', '160%'] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* Sub‑line */}
            <motion.div
              className="h-px w-48 mx-auto mb-8"
              style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7 }}
              className="text-white/40 font-body text-xs lg:text-sm tracking-[0.25em] uppercase max-w-lg mx-auto leading-relaxed"
            >
              Curated Excellence. Unmatched Quality.<br />Experience the Edmonton Gold Standard.
            </motion.p>
          </motion.div>

          {/* ── scroll indicator ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-white/20 text-[9px] tracking-[0.4em] uppercase font-body">Scroll to Browse</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <ChevronDown size={18} className="text-white/15" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════
            COLLECTION HEADER
        ══════════════════════════════════════════════════════ */}
        <div className="py-16 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/[0.04]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#D4AF37] font-heading mb-2">What We Have</p>
            <h2 className="font-heading text-3xl md:text-4xl font-light text-white tracking-tight mb-2">
              The <span className="gradient-text">Collection</span>
            </h2>
            <p className="text-white/30 text-[10px] uppercase font-heading tracking-[0.3em]">
              {total > 0 ? `${total} vehicles available` : 'Browsing all available units'}
            </p>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════
            STICKY SEARCH + FILTER BAR
        ══════════════════════════════════════════════════════ */}
        <div className="sticky top-20 z-30 bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.05] px-6 md:px-12 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-60 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                className="input-dark w-full pl-10 pr-4 py-2.5 text-sm font-body"
                placeholder="Search make, model, or keyword..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                data-testid="inventory-search"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-body tracking-wider uppercase transition-all duration-200 border ${
                showFilters || activeFilters > 0
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                  : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white'
              }`}
              data-testid="inventory-filter-toggle"
            >
              <SlidersHorizontal size={14} />
              Filters {activeFilters > 0 && `(${activeFilters})`}
            </button>

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs font-body transition-colors"
                data-testid="clear-filters-btn"
              >
                <X size={14} /> Clear
              </button>
            )}

            <span className="text-white/40 text-sm font-body ml-auto">
              {total} vehicle{total !== 1 ? 's' : ''} found
            </span>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="max-w-7xl mx-auto mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-2"
              >
                <FilterSelect label="Condition" value={filters.condition} options={CONDITIONS} onChange={(v) => updateFilter('condition', v)} testId="filter-condition" />
                <FilterSelect label="Make"      value={filters.make}      options={MAKES}      onChange={(v) => updateFilter('make', v)}      testId="filter-make" />
                <FilterSelect label="Body Type" value={filters.body_type} options={BODY_TYPES} onChange={(v) => updateFilter('body_type', v)} testId="filter-body-type" />
                <FilterSelect label="Fuel Type" value={filters.fuel_type} options={FUEL_TYPES} onChange={(v) => updateFilter('fuel_type', v)} testId="filter-fuel-type" />
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-heading block mb-1.5">Min Price</label>
                  <input type="number" className="input-dark w-full px-3 py-2.5 text-sm font-body" placeholder="$0"  value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} data-testid="filter-min-price" />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-heading block mb-1.5">Max Price</label>
                  <input type="number" className="input-dark w-full px-3 py-2.5 text-sm font-body" placeholder="Any" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} data-testid="filter-max-price" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══════════════════════════════════════════════════════
            VEHICLE GRID
        ══════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="glass-card aspect-[4/5]"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </motion.div>
            ) : vehicles.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="font-heading text-white text-2xl mb-3">No vehicles found</h3>
                <p className="text-white/45 font-body text-base mb-6">Try adjusting your filters to see more results.</p>
                <button onClick={clearFilters} className="btn-gold px-6 py-3 text-sm" data-testid="no-results-clear-btn">
                  Clear All Filters
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`grid-page-${page}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                data-testid="vehicles-grid"
              >
                {vehicles.map((v, i) => (
                  <BazaarCard key={v._id || v.id || i} vehicle={v} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Pagination ── */}
          {!loading && totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={(p) => { setPage(Math.max(1, Math.min(p, totalPages))); }}
            />
          )}

          {/* ── Page info ── */}
          {!loading && total > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-white/20 text-xs font-body mt-4 tracking-widest uppercase"
            >
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} vehicles
            </motion.p>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
