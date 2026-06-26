import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, RotateCcw, Trash2, Clock, MapPin, Phone, User as UserIcon, UserPlus, UserMinus, Calendar, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import ImageZoomModal from './ImageZoomModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LeadPdfButtons from './LeadPdfButtons';
import LeadImageThumb from './LeadImageThumb';
import CopyText from './CopyText';
import LeadHistoryModal from './LeadHistoryModal';
import PendingApprovalActions from './PendingApprovalActions';
import RefreshButton from './RefreshButton';
import { matchesLeadSearch, isCancellableLead, getTaskTypeLabel, isRejectedLead, isComplaintLead, getLeadProducts, leadMatchesProductFilter, formatProductTypesDisplay } from '../utils/leadHelpers';
import { useLiveData } from '../hooks/useLiveData';

export type LeadCategoryKey = 'total' | 'new' | 'in-progress' | 'completed' | 'cancelled';

export const LEAD_CATEGORY_CONFIG: Record<LeadCategoryKey, { title: string; subtitle: string }> = {
  total: { title: 'Total Leads', subtitle: 'All time leads' },
  new: { title: 'New Leads', subtitle: 'Needs attention' },
  'in-progress': { title: 'In Progress', subtitle: 'Currently active' },
  completed: { title: 'Completed', subtitle: 'Successfully done' },
  cancelled: { title: 'Cancelled', subtitle: 'Total cancelled' },
};

const IN_PROGRESS_STATUSES = [
  'Assigned',
  'InProgress',
  'Reopened',
  'InspectionCompleted',
  'PickedForWorkshop',
  'PendingApproval',
  'Complaint',
];

const matchesLeadCategory = (lead: any, category: LeadCategoryKey) => {
  if (lead.status === 'Deleted') return false;
  switch (category) {
    case 'total':
      return true;
    case 'new':
      return lead.status === 'New';
    case 'in-progress':
      return IN_PROGRESS_STATUSES.includes(lead.status);
    case 'completed':
      return lead.status === 'Completed';
    case 'cancelled':
      return lead.status === 'Cancelled';
    default:
      return true;
  }
};

