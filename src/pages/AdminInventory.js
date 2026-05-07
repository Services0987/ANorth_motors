import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Pencil, Trash2, X, Check, Star, Search,
  ChevronDown, RefreshCcw as RefreshCw, Globe, Link as LinkIcon, Layers, 
  ChevronLeft, ChevronRight, LayoutGrid, FileText, AlertTriangle as AlertCircle,
  StarOff, Upload, Download, LayoutList, CheckCircle, Link
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};
const API = '/api';
const PLACEHOLDER = '/coming-soon-placeholder.png'; // Premium artistic placeholder

const EMPTY_FORM = {
  title: '', make: '', model: '', year: new Date().getFullYear(), price: '',
  mileage: 0, condition: 'used', body_type: 'Sedan', fuel_type: 'Gas',
  transmission: 'Automatic', exterior_color: '', interior_color: '', engine: '',
  drivetrain: 'FWD', doors: 4, seats: 5, vin: '', stock_number: '',
  description: '', features: [], images: [], status: 'available', featured: false,
  show_on_home: false,
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
    {SAFE_ICON(ChevronDown, { size: 12, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" })}
  </div>
);

export default function AdminInventory() {
  const { user, loading: loadingAuth } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [newFeature, setNewFeature] = useState('');
  const [newImage, setNewImage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [addMode, setAddMode] = useState('manual');
  
  // Security & AI State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityForm, setSecurityForm] = useState({ email: user?.email || '', password: '', confirm: '' });
  const [aiForm, setAiForm] = useState({ ai_provider: 'local', ai_api_key: '' });
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState(false);
  
  // Scraper State
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperLoading, setScraperLoading] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null); // { added, updated }
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState({ imported: 0, updated: 0, processed: 0, currentBatch: 0, totalBatches: 0 });

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const { data } = await axios.get(`${API}/vehicles?status=all&limit=${limit}&skip=${skip}&search=${search}`, { withCredentials: true });
      setVehicles(data.vehicles || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, search, limit]);

  const fetchScraperSettings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/scraper/settings`, { withCredentials: true });
      setAutoSync(data.auto_sync); setLastSync(data.last_sync);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchVehicles(); fetchScraperSettings(); }, [fetchVehicles, fetchScraperSettings]);

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

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, year: parseInt(form.year), price: parseFloat(form.price), mileage: parseInt(form.mileage || 0) };
      if (editing) await axios.put(`${API}/vehicles/${editing._id || editing.id}`, payload, { withCredentials: true });
      else await axios.post(`${API}/vehicles`, payload, { withCredentials: true });
      closeModal(); fetchVehicles();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const toggleQuickField = async (id, field, value) => {
    try {
      setVehicles(prev => prev.map(v => (v._id === id || v.id === id) ? { ...v, [field]: value } : v));
      await axios.put(`${API}/vehicles/${id}`, { [field]: value }, { withCredentials: true });
    } catch (err) { 
      console.error(err); 
      fetchVehicles();
    }
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`${API}/vehicles/${id}`, { withCredentials: true }); setDeleteConfirm(null); fetchVehicles(); }
    catch (err) { console.error(err); }
  };

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      if (data) setAiForm({ ai_provider: data.ai_provider || 'local', ai_api_key: data.ai_api_key || '' });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { if (showSecurityModal) fetchSettings(); }, [showSecurityModal, fetchSettings]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (securityForm.password && securityForm.password !== securityForm.confirm) {
      return setSecurityError("Passwords do not match");
    }
    setSecuritySaving(true); setSecurityError(''); setSecuritySuccess(false);
    try {
      await axios.put(`${API}/auth/profile`, { 
        email: securityForm.email, 
        password: securityForm.password || undefined 
      }, { withCredentials: true });
      await axios.put(`${API}/settings`, aiForm, { withCredentials: true });
      setSecuritySuccess(true);
      setTimeout(() => { setShowSecurityModal(false); setSecuritySuccess(false); }, 2000);
    } catch (err) { 
      setSecurityError(err.response?.data?.message || "Failed to update profile");
    } finally { setSecuritySaving(false); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} vehicles?`)) return;
    try {
      await axios.delete(`${API}/vehicles/bulk/delete`, { data: selectedIds, withCredentials: true });
      setSelectedIds([]); fetchVehicles();
    } catch (err) { console.error(err); }
  };

  const toggleAutoSync = async () => {
    const newVal = !autoSync; setAutoSync(newVal);
    try { await axios.post(`${API}/scraper/settings`, { auto_sync: newVal }, { withCredentials: true }); }
    catch (err) { console.error(err); }
  };

  const handleSyncNow = async () => {
    setScraperLoading(true);
    setSyncProgress(0);
    setSyncStatus(null);
    setSyncStats({ imported: 0, updated: 0, processed: 0, currentBatch: 0, totalBatches: 0 });
    
    try { 
      const infoResp = await axios.get(`${API}/scraper/sync/info`, { withCredentials: true });
      const { total_pages } = infoResp.data;
      
      if (!total_pages) {
         alert("No vehicles found to sync.");
         setScraperLoading(false);
         return;
      }
      
      setSyncStats(prev => ({ ...prev, totalBatches: total_pages }));
      
      let totalImported = 0;
      let totalUpdated = 0;
      let totalProcessed = 0;
      
      for (let i = 0; i < total_pages; i++) {
        setSyncStats(prev => ({ ...prev, currentBatch: i + 1 }));
        const { data } = await axios.post(`${API}/scraper/sync/batch?page=${i}`, {}, { withCredentials: true });
        
        totalImported += (data.imported || 0);
        totalUpdated += (data.updated || 0);
        totalProcessed += (data.count || 0);
        
        setSyncStats(prev => ({ 
          ...prev, 
          imported: totalImported, 
          updated: totalUpdated, 
          processed: totalProcessed 
        }));
        setSyncProgress(Math.round(((i + 1) / total_pages) * 100));
      }
      
      setSyncStatus({ added: totalImported, updated: totalUpdated });
      fetchVehicles(); 
      fetchScraperSettings(); 
    }
    catch (err) { console.error(err); alert("Sync failed. Check logs."); } 
    finally { setScraperLoading(false); }
  };

  const handleUrlImport = async () => {
    if (!scraperUrl) return; setScraperLoading(true);
    try { 
      const { data } = await axios.post(`${API}/scraper/import-url`, { url: scraperUrl }, { withCredentials: true }); 
      setScraperUrl(''); 
      if (showModal) {
        setForm(prev => ({ ...prev, ...data.vehicle, images: [...(data.vehicle.images || [])], features: [...(data.vehicle.features || [])] }));
        setAddMode('manual');
      } else {
        fetchVehicles();
      }
    }
    catch (err) { console.error(err); } finally { setScraperLoading(false); }
  };

  const handleVinPopulate = async () => {
    if (!form.vin || form.vin.length < 17) return;
    setScraperLoading(true);
    try {
      const yearPrefix = form.vin.charAt(9);
      const yearMap = { 'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025 };
      if (yearMap[yearPrefix.toUpperCase()]) setF('year', yearMap[yearPrefix.toUpperCase()]);
    } finally { setScraperLoading(false); }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${API}/vehicles/import`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      fetchVehicles();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === vehicles.length && vehicles.length > 0 ? [] : vehicles.map(v => v._id || v.id));

  const totalPages = Math.ceil(total / limit);

  if (loadingAuth) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-heading text-[#D4AF37] uppercase tracking-[0.3em] text-xs">Initializing Secure Portal...</div>;
  if (!user) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-heading text-white/20 uppercase tracking-[0.3em] text-xs">Unauthorized · 403</div>;

  return (
    <AdminLayout title="Inventory Power-Center">

      <div className="space-y-6">
        <div className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30">
                  {SAFE_ICON(AlertCircle, { size: 14, className: `text-[#D4AF37] ${scraperLoading ? 'animate-spin' : ''}` })}
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
                 <div className="flex flex-col items-end gap-2">
                    <button onClick={handleSyncNow} disabled={scraperLoading} className="btn-gold px-4 py-2 text-[10px] font-heading tracking-widest uppercase flex items-center gap-2">
                       {SAFE_ICON(RefreshCw, { size: 11, className: scraperLoading ? 'animate-spin' : '' })} 
                       {scraperLoading ? 'Syncing...' : 'Sync TeamFord'}
                    </button>
                    {syncStatus && !scraperLoading && (
                      <p className="text-emerald-400 text-[9px] font-heading uppercase tracking-widest animate-fade-in">
                        Success: {syncStatus.added} added, {syncStatus.updated} updated
                      </p>
                    )}
                 </div>
              </div>
           </div>
           
           {scraperLoading && syncProgress > 0 && (
              <div className="mb-6 px-1 animate-fade-in bg-white/[0.02] p-4 border border-white/[0.05] rounded-sm">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] text-white font-heading font-bold uppercase tracking-[0.2em] mb-1">Synchronizing Intelligence</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest">Processing Batch {syncStats.currentBatch} of {syncStats.totalBatches}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-heading font-black text-[#D4AF37] tracking-tighter leading-none">{syncProgress}%</p>
                    <p className="text-[8px] text-emerald-400/60 uppercase tracking-tighter mt-1">{syncStats.imported} New · {syncStats.updated} Updated</p>
                  </div>
                </div>
                <div className="h-1.5 bg-white/5 w-full rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(212,175,55,0.3)] relative" 
                    style={{ width: `${syncProgress}%` }} 
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
           )}

           <div className="h-px bg-white/[0.05] mb-4" />
           
           <div className="flex gap-3">
              <div className="flex-1 relative">
                {SAFE_ICON(Globe, { size: 13, className: "absolute left-3 top-1/2 -translate-y-1/2 text-white/25" })}
                <input className="input-dark w-full pl-9 pr-4 py-2.5 text-sm font-body" placeholder="Paste any vehicle URL from teamford.ca..." value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} />
              </div>
              <button onClick={handleUrlImport} disabled={!scraperUrl || scraperLoading} className="btn-outline px-6 py-2.5 text-[10px] font-heading tracking-widest uppercase flex items-center gap-2">
                {SAFE_ICON(LinkIcon, { size: 11 })} Import URL
              </button>
           </div>
           {lastSync && <p className="text-white/20 text-[9px] mt-3 font-body uppercase tracking-widest">Last Successful Sync: {new Date(lastSync).toLocaleString()}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              {SAFE_ICON(Search, { size: 13, className: "absolute left-3 top-1/2 -translate-y-1/2 text-white/25" })}
              <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-56" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 text-[10px] font-heading tracking-widest uppercase hover:bg-red-500/20 transition-all">
                {SAFE_ICON(Trash2, { size: 11 })} Delete {selectedIds.length} Selected
              </button>
            )}
            <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 px-2 py-1">
              <span className="text-white/25 text-[9px] uppercase font-heading">Rows:</span>
              <select 
                value={limit} 
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className="bg-transparent text-white text-[10px] font-heading outline-none cursor-pointer"
              >
                <option value={10} className="bg-black">10</option>
                <option value={20} className="bg-black">20</option>
                <option value={50} className="bg-black">50</option>
                <option value={100} className="bg-black">100</option>
                <option value={500} className="bg-black">500</option>
              </select>
            </div>
            <span className="text-white/25 text-[10px] font-heading uppercase tracking-widest ml-2">{total} vehicles total</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleCSVUpload} />
            <div className="flex bg-[#0A0A0A] border border-white/10 p-1">
              <button onClick={openAdd} className="bg-[#D4AF37] hover:bg-[#F3E5AB] text-black px-5 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2">
                {SAFE_ICON(Plus, { size: 14 })} Manual
              </button>
              <button onClick={() => { openAdd(); setAddMode('url'); }} className="text-white/40 hover:text-white px-5 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2">
                {SAFE_ICON(Link, { size: 14 })} URL
              </button>
            </div>
            <label htmlFor="csv-upload" className="btn-outline px-6 py-3 text-xs flex items-center gap-2 cursor-pointer">
              {SAFE_ICON(Upload, { size: 14 })} CSV
            </label>
            <button 
              onClick={() => setShowSecurityModal(true)}
              className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all rounded-sm"
              title="Security Settings"
            >
              {SAFE_ICON(Pencil, { size: 16 })}
            </button>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/[0.05] overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="px-4 py-4 text-left"><input type="checkbox" className="accent-[#D4AF37]" checked={selectedIds.length === vehicles.length && vehicles.length > 0} onChange={toggleSelectAll} /></th>
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
              )) : vehicles.map(v => (
                <tr key={v._id || v.id} className={`border-b border-white/[0.03] transition-colors ${selectedIds.includes(v._id || v.id) ? 'bg-[#D4AF37]/5' : 'hover:bg-white/[0.01]'}`}>
                  <td className="px-4 py-3"><input type="checkbox" className="accent-[#D4AF37]" checked={selectedIds.includes(v._id || v.id)} onChange={() => toggleSelect(v._id || v.id)} /></td>
                  <td className="px-4 py-3"><img src={v.images?.[0] || PLACEHOLDER} alt="" className="w-16 h-11 object-cover border border-white/5" /></td>
                  <td className="px-4 py-3"><p className="text-white text-xs font-medium">{v.title}</p><p className="text-white/25 text-[10px] mt-1 uppercase font-body">{v.year}</p></td>
                  <td className="px-4 py-3 text-[#D4AF37] font-heading text-sm font-semibold">${v.price?.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 text-[10px] font-heading uppercase ${v.condition === 'new' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>{v.condition}</span></td>
                  <td className="px-4 py-3"><div className={`text-[10px] px-2 py-1 inline-block border uppercase ${v.status === 'available' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>{v.status}</div></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => toggleQuickField(v._id || v.id, 'featured', !v.featured)}
                        className={`transition-all hover:scale-125 ${v.featured ? 'text-[#D4AF37]' : 'text-white/10 hover:text-white/30'}`}
                        title="Toggle Featured"
                      >
                        {SAFE_ICON(Star, { size: 16, fill: v.featured ? 'currentColor' : 'none' })}
                      </button>
                      <button 
                        onClick={() => toggleQuickField(v._id || v.id, 'show_on_home', !v.show_on_home)}
                        className={`transition-all hover:scale-125 ${v.show_on_home ? 'text-emerald-400' : 'text-white/10 hover:text-white/30'}`}
                        title="Toggle Show on Home"
                      >
                        {SAFE_ICON(Globe, { size: 16 })}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <button onClick={() => openEdit(v)} className="text-white/20 hover:text-white transition-colors">{SAFE_ICON(Pencil, { size: 15 })}</button>
                      <button onClick={() => setDeleteConfirm(v._id || v.id)} className="text-white/20 hover:text-red-500 transition-colors">{SAFE_ICON(Trash2, { size: 15 })}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-white/10 text-white/40 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span className="text-white/40 text-xs font-heading">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border border-white/10 text-white/40 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#050505] border border-white/10 p-10 max-w-sm w-full text-center">
            {SAFE_ICON(Trash2, { size: 40, className: "text-red-400 mx-auto mb-6" })}
            <h3 className="font-heading text-white text-xl uppercase mb-3 text-[14px]">Delete Permanently?</h3>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1 py-3 text-xs uppercase">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 text-xs bg-red-600 text-white font-heading uppercase">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 md:p-8">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-5xl h-full flex flex-col shadow-2xl">
            <div className="px-8 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-heading text-white text-lg uppercase tracking-wide">{editing ? 'Edit Luxury Listing' : 'Premium Inventory Entry'}</h2>
              <button onClick={closeModal} className="text-white/20 hover:text-white transition-colors">{SAFE_ICON(X, { size: 18 })}</button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-12 gap-10">
              {addMode === 'url' ? (
                <div className="col-span-12 space-y-6 max-w-xl mx-auto py-10 w-full">
                  <div className="text-center mb-8">
                    {SAFE_ICON(Link, { size: 32, className: "text-[#D4AF37] mx-auto mb-4" })}
                    <h3 className="text-white text-xl font-heading mb-2">Import from External URL</h3>
                    <p className="text-white/40 text-sm font-body">Paste a TeamFord.ca or GoAuto listing URL to automatically extract all specs and high-res images.</p>
                  </div>
                  <div className="flex gap-3">
                    <input className="input-dark w-full px-4 py-3 text-sm font-body" placeholder="https://www.teamford.ca/vehicles/..." value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} />
                    <button onClick={handleUrlImport} disabled={scraperLoading} className="btn-gold px-8 py-3 text-xs uppercase font-bold">{scraperLoading ? 'Scraping...' : 'Fetch'}</button>
                  </div>
                  <button onClick={() => setAddMode('manual')} className="w-full text-white/20 text-[10px] uppercase tracking-widest font-heading hover:text-white transition-colors">Skip to Manual Entry</button>
                </div>
              ) : (
                  <>
                    <div className="col-span-12 lg:col-span-7 space-y-10">
                      <section>
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4">{SAFE_ICON(LayoutGrid, { size: 12 })} Visual Assets</p>
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <input className="input-dark flex-1 px-4 py-3 text-sm font-body" placeholder="Import link..." value={newImage} onChange={e => setNewImage(e.target.value)} />
                            <button type="button" onClick={addImage} className="btn-gold px-6 py-3 text-xs uppercase">Upload</button>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            {form.images.map((img, i) => (
                              <div key={i} className="relative aspect-[4/3] border border-white/5 group">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
                                  <button type="button" onClick={() => moveImage(i, -1)} className="p-1 hover:text-[#D4AF37] transition-colors">{SAFE_ICON(ChevronLeft, { size: 12 })}</button>
                                  <button type="button" onClick={() => removeImage(i)} className="p-1 hover:text-red-500 transition-colors">{SAFE_ICON(Trash2, { size: 12 })}</button>
                                  <button type="button" onClick={() => moveImage(i, 1)} className="p-1 hover:text-[#D4AF37] transition-colors">{SAFE_ICON(ChevronRight, { size: 12 })}</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    </div>
                    <div className="col-span-12 lg:col-span-5 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Listing Name"><Input value={form.title} onChange={e => setF('title', e.target.value)} /></Field>
                        <Field label="Price"><Input type="number" value={form.price} onChange={e => setF('price', e.target.value)} /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Make"><Input value={form.make} onChange={e => setF('make', e.target.value)} /></Field>
                        <Field label="Model"><Input value={form.model} onChange={e => setF('model', e.target.value)} /></Field>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Year"><Input type="number" value={form.year} onChange={e => setF('year', e.target.value)} /></Field>
                        <Field label="Mileage"><Input type="number" value={form.mileage} onChange={e => setF('mileage', e.target.value)} /></Field>
                        <Field label="Condition"><Sel options={['used','new']} value={form.condition} onChange={e => setF('condition', e.target.value)} /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="VIN">
                          <div className="flex gap-2">
                            <Input value={form.vin} onChange={e => setF('vin', e.target.value)} />
                            <button type="button" onClick={handleVinPopulate} className="btn-outline px-3 py-2 text-[9px] font-heading tracking-tighter hover:text-[#D4AF37]">DECODE</button>
                          </div>
                        </Field>
                        <Field label="Stock #"><Input value={form.stock_number} onChange={e => setF('stock_number', e.target.value)} /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Body Type"><Sel options={['Sedan','SUV','Truck','Coupe','Van','Wagon']} value={form.body_type} onChange={e => setF('body_type', e.target.value)} /></Field>
                        <Field label="Transmission"><Sel options={['Automatic','Manual','CVT']} value={form.transmission} onChange={e => setF('transmission', e.target.value)} /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Fuel Type"><Sel options={['Gas','Diesel','Electric','Hybrid']} value={form.fuel_type} onChange={e => setF('fuel_type', e.target.value)} /></Field>
                        <Field label="Drivetrain"><Sel options={['FWD','RWD','AWD','4WD']} value={form.drivetrain} onChange={e => setF('drivetrain', e.target.value)} /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Exterior Color"><Input value={form.exterior_color} onChange={e => setF('exterior_color', e.target.value)} /></Field>
                        <Field label="Interior Color"><Input value={form.interior_color} onChange={e => setF('interior_color', e.target.value)} /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-white/[0.02] p-4 border border-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="f-home" checked={form.show_on_home} onChange={e => setF('show_on_home', e.target.checked)} className="accent-[#D4AF37]" />
                          <label htmlFor="f-home" className="text-[10px] font-heading uppercase tracking-widest text-white/50 cursor-pointer">Show on Home</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="f-feat" checked={form.featured} onChange={e => setF('featured', e.target.checked)} className="accent-[#D4AF37]" />
                          <label htmlFor="f-feat" className="text-[10px] font-heading uppercase tracking-widest text-white/50 cursor-pointer">Mark Featured</label>
                        </div>
                      </div>
                      <Field label="Description"><textarea className="input-dark w-full px-3 py-2.5 text-sm font-body h-24" value={form.description} onChange={e => setF('description', e.target.value)} /></Field>
                      
                      <section>
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-heading mb-4">Features & Tech</p>
                        <div className="flex gap-2 mb-3">
                          <Input value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Add feature (e.g. Sunroof)..." onKeyDown={e => e.key === 'Enter' && addFeature()} />
                          <button type="button" onClick={addFeature} className="btn-gold px-4 py-2 uppercase text-[10px]">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {form.features.map((f, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 px-2 py-1 flex items-center gap-2 group">
                              <span className="text-white/60 text-[10px] uppercase">{f}</span>
                              <button type="button" onClick={() => removeFeature(i)} className="text-white/20 hover:text-red-400 transition-colors">{SAFE_ICON(X, { size: 10 })}</button>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </>
                )}
              </div>
            <div className="px-8 py-6 border-t border-white/[0.06] flex gap-4">
              <button type="button" onClick={closeModal} className="btn-outline flex-1 py-4 text-xs uppercase">Discard</button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-4 text-xs font-bold uppercase transition-all hover:tracking-widest">{saving ? 'Processing...' : 'Finalize Listing'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Security Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowSecurityModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#0A0A0A] border border-white/10 w-full max-w-md p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading text-xl font-semibold text-white">Security Settings</h2>
                <p className="text-white/35 text-xs font-body mt-1">Update your admin login credentials</p>
              </div>
              <button onClick={() => setShowSecurityModal(false)} className="text-white/20 hover:text-white transition-colors p-2">{SAFE_ICON(X, { size: 20 })}</button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-6">
              {securityError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body">{securityError}</div>}
              {securitySuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-body">Profile updated successfully!</div>}
              
              <Field label="Admin Email">
                <Input type="email" value={securityForm.email} onChange={(e) => setSecurityForm({...securityForm, email: e.target.value})} placeholder="admin@autonorth.ca" required />
              </Field>

              <div className="space-y-4 pt-4 border-t border-white/[0.05]">
                <p className="text-[10px] text-white/20 uppercase tracking-widest">Change Password (Optional)</p>
                <Field label="New Password">
                  <Input type="password" value={securityForm.password} onChange={(e) => setSecurityForm({...securityForm, password: e.target.value})} placeholder="••••••••" />
                </Field>
                <Field label="Confirm New Password">
                  <Input type="password" value={securityForm.confirm} onChange={(e) => setSecurityForm({...securityForm, confirm: e.target.value})} placeholder="••••••••" />
                </Field>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/[0.05]">
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-heading">AI & Provider Control</p>
                <Field label="AI Provider">
                  <Sel 
                    options={['local', 'gemini', 'claude', 'openrouter']} 
                    value={aiForm.ai_provider} 
                    onChange={(e) => setAiForm({...aiForm, ai_provider: e.target.value})} 
                  />
                </Field>
                {aiForm.ai_provider !== 'local' && (
                  <Field label={`${aiForm.ai_provider.toUpperCase()} API Key`}>
                    <Input 
                      type="password" 
                      value={aiForm.ai_api_key} 
                      onChange={(e) => setAiForm({...aiForm, ai_api_key: e.target.value})} 
                      placeholder="sk-..." 
                    />
                  </Field>
                )}
                <p className="text-[9px] text-white/15 font-body leading-relaxed italic">
                  * Local mode works without any API key by scanning your live inventory. Cloud modes (Claude/Gemini) provide more conversational depth.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSecurityModal(false)} className="flex-1 px-6 py-3 border border-white/10 text-white/40 text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={securitySaving} className="flex-2 btn-gold px-8 py-3 text-[10px] uppercase tracking-widest">
                  {securitySaving ? 'Saving...' : 'Save All Settings'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
