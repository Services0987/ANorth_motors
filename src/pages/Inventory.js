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

/* ─── 3D Rotated Glowing Diamond & Turbine Wheel (Wow Factor "O") ─── */
export function WowTurbineO({ size = 160 }) {
  return (
    <div
      className="inline-flex items-center justify-center relative mx-4 lg:mx-8"
      style={{ width: size, height: size, verticalAlign: 'middle', perspective: '1000px' }}
    >
      {/* Intense Gold Backlight Glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,1) 0%, rgba(212,175,55,0) 70%)',
          filter: 'blur(30px)',
          zIndex: 0,
        }}
      />
      
      {/* Solid Black Metallic Diamond */}
      <motion.div
        className="absolute w-full h-full border-2 border-[#D4AF37]/50 shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #111 0%, #050505 100%)',
          rotate: 45,
          zIndex: 1,
          boxShadow: '0 0 40px rgba(212,175,55,0.2)',
        }}
      >
        {/* Diamond inner reflection sweep */}
        <motion.div
          className="absolute inset-0 bg-white"
          animate={{ x: ['-200%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
          style={{ opacity: 0.05, transform: 'rotate(-45deg)' }}
        />
      </motion.div>

      {/* The Central Spinning Wheel (SVG Turbine) */}
      <motion.div
        className="absolute z-10 w-[75%] h-[75%] rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)_inset]"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{
          background: 'radial-gradient(circle at 30% 30%, #333 0%, #050505 90%)',
          border: '4px solid #1a1a1a',
        }}
      >
        {/* Brake Caliper (Static behind spokes, wait, we put it strictly under the spokes) */}
        <div className="absolute top-[15%] right-[15%] w-[30%] h-[30%] rounded-full bg-[#cc0000] z-0 blur-[1px]" />
        
        {/* Detailed SVG Alloy Wheel Spokes */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full z-10 drop-shadow-2xl">
          <defs>
            <linearGradient id="spokeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#888" stopOpacity="1" />
              <stop offset="100%" stopColor="#222" stopOpacity="1" />
            </linearGradient>
            <radialGradient id="centerCap" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
              <stop offset="100%" stopColor="#8a6d1a" stopOpacity="1" />
            </radialGradient>
          </defs>
          {/* Outer Rim */}
          <circle cx="50" cy="50" r="47" fill="none" stroke="url(#spokeGlow)" strokeWidth="6" />
          
          {/* Multiple Spokes */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i} transform={`rotate(${angle} 50 50)`}>
              <path d="M 50 50 L 47 10 L 53 10 Z" fill="url(#spokeGlow)" />
              {/* Complex inner groove */}
              <line x1="50" y1="50" x2="50" y2="5" stroke="#111" strokeWidth="1" />
            </g>
          ))}
          
          {/* Center Cap */}
          <circle cx="50" cy="50" r="10" fill="url(#centerCap)" />
          {/* Center Logo 'AN' mini */}
          <text x="50" y="52.5" fontSize="6" fontWeight="bold" fill="#000" textAnchor="middle" fontFamily="'Outfit', sans-serif">
            AN
          </text>
        </svg>

        {/* Dynamic Light Sweep on the Wheel */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ rotate: -360 }} /* Counter-rotate so the light source looks static */
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute top-0 w-full h-[30%] bg-gradient-to-b from-white/30 to-transparent rounded-t-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── 3-D card tilt hook ─── */
function use3DTilt(strength = 12) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [strength, -strength]), { stiffness: 400, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-strength, strength]), { stiffness: 400, damping: 30 });

  // Mobile Gyroscope listener for Bazaar cards
  useEffect(() => {
    if (typeof window === 'undefined' || !/Mobi|Android/i.test(navigator.userAgent)) return;
    const handleOrientation = (e) => {
      if (!e.beta || !e.gamma) return;
      const nx = e.gamma / 30;
      const ny = (e.beta - 45) / 30;
      x.set(Math.max(-0.5, Math.min(0.5, nx)));
      y.set(Math.max(-0.5, Math.min(0.5, ny)));
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [x, y]);

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
      
      // Only scroll to the collection if we are changing pages (not on initial load)
      if (collectionRef.current && page > 1) {
        const offset = 100; // Account for sticky navbar
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

  // Semantic Intent Engine: Generate dynamic SEO signals based on active filters
  const getIntentText = () => {
    const parts = [];
    if (filters.condition) parts.push(filters.condition === 'new' ? 'New' : 'Used');
    if (filters.make) parts.push(filters.make);
    if (filters.body_type) parts.push(`${filters.body_type}s`);
    if (parts.length === 0) return 'Premium Vehicles';
    return parts.join(' ');
  };

  const intentTitle = `${getIntentText()} for Sale in Edmonton, Alberta | AutoNorth Motors`;
  const intentDesc = `Browse our elite selection of ${getIntentText().toLowerCase()} in Edmonton. Serving Alberta and Canada with certified quality, zero dealer fees, and instant financing. View all ${total} matching listings.`;

  /* ── Hero parallax ── */
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 500], [0, 80]);

  /* ── compute hero tyre size from viewport ── */
  const [tyreSize, setTyreSize] = useState(160);
  useEffect(() => {
    const update = () => setTyreSize(Math.min(220, Math.max(120, window.innerWidth * 0.12)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const [assetsReady, setAssetsReady] = useState(false);

  // Preload critical assets for smooth animations
  useEffect(() => {
    const criticalImages = [
      '/clean_luxury_showroom_no_text_1777282813141.png',
      '/full_luxury_wheel_with_tyre_1777282790829.png'
    ];
    let loadedCount = 0;
    criticalImages.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === criticalImages.length) setAssetsReady(true);
      };
      img.onerror = () => setAssetsReady(true); // Fallback to avoid hanging
    });
  }, []);

  return (
    <>
      <Helmet>
        <title>{intentTitle}</title>
        <meta name="description" content={intentDesc} />
        <link rel="canonical" href={`https://autonorth.ca/inventory${activeFilters > 0 ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))).toString() : ''}`} />
        <script type="application/ld+json">
          {JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": intentTitle,
              "description": intentDesc,
              "url": window.location.href,
              "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": total,
                "itemListElement": vehicles.slice(0, 20).map((v, i) => ({
                  "@type": "ListItem",
                  "position": i + 1,
                  "item": {
                    "@type": "Product",
                    "name": v.title,
                    "url": `https://autonorth.ca/vehicle/${v._id || v.id}`,
                    "image": v.images?.[0],
                    "offers": {
                      "@type": "Offer",
                      "price": v.price,
                      "priceCurrency": "CAD",
                      "availability": "https://schema.org/InStock"
                    }
                  }
                }))
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "AutoDealer",
              "name": "AutoNorth Motors",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "8202 118 Ave NW",
                "addressLocality": "Edmonton",
                "addressRegion": "AB",
                "postalCode": "T5B 0S3",
                "addressCountry": "CA"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 53.5682,
                "longitude": -113.4619
              },
              "telephone": "+18256055050",
              "priceRange": "$$$"
            }
          ])}
        </script>
      </Helmet>
      <div className="bg-[#050505] min-h-screen" data-testid="inventory-page">
        <Navbar />

        {/* ══════════════════════════════════════════════════════
            HERO  —  The "Mind Blowing" AUTONORTH Display
        ══════════════════════════════════════════════════════ */}
        <motion.div style={{ opacity: heroOpacity }} className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-black">
            <div className="absolute inset-0 z-0">
              {assetsReady && (
                <motion.img 
                  src="/clean_luxury_showroom_no_text_1777282813141.png" 
                  className="w-full h-full object-cover opacity-70"
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.7 }}
                  transition={{ 
                    opacity: { duration: 1 },
                    scale: { duration: 15, ease: "linear", repeat: Infinity, repeatType: "reverse" }
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black" />
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-center py-10 px-6">
              {/* ━━ THE MECHANICAL MASTERPIECE BRAND ━━ */}
              <AnimatePresence>
              {assetsReady && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
                  
                  {/* WORD: AUTO */}
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
                        alt="AutoNorth Motors Luxury Wheel Logo"
                        className="w-[clamp(3rem,12vw,9rem)] h-auto drop-shadow-[0_0_40px_rgba(212,175,55,0.5)] rounded-full overflow-hidden"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  </div>

                  {/* WORD: NORTH */}
                  <div className="flex items-center justify-center gap-1 md:gap-4">
                    {['N'].map((l, i) => (
                      <motion.span
                        key={`north-char-${l}-${i}`}
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
                      key="wheel-o-2"
                      initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ duration: 1.5, delay: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
                      className="relative"
                    >
                      <motion.img 
                        src="/full_luxury_wheel_with_tyre_1777282790829.png"
                        alt="AutoNorth Motors Luxury Wheel Symbol"
                        className="w-[clamp(3rem,12vw,9rem)] h-auto drop-shadow-[0_0_40px_rgba(212,175,55,0.5)] rounded-full overflow-hidden"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>

                    {['R', 'T', 'H'].map((l, i) => (
                      <motion.span
                        key={`north-char-${l}-${i}`}
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
                </motion.div>
              )}
              </AnimatePresence>

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
            <h1 className="font-heading text-3xl md:text-5xl font-light text-white tracking-tight mb-2 uppercase">
              {getIntentText().split(' ').map((word, i) => (
                <span key={i} className={i < 2 ? "font-bold mr-3" : "text-white/40 mr-3"}>
                  {word}
                </span>
              ))}
              <span className="gradient-text font-bold ml-1">in Edmonton</span>
            </h1>
            <p className="text-[#D4AF37] text-[10px] md:text-xs uppercase font-heading tracking-[0.3em] font-bold">
              {total > 0 ? `${total} Certified Units in Alberta` : 'Browsing all available inventory'}
            </p>
          </motion.div>
        </div>

        {/* SEARCH + FILTER BAR */}
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

        {/* VEHICLE GRID */}
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
                {SAFE_ICON(Loader, { className: "w-4 h-4 animate-spin text-[#D4AF37]" })}
                <h3 className="font-heading text-white text-3xl font-light mb-3">No models found</h3>
                <p className="text-white/40 font-body text-base mb-8 max-w-md mx-auto">We couldn't find any vehicles matching your exact criteria. Uncover more by broadening your search.</p>
                <button onClick={clearFilters} className="btn-gold px-8 py-4 text-xs tracking-widest font-heading font-medium" data-testid="no-results-clear-btn">
                  Clear Filters
                </button>
              </motion.div>
            ) : (
              <motion.div key={`grid-page-${page}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" data-testid="vehicles-grid">
                {vehicles && vehicles.map((v, i) => (
                  v && <BazaarCard key={v._id || v.id || i} vehicle={v} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && totalPages > 1 && (
            <div className="mt-16 flex flex-col items-center">
               <Pagination page={page} totalPages={totalPages} onPage={(p) => setPage(p)} />
            </div>
          )}

          {/* ── ALGORITHMIC SEMANTIC SILO (CRAWLER TARGET) ── */}
          <section className="mt-32 pt-20 border-t border-white/[0.05] opacity-[0.03] hover:opacity-100 transition-opacity duration-1000 overflow-hidden">
            <h4 className="text-white text-xs tracking-widest uppercase mb-10 text-center font-heading">Global Intent Index</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 text-[9px] uppercase tracking-tighter">
              {MAKES.filter(m => m !== 'All').map(m => (
                <div key={`silo-${m}`} className="flex flex-col gap-2">
                  <span className="text-white/60 font-bold">{m} Specialist</span>
                  {BODY_TYPES.filter(bt => bt !== 'All').slice(0, 4).map(bt => (
                    <Link key={`silo-${m}-${bt}`} to={`/inventory?make=${m}&body_type=${bt}`} className="text-white/20 hover:text-[#D4AF37] transition-colors">
                      {m} {bt}s for Sale Edmonton
                    </Link>
                  ))}
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <span className="text-white/60 font-bold">Local Financing</span>
                <Link to="/financing" className="text-white/20 hover:text-[#D4AF37]">Used Car Loans St. Albert</Link>
                <Link to="/financing" className="text-white/20 hover:text-[#D4AF37]">Bad Credit Financing Leduc</Link>
                <Link to="/financing" className="text-white/20 hover:text-[#D4AF37]">No Dealer Fees Sherwood Park</Link>
                <Link to="/financing" className="text-white/20 hover:text-[#D4AF37]">Instant Approval Fort Saskatchewan</Link>
              </div>
            </div>
          </section>

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
