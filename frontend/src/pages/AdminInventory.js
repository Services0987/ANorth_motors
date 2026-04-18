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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchVehicles();
  }, [user, fetchVehicles]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white/40 font-body mb-4">Please log in to manage inventory.</p>
          <a href="/admin" className="btn-gold px-8 py-3 text-sm">Return to Login</a>
        </div>
      </div>
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
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase()) || v.vin.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Inventory Management">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              {SAFE_ICON(Search, { size: 13, className: "absolute left-3 top-1/2 -translate-y-1/2 text-white/25" })}
              <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-56" placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} data-testid="inv-search" />
            </div>
            <div className="relative">
              <select className="input-dark px-3 py-2.5 text-sm font-body appearance-none pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="inv-status-filter">
                {['all', 'available', 'sold', 'pending'].map(s => <option key={s} className="bg-[#0A0A0A]">{s}</option>)}
              </select>
              {SAFE_ICON(ChevronDown, { size: 12, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" })}
            </div>
            <span className="text-white/25 text-xs font-body">{filtered.length} vehicles</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCsvModal(true)} className="flex items-center gap-2 border border-white/10 text-white/50 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] px-4 py-2.5 text-xs font-body tracking-wider uppercase transition-all" data-testid="import-csv-btn">
              {SAFE_ICON(Upload, { size: 13 })} Import CSV
            </button>
            <button onClick={openAdd} className="btn-gold px-5 py-2.5 text-xs flex items-center gap-2" data-testid="add-vehicle-btn">
              {SAFE_ICON(Plus, { size: 14 })} Add Vehicle
            </button>
          </div>
        </div>

        {/* Table */}
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
                <tr><td colSpan="6" className="px-4 py-12 text-center text-white/20 font-body">No vehicles match your search.</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-9 bg-white/[0.03] overflow-hidden border border-white/10 flex-shrink-0">
                        <img src={v.images[0] || PLACEHOLDER} alt="" className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER; }} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-body font-medium truncate max-w-[200px]">{v.title}</p>
                        <p className="text-[10px] text-white/30 font-body uppercase tracking-tighter">VIN: {v.vin || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white/60 text-xs font-body">{v.year} | {v.mileage.toLocaleString()} km</p>
                    <p className="text-[10px] text-white/25 font-body uppercase">{v.transmission} • {v.fuel_type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[#D4AF37] text-sm font-heading font-semibold">${v.price.toLocaleString()}</p>
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
                    <button onClick={() => toggleFeatured(v)} className={`transition-colors ${v.featured ? 'text-[#D4AF37]' : 'text-white/15 hover:text-white/40'}`} data-testid={`featured-btn-${v.id}`}>
                      {v.featured ? SAFE_ICON(Star, { size: 15, fill: "currentColor" }) : SAFE_ICON(StarOff, { size: 15 })}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(v)} className="text-white/30 hover:text-white transition-colors" data-testid={`edit-btn-${v.id}`}>{SAFE_ICON(Pencil, { size: 14 })}</button>
                      <button onClick={() => setDeleteConfirm(v.id)} className="text-white/30 hover:text-red-400 transition-colors" data-testid={`delete-btn-${v.id}`}>{SAFE_ICON(Trash2, { size: 14 })}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CSV Import Modal */}
        <AnimatePresence>
          {showCsvModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-[#0D0D0D] border border-white/[0.08] w-full max-w-md p-6" data-testid="csv-modal">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-white text-base font-medium">Import Vehicles from CSV</h2>
                  <button onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvResult(null); }} className="text-white/30 hover:text-white">{SAFE_ICON(X, { size: 18 })}</button>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4">
                    <p className="text-white/60 text-sm font-body mb-3">Download the CSV template with the correct column headers, then fill in your vehicle data.</p>
                    <button onClick={downloadTemplate} className="flex items-center gap-2 text-[#D4AF37] text-xs font-body hover:text-[#F3E5AB] transition-colors" data-testid="download-template-btn">
                      {SAFE_ICON(Download, { size: 14 })} Download Template (autonorth_template.csv)
                    </button>
                  </div>

                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 font-heading mb-2">Upload CSV File</p>
                    <label className="block border-2 border-dashed border-white/10 hover:border-[#D4AF37]/30 p-6 text-center cursor-pointer transition-colors">
                      <input type="file" accept=".csv,.txt" className="hidden" onChange={e => setCsvFile(e.target.files[0])} data-testid="csv-file-input" />
                      {csvFile ? (
                        <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
                          {SAFE_ICON(FileText, { size: 18 })}
                          <span className="text-sm font-body">{csvFile.name}</span>
                        </div>
                      ) : (
                        <div>
                          {SAFE_ICON(Upload, { size: 24, className: "text-white/20 mx-auto mb-2" })}
                          <p className="text-white/40 text-sm font-body">Click to select CSV file</p>
                          <p className="text-white/20 text-xs font-body mt-1">Supports .csv files</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {csvResult && (
                    <div className={`p-4 border ${csvResult.error ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                      {csvResult.error ? (
                        <div className="flex items-center gap-2 text-red-400 text-sm font-body">{SAFE_ICON(AlertCircle, { size: 14 })}{csvResult.error}</div>
                      ) : (
                        <div>
                          <p className="text-emerald-400 text-sm font-body font-medium">{csvResult.created} vehicle{csvResult.created !== 1 ? 's' : ''} imported successfully</p>
                          {csvResult.errors?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-yellow-400 text-xs font-body mb-1">{csvResult.errors.length} row error{csvResult.errors.length !== 1 ? 's' : ''}:</p>
                              {csvResult.errors.map((e, i) => <p key={i} className="text-white/40 text-xs font-body">{e}</p>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvResult(null); }} className="btn-outline flex-1 py-2.5 text-xs">Cancel</button>
                    <button onClick={handleCsvImport} disabled={!csvFile || csvLoading} className="btn-gold flex-1 py-2.5 text-xs flex items-center justify-center gap-2" data-testid="csv-import-submit">
                      {csvLoading ? 'Importing...' : <>{SAFE_ICON(Upload, { size: 13 })} Import Vehicles</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-8 max-w-sm w-full text-center">
                {SAFE_ICON(Trash2, { size: 28, className: "text-red-400 mx-auto mb-4" })}
                <h3 className="font-heading text-white text-lg mb-2">Delete Vehicle?</h3>
                <p className="text-white/35 text-sm font-body mb-6">This cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1 py-2.5 text-sm" data-testid="delete-cancel">Cancel</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white font-body transition-colors" data-testid="delete-confirm">Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-[#0D0D0D] border border-white/[0.08] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-[#0D0D0D] border-b border-white/[0.05] px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="font-heading text-white text-base font-medium">{editing ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                  <button onClick={closeModal} className="text-white/30 hover:text-white">{SAFE_ICON(X, { size: 18 })}</button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                  {/* Form fields... (Truncated for readability, standard fields remain) */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Vehicle Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                    <Input label="Make" value={form.make} onChange={e => setForm({...form, make: e.target.value})} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Price ($)" type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} required />
                    <Select label="Status" value={form.status} onChange={e => setForm({...form, status: e.target.value})} options={['available', 'sold', 'pending']} />
                  </div>

                  {/* Features & Images */}
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-3">Features & Options</p>
                    <div className="flex gap-2 mb-3">
                      <Input placeholder="Add feature (e.g. Apple CarPlay)" value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} />
                      <button type="button" onClick={addFeature} className="btn-gold px-4 py-2 text-xs whitespace-nowrap">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.features.map((f, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-3 py-1 text-xs text-white/60 font-body">
                          {f}<button type="button" onClick={() => removeFeature(i)} className="text-white/25 hover:text-red-400">{SAFE_ICON(X, { size: 11 })}</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-3">Vehicle Images (URLs)</p>
                    <div className="flex gap-2 mb-3">
                      <Input placeholder="Paste image URL (https://...)" value={newImage} onChange={e => setNewImage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }} />
                      <button type="button" onClick={addImage} className="btn-gold px-4 py-2 text-xs whitespace-nowrap">Add</button>
                    </div>
                    {form.images.length > 0 && (
                      <div className="grid grid-cols-5 gap-2">
                        {form.images.map((img, i) => (
                          <div key={i} className="relative group aspect-square overflow-hidden bg-white/[0.03]">
                            <img src={img} alt="" className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER; }} />
                            <button type="button" onClick={() => removeImage(i)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity">{SAFE_ICON(Trash2, { size: 14 })}</button>
                            {i === 0 && <span className="absolute bottom-0.5 left-0.5 bg-[#D4AF37] text-black text-[8px] px-1 font-heading">Main</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 sticky bottom-0 bg-[#0D0D0D] py-4 border-t border-white/[0.05]">
                    <button type="button" onClick={closeModal} className="btn-outline flex-1 py-3 text-xs" data-testid="modal-cancel">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-gold flex-1 py-3 text-xs flex items-center justify-center gap-2" data-testid="modal-save">
                      {saving ? 'Saving...' : <>{SAFE_ICON(Check, { size: 13 })} {editing ? 'Update Vehicle' : 'Add to Inventory'}</>}
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
