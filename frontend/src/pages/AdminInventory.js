import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Check, Star, StarOff, Search, ChevronDown, Upload, Download, FileText, AlertCircle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../contexts/AuthContext';

const PLACEHOLDER = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80";

const SAFE_ICON = (Icon, props = {}) => Icon ? <Icon {...props} /> : null;

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-[10px] tracking-[0.2em] uppercase text-white/35 font-heading block">{label}</label>}
    <input {...props} className="input-dark w-full px-4 py-2.5 text-sm font-body focus:border-[#D4AF37]/50" />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-[10px] tracking-[0.2em] uppercase text-white/35 font-heading block">{label}</label>}
    <div className="relative">
      <select {...props} className="input-dark w-full px-4 py-2.5 text-sm font-body appearance-none focus:border-[#D4AF37]/50">
        {options.map(o => <option key={o} value={o} className="bg-[#0A0A0A]">{o}</option>)}
      </select>
      {SAFE_ICON(ChevronDown, { size: 14, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" })}
    </div>
  </div>
);

export default function AdminInventory() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  const [form, setForm] = useState({
    title: '', make: '', model: '', year: 2024, price: 0, mileage: 0,
    condition: 'used', body_type: 'Sedan', fuel_type: 'Gas', transmission: 'Automatic',
    exterior_color: '', interior_color: '', engine: '', drivetrain: 'FWD',
    vin: '', stock_number: '', description: '', features: [], images: [],
    status: 'available', featured: false
  });

  const [newFeature, setNewFeature] = useState('');
  const [newImage, setNewImage] = useState('');

  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/vehicles', { params: { status: 'all' } });
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error('Fetch failed:', err);
      setVehicles([]); // Graceful failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchVehicles();
  }, [user, fetchVehicles]);

  if (!user) {
    return (
      <AdminLayout title="Inventory">
        <div className="flex items-center justify-center p-12">
          <p className="text-white/40">Loading authorization...</p>
        </div>
      </AdminLayout>
    );
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/vehicles/${id}`);
      setVehicles(prev => prev.filter(v => v.id !== id));
      setDeleteConfirm(null);
    } catch (err) { alert('Failed to delete'); }
  };

  const toggleFeatured = async (v) => {
    try {
      await axios.put(`/api/vehicles/${v.id}`, { featured: !v.featured });
      setVehicles(prev => prev.map(item => item.id === v.id ? { ...item, featured: !v.featured } : item));
    } catch (err) { console.error(err); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      title: '', make: '', model: '', year: 2024, price: 0, mileage: 0,
      condition: 'used', body_type: 'Sedan', fuel_type: 'Gas', transmission: 'Automatic',
      exterior_color: '', interior_color: '', engine: '', drivetrain: 'FWD',
      vin: '', stock_number: '', description: '', features: [], images: [],
      status: 'available', featured: false
    });
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v.id);
    setForm({ ...v });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`/api/vehicles/${editing}`, form);
      } else {
        await axios.post('/api/vehicles', form);
      }
      fetchVehicles();
      closeModal();
    } catch (err) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setForm(prev => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
    setNewFeature('');
  };

  const removeFeature = (idx) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const addImage = () => {
    if (!newImage.trim()) return;
    setForm(prev => ({ ...prev, images: [...prev.images, newImage.trim()] }));
    setNewImage('');
  };

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvResult(null);
    const formData = new FormData();
    formData.append('file', csvFile);
    try {
      const { data } = await axios.post('/api/vehicles/import', formData);
      setCsvResult(data);
      fetchVehicles();
    } catch (err) {
      setCsvResult({ error: err.response?.data?.detail || 'Import failed' });
    } finally {
      setCsvLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get('/api/vehicles/template/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'autonorth_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert('Template download failed'); }
  };

  const filtered = vehicles.filter(v => {
    const title = v.title || '';
    const vin = v.vin || '';
    const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) || vin.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Inventory Management">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              {SAFE_ICON(Search, { size: 13, className: "absolute left-3 top-1/2 -translate-y-1/2 text-white/25" })}
              <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-56" placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="relative">
              <select className="input-dark px-3 py-2.5 text-sm font-body appearance-none pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {['all', 'available', 'sold', 'pending'].map(s => <option key={s} className="bg-[#0A0A0A]">{s}</option>)}
              </select>
              {SAFE_ICON(ChevronDown, { size: 12, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" })}
            </div>
            <span className="text-white/25 text-xs font-body">{filtered.length} vehicles</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCsvModal(true)} className="flex items-center gap-2 border border-white/10 text-white/50 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] px-4 py-2.5 text-xs font-body tracking-wider uppercase transition-all">
              {SAFE_ICON(Upload, { size: 13 })} Import CSV
            </button>
            <button onClick={openAdd} className="btn-gold px-5 py-2.5 text-xs flex items-center gap-2">
              {SAFE_ICON(Plus, { size: 14 })} Add Vehicle
            </button>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                <th className="px-4 py-3 text-[10px] tracking-widest uppercase text-white/30 font-heading">Vehicle</th>
                <th className="px-4 py-3 text-[10px] tracking-widest uppercase text-white/30 font-heading">Specs</th>
                <th className="px-4 py-3 text-[10px] tracking-widest uppercase text-white/30 font-heading">Price</th>
                <th className="px-4 py-3 text-[10px] tracking-widest uppercase text-white/30 font-heading">Status</th>
                <th className="px-4 py-3 text-[10px] tracking-widest uppercase text-white/30 font-heading text-center">Featured</th>
                <th className="px-4 py-3 text-[10px] tracking-widest uppercase text-white/30 font-heading">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-white/20 font-body">Loading inventory...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-white/20 font-body">No vehicles found.</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-9 bg-white/[0.03] overflow-hidden border border-white/10 flex-shrink-0">
                        <img src={v.images[0] || PLACEHOLDER} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-body font-medium truncate max-w-[200px]">{v.title}</p>
                        <p className="text-[10px] text-white/30 font-body uppercase tracking-tighter">VIN: {v.vin || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white/60 text-xs font-body">{v.year} | {(v.mileage || 0).toLocaleString()} km</p>
                    <p className="text-[10px] text-white/25 font-body uppercase">{v.transmission} • {v.fuel_type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[#D4AF37] text-sm font-heading font-semibold">${(v.price || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-heading font-bold uppercase ${
                      v.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' :
                      v.status === 'sold' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleFeatured(v)} className={`transition-colors ${v.featured ? 'text-[#D4AF37]' : 'text-white/15 hover:text-white/40'}`}>
                      {v.featured ? SAFE_ICON(Star, { size: 15, fill: "currentColor" }) : SAFE_ICON(StarOff, { size: 15 })}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(v)} className="text-white/30 hover:text-white transition-colors">{SAFE_ICON(Pencil, { size: 14 })}</button>
                      <button onClick={() => setDeleteConfirm(v.id)} className="text-white/30 hover:text-red-400 transition-colors">{SAFE_ICON(Trash2, { size: 14 })}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AnimatePresence>
          {showCsvModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-[#0D0D0D] border border-white/[0.08] w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-white text-base font-medium">Import Vehicles</h2>
                  <button onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvResult(null); }} className="text-white/30 hover:text-white">{SAFE_ICON(X, { size: 18 })}</button>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4">
                    <p className="text-white/60 text-sm font-body mb-3">Use our template to ensure correct formatting.</p>
                    <button onClick={downloadTemplate} className="flex items-center gap-2 text-[#D4AF37] text-xs font-body hover:text-[#F3E5AB]">
                      {SAFE_ICON(Download, { size: 14 })} Download Template
                    </button>
                  </div>
                  <label className="block border-2 border-dashed border-white/10 hover:border-[#D4AF37]/30 p-6 text-center cursor-pointer">
                    <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
                    {csvFile ? <span className="text-[#D4AF37]">{csvFile.name}</span> : <span>{SAFE_ICON(Upload, { size: 24, className: "mx-auto mb-2 opacity-20" })} Click to upload</span>}
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => setShowCsvModal(false)} className="btn-outline flex-1 py-2.5 text-xs">Cancel</button>
                    <button onClick={handleCsvImport} disabled={!csvFile || csvLoading} className="btn-gold flex-1 py-2.5 text-xs">
                      {csvLoading ? 'Importing...' : 'Upload Now'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="glass-card p-8 max-w-sm w-full text-center">
                {SAFE_ICON(Trash2, { size: 28, className: "text-red-400 mx-auto mb-4" })}
                <h3 className="font-heading text-white text-lg mb-6">Delete this vehicle?</h3>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white transition-colors">Delete</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-[#0D0D0D] border border-white/[0.08] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-[#0D0D0D] border-b border-white/[0.05] px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="font-heading text-white text-base font-medium">{editing ? 'Edit' : 'Add'} Vehicle</h2>
                  <button onClick={closeModal} className="text-white/30 hover:text-white">{SAFE_ICON(X, { size: 18 })}</button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                    <Input label="Make" value={form.make} onChange={e => setForm({...form, make: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Price ($)" type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} required />
                    <Select label="Status" value={form.status} onChange={e => setForm({...form, status: e.target.value})} options={['available', 'sold', 'pending']} />
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-white/[0.05]">
                    <button type="button" onClick={closeModal} className="btn-outline flex-1 py-3 text-xs">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-gold flex-1 py-3 text-xs flex items-center justify-center gap-2">
                      {saving ? 'Saving...' : <>{SAFE_ICON(Check, { size: 13 })} Save Vehicle</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
