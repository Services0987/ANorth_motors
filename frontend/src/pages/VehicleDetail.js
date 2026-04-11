import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Phone, MessageSquare, Calendar, Zap } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PLACEHOLDER = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=60';
const TABS = ['contact', 'test_drive', 'financing'];
const TAB_LABELS = { contact: 'Enquire', test_drive: 'Test Drive', financing: 'Financing' };
const TAB_ICONS = { contact: MessageSquare, test_drive: Calendar, financing: Zap };

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('contact');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', preferred_date: '', preferred_time: '', down_payment: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [galleryHovered, setGalleryHovered] = useState(false);
  const galleryRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/vehicles/${id}`)
      .then(({ data }) => setVehicle(data))
      .catch(() => navigate('/inventory'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const images = vehicle?.images?.length > 0 ? vehicle.images : [PLACEHOLDER];

  const handleGalleryMouseMove = (e) => {
    if (!galleryRef.current) return;
    const rect = galleryRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await axios.post(`${API}/leads`, {
        lead_type: activeTab, name: form.name, email: form.email, phone: form.phone,
        message: form.message, vehicle_id: vehicle?.id, vehicle_title: vehicle?.title,
        preferred_date: form.preferred_date || undefined, preferred_time: form.preferred_time || undefined,
        down_payment: form.down_payment ? parseFloat(form.down_payment) : undefined,
      });
      setSubmitted(true);
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!vehicle) return null;

  const specs = [
    ['Year', vehicle.year], ['Make', vehicle.make], ['Model', vehicle.model],
    ['Condition', vehicle.condition === 'new' ? 'Brand New' : 'Pre-Owned'],
    ['Mileage', vehicle.mileage === 0 ? '0 km' : `${vehicle.mileage?.toLocaleString()} km`],
    ['Transmission', vehicle.transmission], ['Fuel Type', vehicle.fuel_type],
    ['Drivetrain', vehicle.drivetrain], ['Engine', vehicle.engine],
    ['Exterior', vehicle.exterior_color], ['Interior', vehicle.interior_color],
    ['Doors', vehicle.doors], ['Seats', vehicle.seats],
    ['Stock #', vehicle.stock_number], ['VIN', vehicle.vin || 'Available on request'],
  ].filter(([, v]) => v);

  const schemaData = {
    "@context": "https://schema.org", "@type": "Vehicle",
    "name": vehicle.title, "description": vehicle.description,
    "vehicleModelDate": String(vehicle.year), "fuelType": vehicle.fuel_type,
    "mileageFromOdometer": { "@type": "QuantitativeValue", "value": vehicle.mileage, "unitCode": "KMT" },
    "vehicleTransmission": vehicle.transmission,
    "offers": { "@type": "Offer", "price": vehicle.price, "priceCurrency": "CAD", "availability": vehicle.status === 'available' ? "https://schema.org/InStock" : "https://schema.org/SoldOut", "seller": { "@type": "AutoDealer", "name": "AutoNorth Motors" } }
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>{`${vehicle.title} — AutoNorth Motors Edmonton`}</title>
        <meta name="description" content={`${vehicle.title} for sale at AutoNorth Motors Edmonton. $${vehicle.price?.toLocaleString()} CAD. ${vehicle.mileage === 0 ? 'Brand new.' : `${vehicle.mileage?.toLocaleString()} km.`} ${vehicle.fuel_type} · ${vehicle.transmission}. Book a test drive today.`} />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <div className="bg-[#050505] min-h-screen" data-testid="vehicle-detail-page">
        <Navbar />

        <div className="pt-24 max-w-7xl mx-auto px-6 md:px-12 pb-24">
          <motion.button onClick={() => navigate(-1)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-white/35 hover:text-white text-sm font-body transition-colors mb-8">
            <ArrowLeft size={15} /> Back to Inventory
          </motion.button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Gallery + Info */}
            <div className="lg:col-span-3">

              {/* 3D Interactive Gallery */}
              <div
                ref={galleryRef}
                className="relative mb-3"
                style={{ perspective: '1200px', cursor: 'crosshair' }}
                onMouseMove={handleGalleryMouseMove}
                onMouseEnter={() => setGalleryHovered(true)}
                onMouseLeave={() => { setMousePos({ x: 0, y: 0 }); setGalleryHovered(false); }}
                data-testid="vehicle-gallery"
              >
                {/* Ambient spotlight */}
                <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500"
                  style={{
                    background: galleryHovered
                      ? `radial-gradient(ellipse at ${(mousePos.x + 0.5) * 100}% ${(mousePos.y + 0.5) * 100}%, rgba(212,175,55,0.18) 0%, transparent 55%)`
                      : 'radial-gradient(ellipse at 35% 35%, rgba(212,175,55,0.08) 0%, transparent 55%)',
                    pointerEvents: 'none',
                  }}
                />

                <motion.div
                  animate={{
                    rotateY: galleryHovered ? mousePos.x * 8 : 0,
                    rotateX: galleryHovered ? mousePos.y * -4 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 180, damping: 28 }}
                  style={{ transformStyle: 'preserve-3d', overflow: 'hidden', paddingTop: '62.5%', position: 'relative' }}
                  className="bg-[#090909] border border-white/[0.06]"
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={imgIdx}
                      src={images[imgIdx]}
                      alt={vehicle.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        x: galleryHovered ? mousePos.x * -30 : 0,
                        y: galleryHovered ? mousePos.y * -20 : 0,
                        scale: 1.08,
                      }}
                      onError={(e) => { e.target.src = PLACEHOLDER; }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                    />
                  </AnimatePresence>
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 backdrop-blur flex items-center justify-center text-white hover:bg-[#D4AF37] hover:text-black transition-all z-10"><ChevronLeft size={18} /></button>
                      <button onClick={() => setImgIdx((i) => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 backdrop-blur flex items-center justify-center text-white hover:bg-[#D4AF37] hover:text-black transition-all z-10"><ChevronRight size={18} /></button>
                    </>
                  )}
                  <div className="absolute top-3 left-3 flex gap-1.5 z-20">
                    <span className={`px-3 py-1 text-[11px] font-heading font-bold tracking-wider uppercase ${vehicle.condition === 'new' ? 'bg-emerald-500 text-white' : 'bg-[#D4AF37] text-black'}`}>{vehicle.condition === 'new' ? 'New' : 'Pre-Owned'}</span>
                    {vehicle.status === 'sold' && <span className="px-3 py-1 text-[11px] font-heading bg-red-600 text-white tracking-wider uppercase">Sold</span>}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white/50 text-xs font-body px-2 py-1 z-20">{imgIdx + 1}/{images.length}</div>
                </motion.div>

                {/* Ground reflection */}
                <div style={{
                  height: '30px',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
                  filter: 'blur(4px)',
                  marginTop: '-2px',
                  opacity: 0.5,
                }} />
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`flex-shrink-0 w-20 h-14 overflow-hidden transition-all border-2 ${i === imgIdx ? 'border-[#D4AF37]' : 'border-transparent opacity-40 hover:opacity-70'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = PLACEHOLDER; }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="mt-6 glass-card p-6">
                <h2 className="font-heading text-lg font-medium text-white mb-3">About This Vehicle</h2>
                <p className="text-white/65 font-body text-base leading-relaxed">{vehicle.description || 'Contact us for more details about this vehicle.'}</p>
              </div>

              {/* Features */}
              {vehicle.features?.length > 0 && (
                <div className="mt-4 glass-card p-6">
                  <h2 className="font-heading text-lg font-medium text-white mb-4">Key Features & Equipment</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {vehicle.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-white/65 font-body text-sm">
                        <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specs */}
              <div className="mt-4 glass-card p-6">
                <h2 className="font-heading text-lg font-medium text-white mb-4">Full Specifications</h2>
                <div className="divide-y divide-white/[0.04]">
                  {specs.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-3">
                      <span className="text-white/40 font-body text-sm">{label}</span>
                      <span className="text-white font-body text-sm font-medium capitalize">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky panel */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                <div className="glass-card p-6">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {vehicle.body_type && <span className="text-[10px] border border-white/10 text-white/35 px-2 py-0.5 font-body tracking-wide">{vehicle.body_type}</span>}
                    {vehicle.fuel_type && <span className="text-[10px] border border-white/10 text-white/35 px-2 py-0.5 font-body tracking-wide">{vehicle.fuel_type}</span>}
                    {vehicle.drivetrain && <span className="text-[10px] border border-white/10 text-white/35 px-2 py-0.5 font-body tracking-wide">{vehicle.drivetrain}</span>}
                  </div>
                  <h1 className="font-heading text-2xl md:text-3xl font-semibold text-white leading-tight mb-4" data-testid="vehicle-title">{vehicle.title}</h1>
                  <div className="mb-5">
                    <p className="text-[#D4AF37] font-heading text-4xl font-bold" data-testid="vehicle-price">${vehicle.price?.toLocaleString()}</p>
                    <p className="text-white/30 text-sm font-body mt-1">+ applicable taxes & registration</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pb-5 border-b border-white/[0.05]">
                    {[[vehicle.year, 'Year'], [vehicle.mileage === 0 ? '0 km' : `${vehicle.mileage?.toLocaleString()} km`, 'Mileage'], [vehicle.transmission, 'Transmission'], [vehicle.drivetrain || '—', 'Drivetrain']].map(([v, l]) => (
                      <div key={l}>
                        <p className="text-white font-heading text-sm font-medium">{v}</p>
                        <p className="text-white/25 text-xs font-body">{l}</p>
                      </div>
                    ))}
                  </div>
                  <a href="tel:+18256055050" className="btn-outline w-full py-3 text-xs flex items-center justify-center gap-2 mt-4" data-testid="vehicle-call-btn">
                    <Phone size={14} /> Call 825-605-5050
                  </a>
                </div>

                {/* Lead Form */}
                <div className="glass-card p-6">
                  <div className="flex border-b border-white/[0.06] mb-5">
                    {TABS.map((tab) => {
                      const Icon = TAB_ICONS[tab];
                      return (
                        <button key={tab} onClick={() => { setActiveTab(tab); setSubmitted(false); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-heading tracking-[0.12em] uppercase transition-all border-b-2 ${activeTab === tab ? 'text-[#D4AF37] border-[#D4AF37]' : 'text-white/25 border-transparent hover:text-white/50'}`}
                          data-testid={`lead-tab-${tab}`}>
                          <Icon size={11} /> {TAB_LABELS[tab]}
                        </button>
                      );
                    })}
                  </div>

                  {submitted ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-3">
                        <Check size={18} className="text-[#D4AF37]" />
                      </div>
                      <p className="font-heading text-white text-base mb-1">Request Sent!</p>
                      <p className="text-white/35 text-xs font-body">We'll be in touch within 2 hours.</p>
                      <button onClick={() => setSubmitted(false)} className="mt-4 text-white/25 hover:text-white text-xs font-body transition-colors">Send another</button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3" data-testid="vehicle-lead-form">
                      <input className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="lead-name" />
                      <input type="email" className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Email Address *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="lead-email" />
                      <input type="tel" className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="lead-phone" />
                      {activeTab === 'test_drive' && (
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" className="input-dark px-3 py-3 text-sm font-body" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} data-testid="lead-date" />
                          <select className="input-dark px-3 py-3 text-sm font-body" value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} data-testid="lead-time">
                            <option value="">Preferred Time</option>
                            {['9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                      {activeTab === 'financing' && (
                        <input type="number" className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="Down Payment ($)" value={form.down_payment} onChange={(e) => setForm({ ...form, down_payment: e.target.value })} data-testid="lead-down-payment" />
                      )}
                      {activeTab === 'contact' && (
                        <textarea className="input-dark w-full px-4 py-3 text-sm font-body resize-none" rows={3} placeholder="Your message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="lead-message" />
                      )}
                      <button type="submit" disabled={sending} className="btn-gold w-full py-3 text-xs" data-testid="lead-submit-btn">
                        {sending ? 'Sending...' : activeTab === 'contact' ? 'Send Enquiry' : activeTab === 'test_drive' ? 'Book Test Drive' : 'Apply for Financing'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </HelmetProvider>
  );
}
