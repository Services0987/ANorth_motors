import React from 'react';
import { motion } from 'framer-motion';

const SymbolicLogo = ({ className = "" }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0, scale: 0.8 },
    show: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    show: { pathLength: 1, opacity: 1, transition: { duration: 1.5, ease: "easeInOut" } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className={`flex items-baseline justify-center gap-1 md:gap-2 select-none ${className}`}
    >
      {/* A - The Speed Arrow */}
      <motion.div variants={item} className="relative group">
        <svg viewBox="0 0 40 50" className="w-8 h-10 md:w-12 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.path variants={draw} d="M5 45L20 5L35 45M12 30H28" />
          <motion.path variants={draw} d="M15 15L20 5L25 15" className="stroke-white/40" />
        </svg>
      </motion.div>

      {/* U - The Magnet */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-7 h-10 md:w-11 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.path variants={draw} d="M8 5V30C8 38 15 42 20 42C25 42 32 38 32 30V5" />
          <motion.rect variants={draw} x="5" y="5" width="8" height="8" className="fill-[#D4AF37]/20" />
          <motion.rect variants={draw} x="27" y="5" width="8" height="8" className="fill-[#D4AF37]/20" />
        </svg>
      </motion.div>

      {/* T - The Control */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-7 h-10 md:w-11 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.path variants={draw} d="M5 8H35M20 8V45" />
          <motion.circle variants={draw} cx="20" cy="8" r="4" className="fill-[#D4AF37]" />
        </svg>
      </motion.div>

      {/* O - The Wheel */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-8 h-10 md:w-12 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.circle variants={draw} cx="20" cy="25" r="16" />
          <motion.circle variants={draw} cx="20" cy="25" r="6" className="stroke-white/20" />
          <motion.path variants={draw} d="M20 9V14M20 36V41M9 25H14M31 25H36" />
        </svg>
      </motion.div>

      {/* SPACE */}
      <div className="w-2" />

      {/* N - The North Peak */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-8 h-10 md:w-12 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.path variants={draw} d="M8 45V5L32 45V5" />
          <motion.path variants={draw} d="M15 5L20 12L25 5" className="stroke-white/60" />
        </svg>
      </motion.div>

      {/* O - The Gear */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-7 h-10 md:w-11 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.circle variants={draw} cx="20" cy="25" r="14" />
          <motion.path variants={draw} d="M20 7V11M20 39V43M7 25H11M39 25H43M11 11L14 14M26 26L29 29" className="stroke-[#D4AF37]/40" />
        </svg>
      </motion.div>

      {/* R - The Road */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-7 h-10 md:w-11 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.path variants={draw} d="M10 45V5H25C32 5 32 18 25 18H10M20 18L32 45" />
          <motion.path variants={draw} d="M15 30H25" className="stroke-white/20 dash-4" />
        </svg>
      </motion.div>

      {/* T - The Toolkit */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-7 h-10 md:w-11 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.path variants={draw} d="M5 12H35M20 12V45" />
          <motion.path variants={draw} d="M12 45H28" className="stroke-[#D4AF37]/50" />
        </svg>
      </motion.div>

      {/* H - The Handshake */}
      <motion.div variants={item}>
        <svg viewBox="0 0 40 50" className="w-8 h-10 md:w-12 md:h-16 fill-none stroke-[#D4AF37] stroke-[2.5]">
          <motion.path variants={draw} d="M10 5V45M30 5V45M10 25H30" />
          <motion.path variants={draw} d="M15 20L25 30M15 30L25 20" className="stroke-white/30" />
        </svg>
      </motion.div>
    </motion.div>
  );
};

export default SymbolicLogo;
