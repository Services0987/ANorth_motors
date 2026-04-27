import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Phone, Mail, Car, Calendar, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AdminLayout, { SafeLink } from '../components/AdminLayout';

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};
const API = '/api';

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
      const mapped = (data || []).map(l => ({ ...l, id: l.id || l._id }));
      setLeads(mapped);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id, status) => {
    if (!id) return;
    try {
      await axios.put(`${API}/leads/${id}`, { status }, { withCredentials: true });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
      if (selectedLead?.id === id) setSelectedLead((l) => ({ ...l, status }));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!id) return;
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
            >
              <p className={`font-heading text-2xl font-semibold mb-1 ${s.style.split(' ')[1]}`}>{statusCounts[s.key] || 0}</p>
              <p className="text-white/30 text-xs font-body">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            {SAFE_ICON(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-white/30" })}
            <input className="input-dark pl-9 pr-4 py-2.5 text-sm font-body w-full" placeholder="Search name, email, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="relative">
            <select className="input-dark px-3 py-2.5 text-sm font-body appearance-none pr-8" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {SAFE_ICON(ChevronDown, { size: 13, className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" })}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.location.href = `${API}/leads/export`}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#D4AF37]/40 text-[10px] font-heading uppercase tracking-widest transition-all"
            >
              Download CSV
            </button>
            <button 
              onClick={async () => {
                if (!window.confirm("Export your data first! Are you sure you want to PERMANENTLY clear all leads?")) return;
                try {
                  await axios.post(`${API}/leads/clear`, {}, { withCredentials: true });
                  fetchLeads();
                } catch { alert("Clear failed"); }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/5 border border-red-500/10 text-red-400/40 hover:bg-red-500 hover:text-white text-[10px] font-heading uppercase tracking-widest transition-all"
            >
              Clear All
            </button>
          </div>

          <span className="text-white/30 text-xs font-body ml-auto">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table + Detail Panel */}
        <div className="flex gap-6 min-h-0 overflow-hidden">
          <div className={`bg-[#0A0A0A] border border-white/[0.05] overflow-x-auto flex-1 min-w-0 ${selectedLead ? 'hidden md:block' : ''}`}>
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Name', 'Type', 'Contact', 'Vehicle Interest', 'Date', 'Status', 'Actions'].map((h) => (
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
                  >
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium">{lead.name}</p>
                      <p className="text-white/30 text-xs">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-body ${TYPE_COLORS[lead.lead_type] || 'text-white/40'}`}>{TYPE_LABELS[lead.lead_type] || lead.lead_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone ? (
                        <div className="flex items-center gap-2 text-white/80 font-body text-xs">
                          {SAFE_ICON(Phone, { size: 12, className: "text-[#D4AF37]" })}
                          {lead.phone}
                        </div>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[240px]">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className={`text-xs font-medium ${lead.vehicle_title !== 'General Inquiry' ? 'text-[#D4AF37]' : 'text-white/40'}`}>
                            {lead.vehicle_title || '—'}
                          </p>
                          {lead.vehicle_vin && lead.vehicle_vin !== '—' && (
                            <p className="text-white/20 text-[9px] uppercase tracking-wider mt-0.5">VIN: {lead.vehicle_vin}</p>
                          )}
                        </div>
                        {lead.vehicle_id && (
                          <SafeLink 
                            to={`/vehicle/${lead.vehicle_id}`}
                            className="p-1.5 bg-white/5 border border-white/10 text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all rounded-sm"
                            title="View Vehicle Page"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {SAFE_ICON(Car, { size: 12 })}
                          </SafeLink>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => { e.stopPropagation(); updateStatus(lead.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs px-2 py-1 cursor-pointer bg-transparent border-0 font-body ${STATUS_STYLES[lead.status] || STATUS_STYLES.new || ''}`}
                      >
                        {['new', 'contacted', 'qualified', 'closed'].map((s) => <option key={s} value={s} className="bg-[#0A0A0A] text-white">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(lead.id); }} className="text-white/20 hover:text-red-400 transition-colors">
                        {SAFE_ICON(Trash2, { size: 14 })}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lead Detail Panel */}
          {selectedLead && (
            <div className="w-full md:w-80 bg-[#0A0A0A] border border-white/[0.05] p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-sm font-medium text-white">Lead Details</h3>
                <button onClick={() => setSelectedLead(null)} className="text-white/30 hover:text-white">{SAFE_ICON(X, { size: 16 })}</button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-1">Contact</p>
                  <p className="font-heading text-white text-base font-medium">{selectedLead.name}</p>
                  <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] text-sm font-body mt-1 transition-colors">
                    {SAFE_ICON(Mail, { size: 13 })} {selectedLead.email}
                  </a>
                  {selectedLead.phone && (
                    <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] text-sm font-body mt-1 transition-colors">
                      {SAFE_ICON(Phone, { size: 13 })} {selectedLead.phone}
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
                      {SAFE_ICON(Car, { size: 14, className: "text-[#D4AF37] mt-0.5 flex-shrink-0" })}
                      {selectedLead.vehicle_title}
                    </div>
                  </div>
                )}

                {selectedLead.preferred_date && (
                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-2">Test Drive</p>
                    <div className="flex items-center gap-2 text-white/60 text-sm font-body">
                      {SAFE_ICON(Calendar, { size: 14, className: "text-[#D4AF37]" })}
                      {selectedLead.preferred_date} {selectedLead.preferred_time && `at ${selectedLead.preferred_time}`}
                    </div>
                  </div>
                )}

                {selectedLead.message && (
                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-heading mb-3">Conversation / Message</p>
                    <div className="bg-white/[0.02] border border-white/[0.05] p-3 text-[11px] font-body text-white/60 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {selectedLead.message}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <a href={`mailto:${selectedLead.email}`} className="flex-1 btn-outline py-2.5 text-xs text-center flex items-center justify-center gap-2">
                    {SAFE_ICON(Mail, { size: 13 })} Email
                  </a>
                  {selectedLead.phone && (
                    <a href={`tel:${selectedLead.phone}`} className="flex-1 btn-outline py-2.5 text-xs text-center flex items-center justify-center gap-2">
                      {SAFE_ICON(Phone, { size: 13 })} Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Overlay */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#050505] border border-white/10 p-8 max-w-sm w-full text-center">
            {SAFE_ICON(Trash2, { size: 28, className: "text-red-400 mx-auto mb-3" })}
            <h3 className="font-heading text-white text-base mb-2">Delete this lead?</h3>
            <p className="text-white/40 text-sm font-body mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white font-body transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
