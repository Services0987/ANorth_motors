import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Phone, Mail, Car, Calendar, ChevronDown, Search } from 'lucide-react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const STATUS_STYLES = {
  new: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  contacted: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  qualified: 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30',
  closed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

const TYPE_COLORS = {
  contact: 'text-blue-400',
  test_drive: 'text-emerald-400',
  financing: 'text-[#D4AF37]',
  trade_in: 'text-purple-400',
  exit_intent: 'text-white/40',
};

const TYPE_LABELS = {
  contact: 'Contact',
  test_drive: 'Test Drive',
  financing: 'Financing',
  trade_in: 'Trade-In',
  exit_intent: 'Exit Intent',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/leads`, { withCredentials: true });
      setLeads(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API}/leads/${id}`, { status }, { withCredentials: true });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
      if (selectedLead?.id === id) setSelectedLead((l) => ({ ...l, status }));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/leads/${id}`, { withCredentials: true });
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
      setDeleteConfirm(null);
    } catch (err) { console.error(err); }
  };

  const filtered = leads.filter((l) => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchType = typeFilter === 'all' || l.lead_type === typeFilter;
    const matchSearch = !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()) || l.vehicle_title?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const statusCounts = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});

  return (
    <AdminLayout title="Lead Management">
      <div className="space-y-6" data-testid="admin-leads">
        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'new', label: 'New', style: STATUS_STYLES.new },
            { key: 'contacted', label: 'Contacted', style: STATUS_STYLES.contacted },
            { key: 'qualified', label: 'Qualified', style: STATUS_STYLES.qualified },
            { key: 'closed', label: 'Closed', style: STATUS_STYLES.closed },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
              className={`bg-[#0A0A0A] border border-white/[0.05] p-4 text-left transition-all hover:border-white/10 ${statusFilter === s.key ? 'ring-1 ring-white/20' : ''}`}
              data-testid={`status-filter-${s.key}`}
            >
              <p className={`font-heading text-2xl font-semibold mb-1 ${s.style.split(' ')[1]}`}>{statusCounts[s.key] || 0}</p>
              <p className="text-white/30 text-xs font-body">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-full" placeholder="Search name, email, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="leads-search" />
          </div>
          <div className="relative">
            <select className="input-dark px-3 py-2.5 text-sm font-body appearance-none pr-8" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-testid="leads-type-filter">
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          </div>
          <span className="text-white/30 text-xs font-body ml-auto">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table + Detail Panel */}
        <div className="flex gap-6">
          <div className={`bg-[#0A0A0A] border border-white/[0.05] overflow-x-auto flex-1 ${selectedLead ? 'hidden md:block' : ''}`}>
            <table className="w-full text-sm font-body" data-testid="leads-table">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Name', 'Type', 'Vehicle Interest', 'Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-heading tracking-[0.15em] uppercase text-white/30 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-white/[0.03] animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-white/30">No leads found.</td></tr>
                ) : filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                    className={`border-b border-white/[0.03] cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'bg-white/[0.03]' : 'hover:bg-white/[0.01]'}`}
                    data-testid={`lead-row-${lead.id}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium">{lead.name}</p>
                      <p className="text-white/30 text-xs">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-body ${TYPE_COLORS[lead.lead_type] || 'text-white/40'}`}>{TYPE_LABELS[lead.lead_type] || lead.lead_type}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-white/50 text-xs truncate">{lead.vehicle_title || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => { e.stopPropagation(); updateStatus(lead.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs px-2 py-1 cursor-pointer bg-transparent border-0 font-body ${STATUS_STYLES[lead.status] || STATUS_STYLES.new}`}
                        data-testid={`lead-status-${lead.id}`}
                      >
                        {['new', 'contacted', 'qualified', 'closed'].map((s) => <option key={s} value={s} className="bg-[#0A0A0A] text-white">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(lead.id); }} className="text-white/20 hover:text-red-400 transition-colors" data-testid={`lead-delete-${lead.id}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lead Detail Panel */}
          <AnimatePresence>
            {selectedLead && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full md:w-80 bg-[#0A0A0A] border border-white/[0.05] p-6 flex-shrink-0"
                data-testid="lead-detail-panel"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-sm font-medium text-white">Lead Details</h3>
                  <button onClick={() => setSelectedLead(null)} className="text-white/30 hover:text-white"><X size={16} /></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-1">Contact</p>
                    <p className="font-heading text-white text-base font-medium">{selectedLead.name}</p>
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] text-sm font-body mt-1 transition-colors">
                      <Mail size={13} /> {selectedLead.email}
                    </a>
                    {selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] text-sm font-body mt-1 transition-colors">
                        <Phone size={13} /> {selectedLead.phone}
                      </a>
                    )}
                  </div>

                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-3">Lead Info</p>
                    {[
                      { label: 'Type', value: TYPE_LABELS[selectedLead.lead_type] || selectedLead.lead_type },
                      { label: 'Date', value: formatDate(selectedLead.created_at) },
                      { label: 'Preferred Contact', value: selectedLead.preferred_contact },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-1.5">
                        <span className="text-white/30 text-xs font-body">{label}</span>
                        <span className="text-white text-xs font-body capitalize">{value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedLead.vehicle_title && (
                    <div className="border-t border-white/[0.05] pt-4">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-2">Vehicle Interest</p>
                      <div className="flex items-start gap-2 text-white/60 text-sm font-body">
                        <Car size={14} className="text-[#D4AF37] mt-0.5 flex-shrink-0" />
                        {selectedLead.vehicle_title}
                      </div>
                    </div>
                  )}

                  {selectedLead.preferred_date && (
                    <div className="border-t border-white/[0.05] pt-4">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-2">Test Drive</p>
                      <div className="flex items-center gap-2 text-white/60 text-sm font-body">
                        <Calendar size={14} className="text-[#D4AF37]" />
                        {selectedLead.preferred_date} {selectedLead.preferred_time && `at ${selectedLead.preferred_time}`}
                      </div>
                    </div>
                  )}

                  {selectedLead.down_payment && (
                    <div className="border-t border-white/[0.05] pt-4">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-2">Financing</p>
                      <p className="text-white/60 text-sm font-body">Down Payment: ${selectedLead.down_payment.toLocaleString()}</p>
                    </div>
                  )}

                  {selectedLead.message && (
                    <div className="border-t border-white/[0.05] pt-4">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-2">Message</p>
                      <p className="text-white/50 text-sm font-body leading-relaxed">{selectedLead.message}</p>
                    </div>
                  )}

                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-3">Update Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['new', 'contacted', 'qualified', 'closed'].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(selectedLead.id, s)}
                          className={`py-2 text-xs font-body capitalize transition-all border ${selectedLead.status === s ? STATUS_STYLES[s] : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/60'}`}
                          data-testid={`update-status-${s}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <a href={`mailto:${selectedLead.email}`} className="flex-1 btn-outline py-2.5 text-xs text-center flex items-center justify-center gap-2">
                      <Mail size={13} /> Email
                    </a>
                    {selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} className="flex-1 btn-outline py-2.5 text-xs text-center flex items-center justify-center gap-2">
                        <Phone size={13} /> Call
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-8 max-w-sm w-full text-center">
              <Trash2 size={28} className="text-red-400 mx-auto mb-3" />
              <h3 className="font-heading text-white text-base mb-2">Delete this lead?</h3>
              <p className="text-white/40 text-sm font-body mb-6">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white font-body transition-colors" data-testid="lead-delete-confirm">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
