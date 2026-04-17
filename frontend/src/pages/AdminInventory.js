import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Pencil, Trash2, X, Check, Star, StarOff, Search, 
  ChevronDown, Upload, Download, FileText, CircleAlert, 
  RefreshCw, Globe, Link as LinkIcon, Settings, Layers, 
  ChevronLeft, ChevronRight, LayoutGrid, LayoutList, CircleCheck
} from 'lucide-react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';
const PLACEHOLDER = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&q=40';

const EMPTY_FORM = {
  title: '', make: '', model: '', year: new Date().getFullYear(), price: '',
  mileage: 0, condition: 'used', body_type: 'Sedan', fuel_type: 'Gas',
  transmission: 'Automatic', exterior_color: '', interior_color: '', engine: '',
  drivetrain: 'FWD', doors: 4, seats: 5, vin: '', stock_number: '',
  description: '', features: [], images: [], status: 'available', featured: false,
};

const STATUS_COLOR = { 
  available: 'text-emerald-400 bg-emerald-500/10', 
  sold: 'text-red-400 bg-red-500/10', 
  pending: 'text-yellow-400 bg-yellow-500/10' 
};

const Field = ({ label, children }) => (
  <div><label className="text-[10px] tracking-[0.15em] uppercase text-white/25 font-heading block mb-1.5">{label}</label>{children}</div>
);
const Input = ({ className = '', ...p }) => <input className={`input-dark w-full px-3 py-2.5 text-sm font-body ${className}`} {...p} />;
const Sel = ({ options, ...p }) => (
  <div className="relative">
    <select className="input-dark w-full px-3 py-2.5 text-sm font-body appearance-none pr-8" {...p}>
      {options.map(o => <option key={o} value={o} className="bg-[#0A0A0A]">{o}</option>)}
    </select>
    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
  </div>
);

