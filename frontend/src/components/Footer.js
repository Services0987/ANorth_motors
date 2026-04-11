import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#020202] border-t border-white/5 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#D4AF37] flex items-center justify-center font-heading font-bold text-black text-lg">
                AN
              </div>
              <div>
                <p className="font-heading font-semibold text-white text-sm tracking-widest uppercase">AutoNorth</p>
                <p className="text-white/40 text-xs tracking-[0.15em] uppercase">Motors</p>
              </div>
            </div>
            <p className="text-white/45 text-sm font-body leading-relaxed mb-6">
              Edmonton's premier destination for quality vehicles. Trusted by thousands of satisfied customers across Alberta.
            </p>
            <div className="flex gap-4">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all duration-200">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading text-xs tracking-[0.2em] uppercase text-white/50 mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { to: '/inventory', label: 'Browse Inventory' },
                { to: '/inventory?condition=new', label: 'New Vehicles' },
                { to: '/inventory?condition=used', label: 'Used Vehicles' },
                { to: '/financing', label: 'Financing' },
                { to: '/contact', label: 'Contact Us' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-white/40 hover:text-white text-sm font-body transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs tracking-[0.2em] uppercase text-white/50 mb-6">Vehicle Types</h4>
            <ul className="space-y-3">
              {['Trucks', 'SUVs', 'Sedans', 'Coupes', 'Hybrid & Electric', 'Commercial'].map((item) => (
                <li key={item}>
                  <Link to={`/inventory?body_type=${item}`} className="text-white/40 hover:text-white text-sm font-body transition-colors duration-200">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs tracking-[0.2em] uppercase text-white/50 mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-[#D4AF37] mt-0.5 flex-shrink-0" />
                <span className="text-white/40 text-sm font-body">9104 91 St NW<br />Edmonton, AB T6C 3P6</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={15} className="text-[#D4AF37] flex-shrink-0" />
                <a href="tel:+18256055050" className="text-white/40 hover:text-white text-sm font-body transition-colors">825-605-5050</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={15} className="text-[#D4AF37] flex-shrink-0" />
                <a href="mailto:autonorthab@gmail.com" className="text-white/40 hover:text-white text-sm font-body transition-colors">autonorthab@gmail.com</a>
              </li>
            </ul>
            <div className="mt-6">
              <p className="text-xs tracking-wider uppercase text-white/30 font-body mb-2">Hours</p>
              <p className="text-white/40 text-sm font-body">Mon-Fri: 9am - 8pm</p>
              <p className="text-white/40 text-sm font-body">Sat-Sun: 10am - 6pm</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs font-body tracking-wide">
            © {new Date().getFullYear()} AutoNorth Motors. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/admin" className="text-white/20 hover:text-white/40 text-xs font-body transition-colors">Admin Portal</Link>
            <span className="text-white/10 text-xs font-body">Edmonton, Alberta, Canada</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
