import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Clock, CheckCircle2, Truck, AlertCircle, RefreshCw, Trash2, CheckCircle, Info, Package, Plus, Camera, Download, Video, Eye, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import LeadPdfButtons from './LeadPdfButtons';
import LeadImageThumb from './LeadImageThumb';
import CopyText from './CopyText';
import api from '../services/api';
import toast from 'react-hot-toast';
import RefreshButton from './RefreshButton';
import { useLiveData } from '../hooks/useLiveData';
import { formatPKR, getLeadPictures } from '../utils/leadHelpers';
import { compressImageFile } from '../utils/compressImage';
import {
  WORKSHOP_STATUS_FILTERS,
  TECHNICIAN_WORKSHOP_FILTERS,
  WORKSHOP_NEXT_STATUSES,
  getWorkshopStatusLabel,
} from '../utils/workshopConstants';

interface WorkshopModuleProps {
  showGateInApproval?: boolean;
  /** full = workshop manager/admin, technician = deliver-only on Ready jobs */
  mode?: 'full' | 'technician';
}

const btnColor: Record<string, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm',
  rose: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-sm',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
  purple: 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600 shadow-sm',
  amber: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm',
  slate: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm',
};

const WorkshopModule: React.FC<WorkshopModuleProps> = ({ showGateInApproval = true, mode = 'full' }) => {
  const isTechnicianMode = mode === 'technician';
  const user = useSelector((state: RootState) => state.auth.user);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [deliveryTech, setDeliveryTech] = useState<Record<number, string>>({});
  const [partsDraft, setPartsDraft] = useState<Record<number, string>>({});
  const [savingParts, setSavingParts] = useState<number | null>(null);
  const [uploadingPartsMedia, setUploadingPartsMedia] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ jobId: number; leadId: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const rejectGateIn = async () => {
    if (!rejectModal) return;
    setRejecting(true);
    try {
      await api.delete(`/workshop/jobs/${rejectModal.jobId}`, {
        data: { notes: rejectNote.trim() || undefined },
      });
      toast.success('Pickup rejected — returned to technician with note');
      setRejectModal(null);
      setRejectNote('');
      fetchWorkshopJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject pickup');
    } finally {
      setRejecting(false);
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadPartsMedia = async (jobId: number, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingPartsMedia(jobId);
    try {
      const items: { type: 'image' | 'video'; src: string; caption?: string }[] = [];
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/');
        if (isVideo && file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 15 MB for video)`);
          continue;
        }
        if (isVideo) {
          items.push({ type: 'video', src: await readFileAsDataUrl(file), caption: file.name });
        } else {
          items.push({ type: 'image', src: await compressImageFile(file, 1200, 0.8), caption: file.name });
        }
      }
      if (items.length === 0) return;
      await api.patch(`/workshop/jobs/${jobId}/parts-media`, { items });
      toast.success(`${items.length} file(s) uploaded`);
      fetchWorkshopJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload parts media');
    } finally {
      setUploadingPartsMedia(null);
    }
  };

  const downloadMedia = (src: string, filename: string) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fetchWorkshopJobs = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const filterDef = isTechnicianMode
        ? TECHNICIAN_WORKSHOP_FILTERS.find((f) => f.id === statusFilter)
        : null;
      const scope = filterDef && 'scope' in filterDef ? filterDef.scope : undefined;
      const statusParam = statusFilter === 'all' || statusFilter === 'delivery' ? '' : `status=${statusFilter}`;
      const scopeParam = scope ? `scope=${scope}` : '';
      const qs = [statusParam, scopeParam].filter(Boolean).join('&');
      const [jobsRes, techRes] = await Promise.allSettled([
        api.get(`/workshop/jobs${qs ? `?${qs}` : ''}`, { timeout: 45000 }),
        isTechnicianMode ? Promise.resolve({ data: { technicians: [] } }) : api.get('/users/technicians'),
      ]);
      if (jobsRes.status === 'fulfilled') {
        setJobs(jobsRes.value.data.jobs || []);
      } else if (!opts?.silent) {
        console.error('Workshop jobs failed:', jobsRes.reason);
        toast.error(jobsRes.reason?.response?.data?.message || 'Failed to load workshop jobs');
        setJobs([]);
      }
      if (techRes.status === 'fulfilled') {
        setTechnicians(techRes.value.data.technicians || []);
      }
    } catch (err) {
      console.error('Workshop load error:', err);
      if (!opts?.silent) toast.error('Failed to load workshop jobs');
      setJobs([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['workshop', 'leads'], () => fetchWorkshopJobs({ silent: true }));

  useEffect(() => {
    fetchWorkshopJobs();
  }, [statusFilter]);

  const updateStatus = async (id: number, newStatus: string, notes?: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/workshop/jobs/${id}/status`, { status: newStatus, notes });
      toast.success(`Status updated: ${getWorkshopStatusLabel(newStatus)}`);
      fetchWorkshopJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveAdditionalParts = async (jobId: number) => {
    const text = partsDraft[jobId]?.trim();
    if (!text) return toast.error('Enter parts description');
    setSavingParts(jobId);
    try {
      await api.patch(`/workshop/jobs/${jobId}/parts`, { additional_parts: text });
      toast.success('Additional parts saved for billing');
      setPartsDraft((prev) => ({ ...prev, [jobId]: '' }));
      fetchWorkshopJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save parts');
    } finally {
      setSavingParts(null);
    }
  };

  const statusColors: Record<string, string> = {
    WaitingForApproval: 'bg-amber-500/20 text-amber-600 border-amber-500/20',
    Received: 'bg-indigo-500/20 text-mint-600 border-mint-300/40',
    WorkStarted: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    WaitingForParts: 'bg-rose-500/20 text-rose-400 border-rose-500/20',
    Ready: 'bg-emerald-500/20 text-mint-600 border-mint-300/40',
    Delivered: 'bg-purple-500/20 text-purple-400 border-purple-500/20',
  };

  const getDayCount = (receivedDate: string) => {
    const diff = new Date().getTime() - new Date(receivedDate).getTime();
    return Math.floor(diff / (1000 * 3600 * 24)) + 1;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <RefreshCw className="animate-spin text-mint-500" size={36} />
        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Workshop Data...</span>
      </div>
    );
  }

  const pendingJobs = jobs.filter((j) => j.status === 'WaitingForApproval');
  const activeJobs = jobs.filter((j) => j.status !== 'WaitingForApproval' && j.status !== 'Delivered');
  const readyJobs = jobs.filter((j) => j.status === 'Ready');
  const deliveredJobs = jobs.filter((j) => j.status === 'Delivered');

  const assignDelivery = async (jobId: number) => {
    const techId = deliveryTech[jobId];
    if (!techId) return toast.error('Select a delivery technician first');
    try {
      await api.patch(`/workshop/jobs/${jobId}/assign-delivery`, { technician_id: techId });
      toast.success('Delivery technician assigned');
      fetchWorkshopJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign delivery');
    }
  };

  const renderStatusActions = (job: any, isExpanded: boolean) => {
    const isMyDelivery = isTechnicianMode && job.delivery_assigned_to === user?.id && job.status === 'Ready';
    const canMarkDelivered =
      isTechnicianMode &&
      job.status === 'Ready' &&
      (isMyDelivery || job.received_by === user?.id || job.lead?.assigned_to === user?.id);

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedJobId(isExpanded ? null : job.id);
    };

    if (isTechnicianMode) {
      return (
        <div className="flex flex-wrap items-center gap-2 justify-end min-w-[140px]">
          {canMarkDelivered && (
            <button
              type="button"
              disabled={updatingId === job.id}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Mark ${job.lead.lead_id} as delivered to customer?`)) {
                  updateStatus(job.id, 'Delivered');
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${btnColor.purple}`}
            >
              <Truck size={15} /> Deliver
            </button>
          )}
          {job.lead?.customer?.phone && (
            <a
              href={`tel:${job.lead.customer.phone.replace(/[^0-9+]/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${btnColor.blue}`}
            >
              <Phone size={15} /> Call
            </a>
          )}
          <button
            type="button"
            onClick={toggleExpand}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${btnColor.slate}`}
          >
            {isExpanded ? <ChevronUp size={15} /> : <Eye size={15} />}
            {isExpanded ? 'Hide' : 'Details'}
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <LeadPdfButtons lead={job.lead} compact />
          </div>
        </div>
      );
    }

    const actions = WORKSHOP_NEXT_STATUSES[job.status] || [];
    return (
      <div className="flex flex-wrap items-center gap-2 justify-end min-w-[160px]">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            disabled={updatingId === job.id}
            onClick={() => {
              if (action.value === 'Delivered') {
                if (!window.confirm(`Confirm delivery of ${job.lead.lead_id} to customer?`)) return;
              }
              updateStatus(job.id, action.value);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${btnColor[action.color]}`}
          >
            {action.value === 'Delivered' && <Truck size={12} />}
            {action.value === 'Ready' && <CheckCircle2 size={12} />}
            {action.value === 'WorkStarted' && <Wrench size={12} />}
            {action.value === 'WaitingForParts' && <Package size={12} />}
            {action.label}
          </button>
        ))}

        {job.status === 'Ready' && (
          <div className="flex items-center gap-1 border-l border-slate-200/70 pl-2 ml-1">
            <select
              value={deliveryTech[job.id] || ''}
              onChange={(e) => setDeliveryTech({ ...deliveryTech, [job.id]: e.target.value })}
              className="crm-input text-slate-800 text-[10px] px-2 py-1.5 rounded-lg border border-slate-200/70 max-w-[130px]"
            >
              <option value="">Assign delivery tech...</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => assignDelivery(job.id)}
              className="text-[10px] crm-btn-primary px-2.5 py-1.5 rounded-lg font-bold"
            >
              Assign
            </button>
          </div>
        )}

        {!['WaitingForApproval', 'Delivered'].includes(job.status) && (
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              updateStatus(job.id, e.target.value);
              e.target.value = '';
            }}
            className="bg-white text-slate-400 text-[10px] px-2 py-1.5 rounded-lg border border-slate-200/70"
          >
            <option value="">Change status...</option>
            {Object.entries({
              Received: 'Received in Workshop',
              WorkStarted: 'Repair in Progress',
              WaitingForParts: 'Waiting for Parts',
              Ready: 'Ready to Deliver',
              Delivered: 'Delivered',
            })
              .filter(([val]) => val !== job.status)
              .map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
          </select>
        )}

        <button
          type="button"
          onClick={async () => {
            if (!window.confirm('Remove from workshop and return to technician?')) return;
            try {
              await api.delete(`/workshop/jobs/${job.id}`);
              toast.success('Returned to technician');
              fetchWorkshopJobs();
            } catch {
              toast.error('Failed to remove');
            }
          }}
          className="px-2.5 py-2 rounded-xl text-[10px] font-bold border bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 flex items-center gap-1"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    );
  };

  const filterOptions = isTechnicianMode ? TECHNICIAN_WORKSHOP_FILTERS : WORKSHOP_STATUS_FILTERS;
  const visibleJobs = isTechnicianMode
    ? jobs
    : activeJobs.concat(statusFilter === 'Delivered' ? deliveredJobs : []);

  return (
    <div className="space-y-6">
      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((f) => {
          const count =
            f.id === 'all' ? jobs.length
            : f.id === 'delivery' ? jobs.filter((j) => j.delivery_assigned_to === user?.id && j.status === 'Ready').length
            : f.id === 'Ready' ? readyJobs.length
            : f.id === 'Delivered' ? deliveredJobs.length
            : jobs.filter((j) => j.status === f.id).length;
          const isDeliveryFilter = f.id === 'delivery';
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? isDeliveryFilter
                    ? 'crm-tab-active border-violet-400'
                    : f.id === 'Ready'
                    ? 'crm-tab-active border-emerald-400'
                    : f.id === 'Delivered'
                    ? 'bg-purple-500 text-white border-purple-400'
                    : 'crm-tab-active border-indigo-500'
                  : isDeliveryFilter
                  ? 'bg-violet-500/10 text-violet-300 border-violet-500/30 hover:border-violet-400/50'
                  : 'bg-slate-50 text-slate-400 border-slate-200/70 hover:border-mint-300/50'
              }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${statusFilter === f.id ? 'bg-white/20' : 'bg-slate-50'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats — hide detailed stats for technician */}
      {!isTechnicianMode && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Approval', value: pendingJobs.length, icon: AlertCircle, color: 'text-amber-600 bg-amber-500/10' },
          { label: 'Active Repairs', value: activeJobs.filter((j) => j.status === 'WorkStarted').length, icon: Clock, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Ready to Deliver', value: readyJobs.length, icon: CheckCircle2, color: 'text-mint-600 bg-mint-100' },
          { label: 'Delivered', value: deliveredJobs.length, icon: Truck, color: 'text-purple-400 bg-purple-500/10' },
        ].map((stat, idx) => (
          <div key={idx} className="crm-card border p-6 rounded-[2rem]">
            <div className={`p-3 rounded-2xl w-fit ${stat.color}`}><stat.icon size={24} /></div>
            <h3 className="text-3xl font-black text-slate-800 mt-4">{stat.value}</h3>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Gate-in approval */}
      {showGateInApproval && !isTechnicianMode && pendingJobs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="crm-card border border-amber-500/20 rounded-[2.5rem] p-8">
          <h2 className="text-lg font-black text-amber-600 flex items-center gap-2 mb-6">
            <AlertCircle size={20} /> Pending Gate-In Approval ({pendingJobs.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {pendingJobs.map((job) => (
              <div key={job.id} className="bg-white/95 border border-slate-200/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <span className="text-xs font-mono font-bold text-amber-600">{job.lead.lead_id}</span>
                  <h4 className="font-bold text-slate-800">{job.lead.customer.name}</h4>
                  <p className="text-xs text-slate-400">{job.lead.problem_details}</p>
                  {job.agreed_parts && (
                    <p className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      <span className="font-bold">Agreed Parts:</span> {job.agreed_parts}
                    </p>
                  )}
                  <LeadPdfButtons lead={job} compact />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => updateStatus(job.id, 'Received')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-2.5 px-5 rounded-xl flex items-center gap-1.5">
                    <CheckCircle size={15} /> Approve Gate-In
                  </button>
                  <button type="button" onClick={() => {
                    setRejectModal({ jobId: job.id, leadId: job.lead.lead_id });
                    setRejectNote('');
                  }} className="px-4 py-2.5 bg-red-500/10 text-red-600 rounded-xl border border-red-500/20 text-xs font-bold">
                    Reject Pickup
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Active board */}
      <div className="crm-card border rounded-[2.5rem] p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-mint-600" />
            {isTechnicianMode ? 'My Workshop Jobs' : 'Workshop Inventory'}
          </h2>
          <RefreshButton onClick={refresh} loading={refreshing} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/70 text-xs uppercase tracking-widest text-slate-500">
                <th className="pb-4 font-bold">Job ID</th>
                <th className="pb-4 font-bold">Appliance & Customer</th>
                <th className="pb-4 font-bold text-center hidden sm:table-cell">Age</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {visibleJobs.map((job) => {
                const days = getDayCount(job.received_date);
                const isExpanded = expandedJobId === job.id;
                const agreed = job.agreed_parts || job.lead.repair_details || '';
                const isDeliveryJob = isTechnicianMode && job.delivery_assigned_to === user?.id && job.status === 'Ready';
                const agreedAmt = Number(job.lead.agreed_amount || job.lead.total_amount || 0);
                const collected = Number(job.lead.collected_amount || 0);
                const balance = Math.max(0, agreedAmt - collected);
                const leadPics = getLeadPictures(job.lead);
                const thumbSrc = leadPics[0] || job.lead.house_image || null;

                return (
                  <React.Fragment key={job.id}>
                    <tr
                      className={`group transition-colors cursor-pointer ${
                        isDeliveryJob
                          ? 'bg-violet-50 hover:bg-violet-100/80 border-l-4 border-l-violet-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    >
                      <td className="py-4 pr-3 align-middle">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <LeadImageThumb src={thumbSrc} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl border-2 border-slate-200" />
                          <div className="min-w-0">
                            <CopyText
                              value={job.lead.lead_id}
                              label="Lead ID"
                              className="text-sm font-mono font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 block w-fit cursor-copy"
                            />
                            {isDeliveryJob && (
                              <span className="text-[10px] font-black text-violet-700 uppercase mt-1.5 inline-block">Delivery Assigned</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 align-middle">
                        <p className="font-bold text-slate-900 text-base">{job.lead.product_type}</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{job.lead.customer.name}</p>
                        <CopyText value={job.lead.customer.phone} label="Phone" className="text-sm text-slate-700 font-mono mt-0.5 block cursor-copy" />
                        <p className="text-xs text-mint-700 mt-1.5 flex items-center gap-1 font-medium"><Info size={12} /> Tap row or Details for full info</p>
                      </td>
                      <td className="py-4 text-center hidden sm:table-cell align-middle">
                        <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-bold border ${days > 3 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          Day {days}
                        </span>
                      </td>
                      <td className="py-4 align-middle">
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-black uppercase border ${statusColors[job.status] || statusColors.Received}`}>
                          {getWorkshopStatusLabel(job.status)}
                        </span>
                      </td>
                      <td className="py-4 pl-2 align-middle" onClick={(e) => e.stopPropagation()}>
                        {renderStatusActions(job, isExpanded)}
                      </td>
                    </tr>

                    <AnimatePresence>
                      {isExpanded && (
                        <tr className="bg-white/90">
                          <td colSpan={5} className="p-6 border-t border-slate-200/60">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-sm shadow-sm">
                                  <h4 className="text-xs font-black text-slate-500 uppercase">Customer Info</h4>
                                  <p><span className="text-slate-500">Phone:</span>{' '}
                                    <CopyText value={job.lead.customer.phone} label="Phone" className="font-mono font-semibold text-slate-900 cursor-copy" />
                                  </p>
                                  <p><span className="text-slate-500">Address:</span> <span className="text-slate-800">{job.lead.exact_address || job.lead.customer.exact_address || job.lead.customer.area || '—'}</span></p>
                                  <p><span className="text-slate-500">Technician:</span> <span className="text-slate-800 font-semibold">{job.lead.technician?.name || '—'}</span></p>
                                  <p><span className="text-slate-500">Issue:</span> <span className="text-slate-800">{job.lead.problem_details || '—'}</span></p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-2 text-sm shadow-sm">
                                  <h4 className="text-xs font-black text-emerald-700 uppercase">Payment Details</h4>
                                  <p><span className="text-slate-600">Agreed Amount:</span> <span className="text-emerald-800 font-bold">{formatPKR(agreedAmt)}</span></p>
                                  <p><span className="text-slate-600">Advance Received:</span> <span className="text-blue-800 font-bold">{formatPKR(collected)}</span></p>
                                  <p><span className="text-slate-600">Remaining Balance:</span> <span className="text-amber-800 font-bold">{formatPKR(balance)}</span></p>
                                </div>
                              </div>

                              {(job.lead.actual_problem || job.lead.repair_details) && (
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2 text-sm shadow-sm">
                                  <h4 className="text-xs font-black text-amber-800 uppercase">Inspection / Technician Notes</h4>
                                  {job.lead.actual_problem && (
                                    <p className="text-slate-800"><span className="text-slate-600 font-bold">Actual Problem:</span> {job.lead.actual_problem}</p>
                                  )}
                                  {job.lead.repair_details && (
                                    <p className="text-slate-800 whitespace-pre-wrap"><span className="text-slate-600 font-bold">Notes:</span> {job.lead.repair_details}</p>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-2 text-sm shadow-sm">
                                  <h4 className="text-xs font-black text-blue-800 uppercase flex items-center gap-1"><Package size={12} /> Agreed Parts (Technician)</h4>
                                  <p className="text-slate-800 whitespace-pre-wrap">{agreed || 'No agreed parts recorded at pickup.'}</p>
                                </div>
                              </div>

                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                                <h4 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1"><Plus size={12} /> Additional Parts Used (Billing)</h4>
                                {job.additional_parts ? (
                                  <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans bg-white p-3 rounded-xl border border-slate-200">{job.additional_parts}</pre>
                                ) : (
                                  <p className="text-sm text-slate-500 italic">No extra parts added yet.</p>
                                )}
                                {!isTechnicianMode && job.status !== 'Delivered' && (
                                  <div className="flex gap-2">
                                    <textarea
                                      value={partsDraft[job.id] || ''}
                                      onChange={(e) => setPartsDraft({ ...partsDraft, [job.id]: e.target.value })}
                                      placeholder="e.g. Capacitor 45µF — PKR 1,200 | Fan Motor — PKR 3,500"
                                      rows={2}
                                      className="flex-1 crm-input text-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200/70 outline-none resize-none"
                                    />
                                    <button
                                      type="button"
                                      disabled={savingParts === job.id}
                                      onClick={() => saveAdditionalParts(job.id)}
                                      className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl self-end"
                                    >
                                      {savingParts === job.id ? 'Saving...' : 'Add Parts'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="bg-violet-950/20 p-4 rounded-2xl border border-violet-500/10 space-y-3">
                                <h4 className="text-xs font-black text-violet-300 uppercase flex items-center gap-1">
                                  <Camera size={12} /> Spare Parts Photos & Videos
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                  Upload proof of replaced parts — visible on the job record for customer sharing.
                                </p>
                                {Array.isArray(job.parts_media) && job.parts_media.length > 0 ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {job.parts_media.map((item: any) => (
                                      <div key={item.id} className="relative rounded-xl overflow-hidden border border-slate-200/60 bg-white group">
                                        {item.type === 'video' ? (
                                          <video src={item.src} className="w-full h-28 object-cover bg-black" controls playsInline />
                                        ) : (
                                          <img src={item.src} alt={item.caption || 'Part'} className="w-full h-28 object-cover" />
                                        )}
                                        <div className="p-2 text-[10px] text-slate-600 truncate">{item.caption || item.uploadedBy || 'Part media'}</div>
                                        <button
                                          type="button"
                                          onClick={() => downloadMedia(item.src, item.caption || `part-${item.id}`)}
                                          className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Download"
                                        >
                                          <Download size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">No parts media uploaded yet.</p>
                                )}
                                {!isTechnicianMode && job.status !== 'Delivered' && (
                                  <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2.5 bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 text-xs font-bold rounded-xl border border-violet-500/30">
                                    {uploadingPartsMedia === job.id ? (
                                      <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                      <Video size={14} />
                                    )}
                                    {uploadingPartsMedia === job.id ? 'Uploading…' : 'Add Photos / Videos'}
                                    <input
                                      type="file"
                                      accept="image/*,video/*"
                                      multiple
                                      className="hidden"
                                      disabled={uploadingPartsMedia === job.id}
                                      onChange={(e) => {
                                        uploadPartsMedia(job.id, e.target.files);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}
                              </div>

                              <LeadPdfButtons lead={job} />
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {visibleJobs.length === 0 && (
            <div className="text-center py-16 text-slate-500 italic">
              {statusFilter === 'delivery' ? 'No jobs assigned for delivery.' : statusFilter === 'Ready' ? 'No jobs ready for delivery.' : 'No workshop jobs in this filter.'}
            </div>
          )}
        </div>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="crm-modal border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800">Reject Gate-In — {rejectModal.leadId}</h3>
            <p className="text-sm text-slate-600">The lead will return to the technician with your rejection note. All submitted pickup data is preserved on the lead record.</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (required for technician)..."
              rows={3}
              className="w-full crm-input text-slate-800 text-sm px-3 py-2 rounded-xl border border-slate-200/70 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setRejectModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold">Cancel</button>
              <button type="button" disabled={rejecting} onClick={rejectGateIn} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {rejecting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopModule;
