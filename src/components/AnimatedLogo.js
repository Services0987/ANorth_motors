import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// The spinning alloy-wheel asset that replaces the letter "O"
// High-definition alloy wheel asset for the letter "O"
const TYRE_SRC = '/hd_wheel.png';

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 },
  }),
};

function SpinningO({ size = 'large' }) {
  const dim = size === 'large'
    ? 'w-[1em] h-[1em]'
    : 'w-[1.1em] h-[1.1em]';

  return (
    <span
      className={`inline-flex items-center justify-center relative ${dim}`}
      style={{ verticalAlign: 'middle' }}
    >
      <motion.img
        src={TYRE_SRC}
        alt="O"
        className="w-full h-full object-contain"
        style={{ filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.45))' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      {/* Radial glint sweeping across the tyre */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.25) 20deg, transparent 40deg)',
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </span>
  );
}

export default function AnimatedLogo({ size = 'large', className = '' }) {
  const isLarge = size === 'large';

  /* ── Navbar / small variant with Randomized Interval Animations ──────────────── */
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    if (isLarge) return; // Don't run interval for hero logo
    // Cycle animation phase every 8 seconds to show a new entrance effect
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 3);
    }, 8000);
    return () => clearInterval(interval);
  }, [isLarge]);

  if (!isLarge) {
    // 3 distinct high-end text animation variants
    const getVariants = (delayOffset) => {
      if (animPhase === 0) return { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: delayOffset } } };
      if (animPhase === 1) return { initial: { opacity: 0, scale: 0.9, filter: 'blur(4px)' }, animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.8, delay: delayOffset } } };
      if (animPhase === 2) return { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0, transition: { duration: 0.6, type: 'spring', stiffness: 100, delay: delayOffset } } };
      return { initial: { opacity: 0 }, animate: { opacity: 1 } };
    };

    return (
      <span
        key={animPhase} // Forcing re-mount to re-trigger the animation cycle
        className={`inline-flex items-center font-heading font-bold text-lg select-none ${className}`}
        style={{ letterSpacing: '0.15em' }}
      >
        <motion.span
          className="text-white drop-shadow-md"
          initial={getVariants(0).initial}
          animate={getVariants(0).animate}
        >
          AUTO
        </motion.span>
        <motion.span
          className="text-[#D4AF37] drop-shadow-md ml-[0.05em]"
          initial={getVariants(0.2).initial}
          animate={getVariants(0.2).animate}
          style={{ textShadow: '0 0 8px rgba(212,175,55,0.4)' }}
        >
          NORTH
        </motion.span>
      </span>
    );
  }

  /* ── Hero / large variant ────────────────────────────── */
  const autoLetters = ['A', 'U', 'T'];
  const northLetters = ['N', 'O', 'R', 'T', 'H'];

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="flex items-center leading-none"
        initial="hidden"
        animate="show"
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(3.5rem, 9vw, 7.5rem)',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {/* AUTO */}
        {autoLetters.map((l, i) => (
          <motion.span
            key={`auto-${i}`}
            custom={i}
            variants={letterVariants}
            className="text-white"
          >
            {l}
          </motion.span>
        ))}
        {/* Spinning tyre replaces 'O' */}
        <motion.span custom={3} variants={letterVariants}>
          <SpinningO size="large" />
        </motion.span>

        {/* Thin vertical spacer between AUTO and NORTH */}
        <motion.span
          custom={4}
          variants={letterVariants}
          className="mx-3 md:mx-4 w-px bg-[#D4AF37]/50 self-stretch"
        />

        {/* NORTH — outlined style for visual contrast */}
        {northLetters.map((l, i) => {
          if (l === 'O') {
            return (
              <motion.span key={`north-o`} custom={5 + i} variants={letterVariants}>
                <SpinningO size="large" />
              </motion.span>
            );
          }
          return (
            <motion.span
              key={`north-${i}`}
              custom={5 + i}
              variants={letterVariants}
              style={{
                color: 'transparent',
                WebkitTextStroke: '1.5px rgba(255,255,255,0.35)',
              }}
            >
              {l}
            </motion.span>
          );
        })}
      </motion.div>

      {/* Full-width light-sweep glint across the whole logo */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <motion.div
          className="absolute top-0 bottom-0 w-[20%]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
            skewX: '-15deg',
          }}
          animate={{ x: ['-30%', '150%'] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Sub-label */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.7 }}
        className="mt-3 text-[0.55rem] tracking-[0.55em] uppercase text-[#D4AF37]/70 font-body"
      >
        Motors · Edmonton, Alberta
      </motion.p>
    </div>
  );
}
