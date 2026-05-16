import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight, ArrowRight, Loader2 as Loader } from 'lucide-react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VehicleCard from '../components/VehicleCard';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};

const MAKES      = ['All', 'Ford', 'Toyota', 'Honda', 'Chevrolet', 'BMW', 'Mercedes', 'Audi', 'Hyundai', 'Kia', 'Dodge', 'Jeep', 'RAM', 'GMC', 'Nissan', 'Mazda', 'Volvo'];
const BODY_TYPES = ['All', 'Truck', 'SUV', 'Sedan', 'Coupe', 'Hatchback', 'Wagon', 'Minivan', 'Cargo Van'];
const FUEL_TYPES = ['All', 'Gas', 'Diesel', 'Hybrid', 'Electric'];
const CONDITIONS = ['All', 'new', 'used'];

/* ─── 3-D card tilt hook ─── */
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

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return { ref, rotateX, rotateY, handleMouse, handleLeave };
}

/* ─── Filter select ─── */
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
            <option key={opt} value={opt === 'All' ? '' : opt} className="bg-[#0A0A0A]">{opt}</option>
          ))}
        </select>
        {SAFE_ICON(ChevronDown, { size: 14, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" })}
      </div>
    </div>
  );
}

/* ─── Bazaar Card ─── */
function BazaarCard({ vehicle, index }) {
  const { ref, rotateX, rotateY, handleMouse, handleLeave } = use3DTilt(8);
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: '800px' }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { handleLeave(); setHovered(false); }}
      onMouseEnter={() => setHovered(true)}
      data-testid={`vehicle-card-${vehicle._id || vehicle.id}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }}
    >
      <VehicleCard vehicle={vehicle} index={index} />
    </motion.div>
  );
}

/* ─── Pagination ─── */
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-14 flex justify-center items-center gap-2 flex-wrap">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className={`w-10 h-10 flex items-center justify-center border transition-all ${page <= 1 ? 'border-white/5 text-white/10 cursor-not-allowed' : 'border-white/15 text-white/50 hover:border-[#D4AF37] hover:text-[#D4AF37]'}`}>{SAFE_ICON(ChevronLeft, { size: 15 })}</button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-white/25 text-sm">…</span>
        ) : (
          <motion.button key={p} onClick={() => onPage(p)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} className={`w-10 h-10 flex items-center justify-center border text-sm font-heading transition-all duration-200 ${p === page ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white'}`}>{p}</motion.button>
        )
      )}
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={`w-10 h-10 flex items-center justify-center border transition-all ${page >= totalPages ? 'border-white/5 text-white/10 cursor-not-allowed' : 'border-white/15 text-white/50 hover:border-[#D4AF37] hover:text-[#D4AF37]'}`}>{SAFE_ICON(ChevronRight, { size: 15 })}</button>
    </motion.div>
  );
}

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [filters, setFilters] = useState({
    search:    '',
    condition: searchParams.get('condition') || '',
    make:      searchParams.get('make')      || '',
    body_type: searchParams.get('body_type') || '',
    fuel_type: searchParams.get('fuel_type') || '',
    min_price: '',
    max_price: '',
  });

  const collectionRef = useRef(null);

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
      
      if (collectionRef.current && page > 1) {
        const offset = 100; 
        const elementPosition = collectionRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const updateFilter = (key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); };
  const clearFilters = () => { setFilters({ search: '', condition: '', make: '', body_type: '', fuel_type: '', min_price: '', max_price: '' }); setPage(1); };

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const totalPages    = Math.ceil(total / limit);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 500], [0, 80]);

  return (
    <>
      <Helmet>
        <title>Inventory | AutoNorth Motors Edmonton — Premium Vehicles</title>
      </Helmet>
      <div className="bg-[#050505] min-h-screen" data-testid="inventory-page">
        <Navbar />

        <motion.div style={{ opacity: heroOpacity }} className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-black">
            <div className="absolute inset-0 z-0">
              <motion.img 
                src="/clean_luxury_showroom_no_text_1777282813141.png" 
                className="w-full h-full object-cover opacity-70"
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black" />
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-center py-10 px-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-1 md:gap-4 mb-4">
                  {['A', 'U', 'T'].map((l, i) => (
                    <motion.span
                      key={`auto-${l}`}
                      initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 1, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="text-white font-heading font-extrabold text-[clamp(3rem,12vw,9rem)] leading-none drop-shadow-2xl"
                      style={{
                        background: 'linear-gradient(180deg, #fff 0%, #aaa 50%, #444 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {l}
                    </motion.span>
                  ))}
                  
                  {/* SPINNING O (WHEEL) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 1.5, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                    className="relative"
                  >
                    <motion.img 
                      src="/full_luxury_wheel_with_tyre_1777282790829.png"
                      className="w-[clamp(3rem,12vw,9rem)] h-auto drop-shadow-[0_0_40px_rgba(212,175,55,0.5)] rounded-full overflow-hidden"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </div>

                <div className="flex items-center justify-center gap-1 md:gap-4">
                  {['N'].map((l, i) => (
                    <motion.span
                      key={`north-${l}`}
                      initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 1, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
                      className="text-white font-heading font-extrabold text-[clamp(3rem,12vw,9rem)] leading-none drop-shadow-2xl"
                      style={{
                        background: 'linear-gradient(180deg, #fff 0%, #aaa 50%, #444 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {l}
                    </motion.span>
                  ))}

                  {/* SPINNING O (WHEEL 2) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 1.5, delay: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="relative"
                  >
                    <motion.img 
                      src="/full_luxury_wheel_with_tyre_1777282790829.png"
                      className="w-[clamp(3rem,12vw,9rem)] h-auto drop-shadow-[0_0_40px_rgba(212,175,55,0.5)] rounded-full overflow-hidden"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>

                  {['R', 'T', 'H'].map((l, i) => (
                    <motion.span
                      key={`north-${l}`}
                      initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 1, delay: 1.6 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="text-white font-heading font-extrabold text-[clamp(3rem,12vw,9rem)] leading-none drop-shadow-2xl"
                      style={{
                        background: 'linear-gradient(180deg, #fff 0%, #aaa 50%, #444 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {l}
                    </motion.span>
                  ))}
                </div>
              </div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 2.5 }}
                className="text-white/40 font-body text-[10px] md:text-sm tracking-[0.4em] uppercase mt-12 text-center"
              >
                Curated Excellence. Unmatched Quality.
              </motion.p>
            </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
            <span className="text-white/20 text-[9px] tracking-[0.4em] uppercase font-body">Scroll to Browse</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              {SAFE_ICON(ChevronDown, { size: 18, className: "text-white/15" })}
            </motion.div>
          </motion.div>
        </motion.div>

        <div ref={collectionRef} className="py-16 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/[0.04] bg-[#050505] relative z-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-heading text-3xl md:text-5xl font-light text-white tracking-tight mb-2">
              The <span className="gradient-text font-bold">Collection</span>
            </h2>
            <p className="text-white/40 text-[10px] md:text-xs uppercase font-heading tracking-[0.3em]">
              {total > 0 ? `${total} Premium Vehicles Available` : 'Browsing all available units'}
            </p>
          </motion.div>
        </div>

        <div className="sticky top-20 z-30 bg-[#050505]/95 backdrop-blur-xl border-y border-white/[0.08] px-6 md:px-12 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-60 relative group">
              {SAFE_ICON(Search, { size: 15, className: "absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" })}
              <input
                className="w-full bg-[#111] border border-white/10 focus:border-[#D4AF37]/50 rounded-none pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/30 font-body transition-all outline-none shadow-inner"
                placeholder="Search make, model, or keyword..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                data-testid="inventory-search"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-heading font-medium tracking-[0.2em] uppercase transition-all duration-300 border ${
                showFilters || activeFilters > 0
                  ? 'border-[#D4AF37] text-black bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : 'border-white/15 text-white/60 hover:border-white/40 hover:text-white hover:bg-white/5'
              }`}
              data-testid="inventory-filter-toggle"
            >
              {SAFE_ICON(SlidersHorizontal, { size: 14 })}
              Filters {activeFilters > 0 && `(${activeFilters})`}
            </button>

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-4 text-white/40 hover:text-white text-[10px] tracking-widest uppercase font-heading transition-colors"
                data-testid="clear-filters-btn"
              >
                {SAFE_ICON(X, { size: 14 })} Reset
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="max-w-7xl mx-auto mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 pb-4">
                  <FilterSelect label="Condition" value={filters.condition} options={CONDITIONS} onChange={(v) => updateFilter('condition', v)} testId="filter-condition" />
                  <FilterSelect label="Make"      value={filters.make}      options={MAKES}      onChange={(v) => updateFilter('make', v)}      testId="filter-make" />
                  <FilterSelect label="Body Type" value={filters.body_type} options={BODY_TYPES} onChange={(v) => updateFilter('body_type', v)} testId="filter-body-type" />
                  <FilterSelect label="Fuel Type" value={filters.fuel_type} options={FUEL_TYPES} onChange={(v) => updateFilter('fuel_type', v)} testId="filter-fuel-type" />
                  <div>
                    <label className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-heading block mb-1.5">Min Price</label>
                    <input type="number" className="w-full bg-[#111] border border-white/10 focus:border-[#D4AF37]/50 outline-none px-3 py-2.5 text-sm text-white font-body transition-all" placeholder="$0"  value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} data-testid="filter-min-price" />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-heading block mb-1.5">Max Price</label>
                    <input type="number" className="w-full bg-[#111] border border-white/10 focus:border-[#D4AF37]/50 outline-none px-3 py-2.5 text-sm text-white font-body transition-all" placeholder="Any" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} data-testid="filter-max-price" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 relative z-20">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[...Array(8)].map((_, i) => (
                  <motion.div key={i} className="glass-card aspect-[4/5] overflow-hidden relative" animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent" />
                  </motion.div>
                ))}
              </motion.div>
            ) : vehicles.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-32 border border-white/5 bg-white/[0.02]">
                <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                  {SAFE_ICON(Search, { size: 32, className: "text-[#D4AF37]" })}
                </div>
                <h3 className="font-heading text-white text-3xl font-light mb-3">No models found</h3>
                <p className="text-white/40 font-body text-base mb-8 max-w-md mx-auto">We couldn't find any vehicles matching your exact criteria. Uncover more by broadening your search.</p>
                <button onClick={clearFilters} className="btn-gold px-8 py-4 text-xs tracking-widest font-heading font-medium" data-testid="no-results-clear-btn">
                  Clear Filters
                </button>
              </motion.div>
            ) : (
              <motion.div key={`grid-page-${page}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" data-testid="vehicles-grid">
                {vehicles.map((v, i) => (
                  <BazaarCard key={v._id || v.id || i} vehicle={v} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && totalPages > 1 && (
            <div className="mt-16 flex flex-col items-center">
              <Pagination page={page} totalPages={totalPages} onPage={(p) => setPage(p)} />
            </div>
          )}

          {!loading && total > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/20 text-[10px] font-heading mt-6 tracking-widest uppercase">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} listings
            </motion.p>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