const getLeadStatusDisplay = (lead: any) => {
  const status = lead.status;
  if (status === 'New') return { label: 'NEW', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', row: 'bg-emerald-50/30' };
  if (status === 'PickedForWorkshop') return { label: 'WORKSHOP PICKUP', badge: 'bg-rose-100 text-rose-700 border-rose-200', row: 'bg-rose-50/40' };
  if (status === 'Complaint' || status === 'Reopened') return { label: 'COMPLAINT', badge: 'bg-sky-100 text-sky-700 border-sky-200', row: 'bg-sky-50/30' };
  if (status === 'Assigned' || status === 'InProgress') return { label: 'ASSIGNED', badge: 'bg-violet-100 text-violet-700 border-violet-200', row: 'bg-violet-50/25' };
  if (status === 'Cancelled') return { label: 'CANCELLED', badge: 'bg-orange-100 text-orange-700 border-orange-200', row: 'bg-orange-50/30' };
  if (status === 'Completed') return { label: 'COMPLETED', badge: 'bg-mint-100 text-mint-700 border-mint-200', row: 'bg-white' };
  if (status === 'PendingApproval') return { label: getTaskTypeLabel(lead).toUpperCase(), badge: 'bg-pink-100 text-pink-700 border-pink-200', row: 'bg-pink-50/25' };
  if (status === 'InspectionCompleted') return { label: 'INSPECTION', badge: 'bg-blue-100 text-blue-700 border-blue-200', row: 'bg-blue-50/25' };
  return { label: status.toUpperCase(), badge: 'bg-slate-100 text-slate-600 border-slate-200', row: 'bg-white' };
};

interface LeadsModuleProps {
  externalSearch?: string;
  categoryFilter?: LeadCategoryKey;
  hideSummary?: boolean;
  onCategorySelect?: (category: LeadCategoryKey) => void;
}

const LeadsModule: React.FC<LeadsModuleProps> = ({ externalSearch, categoryFilter, hideSummary, onCategorySelect }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(externalSearch || '');
  const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{ open: boolean; lead: any }>({ open: false, lead: null });
  const [assignForm, setAssignForm] = useState({ technician_id: '', visit_date: '' });
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [draftArea, setDraftArea] = useState('all');
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');
  const [draftStatus, setDraftStatus] = useState('all');
  const [draftTech, setDraftTech] = useState('all');
  const [draftProduct, setDraftProduct] = useState('all');
  const [appliedArea, setAppliedArea] = useState('all');
  const [appliedDateFrom, setAppliedDateFrom] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('all');
  const [appliedTech, setAppliedTech] = useState('all');
  const [appliedProduct, setAppliedProduct] = useState('all');

  const getPictures = (lead: any) => {
    if (!lead?.item_pictures) return [];
    if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
    try { return JSON.parse(lead.item_pictures); } catch { return []; }
  };

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const [res, techRes, areasRes] = await Promise.allSettled([
        api.get('/leads', { timeout: 45000 }),
        api.get('/users/technicians'),
        api.get('/areas'),
      ]);

      if (res.status === 'fulfilled') {
        setLeads(res.value.data.leads || res.value.data || []);
      } else if (!opts?.silent) {
        toast.error('Failed to load leads');
      }

      if (techRes.status === 'fulfilled') {
        setTechnicians(techRes.value.data.technicians || []);
      }
      if (areasRes.status === 'fulfilled') {
        setAreas(areasRes.value.data.areas || []);
      }
    } catch {
      if (!opts?.silent) toast.error('Failed to load leads');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['leads'], () => fetchData({ silent: true }), { pollIntervalMs: 45000 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (externalSearch !== undefined) setSearchTerm(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, appliedArea, appliedDateFrom, appliedDateTo, appliedStatus, appliedTech, appliedProduct, searchTerm]);

  const applyFilters = () => {
    setAppliedArea(draftArea);
    setAppliedDateFrom(draftDateFrom);
    setAppliedDateTo(draftDateTo);
    setAppliedStatus(draftStatus);
    setAppliedTech(draftTech);
    setAppliedProduct(draftProduct);
  };

  const isGlobalSearch = searchTerm.trim().length > 0;

  const productTypes = [...new Set(leads.flatMap((l) => getLeadProducts(l)))].sort();
  const areaNames = [...new Set([
    ...areas.map((a) => a.name),
    ...leads.map((l) => l.customer?.area).filter(Boolean),
  ])].sort() as string[];

  const categoryCounts = {
    total: leads.filter((l) => l.status !== 'Deleted').length,
    new: leads.filter((l) => l.status === 'New').length,
    'in-progress': leads.filter((l) => IN_PROGRESS_STATUSES.includes(l.status)).length,
    completed: leads.filter((l) => l.status === 'Completed').length,
    cancelled: leads.filter((l) => l.status === 'Cancelled').length,
  };

  const filteredLeads = leads.filter(lead => {
    if (categoryFilter && !matchesLeadCategory(lead, categoryFilter)) return false;
    if (!matchesLeadSearch(lead, searchTerm)) return false;
    if (isGlobalSearch) return true;
    if (appliedArea !== 'all' && lead.customer?.area !== appliedArea) return false;
    if (appliedDateFrom) {
      const from = new Date(appliedDateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(lead.created_at) < from) return false;
    }
    if (appliedDateTo) {
      const to = new Date(appliedDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(lead.created_at) > to) return false;
    }
    if (appliedStatus === 'rejected') return isRejectedLead(lead);
    if (appliedStatus === 'Complaint') return isComplaintLead(lead);
    if (appliedStatus === 'all') return lead.status !== 'Deleted';
    if (appliedStatus === 'Cancelled') return lead.status === 'Cancelled';
    if (lead.status !== appliedStatus) return false;
    if (appliedTech !== 'all' && String(lead.technician?.id) !== appliedTech) return false;
    if (!leadMatchesProductFilter(lead, appliedProduct)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / perPage));
  const paginatedLeads = useMemo(
    () => filteredLeads.slice((page - 1) * perPage, page * perPage),
    [filteredLeads, page, perPage]
  );

  const handleCancel = async (lead: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Cancel lead ${lead.lead_id}?`)) return;
    try {
      await api.patch(`/leads/${lead.id}/cancel`);
      toast.success('Lead cancelled');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleDelete = async (leadId: number, leadDisplayId: string, status: string) => {
    if (status !== 'New') {
      toast.error('Only unassigned (New) leads can be deleted');
      return;
    }
    if (window.confirm(`Delete lead ${leadDisplayId}? This moves it to the Bin.`)) {
      try {
        await api.delete(`/leads/${leadId}`);
        toast.success('Lead moved to Bin');
        fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.lead) return;
    try {
      await api.patch(`/leads/${assignModal.lead.id}/assign`, assignForm);
      toast.success('Lead assigned');
      setAssignModal({ open: false, lead: null });
      fetchData();
    } catch { toast.error('Failed to assign'); }
  };

  const handleUnassign = async (lead: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Unassign ${lead.lead_id}?`)) return;
    try {
      await api.patch(`/leads/${lead.id}/unassign`);
      toast.success('Lead unassigned');
      fetchData();
    } catch { toast.error('Failed to unassign'); }
  };

  const handleReopen = async (lead: any) => {
    const reason = prompt('Reason for reopening as complaint?');
    if (reason) {
      try {
        await api.patch(`/leads/${lead.id}/reopen`, { reason });
        toast.success('Job reopened as complaint!');
        fetchData();
      } catch { toast.error('Failed to reopen'); }
    }
  };

  if (loading && leads.length === 0) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-mint-400 border-t-transparent rounded-full animate-spin"></div></div>;

  const showingFrom = filteredLeads.length === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = Math.min(page * perPage, filteredLeads.length);

  return (
    <div className="space-y-5">
      {!hideSummary && (
        <>
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Service Leads</h2>
            <p className="text-slate-500 font-medium mt-1">Manage and track all customer service requests</p>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={draftArea}
                onChange={(e) => setDraftArea(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-mint-400 min-w-[130px]"
              >
                <option value="all">All Areas</option>
                {areaNames.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={draftDateFrom}
                onChange={(e) => setDraftDateFrom(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-mint-400"
              />
            </div>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={draftDateTo}
                onChange={(e) => setDraftDateTo(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-mint-400"
              />
            </div>
            <select
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:border-mint-400"
            >
              <option value="all">All Status</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="InProgress">In Progress</option>
              <option value="PendingApproval">Pending Approval</option>
              <option value="Complaint">Complaint</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="PickedForWorkshop">Workshop Pickup</option>
            </select>
            <select
              value={draftTech}
              onChange={(e) => setDraftTech(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:border-mint-400"
            >
              <option value="all">All Technicians</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              value={draftProduct}
              onChange={(e) => setDraftProduct(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:border-mint-400"
            >
              <option value="all">All Products</option>
              {productTypes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              type="button"
              onClick={applyFilters}
              className="px-5 py-2.5 rounded-xl bg-mint-500 hover:bg-mint-600 text-white text-sm font-bold shadow-md shadow-mint-500/20 transition-colors"
            >
              Apply Filters
            </button>
            <RefreshButton onClick={refresh} loading={refreshing} />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(Object.keys(LEAD_CATEGORY_CONFIG) as LeadCategoryKey[]).map((key) => {
              const config = LEAD_CATEGORY_CONFIG[key];
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileHover={{ y: -2 }}
                  onClick={() => onCategorySelect?.(key)}
                  className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-mint-300 hover:shadow-md transition-all"
                >
                  <p className="text-xs font-semibold text-slate-500">{config.title}</p>
                  <p className="text-3xl font-black text-mint-600 mt-1">{categoryCounts[key]}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{config.subtitle}</p>
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {/* Lead cards list */}
      <div className="space-y-3">
        {paginatedLeads.map((lead) => {
          const statusDisplay = getLeadStatusDisplay(lead);
          return (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`border border-slate-200/80 rounded-2xl p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center gap-4 cursor-pointer hover:shadow-md transition-all ${statusDisplay.row}`}
            >
              <LeadImageThumb
                src={getPictures(lead)[0]}
                className="w-20 h-20 lg:w-24 lg:h-24 shrink-0 rounded-xl"
                onZoom={(src) => setZoomImg(src)}
              />

              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <CopyText value={lead.lead_id} label="Lead ID" className="font-mono text-sm font-black text-slate-800" />
                  <p className="text-sm font-semibold text-slate-700 mt-1">{formatProductTypesDisplay(lead.product_type, lead)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    {new Date(lead.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <UserIcon size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{lead.customer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={12} className="shrink-0" />
                    <CopyText value={lead.customer?.phone} label="Phone" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={12} className="text-mint-500 shrink-0" />
                    <span className="truncate">{lead.customer?.area || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide border ${statusDisplay.badge}`}>
                    {statusDisplay.label}
                  </span>
                  {lead.is_warranty_claim && (
                    <span className="text-[9px] font-black text-amber-600">★ Warranty</span>
                  )}
                </div>

                <div>
                  {lead.technician ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-mint-500 flex items-center justify-center text-white text-xs font-black">
                        {lead.technician.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{lead.technician.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Unassigned</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 lg:ml-auto" onClick={(e) => e.stopPropagation()}>
                {lead.status === 'New' && (
                  <button
                    type="button"
                    onClick={() => setAssignModal({ open: true, lead })}
                    className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold"
                  >
                    Assign
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLead(lead)}
                  className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold"
                >
                  View
                </button>
                {(lead.status === 'Completed' || lead.status === 'InspectionCompleted') && (
                  <>
                    <LeadPdfButtons lead={lead} compact />
                    <button
                      type="button"
                      onClick={() => handleReopen(lead)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600"
                      title="Reopen"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </>
                )}
                {lead.status === 'Assigned' && (
                  <button type="button" onClick={(e) => handleUnassign(lead, e)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600">
                    <UserMinus size={14} />
                  </button>
                )}
                {isCancellableLead(lead) && (
                  <button type="button" onClick={(e) => handleCancel(lead, e)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                )}
                {lead.status === 'New' && (
                  <button type="button" onClick={() => handleDelete(lead.id, lead.lead_id, lead.status)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredLeads.length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-300 rounded-2xl">
            <ClipboardList size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-medium">No leads found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredLeads.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-sm text-slate-500">
            Showing {showingFrom} to {showingTo} of {filteredLeads.length} leads
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-mint-500 text-white text-sm font-bold">
              {page}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 outline-none focus:border-mint-400"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      )}

      {/* Selected Lead Modal */}
      {selectedLead && (
        <LeadHistoryModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          extraActions={selectedLead.status === 'PendingApproval' && (
            <PendingApprovalActions
              lead={selectedLead}
              showView={false}
              layout="stack"
              onDone={() => {
                setSelectedLead(null);
                fetchData();
              }}
            />
          )}
        />
      )}

      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md">
          <form onSubmit={handleAssign} className="crm-modal border rounded-3xl p-8 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black text-white">Assign {assignModal.lead?.lead_id}</h3>
            <select required value={assignForm.technician_id} onChange={e => setAssignForm({ ...assignForm, technician_id: e.target.value })}
              className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70">
              <option value="">Select Technician</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="date" value={assignForm.visit_date} onChange={e => setAssignForm({ ...assignForm, visit_date: e.target.value })}
              className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setAssignModal({ open: false, lead: null })} className="flex-1 py-3 bg-slate-50 rounded-xl text-slate-800 font-bold">Cancel</button>
              <button type="submit" className="flex-1 py-3 bg-indigo-500 rounded-xl text-slate-800 font-bold">Assign</button>
            </div>
          </form>
        </div>
      )}
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
    </div>
  );
};

export default LeadsModule;
