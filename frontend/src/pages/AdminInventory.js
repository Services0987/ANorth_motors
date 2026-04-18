import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Check, Star, StarOff, Search, ChevronDown, Upload, Download, FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/AdminLayout';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon) return null;
  try {
    return <Icon {...props} />;
  } catch (e) {
    console.error('Icon failed to render:', e);
    return null;
  }
};

const API = '/api';
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
      {(options || []).map(o => <option key={o} value={o} className="bg-[#0A0A0A]">{o}</option>)}
    </select>
    {SAFE_ICON(ChevronDown, { size: 12, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" })}
  </div>
);

export default function AdminInventory() {
  const auth = useAuth() || {};
  const { user, loading: loadingAuth } = auth;
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
    } catch (err) { 
      console.error('Fetch failed:', err);
      setVehicles([]);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) fetchVehicles(); }, [user, fetchVehicles]);

  if (loadingAuth) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-heading text-[#D4AF37] uppercase tracking-[0.3em] text-xs">Initializing...</div>;
  if (!user) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-heading text-white/20 uppercase tracking-[0.3em] text-xs">Log in required</div>;

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditing(null); setShowModal(true); };
  const openEdit = (v) => { setForm({ ...v, features: [...(v.features || [])], images: [...(v.images || [])] }); setEditing(v); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setNewFeature(''); setNewImage(''); };

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

  const filtered = (vehicles || []).filter(v => {
    const ms = !search || v.title?.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'all' || v.status === statusFilter;
    return ms && mst;
  });

  return (
    <AdminLayout title="Inventory">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              {SAFE_ICON(Search, { size: 13, className: "absolute left-3 top-1/2 -translate-y-1/2 text-white/25" })}
              <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-56" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Sel options={['all', 'available', 'sold', 'pending']} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} />
          </div>
          <button onClick={openAdd} className="btn-gold px-5 py-2.5 text-xs flex items-center gap-2">
            {SAFE_ICON(Plus, { size: 14 })} Add Vehicle
          </button>
        </div>

        <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/[0.05] text-[10px] font-heading uppercase tracking-widest text-white/25">
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="py-20 text-center opacity-20">Loading...</td></tr> : 
               filtered.length === 0 ? <tr><td colSpan={4} className="py-20 text-center opacity-20">No data</td></tr> :
               filtered.map(v => (
                <tr key={v.id} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                   <td className="px-4 py-3">
                     <p className="text-white text-xs font-medium">{v.title}</p>
                     <p className="text-white/25 text-[10px] uppercase font-heading">{v.make} · {v.year}</p>
                   </td>
                   <td className="px-4 py-3 text-[#D4AF37]">${v.price?.toLocaleString()}</td>
                   <td className="px-4 py-3 capitalize">{v.status}</td>
                   <td className="px-4 py-3">
                     <div className="flex gap-4">
                       <button onClick={() => openEdit(v)}>{SAFE_ICON(Pencil, { size: 14, className: "text-white/30" })}</button>
                       <button onClick={() => setDeleteConfirm(v.id)}>{SAFE_ICON(Trash2, { size: 14, className: "text-white/30" })}</button>
                     </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0D0D0D] border border-white/10 p-8 w-full max-w-lg">
                <h2 className="text-white font-heading mb-6">{editing ? 'Edit' : 'Add'} Vehicle</h2>
                <form onSubmit={handleSave} className="space-y-4">
                   <Input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Title" required />
                   <Input value={form.price} onChange={e => setF('price', e.target.value)} placeholder="Price" required />
                   <div className="flex gap-3 pt-4">
                      <button type="button" onClick={closeModal} className="btn-outline flex-1 py-3 text-xs">Cancel</button>
                      <button type="submit" disabled={saving} className="btn-gold flex-1 py-3 text-xs">Save</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
