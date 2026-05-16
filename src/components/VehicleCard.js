import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Gauge, Fuel, ArrowRight, Star } from 'lucide-react';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=60';

export default function VehicleCard({ vehicle, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const img = vehicle.images?.[0] || PLACEHOLDER;
  const isNew = vehicle.condition === 'new';
  const isSold = vehicle.status === 'sold';

  // Framer Motion values for 3D tracking
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 250, damping: 30 });
  const springY = useSpring(my, { stiffness: 250, damping: 30 });

  // Card rotates on mouse move
  const rotateY = useTransform(springX, [-0.5, 0.5], [-14, 14]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8]);

  // Image moves opposite direction = depth parallax
  const imgX = useTransform(springX, [-0.5, 0.5], ['18px', '-18px']);
  const imgY = useTransform(springY, [-0.5, 0.5], ['14px', '-14px']);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: '1200px' }}
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
            ? '0 32px 80px rgba(0,0,0,0.85), 0 0 50px rgba(212,175,55,0.13), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 10px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)',
          border: `1px solid ${hovered ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.055)'}`,
          background: '#080808',
          overflow: 'hidden',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <Link to={`/vehicle/${vehicle.id}`} className="block">
          {/* Image with depth parallax */}
          <div className="relative overflow-hidden" style={{ paddingTop: '64%' }}>
            <motion.img
              src={img}
              alt={vehicle.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                x: imgX,
                y: imgY,
                scale: hovered ? 1.12 : 1.0,
                transition: 'scale 0.5s cubic-bezier(0.16,1,0.3,1)',
              }}
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />

            {/* Dynamic specular glare */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.16) 0%, rgba(212,175,55,0.06) 30%, transparent 62%)`,
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.4s',
              }}
            />

            {/* Bottom gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-1.5 z-20">
              <span className={`px-2.5 py-1 text-[11px] font-heading font-bold tracking-[0.12em] uppercase ${isNew ? 'bg-emerald-500 text-white' : 'bg-[#D4AF37] text-black'}`}>
                {isNew ? 'New' : 'Used'}
              </span>
              {vehicle.featured && (
                <span className="px-2.5 py-1 text-[11px] font-heading tracking-[0.1em] uppercase bg-black/50 backdrop-blur-sm text-white border border-white/15 flex items-center gap-1">
                  <Star size={8} fill="currentColor" /> Featured
                </span>
              )}
            </div>

            {/* Sold overlay */}
            {isSold && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-20">
                <div className="border-2 border-white/45 px-6 py-2 rotate-[-12deg]">
                  <span className="text-white font-heading text-xl font-bold tracking-[0.22em]">SOLD</span>
                </div>
              </div>
            )}

            {/* Price — floats in 3D space */}
            <div className="absolute bottom-4 left-4 z-20" style={{ transform: 'translateZ(15px)' }}>
              <p className="text-[#D4AF37] font-heading font-bold text-2xl leading-none" style={{ textShadow: '0 2px 12px rgba(212,175,55,0.5)' }}>
                ${vehicle.price?.toLocaleString()}
              </p>
              <p className="text-white/45 text-xs font-body mt-0.5">+ taxes & fees</p>
            </div>
          </div>

          {/* Info Footer */}
          <div
            className="px-4 py-4"
            style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #060606 100%)' }}
          >
            <h3
              className="font-heading font-semibold text-[15px] leading-snug mb-3 line-clamp-2 transition-colors duration-300"
              style={{ color: hovered ? '#D4AF37' : '#fff' }}
            >
              {vehicle.title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-white/45 text-xs font-body">
                  <Gauge size={12} strokeWidth={1.5} />
                  {vehicle.mileage === 0 ? '0 km' : `${vehicle.mileage?.toLocaleString()} km`}
                </span>
                <span className="flex items-center gap-1.5 text-white/45 text-xs font-body">
                  <Fuel size={12} strokeWidth={1.5} />
                  {vehicle.fuel_type}
                </span>
              </div>
              <span
                className="flex items-center gap-1 text-xs font-body transition-colors duration-300"
                style={{ color: hovered ? '#D4AF37' : 'rgba(255,255,255,0.28)' }}
              >
                View
                <ArrowRight
                  size={13}
                  style={{ transform: hovered ? 'translateX(4px)' : 'none', transition: 'transform 0.3s' }}
                />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
