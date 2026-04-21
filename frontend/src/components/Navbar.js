import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AnimatedLogo from './AnimatedLogo';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/financing', label: 'Financing' },
    { href: '/contact', label: 'Contact' },
  ];

  const isActive = (href) => location.pathname === href;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'nav-blur' : 'bg-transparent'
      }`}
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20">
          {/* ── Logo ── */}
          <Link to="/" className="flex items-center" data-testid="nav-logo">
            <AnimatedLogo size="small" />
          </Link>

          {/* ── Desktop links ── */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`font-body text-xs tracking-[0.15em] uppercase transition-colors duration-200 ${
                  isActive(link.href) ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'
                }`}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:+18256055050"
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-body tracking-wider"
            >
              <Phone size={14} />
              <span>825-605-5050</span>
            </a>
            {user ? (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="btn-gold px-5 py-2 text-xs"
                data-testid="nav-admin-btn"
              >
                Dashboard
              </button>
            ) : (
              <Link to="/inventory" className="btn-gold px-6 py-2 text-xs" data-testid="nav-browse-btn">
                Browse Cars
              </Link>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <button
            className="md:hidden text-white/70 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="nav-mobile-toggle"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden nav-blur border-t border-white/5"
          >
            <div className="px-6 py-6 flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-white/70 font-body text-sm tracking-widest uppercase hover:text-[#D4AF37] transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/inventory"
                className="btn-gold px-6 py-3 text-xs text-center"
                onClick={() => setMobileOpen(false)}
              >
                Browse Inventory
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
