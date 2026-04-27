import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Gauge, Fuel, Star } from 'lucide-react';
import { Analytics } from '../utils/analytics';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=60';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};

export default function VehicleCard({ vehicle, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  const [activeImg, setActiveImg] = useState(0);

  const images = vehicle.images?.length > 0 ? vehicle.images : [PLACEHOLDER];
  const img = images[activeImg];
  const isNew = vehicle.condition === 'new';
  const isSold = vehicle.status === 'sold';

  // Framer Motion values for 3D tracking
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 200, damping: 25 });
  const springY = useSpring(my, { stiffness: 200, damping: 25 });

  const rotateY = useTransform(springX, [-0.5, 0.5], [-18, 18]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const imgX = useTransform(springX, [-0.5, 0.5], ['22px', '-22px']);
  const imgY = useTransform(springY, [-0.5, 0.5], ['18px', '-18px']);

  // Gyroscope tracking for mobile tilt
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOrientation = (e) => {
      if (!e.beta || !e.gamma) return;
      // Map beta/gamma to mx/my range [-0.5, 0.5]
      // Beta (pitch): ~30 to 60 degrees is normal holding angle
      const ny = (e.beta - 45) / 30; 
      const nx = e.gamma / 30;
      mx.set(Math.max(-0.5, Math.min(0.5, nx)));
      my.set(Math.max(-0.5, Math.min(0.5, ny)));
      setGlare({ x: (nx + 0.5) * 100, y: (ny + 0.5) * 100 });
      setHovered(true);
    };

    if (window.DeviceOrientationEvent && /Mobi|Android/i.test(navigator.userAgent)) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [mx, my]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mx.set(nx - 0.5);
    my.set(ny - 0.5);
    setGlare({ x: nx * 100, y: ny * 100 });
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
    setHovered(false);
  };

  const nextImg = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImg((prev) => (prev + 1) % Math.min(images.length, 5));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
      style={{ perspective: '1500px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setHovered(true)}
      data-testid={`vehicle-card-${vehicle.id}`}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          boxShadow: hovered
            ? '0 45px 100px rgba(0,0,0,0.9), 0 0 60px rgba(212,175,55,0.18), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 15px 45px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
          border: `1px solid ${hovered ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.08)'}`,
          background: '#080808',
          overflow: 'hidden',
          transition: 'border-color 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <Link 
          to={`/vehicle/${vehicle._id || vehicle.id}`} 
          className="block relative group"
          onClick={() => Analytics.clickVehicle(vehicle._id || vehicle.id, vehicle.title)}
        >
          {/* Image with depth parallax */}
          <div className="relative overflow-hidden" style={{ paddingTop: '64%' }}>
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImg}
                src={img}
                alt={vehicle.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index < 4 ? "eager" : "lazy"}
                style={{ x: imgX, y: imgY, scale: hovered ? 1.15 : 1.0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  scale: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.3 }
                }}
                onError={(e) => { e.target.src = PLACEHOLDER; }}
              />
            </AnimatePresence>

            {/* Mini-Gallery Navigation Dots */}
            {images.length > 1 && hovered && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                {images.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveImg(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeImg ? 'bg-[#D4AF37] w-4' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}

            {/* Quick Next Overlay */}
            {images.length > 1 && hovered && (
              <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-e-resize" onClick={nextImg} />
            )}

            {/* Dynamic specular glare */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.2) 0%, rgba(212,175,55,0.08) 30%, transparent 65%)`,
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.4s',
              }}
            />

            {/* Bottom gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-30" style={{ transform: 'translateZ(50px)' }}>
              <motion.span
                initial={false}
                animate={{ scale: hovered ? 1.05 : 1 }}
                className={`px-3 py-1 text-[9px] font-heading font-bold tracking-[0.18em] uppercase backdrop-blur-md shadow-lg ${isNew ? 'bg-emerald-500/90 text-white' : 'bg-[#D4AF37]/90 text-black'}`}
              >
                {isNew ? 'New Arrival' : 'Certified Used'}
              </motion.span>
              {vehicle.featured && (
                <span className="px-3 py-1 text-[9px] font-heading tracking-[0.15em] uppercase bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-xl">
                  {SAFE_ICON(Star, { size: 8, fill: "currentColor", className: "text-[#D4AF37]" })} Exclusive
                </span>
              )}
            </div>

            {/* Sold overlay */}
            {isSold && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] flex items-center justify-center z-40">
                <div className="border border-white/30 px-8 py-3 rotate-[-12deg] bg-black/40 backdrop-blur-sm">
                  <span className="text-white font-heading text-2xl font-bold tracking-[0.3em]">RESERVED</span>
                </div>
              </div>
            )}

            {/* Price — floats in 3D space */}
            <div className="absolute bottom-5 left-5 z-30" style={{ transform: 'translateZ(60px)' }}>
              <motion.div
                animate={{ y: hovered ? -6 : 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-[#D4AF37] font-heading font-medium text-sm">$</span>
                  <p className="text-[#D4AF37] font-heading font-bold text-3xl leading-none tracking-tight" style={{ textShadow: '0 0 20px rgba(212,175,55,0.4)' }}>
                    {vehicle.price?.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-[1px] w-4 bg-[#D4AF37]/50" />
                  <p className="text-white/40 text-[9px] uppercase tracking-[0.2em] font-body">Premium Inventory</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Info Footer */}
          <div
            className="px-5 py-5 relative"
            style={{
              background: 'linear-gradient(180deg, rgba(13,13,13,1) 0%, rgba(5,5,5,1) 100%)',
              borderTop: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/5 to-[#D4AF37]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <h3
              className="font-heading font-medium text-[16px] leading-snug mb-4 line-clamp-2 transition-all duration-500"
              style={{
                color: hovered ? '#D4AF37' : '#fff',
                transform: hovered ? 'translateZ(25px)' : 'translateZ(0px)'
              }}
            >
              {vehicle.title}
            </h3>

            <div className="flex items-center gap-5 text-white/30 text-[9px] uppercase font-heading tracking-[0.2em]">
              <div className="flex items-center gap-2 group/stat">
                {SAFE_ICON(Gauge, { size: 13, className: "text-[#D4AF37]/60 group-hover/stat:text-[#D4AF37] transition-colors" })}
                <span className="group-hover/stat:text-white/50 transition-colors">{vehicle.mileage?.toLocaleString()} KM</span>
              </div>
              <div className="w-[1px] h-3 bg-white/10" />
              <div className="flex items-center gap-2 group/stat">
                {SAFE_ICON(Fuel, { size: 13, className: "text-[#D4AF37]/60 group-hover/stat:text-[#D4AF37] transition-colors" })}
                <span className="group-hover/stat:text-white/50 transition-colors">{vehicle.fuel_type || vehicle.fuel || 'Gas'}</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
