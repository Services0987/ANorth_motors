import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Gauge, Fuel, ArrowRight, Star } from 'lucide-react';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=60';

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

  // Card rotates on mouse move
  const rotateY = useTransform(springX, [-0.5, 0.5], [-18, 18]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);

  // Image moves opposite direction = depth parallax
  const imgX = useTransform(springX, [-0.5, 0.5], ['22px', '-22px']);
  const imgY = useTransform(springY, [-0.5, 0.5], ['18px', '-18px']);

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
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
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
        <Link to={`/vehicle/${vehicle.id}`} className="block relative">
          {/* Image with depth parallax */}
          <div className="relative overflow-hidden" style={{ paddingTop: '64%' }}>
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImg}
                layoutId={`vehicle-image-${vehicle.id}`}
                src={img}
                alt={vehicle.title}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  x: imgX,
                  y: imgY,
                  scale: hovered ? 1.15 : 1.0,
                }}
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveImg(i);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeImg ? 'bg-[#D4AF37] w-4' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}

            {/* Quick Next Overlay */}
            {images.length > 1 && hovered && (
              <div 
                className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-e-resize"
                onClick={nextImg}
              />
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
            <div className="absolute top-3 left-3 flex gap-1.5 z-20" style={{ transform: 'translateZ(20px)' }}>
              <span className={`px-2.5 py-1 text-[10px] font-heading font-bold tracking-[0.14em] uppercase ${isNew ? 'bg-emerald-500 text-white' : 'bg-[#D4AF37] text-black'}`}>
                {isNew ? 'New' : 'Used'}
              </span>
              {vehicle.featured && (
                <span className="px-2.5 py-1 text-[10px] font-heading tracking-[0.12em] uppercase bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">
                  <Star size={7} fill="currentColor" /> Featured
                </span>
              )}
            </div>

            {/* Sold overlay */}
            {isSold && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                <div className="border-2 border-white/50 px-6 py-2 rotate-[-12deg]">
                  <span className="text-white font-heading text-xl font-bold tracking-[0.25em]">SOLD</span>
                </div>
              </div>
            )}

            {/* Price — floats in 3D space */}
            <div className="absolute bottom-4 left-4 z-20" style={{ transform: 'translateZ(35px)' }}>
              <motion.div
                animate={{ y: hovered ? -4 : 0 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[#D4AF37] font-heading font-bold text-2xl leading-none" style={{ textShadow: '0 4px 15px rgba(212,175,55,0.6)' }}>
                  ${vehicle.price?.toLocaleString()}
                </p>
                <p className="text-white/50 text-[10px] uppercase tracking-wider font-body mt-1">Available at AutoNorth</p>
              </motion.div>
            </div>
          </div>

          {/* Info Footer */}
          <div
            className="px-4 py-4"
            style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #060606 100%)' }}
          >
            <h3
              className="font-heading font-semibold text-[15px] leading-snug mb-3 line-clamp-2 transition-colors duration-400"
              style={{ color: hovered ? '#D4AF37' : '#fff' }}
            >
              {vehicle.title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-white/45 text-[11px] font-body">
                  <Gauge size={12} strokeWidth={1.5} />
                  {vehicle.mileage === 0 ? '0 km' : `${vehicle.mileage?.toLocaleString()} km`}
                </span>
                <span className="flex items-center gap-1.5 text-white/45 text-[11px] font-body">
                  <Fuel size={12} strokeWidth={1.5} />
                  {vehicle.fuel_type}
                </span>
              </div>
              <span
                className="flex items-center gap-1.5 text-[11px] font-heading tracking-widest uppercase transition-colors duration-400"
                style={{ color: hovered ? '#D4AF37' : 'rgba(255,255,255,0.25)' }}
              >
                Explore
                <ArrowRight
                  size={12}
                  style={{ transform: hovered ? 'translateX(5px)' : 'none', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)' }}
                />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
