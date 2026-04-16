import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VehicleCard from '../components/VehicleCard';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const MAKES = ['All', 'Ford', 'Toyota', 'Honda', 'Chevrolet', 'BMW', 'Mercedes', 'Audi', 'Hyundai', 'Kia'];
const BODY_TYPES = ['All', 'Truck', 'SUV', 'Sedan', 'Coupe', 'Hatchback', 'Wagon', 'Minivan', 'Cargo Van'];
const FUEL_TYPES = ['All', 'Gas', 'Diesel', 'Hybrid', 'Electric'];
const CONDITIONS = ['All', 'new', 'used'];

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
            <option key={opt} value={opt === 'All' ? '' : opt} className="bg-[#0A0A0A]">
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
      </div>
    </div>
  );
}

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    condition: searchParams.get('condition') || '',
    make: searchParams.get('make') || '',
    body_type: searchParams.get('body_type') || '',
    fuel_type: searchParams.get('fuel_type') || '',
    min_price: '',
    max_price: '',
  });

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.make) params.append('make', filters.make);
      if (filters.body_type) params.append('body_type', filters.body_type);
      if (filters.fuel_type) params.append('fuel_type', filters.fuel_type);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      params.append('limit', '50');

      const { data } = await axios.get(`${API}/vehicles?${params}`);
      setVehicles(data.vehicles || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters({ search: '', condition: '', make: '', body_type: '', fuel_type: '', min_price: '', max_price: '' });

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <Helmet>
        <title>Inventory | AutoNorth Motors Edmonton — Browse New & Used Vehicles</title>
        <meta name="description" content="Browse our premium inventory of new and used trucks, SUVs and cars at AutoNorth Motors Edmonton. Serving all of Alberta with the best selection and financing rates. Canada-wide shipping available." />
        <meta name="keywords" content="used trucks Edmonton, SUVs for sale Alberta, Ford inventory Edmonton, AutoNorth Motors vehicles, buy used car Edmonton, Alberta auto sales" />
      </Helmet>

      <div className="bg-[#050505] min-h-screen" data-testid="inventory-page">
      <Navbar />

      <div className="pt-32 pb-6 px-6 md:px-12 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-2">Our Collection</p>
          <h1 className="font-heading text-4xl md:text-5xl font-light text-white tracking-tight">
            Vehicle <span className="gradient-text">Inventory</span>
          </h1>
        </motion.div>
      </div>

      {/* Search + Filters Bar */}
      <div className="sticky top-20 z-30 bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.05] px-6 md:px-12 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-60 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="input-dark w-full pl-10 pr-4 py-2.5 text-sm font-body"
              placeholder="Search make, model, or keyword..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              data-testid="inventory-search"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-body tracking-wider uppercase transition-all duration-200 border ${
              showFilters || activeFilters > 0 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white'
            }`}
            data-testid="inventory-filter-toggle"
          >
            <SlidersHorizontal size={14} />
            Filters {activeFilters > 0 && `(${activeFilters})`}
          </button>

          {activeFilters > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs font-body transition-colors" data-testid="clear-filters-btn">
              <X size={14} /> Clear
            </button>
          )}

          <span className="text-white/40 text-sm font-body ml-auto">{total} vehicle{total !== 1 ? 's' : ''} found</span>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-2"
          >
            <FilterSelect label="Condition" value={filters.condition} options={CONDITIONS} onChange={(v) => updateFilter('condition', v)} testId="filter-condition" />
            <FilterSelect label="Make" value={filters.make} options={MAKES} onChange={(v) => updateFilter('make', v)} testId="filter-make" />
            <FilterSelect label="Body Type" value={filters.body_type} options={BODY_TYPES} onChange={(v) => updateFilter('body_type', v)} testId="filter-body-type" />
            <FilterSelect label="Fuel Type" value={filters.fuel_type} options={FUEL_TYPES} onChange={(v) => updateFilter('fuel_type', v)} testId="filter-fuel-type" />
            <div>
              <label className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-heading block mb-1.5">Min Price</label>
              <input type="number" className="input-dark w-full px-3 py-2.5 text-sm font-body" placeholder="$0" value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} data-testid="filter-min-price" />
            </div>
            <div>
              <label className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-heading block mb-1.5">Max Price</label>
              <input type="number" className="input-dark w-full px-3 py-2.5 text-sm font-body" placeholder="Any" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} data-testid="filter-max-price" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Vehicles Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-heading text-white text-2xl mb-3">No vehicles found</h3>
            <p className="text-white/45 font-body text-base mb-6">Try adjusting your filters to see more results.</p>
            <button onClick={clearFilters} className="btn-gold px-6 py-3 text-sm" data-testid="no-results-clear-btn">Clear All Filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="vehicles-grid">
            {vehicles?.map((v, i) => <VehicleCard key={v._id || v.id || i} vehicle={v} index={i} />)}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
