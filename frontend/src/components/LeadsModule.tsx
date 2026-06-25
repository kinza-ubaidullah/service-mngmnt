import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, RotateCcw, Trash2, Clock, MapPin, Phone, User as UserIcon, X, UserPlus, UserMinus, Image, Filter, Calendar } from 'lucide-react';
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
import { matchesLeadSearch, isCancellableLead, getTaskTypeLabel, isRejectedLead, isComplaintLead, getLeadProducts, leadMatchesProductFilter, isActiveOperationalLeadStatus, formatProductTypesDisplay } from '../utils/leadHelpers';
import { useLiveData } from '../hooks/useLiveData';

interface LeadsModuleProps {
  externalSearch?: string;
}

const LeadsModule: React.FC<LeadsModuleProps> = ({ externalSearch }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(externalSearch || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{ open: boolean; lead: any }>({ open: false, lead: null });
  const [assignForm, setAssignForm] = useState({ technician_id: '', visit_date: '' });
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const getPictures = (lead: any) => {
    if (!lead?.item_pictures) return [];
    if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
    try { return JSON.parse(lead.item_pictures); } catch { return []; }
  };

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const [res, techRes, areasRes] = await Promise.all([
        api.get('/leads'),
        api.get('/users/technicians').catch(() => ({ data: { technicians: [] } })),
        api.get('/areas').catch(() => ({ data: { areas: [] } })),
      ]);
      setLeads(res.data.leads || res.data);
      setTechnicians(techRes.data.technicians || []);
      setAreas(areasRes.data.areas || []);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['leads'], () => fetchData({ silent: true }));

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (externalSearch !== undefined) setSearchTerm(externalSearch);
  }, [externalSearch]);

  const isGlobalSearch = searchTerm.trim().length > 0;

  const productTypes = [...new Set(leads.flatMap((l) => getLeadProducts(l)))].sort();
  const areaNames = [...new Set([
    ...areas.map((a) => a.name),
    ...leads.map((l) => l.customer?.area).filter(Boolean),
  ])].sort() as string[];

  const filteredLeads = leads.filter(lead => {
    if (!matchesLeadSearch(lead, searchTerm)) return false;
    if (isGlobalSearch) return true;
    if (activeOnly && !isActiveOperationalLeadStatus(lead.status)) return false;
    if (warrantyOnly && !lead.is_warranty_claim) return false;
    if (areaFilter !== 'all' && lead.customer?.area !== areaFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(lead.created_at) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(lead.created_at) > to) return false;
    }
    if (statusFilter === 'rejected') return isRejectedLead(lead);
    if (statusFilter === 'Complaint') return isComplaintLead(lead);
    if (statusFilter === 'all') return lead.status !== 'Deleted';
    if (statusFilter === 'Cancelled') return lead.status === 'Cancelled';
    if (lead.status !== statusFilter) return false;
    if (techFilter !== 'all' && String(lead.technician?.id) !== techFilter) return false;
    if (!leadMatchesProductFilter(lead, productFilter)) return false;
    return true;
  });

  const clearAdvancedFilters = () => {
    setAreaFilter('all');
    setDateFrom('');
    setDateTo('');
    setActiveOnly(false);
    setWarrantyOnly(false);
    setProductFilter('all');
    setTechFilter('all');
    setStatusFilter('all');
  };

  const hasAdvancedFilters = areaFilter !== 'all' || dateFrom || dateTo || activeOnly || warrantyOnly;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Service Leads</h2>
          <p className="text-slate-500 font-medium">Manage and track all customer service requests</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <RefreshButton onClick={refresh} loading={refreshing} />
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search all leads (any section)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full crm-card border border-slate-200/60 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-mint-400/50 transition-all"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="crm-card border border-slate-200/60 rounded-xl py-2 px-4 text-sm text-slate-800 outline-none focus:border-mint-400/50 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="New">New</option>
            <option value="Assigned">Assigned</option>
            <option value="InProgress">In Progress</option>
            <option value="PendingApproval">Pending Approval</option>
            <option value="rejected">Rejected</option>
            <option value="Complaint">Complaint</option>
            <option value="Completed">Completed</option>
            <option value="InspectionCompleted">Inspection Done</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Reopened">Reopened</option>
            <option value="PickedForWorkshop">Workshop Pickup</option>
          </select>
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="crm-card border border-slate-200/60 rounded-xl py-2 px-4 text-sm text-slate-800 outline-none focus:border-mint-400/50 appearance-none"
          >
            <option value="all">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="crm-card border border-slate-200/60 rounded-xl py-2 px-4 text-sm text-slate-800 outline-none focus:border-mint-400/50 appearance-none"
          >
            <option value="all">All Products</option>
            {productTypes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="crm-card border border-slate-200/60 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-600">Advanced Filters</span>
          {hasAdvancedFilters && (
            <button type="button" onClick={clearAdvancedFilters} className="text-[10px] font-bold text-rose-600 hover:underline ml-auto">
              Clear filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Area</label>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
              className="crm-card border border-slate-200/60 rounded-xl py-2 px-3 text-sm text-slate-800 min-w-[140px]">
              <option value="all">All Areas</option>
              {areaNames.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar size={10} /> From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="crm-card border border-slate-200/60 rounded-xl py-2 px-3 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="crm-card border border-slate-200/60 rounded-xl py-2 px-3 text-sm text-slate-800" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer pb-2">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="rounded border-slate-300" />
            Active only
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer pb-2">
            <input type="checkbox" checked={warrantyOnly} onChange={(e) => setWarrantyOnly(e.target.checked)} className="rounded border-slate-300" />
            Warranty claims
          </label>
        </div>
        <p className="text-[11px] text-slate-500">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} match current filters</p>
      </div>

      <div className="crm-card border rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200/60 bg-slate-50/80">
                <th className="px-8 py-5">Photo</th>
                <th className="px-8 py-5">Lead Detail</th>
                <th className="px-8 py-5">Customer info</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Assigned To</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="group hover:bg-slate-50/80 transition-colors cursor-pointer">
                  <td className="px-8 py-6">
                    <LeadImageThumb
                      src={getPictures(lead)[0]}
                      onZoom={(src) => setZoomImg(src)}
                    />
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <CopyText value={lead.lead_id} label="Lead ID" className="font-mono text-sm font-black text-mint-600" />
                      <span className="text-xs text-slate-500 mt-1 font-medium">{formatProductTypesDisplay(lead.product_type, lead)}</span>
                      <div className="flex items-center gap-2 mt-2">
                         <Clock size={12} className="text-slate-500" />
                         <span className="text-[10px] text-slate-500 font-bold">{new Date(lead.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <UserIcon size={14} className="text-slate-500" /> {lead.customer.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <Phone size={12} />
                        <CopyText value={lead.customer.phone} label="Phone" />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <MapPin size={12} className="text-indigo-500/50" /> {lead.customer.area || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2">
                       <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black tracking-wider border w-max
                        ${lead.status === 'New' ? 'bg-mint-100 text-mint-600 border-mint-300/40' : 
                          lead.status === 'Assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          lead.status === 'PendingApproval' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 
                          lead.status === 'Completed' ? 'bg-mint-100 text-mint-600 border-mint-300/40' :
                          lead.status === 'Reopened' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-slate-100 text-slate-700 border-slate-200'}
                      `}>
                        {lead.status === 'PendingApproval' ? getTaskTypeLabel(lead).toUpperCase() : lead.status.toUpperCase()}
                      </span>
                      {lead.is_warranty_claim && (
                        <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1">
                          ★ Warranty Claim
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {lead.technician ? (
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-mint-100 border border-mint-300/40 flex items-center justify-center text-mint-600 text-xs font-black">
                            {lead.technician.name.charAt(0)}
                         </div>
                         <span className="text-xs font-bold text-slate-700">{lead.technician.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-600 font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(lead.status === 'New' || lead.status === 'Assigned') && (
                        <button onClick={(e) => { e.stopPropagation(); setAssignModal({ open: true, lead }); }}
                          className="p-2 bg-slate-50 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-xl border border-slate-200/60" title="Assign">
                          <UserPlus size={16} />
                        </button>
                      )}
                      {lead.status === 'Assigned' && (
                        <button onClick={(e) => handleUnassign(lead, e)}
                          className="p-2 bg-slate-50 hover:bg-amber-500/20 text-slate-400 hover:text-amber-600 rounded-xl border border-slate-200/60" title="Unassign">
                          <UserMinus size={16} />
                        </button>
                      )}
                      {isCancellableLead(lead) && (
                        <button onClick={(e) => handleCancel(lead, e)}
                          className="p-2 bg-slate-50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-200/60" title="Cancel lead">
                          <Trash2 size={16} />
                        </button>
                      )}
                      {lead.status === 'PendingApproval' && (
                        <div onClick={(e) => e.stopPropagation()} className="flex gap-1">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-2 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200/60 font-bold text-xs"
                            title="View details"
                          >
                            View
                          </button>
                        </div>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <LeadPdfButtons lead={lead} compact />
                      </div>
                      {(lead.status === 'Completed' || lead.status === 'InspectionCompleted') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleReopen(lead); }}
                          className="p-2 bg-slate-50 hover:bg-amber-500/20 text-slate-400 hover:text-amber-600 rounded-xl transition-all border border-slate-200/60 hover:border-amber-500/20"
                          title="Reopen as Complaint"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      {lead.status === 'New' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(lead.id, lead.lead_id, lead.status); }}
                          className="p-2 bg-slate-50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-slate-200/60 hover:border-red-500/20"
                          title="Delete Lead"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-medium italic">
                    No leads found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