export default function AdminInventory() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newFeature, setNewFeature] = useState('');
  const [newImage, setNewImage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showScraperTab, setShowScraperTab] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Scraper State
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperLoading, setScraperLoading] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/vehicles?status=all&limit=200`, { withCredentials: true });
      setVehicles(data.vehicles || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchScraperSettings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/scraper/settings`, { withCredentials: true });
      setAutoSync(data.auto_sync);
      setLastSync(data.last_sync);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { 
    fetchVehicles(); 
    fetchScraperSettings();
  }, [fetchVehicles, fetchScraperSettings]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditing(null); setShowModal(true); };
  const openEdit = (v) => { setForm({ ...v, features: [...(v.features || [])], images: [...(v.images || [])] }); setEditing(v); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setNewFeature(''); setNewImage(''); };

  const addFeature = () => { if (newFeature.trim()) { setF('features', [...form.features, newFeature.trim()]); setNewFeature(''); } };
  const removeFeature = (i) => setF('features', form.features.filter((_, idx) => idx !== i));
  const addImage = () => { if (newImage.trim()) { setF('images', [...form.images, newImage.trim()]); setNewImage(''); } };
  const removeImage = (i) => setF('images', form.images.filter((_, idx) => idx !== i));
  
  const moveImage = (index, direction) => {
    const newImages = [...form.images];
    const target = index + direction;
    if (target < 0 || target >= newImages.length) return;
    [newImages[index], newImages[target]] = [newImages[target], newImages[index]];
    setF('images', newImages);
  };

  const makePrimary = (index) => {
    const newImages = [...form.images];
    const [img] = newImages.splice(index, 1);
    newImages.unshift(img);
    setF('images', newImages);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, year: parseInt(form.year), price: parseFloat(form.price), mileage: parseInt(form.mileage || 0), doors: parseInt(form.doors), seats: parseInt(form.seats) };
      if (editing) await axios.put(`${API}/vehicles/${editing.id}`, payload, { withCredentials: true });
      else await axios.post(`${API}/vehicles`, payload, { withCredentials: true });
      closeModal(); fetchVehicles();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`${API}/vehicles/${id}`, { withCredentials: true }); setDeleteConfirm(null); fetchVehicles(); }
    catch (err) { console.error(err); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} vehicles?`)) return;
    try {
      await axios.delete(`${API}/vehicles/bulk/delete`, { data: selectedIds, withCredentials: true });
      setSelectedIds([]);
      fetchVehicles();
    } catch (err) { console.error(err); }
  };

  const toggleAutoSync = async () => {
    const newVal = !autoSync;
    setAutoSync(newVal);
    try {
      await axios.post(`${API}/scraper/settings`, { auto_sync: newVal }, { withCredentials: true });
    } catch (err) { console.error(err); }
  };

  const handleSyncNow = async () => {
    setScraperLoading(true);
    try {
      await axios.post(`${API}/scraper/sync/teamford`, {}, { withCredentials: true });
      fetchVehicles();
      fetchScraperSettings();
    } catch (err) { console.error(err); }
    finally { setScraperLoading(false); }
  };

  const handleUrlImport = async () => {
    if (!scraperUrl) return;
    setScraperLoading(true);
    try {
      await axios.post(`${API}/scraper/import-url`, { url: scraperUrl }, { withCredentials: true });
      setScraperUrl('');
      fetchVehicles();
    } catch (err) { console.error(err); }
    finally { setScraperLoading(false); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(v => v.id));
  };

  const filtered = vehicles.filter(v => {
    const ms = !search || v.title?.toLowerCase().includes(search.toLowerCase()) || v.make?.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'all' || v.status === statusFilter;
    return ms && mst;
  });

  return (
    <AdminLayout title="Inventory Power-Center">
      <div className="space-y-6" data-testid="admin-inventory">
        
        {/* Scraper & Sync Hub */}
        <div className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-5">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30">
                  <CircleAlert size={14} className={`text-[#D4AF37] ${scraperLoading ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-white text-sm font-heading font-medium tracking-wide">Automated Inventory Sync</h3>
                  <p className="text-white/25 text-[10px] uppercase tracking-widest font-body">Source: TeamFord.ca · Edmonton, Alberta</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-3">
                    <span className="text-white/35 text-[10px] font-heading uppercase tracking-widest">Auto-Sync</span>
                    <button onClick={toggleAutoSync} className={`w-10 h-5 relative transition-colors duration-300 rounded-full ${autoSync ? 'bg-[#D4AF37]' : 'bg-white/10'}`}>
                       <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform duration-300 rounded-full ${autoSync ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                 </div>
                 <button 
                  onClick={handleSyncNow} 
                  disabled={scraperLoading}
                  className="btn-gold px-4 py-2 text-[10px] font-heading tracking-widest uppercase flex items-center gap-2"
                >
                    <RefreshCw size={11} className={scraperLoading ? 'animate-spin' : ''} />
                    Sync TeamFord
                 </button>
              </div>
           </div>
           
           <div className="h-px bg-white/[0.05] mb-4" />
           
           <div className="flex gap-3">
              <div className="flex-1 relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input 
                  className="input-dark w-full pl-9 pr-4 py-2.5 text-sm font-body" 
                  placeholder="Paste any vehicle URL from teamford.ca or other listings..." 
                  value={scraperUrl}
                  onChange={e => setScraperUrl(e.target.value)}
                />
              </div>
              <button 
                onClick={handleUrlImport}
                disabled={!scraperUrl || scraperLoading}
                className="btn-outline px-6 py-2.5 text-[10px] font-heading tracking-widest uppercase flex items-center gap-2"
              >
                <LinkIcon size={11} /> Import URL
              </button>
           </div>
           {lastSync && <p className="text-white/20 text-[9px] mt-3 font-body uppercase tracking-widest">Last Successful Sync: {new Date(lastSync).toLocaleString()}</p>}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-56" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="relative">
              <select className="input-dark px-3 py-2.5 text-sm font-body appearance-none pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {['all', 'available', 'sold', 'pending'].map(s => <option key={s} className="bg-[#0A0A0A]">{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            </div>
            {selectedIds.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 text-[10px] font-heading tracking-widest uppercase hover:bg-red-500/20 transition-all"
              >
                <Trash2 size={11} /> Delete {selectedIds.length} Selected
              </motion.button>
            )}
            <span className="text-white/25 text-xs font-body ml-2">{filtered.length} vehicles matching</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openAdd} className="btn-gold px-6 py-3 text-xs flex items-center gap-2 border border-white/10">
              <Plus size={14} /> Add Manual Listing
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-x-auto">
          <table className="w-full text-sm font-body" data-testid="vehicles-table">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="px-4 py-4 text-left">
                  <input type="checkbox" className="accent-[#D4AF37]" 
                    checked={selectedIds.length === filtered.length && filtered.length > 0} 
                    onChange={toggleSelectAll} 
                  />
                </th>
                {['Image', 'Vehicle Overview', 'Price', 'Class', 'Current Status', 'Featured', 'Actions'].map(h => (
                   <th key={h} className="text-left px-4 py-4 text-[10px] font-heading tracking-[0.18em] uppercase text-white/25">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                   <td className="px-4 py-4"><div className="h-4 w-4 bg-white/[0.03] animate-pulse" /></td>
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-white/[0.03] animate-pulse" /></td>)}
                </tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-20 text-white/25 font-heading uppercase tracking-widest text-xs">No matching inventory at AutoNorth.</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className={`border-b border-white/[0.03] transition-colors ${selectedIds.includes(v.id) ? 'bg-[#D4AF37]/5' : 'hover:bg-white/[0.01]'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" className="accent-[#D4AF37]" 
                      checked={selectedIds.includes(v.id)} 
                      onChange={() => toggleSelect(v.id)} 
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-16 h-11 overflow-hidden bg-[#111] border border-white/5 p-0.5">
                      <img src={v.images?.[0] || PLACEHOLDER} alt="" className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER; }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-medium max-w-[200px] truncate">{v.title}</p>
                    <p className="text-white/25 text-[10px] mt-1 uppercase tracking-wider font-body">Available at AutoNorth · {v.year}</p>
                  </td>
                  <td className="px-4 py-3 text-[#D4AF37] font-heading text-sm font-semibold">${v.price?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 text-[10px] font-heading uppercase tracking-wider ${v.condition === 'new' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>{v.condition}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-[10px] px-2 py-1 inline-block border font-heading tracking-widest uppercase ${v.status === 'available' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>
                      {v.status}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                     <button onClick={() => {}} className={`transition-all duration-300 ${v.featured ? 'text-[#D4AF37]' : 'text-white/10'}`}>
                        {Star ? <Star size={16} fill={v.featured ? 'currentColor' : 'none'} /> : null}
                     </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <button onClick={() => openEdit(v)} title="Edit Listing" className="text-white/20 hover:text-white transition-colors">{Pencil ? <Pencil size={15} /> : 'Edit'}</button>
                      <button onClick={() => setDeleteConfirm(v.id)} title="Delete" className="text-white/20 hover:text-red-500 transition-colors">{Trash2 ? <Trash2 size={15} /> : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#050505] border border-white/10 p-10 max-w-sm w-full text-center">
              <Trash2 size={40} className="text-red-400 mx-auto mb-6" />
              <h3 className="font-heading text-white text-xl font-medium tracking-wide mb-3 uppercase">Delete Permanently?</h3>
              <p className="text-white/40 text-sm font-body mb-8 leading-relaxed">This vehicle will be removed from AutoNorth and all search results across Canada.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1 py-3 text-xs tracking-widest uppercase">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 text-xs bg-red-600 hover:bg-red-500 text-white font-heading tracking-widest uppercase transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal (Premium Redesign) */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 md:p-8" data-testid="vehicle-modal">
            <motion.div initial={{ scale: 0.98, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98 }} className="bg-[#0A0A0A] border border-white/10 w-full max-w-5xl h-full max-h-full overflow-hidden flex flex-col shadow-[0_0_100px_rgba(212,175,55,0.1)]">
              
              <div className="px-8 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                   <h2 className="font-heading text-white text-lg font-medium tracking-wide uppercase">{editing ? 'Edit Luxury Listing' : 'Premium Inventory Entry'}</h2>
                   <p className="text-[#D4AF37] text-[10px] font-body uppercase tracking-[0.2em] mt-1">Available at AutoNorth, Edmonton</p>
                </div>
                <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white transition-colors bg-white/5 rounded-full"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-10 p-10">
                  
                  {/* Left Column: Media & Primary Info */}
                  <div className="lg:col-span-7 space-y-10">
                    
                    {/* Visual Asset Management */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-heading flex items-center gap-2">
                           <LayoutGrid size={12} /> Visual Assets
                        </p>
                        <span className="text-white/25 text-[10px] font-body">Index 0 = Featured Hero Image</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input 
                            className="input-dark flex-1 px-4 py-3 text-sm font-body border-white/5" 
                            placeholder="Import high-res asset link (https://...)" 
                            value={newImage} 
                            onChange={e => setNewImage(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
                          />
                          <button type="button" onClick={addImage} className="btn-gold px-6 py-3 text-xs font-heading font-medium tracking-widest uppercase">Upload</button>
                        </div>
                        
                        {form.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-3">
                            {form.images.map((img, i) => (
                              <div key={i} className={`relative group aspect-[4/3] border ${i === 0 ? 'border-[#D4AF37]' : 'border-white/5'} overflow-hidden bg-[#111] transition-all`}>
                                <img src={img} alt="" className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER; }} />
                                
                                {/* Image Controls Overlay */}
                                <div className="absolute inset-x-0 bottom-0 bg-black/90 p-1.5 flex items-center justify-around opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="text-white/40 hover:text-[#D4AF37] disabled:opacity-0"><ChevronLeft size={14} /></button>
                                   <button type="button" onClick={() => makePrimary(i)} className={`text-[9px] font-heading uppercase tracking-tighter ${i === 0 ? 'text-[#D4AF37]' : 'text-white/40 hover:text-white'}`}>Main</button>
                                   <button type="button" onClick={() => removeImage(i)} className="text-white/40 hover:text-red-500"><Trash2 size={13} /></button>
                                   <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="text-white/40 hover:text-[#D4AF37] disabled:opacity-0"><ChevronRight size={14} /></button>
                                </div>
                                {i === 0 && (
                                   <div className="absolute top-0 right-0 bg-[#D4AF37] text-black text-[9px] px-2 py-0.5 font-heading font-bold shadow-lg">HERO</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Technical Description */}
                    <section>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4 flex items-center gap-2">
                        <FileText size={12} /> Narrative Description
                      </p>
                      <textarea 
                        className="input-dark w-full px-5 py-5 text-sm font-body resize-none leading-relaxed min-h-[160px]" 
                        placeholder="Craft a compelling narrative for this vehicle..." 
                        value={form.description} 
                        onChange={e => setF('description', e.target.value)} 
                      />
                    </section>

                    {/* Features Hub */}
                    <section>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4 flex items-center gap-2">
                        <Layers size={12} /> Features & Excellence
                      </p>
                      <div className="flex gap-2 mb-4">
                        <input className="input-dark flex-1 px-4 py-3 text-sm border-white/5 font-body" placeholder="Premium feature (e.g. Adaptive Cruise Control)" value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} />
                        <button type="button" onClick={addFeature} className="btn-outline px-6 py-3 text-xs tracking-widest uppercase">Append</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.features.map((f, i) => (
                          <span key={i} className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-4 py-2 text-[11px] text-white/50 font-body">
                            {f}<button type="button" onClick={() => removeFeature(i)} className="text-white/20 hover:text-red-400 transition-colors"><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Specifications & Configuration */}
                  <div className="lg:col-span-5 space-y-10 border-l border-white/[0.05] pl-10">
                    
                    <section>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-6">Commercial Terms</p>
                      <div className="space-y-5">
                        <Field label="Listing Name"><Input placeholder="2024 Ford F-150 Lariat" value={form.title} onChange={e => setF('title', e.target.value)} required /></Field>
                        <div className="grid grid-cols-2 gap-4">
                           <Field label="MSRP / Sell Price"><Input type="number" placeholder="78500" value={form.price} onChange={e => setF('price', e.target.value)} required /></Field>
                           <Field label="Mileage (KM)"><Input type="number" placeholder="25" value={form.mileage} onChange={e => setF('mileage', e.target.value)} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Field label="Vin Identification"><Input placeholder="..." value={form.vin} onChange={e => setF('vin', e.target.value)} /></Field>
                           <Field label="Stock Reference"><Input placeholder="AN-001" value={form.stock_number} onChange={e => setF('stock_number', e.target.value)} /></Field>
                        </div>
                      </div>
                    </section>

                    <section>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-6">Technical Configuration</p>
                      <div className="grid grid-cols-2 gap-5">
                        <Field label="Condition"><Sel options={['used','new']} value={form.condition} onChange={e => setF('condition', e.target.value)} /></Field>
                        <Field label="Body Configuration"><Sel options={['Truck','SUV','Sedan','Coupe','Van']} value={form.body_type} onChange={e => setF('body_type', e.target.value)} /></Field>
                        <Field label="Propulsion"><Sel options={['Gas','Electric','Diesel','Hybrid']} value={form.fuel_type} onChange={e => setF('fuel_type', e.target.value)} /></Field>
                        <Field label="Drivetrain"><Sel options={['4WD','AWD','RWD','FWD']} value={form.drivetrain} onChange={e => setF('drivetrain', e.target.value)} /></Field>
                        <Field label="Transmission"><Sel options={['Automatic','Manual']} value={form.transmission} onChange={e => setF('transmission', e.target.value)} /></Field>
                        <Field label="Power Plant"><Input placeholder="3.5L V6" value={form.engine} onChange={e => setF('engine', e.target.value)} /></Field>
                        <Field label="Exterior Finish"><Input placeholder="Oxford White" value={form.exterior_color} onChange={e => setF('exterior_color', e.target.value)} /></Field>
                        <Field label="Interior Palette"><Input placeholder="Onyx Black" value={form.interior_color} onChange={e => setF('interior_color', e.target.value)} /></Field>
                      </div>
                    </section>

                    <section className="bg-white/5 p-6 rounded-lg space-y-5">
                       <Field label="Operational Status">
                          <Sel options={['available','sold','pending']} value={form.status} onChange={e => setF('status', e.target.value)} />
                       </Field>
                       <div className="flex items-center justify-between">
                          <span className="text-white/40 text-[10px] font-heading uppercase tracking-[0.15em]">Promote as Featured</span>
                          <button type="button" onClick={() => setF('featured', !form.featured)} className={`w-10 h-5 relative transition-colors duration-300 rounded-full ${form.featured ? 'bg-[#D4AF37]' : 'bg-white/10'}`}>
                             <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform duration-300 rounded-full ${form.featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                       </div>
                    </section>

                  </div>
                </form>
              </div>

              <div className="px-8 py-6 border-t border-white/[0.06] bg-[#0A0A0A] flex gap-4">
                <button type="button" onClick={closeModal} className="btn-outline flex-1 py-4 text-xs tracking-widest uppercase">Discard Changes</button>
                <button type="button" onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-4 text-xs font-heading font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2">
                  {saving ? 'Processing...' : <><Check size={16} /> Finalize Listing</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
