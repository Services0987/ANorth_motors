import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Check, Star, StarOff, Search, ChevronDown, Upload, Download, FileText, AlertCircle } from 'lucide-react';
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

const STATUS_COLOR = { available: 'text-emerald-400 bg-emerald-500/10', sold: 'text-red-400 bg-red-500/10', pending: 'text-yellow-400 bg-yellow-500/10' };

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
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/vehicles?status=all&limit=200`, { withCredentials: true });
      setVehicles(data.vehicles || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditing(null); setShowModal(true); };
  const openEdit = (v) => { setForm({ ...v, features: [...(v.features || [])], images: [...(v.images || [])] }); setEditing(v); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setNewFeature(''); setNewImage(''); };

  const addFeature = () => { if (newFeature.trim()) { setF('features', [...form.features, newFeature.trim()]); setNewFeature(''); } };
  const removeFeature = (i) => setF('features', form.features.filter((_, idx) => idx !== i));
  const addImage = () => { if (newImage.trim()) { setF('images', [...form.images, newImage.trim()]); setNewImage(''); } };
  const removeImage = (i) => setF('images', form.images.filter((_, idx) => idx !== i));

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

  const toggleFeatured = async (v) => {
    try { await axios.put(`${API}/vehicles/${v.id}`, { featured: !v.featured }, { withCredentials: true }); fetchVehicles(); }
    catch (err) { console.error(err); }
  };

  const updateStatus = async (v, status) => {
    try { await axios.put(`${API}/vehicles/${v.id}`, { status }, { withCredentials: true }); fetchVehicles(); }
    catch (err) { console.error(err); }
  };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/vehicles/template/csv`, { withCredentials: true, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'autonorth_template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvLoading(true); setCsvResult(null);
    try {
      const fd = new FormData(); fd.append('file', csvFile);
      const { data } = await axios.post(`${API}/vehicles/import`, fd, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      setCsvResult(data); fetchVehicles();
    } catch (err) { setCsvResult({ error: err.message }); }
    finally { setCsvLoading(false); }
  };

  const filtered = vehicles.filter(v => {
    const ms = !search || v.title?.toLowerCase().includes(search.toLowerCase()) || v.make?.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'all' || v.status === statusFilter;
    return ms && mst;
  });

  return (
    <AdminLayout title="Inventory Management">
      <div className="space-y-5" data-testid="admin-inventory">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-56" placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} data-testid="inv-search" />
            </div>
            <div className="relative">
              <select className="input-dark px-3 py-2.5 text-sm font-body appearance-none pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="inv-status-filter">
                {['all', 'available', 'sold', 'pending'].map(s => <option key={s} className="bg-[#0A0A0A]">{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            </div>
            <span className="text-white/25 text-xs font-body">{filtered.length} vehicles</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCsvModal(true)} className="flex items-center gap-2 border border-white/10 text-white/50 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] px-4 py-2.5 text-xs font-body tracking-wider uppercase transition-all" data-testid="import-csv-btn">
              <Upload size={13} /> Import CSV
            </button>
            <button onClick={openAdd} className="btn-gold px-5 py-2.5 text-xs flex items-center gap-2" data-testid="add-vehicle-btn">
              <Plus size={14} /> Add Vehicle
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-x-auto">
          <table className="w-full text-sm font-body" data-testid="vehicles-table">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Image', 'Vehicle', 'Price', 'Type', 'Status', 'Featured', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-heading tracking-[0.15em] uppercase text-white/25">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-white/[0.03] animate-pulse" /></td>)}
                </tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-white/25">No vehicles found.</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors" data-testid={`vehicle-row-${v.id}`}>
                  <td className="px-4 py-3">
                    <div className="w-14 h-10 overflow-hidden bg-white/[0.03]">
                      <img src={v.images?.[0] || PLACEHOLDER} alt="" className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER; }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-medium max-w-[180px] truncate">{v.title}</p>
                    <p className="text-white/25 text-xs mt-0.5">{v.year} · {v.mileage === 0 ? '0 km' : `${v.mileage?.toLocaleString()} km`}</p>
                  </td>
                  <td className="px-4 py-3 text-[#D4AF37] font-heading text-sm font-medium">${v.price?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs capitalize ${v.condition === 'new' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>{v.condition}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={v.status} onChange={e => updateStatus(v, e.target.value)}
                      className={`text-xs px-2 py-1 appearance-none cursor-pointer bg-transparent border-0 font-body capitalize ${STATUS_COLOR[v.status] || ''}`}
                      data-testid={`status-select-${v.id}`}>
                      {['available', 'sold', 'pending'].map(s => <option key={s} value={s} className="bg-[#0A0A0A] text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleFeatured(v)} className={`transition-colors ${v.featured ? 'text-[#D4AF37]' : 'text-white/15 hover:text-white/40'}`} data-testid={`featured-btn-${v.id}`}>
                      {v.featured ? <Star size={15} fill="currentColor" /> : <StarOff size={15} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(v)} className="text-white/30 hover:text-white transition-colors" data-testid={`edit-btn-${v.id}`}><Pencil size={14} /></button>
                      <button onClick={() => setDeleteConfirm(v.id)} className="text-white/30 hover:text-red-400 transition-colors" data-testid={`delete-btn-${v.id}`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showCsvModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-[#0D0D0D] border border-white/[0.08] w-full max-w-md p-6" data-testid="csv-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-white text-base font-medium">Import Vehicles from CSV</h2>
                <button onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvResult(null); }} className="text-white/30 hover:text-white"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4">
                  <p className="text-white/60 text-sm font-body mb-3">Download the CSV template with the correct column headers, then fill in your vehicle data.</p>
                  <button onClick={downloadTemplate} className="flex items-center gap-2 text-[#D4AF37] text-xs font-body hover:text-[#F3E5AB] transition-colors" data-testid="download-template-btn">
                    <Download size={14} /> Download Template (autonorth_template.csv)
                  </button>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 font-heading mb-2">Upload CSV File</p>
                  <label className="block border-2 border-dashed border-white/10 hover:border-[#D4AF37]/30 p-6 text-center cursor-pointer transition-colors">
                    <input type="file" accept=".csv,.txt" className="hidden" onChange={e => setCsvFile(e.target.files[0])} data-testid="csv-file-input" />
                    {csvFile ? (
                      <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
                        <FileText size={18} />
                        <span className="text-sm font-body">{csvFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload size={24} className="text-white/20 mx-auto mb-2" />
                        <p className="text-white/40 text-sm font-body">Click to select CSV file</p>
                        <p className="text-white/20 text-xs font-body mt-1">Supports .csv files</p>
                      </div>
                    )}
                  </label>
                </div>

                {csvResult && (
                  <div className={`p-4 border ${csvResult.error ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                    {csvResult.error ? (
                      <div className="flex items-center gap-2 text-red-400 text-sm font-body"><AlertCircle size={14} />{csvResult.error}</div>
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
                    {csvLoading ? 'Importing...' : <><Upload size={13} /> Import Vehicles</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-8 max-w-sm w-full text-center">
              <Trash2 size={28} className="text-red-400 mx-auto mb-4" />
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
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" data-testid="vehicle-modal">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-[#0D0D0D] border border-white/[0.08] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-[#0D0D0D] border-b border-white/[0.05] px-6 py-4 flex items-center justify-between z-10">
                <h2 className="font-heading text-white text-base font-medium">{editing ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                <button onClick={closeModal} className="text-white/30 hover:text-white"><X size={18} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-4">Basic Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Field label="Listing Title *"><Input placeholder="2024 Ford F-150 XLT SuperCrew 4x4" value={form.title} onChange={e => setF('title', e.target.value)} required data-testid="form-title" /></Field></div>
                    <Field label="Make *"><Input placeholder="Ford" value={form.make} onChange={e => setF('make', e.target.value)} required data-testid="form-make" /></Field>
                    <Field label="Model *"><Input placeholder="F-150" value={form.model} onChange={e => setF('model', e.target.value)} required data-testid="form-model" /></Field>
                    <Field label="Year *"><Input type="number" value={form.year} onChange={e => setF('year', e.target.value)} required data-testid="form-year" /></Field>
                    <Field label="Price (CAD) *"><Input type="number" placeholder="52900" value={form.price} onChange={e => setF('price', e.target.value)} required data-testid="form-price" /></Field>
                    <Field label="Mileage (km)"><Input type="number" placeholder="0" value={form.mileage} onChange={e => setF('mileage', e.target.value)} data-testid="form-mileage" /></Field>
                    <Field label="Stock #"><Input placeholder="A001" value={form.stock_number} onChange={e => setF('stock_number', e.target.value)} /></Field>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-4">Vehicle Specifications</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Condition"><Sel options={['used','new']} value={form.condition} onChange={e => setF('condition', e.target.value)} /></Field>
                    <Field label="Body Type"><Sel options={['Sedan','SUV','Truck','Coupe','Hatchback','Wagon','Minivan','Cargo Van']} value={form.body_type} onChange={e => setF('body_type', e.target.value)} /></Field>
                    <Field label="Fuel Type"><Sel options={['Gas','Diesel','Hybrid','Electric']} value={form.fuel_type} onChange={e => setF('fuel_type', e.target.value)} /></Field>
                    <Field label="Transmission"><Sel options={['Automatic','Manual']} value={form.transmission} onChange={e => setF('transmission', e.target.value)} /></Field>
                    <Field label="Drivetrain"><Sel options={['FWD','RWD','AWD','4WD']} value={form.drivetrain} onChange={e => setF('drivetrain', e.target.value)} /></Field>
                    <Field label="Engine"><Input placeholder="3.5L EcoBoost V6" value={form.engine} onChange={e => setF('engine', e.target.value)} /></Field>
                    <Field label="Exterior Color"><Input placeholder="Oxford White" value={form.exterior_color} onChange={e => setF('exterior_color', e.target.value)} /></Field>
                    <Field label="Interior Color"><Input placeholder="Black" value={form.interior_color} onChange={e => setF('interior_color', e.target.value)} /></Field>
                    <Field label="VIN"><Input placeholder="1FTFW1ET4EKF34678" value={form.vin} onChange={e => setF('vin', e.target.value)} /></Field>
                    <Field label="Doors"><Input type="number" min={1} max={8} value={form.doors} onChange={e => setF('doors', e.target.value)} /></Field>
                    <Field label="Seats"><Input type="number" min={1} max={12} value={form.seats} onChange={e => setF('seats', e.target.value)} /></Field>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-4">Listing Options</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Status"><Sel options={['available','sold','pending']} value={form.status} onChange={e => setF('status', e.target.value)} /></Field>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-10 h-5 relative cursor-pointer transition-colors duration-200 ${form.featured ? 'bg-[#D4AF37]' : 'bg-white/10'}`} onClick={() => setF('featured', !form.featured)}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform duration-200 ${form.featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-white/50 font-body text-sm">Featured Listing</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-4">Description</p>
                  <textarea className="input-dark w-full px-3 py-2.5 text-sm font-body resize-none" rows={4} placeholder="Describe the vehicle in detail..." value={form.description} onChange={e => setF('description', e.target.value)} />
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-heading mb-3">Features & Options</p>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="Add feature (e.g. Apple CarPlay)" value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} />
                    <button type="button" onClick={addFeature} className="btn-gold px-4 py-2 text-xs whitespace-nowrap">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.features.map((f, i) => (
                      <span key={i} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-3 py-1 text-xs text-white/60 font-body">
                        {f}<button type="button" onClick={() => removeFeature(i)} className="text-white/25 hover:text-red-400"><X size={11} /></button>
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
                          <button type="button" onClick={() => removeImage(i)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"><Trash2 size={14} /></button>
                          {i === 0 && <span className="absolute bottom-0.5 left-0.5 bg-[#D4AF37] text-black text-[8px] px-1 font-heading">Main</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 sticky bottom-0 bg-[#0D0D0D] py-4 border-t border-white/[0.05]">
                  <button type="button" onClick={closeModal} className="btn-outline flex-1 py-3 text-xs" data-testid="modal-cancel">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-gold flex-1 py-3 text-xs flex items-center justify-center gap-2" data-testid="modal-save">
                    {saving ? 'Saving...' : <><Check size={13} /> {editing ? 'Update Vehicle' : 'Add to Inventory'}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
