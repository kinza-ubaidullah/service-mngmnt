import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Clock, CheckCircle2, Truck, AlertCircle, RefreshCw, Trash2, CheckCircle, Info } from 'lucide-react';
import LeadPdfButtons from './LeadPdfButtons';
import api from '../services/api';
import toast from 'react-hot-toast';
import RefreshButton from './RefreshButton';
import { useLiveData } from '../hooks/useLiveData';

interface WorkshopModuleProps {
  showGateInApproval?: boolean;
  readOnly?: boolean;
}

const WorkshopModule: React.FC<WorkshopModuleProps> = ({ showGateInApproval = true, readOnly = false }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [deliveryTech, setDeliveryTech] = useState<Record<number, string>>({});

  const fetchWorkshopJobs = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const [res, techRes] = await Promise.all([
        api.get(`/workshop/jobs${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`),
        api.get('/users/technicians').catch(() => ({ data: { technicians: [] } }))
      ]);
      setJobs(res.data.jobs);
      setTechnicians(techRes.data.technicians || []);
    } catch (error) {
      toast.error('Failed to load workshop jobs');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['workshop', 'leads'], () => fetchWorkshopJobs({ silent: true }));

  useEffect(() => {
    fetchWorkshopJobs();
  }, [statusFilter]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/workshop/jobs/${id}/status`, { status: newStatus });
      toast.success(`Job status updated to ${newStatus}`);
      fetchWorkshopJobs();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const statusColors: any = {
    'WaitingForApproval': 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    'Received': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20',
    'WorkStarted': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    'WaitingForParts': 'bg-rose-500/20 text-rose-400 border-rose-500/20',
    'Ready': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    'Delivered': 'bg-purple-500/20 text-purple-400 border-purple-500/20',
  };

  const getDayCount = (receivedDate: string) => {
    const diff = new Date().getTime() - new Date(receivedDate).getTime();
    return Math.floor(diff / (1000 * 3600 * 24)) + 1;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <RefreshCw className="animate-spin text-indigo-500" size={36} />
        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Workshop Data...</span>
      </div>
    );
  }

  // Filter jobs
  const pendingJobs = jobs.filter(j => j.status === 'WaitingForApproval');
  const activeJobs = jobs.filter(j => j.status !== 'WaitingForApproval' && j.status !== 'Delivered');

  const assignDelivery = async (jobId: number) => {
    const techId = deliveryTech[jobId];
    if (!techId) return toast.error('Select a technician');
    try {
      await api.patch(`/workshop/jobs/${jobId}/assign-delivery`, { technician_id: techId });
      toast.success('Delivery technician assigned');
      fetchWorkshopJobs();
    } catch { toast.error('Failed to assign delivery'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {['all', 'WaitingForApproval', 'Received', 'WorkStarted', 'WaitingForParts', 'Ready', 'Delivered'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all ${statusFilter === s ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white/5 text-slate-400 border-white/10'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Approval', value: pendingJobs.length, icon: AlertCircle, color: 'text-amber-400 bg-amber-500/10' },
          { label: 'Active Repairs', value: activeJobs.filter(j => j.status === 'WorkStarted').length, icon: Clock, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Ready for Delivery', value: activeJobs.filter(j => j.status === 'Ready').length, icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10' },
          { label: 'Total in Workshop', value: activeJobs.length, icon: Wrench, color: 'text-indigo-400 bg-indigo-500/10' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] hover:border-indigo-500/20 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-black text-white mt-4">{stat.value}</h3>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 1. Pending Approval Section (Call Center / Admin only) */}
      {showGateInApproval && pendingJobs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-amber-500/20 rounded-[2.5rem] p-8 shadow-xl shadow-amber-500/5"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-amber-400 flex items-center gap-2 uppercase tracking-wide">
              <AlertCircle size={20} /> Pending Call Center Approval ({pendingJobs.length})
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Needs Gate-In Check
              </span>
              <RefreshButton onClick={refresh} loading={refreshing} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingJobs.map((job) => (
              <div 
                key={job.id} 
                className="bg-slate-950/60 border border-white/5 hover:border-amber-500/20 rounded-2xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                      {job.lead.lead_id}
                    </span>
                    <span className="text-xs font-bold text-white uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                      {job.lead.product_type}
                    </span>
                    <span className="text-xs text-slate-500">
                      Picked by: <span className="text-slate-300 font-medium">{job.lead.technician?.name || 'Technician'}</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{job.lead.customer.name} ({job.lead.customer.phone})</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <span className="font-bold text-slate-500 uppercase">Customer Issue:</span> {job.lead.problem_details || 'No details provided'}
                    </p>
                    {job.lead.actual_problem && (
                      <p className="text-xs text-emerald-400/90 flex items-center gap-1 mt-1 font-medium bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-xl">
                        <span className="font-bold text-emerald-500 uppercase">Tech Diagnosis:</span> {job.lead.actual_problem}
                      </p>
                    )}
                  </div>
                  <LeadPdfButtons lead={job.lead} compact />
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <button 
                    onClick={() => updateStatus(job.id, 'Received')}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-orange-500/10 border border-orange-400/20 flex items-center gap-1.5"
                  >
                    <CheckCircle size={15} /> Approve Gate-In
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Reject pickup and return lead back to Technician assigned status?')) {
                        try {
                          await api.delete(`/workshop/jobs/${job.id}`);
                          toast.success('Pickup rejected. Lead returned to technician.');
                          fetchWorkshopJobs();
                        } catch { toast.error('Failed to reject'); }
                      }
                    }}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all text-xs font-bold"
                    title="Reject Pickup"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 2. Active Workshop Board */}
      <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="text-indigo-400" /> Active Workshop Inventory
          </h2>
          <div className="flex items-center gap-2">
            <RefreshButton onClick={refresh} loading={refreshing} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                <th className="pb-4 font-bold">Job ID</th>
                <th className="pb-4 font-bold">Appliance & Customer</th>
                <th className="pb-4 font-bold text-center hidden sm:table-cell">Age</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeJobs.map((job) => {
                const days = getDayCount(job.received_date);
                const isExpanded = expandedJobId === job.id;
                
                return (
                  <React.Fragment key={job.id}>
                    <tr className="group hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => setExpandedJobId(isExpanded ? null : job.id)}>
                      <td className="py-5">
                        <span className="text-xs font-mono font-bold text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                          {job.lead.lead_id}
                        </span>
                      </td>
                      <td className="py-5">
                        <div>
                          <p className="font-bold text-white text-sm flex items-center gap-1.5">
                            {job.lead.product_type}
                            <span className="text-[10px] text-slate-500 font-normal">({job.lead.customer.area})</span>
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{job.lead.customer.name}</p>
                          <p className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-wider">
                            <Info size={10} /> Click to view details & diagnostic instructions
                          </p>
                        </div>
                      </td>
                      <td className="py-5 text-center hidden sm:table-cell">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${days > 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          Day {days} {days > 3 && <AlertCircle size={12} className="inline ml-1 mb-0.5 animate-pulse"/>}
                        </span>
                      </td>
                      <td className="py-5">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[job.status] || statusColors['Received']}`}>
                          {job.status === 'Received' ? 'Approved & In-Queue' : job.status}
                        </span>
                      </td>
                      <td className="py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {!readOnly && job.status === 'Ready' && (
                            <div className="flex items-center gap-1">
                              <select value={deliveryTech[job.id] || ''} onChange={e => setDeliveryTech({ ...deliveryTech, [job.id]: e.target.value })}
                                className="bg-slate-950 text-white text-[10px] px-2 py-1 rounded-lg border border-white/10">
                                <option value="">Assign delivery...</option>
                                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <button onClick={() => assignDelivery(job.id)} className="text-[10px] bg-purple-500 text-white px-2 py-1 rounded-lg font-bold">Go</button>
                            </div>
                          )}
                          {readOnly ? null : job.status === 'Received' && (
                            <button 
                              onClick={() => updateStatus(job.id, 'WorkStarted')}
                              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 transition-all"
                              title="Start Repair Work"
                            >
                              <Clock size={16} />
                            </button>
                          )}
                          {!readOnly && (job.status === 'WorkStarted' || job.status === 'WaitingForParts') && (
                            <>
                              <button 
                                onClick={() => updateStatus(job.id, job.status === 'WorkStarted' ? 'WaitingForParts' : 'WorkStarted')}
                                className={`p-2 rounded-xl border transition-all ${
                                  job.status === 'WaitingForParts' 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}
                                title={job.status === 'WorkStarted' ? 'Hold for Parts' : 'Resume Work'}
                              >
                                <AlertCircle size={16} />
                              </button>
                              <button 
                                onClick={() => updateStatus(job.id, 'Ready')}
                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all"
                                title="Mark Repair Completed & Ready"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            </>
                          )}
                          {!readOnly && job.status === 'Ready' && (
                            <button 
                              onClick={() => updateStatus(job.id, 'Delivered')}
                              className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 transition-all"
                              title="Mark Delivered to Customer"
                            >
                              <Truck size={16} />
                            </button>
                          )}
                          {!readOnly && <button 
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to remove this machine from workshop and return it back to technician?')) {
                                try {
                                  await api.delete(`/workshop/jobs/${job.id}`);
                                  toast.success('Workshop job canceled. Returned to Assigned.');
                                  fetchWorkshopJobs();
                                } catch { toast.error('Failed to remove record'); }
                              }
                            }}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all"
                            title="Cancel / Delete Workshop Job"
                          >
                            <Trash2 size={16} />
                          </button>}
                        </div>
                      </td>
                    </tr>

                    {/* Detailed Dropdown Row */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr className="bg-slate-950/40">
                          <td colSpan={5} className="p-6 border-t border-white/5">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-4 text-slate-300"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Details column */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Job Target Info</h4>
                                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-1.5 text-sm">
                                    <p><span className="text-slate-500 font-bold">Customer:</span> {job.lead.customer.name}</p>
                                    <p><span className="text-slate-500 font-bold">Phone:</span> {job.lead.customer.phone}</p>
                                    <p><span className="text-slate-500 font-bold">Address:</span> {job.lead.exact_address || job.lead.customer.exact_address || 'Not listed'}</p>
                                    <p><span className="text-slate-500 font-bold">Assigned Tech:</span> {job.lead.technician?.name || 'General Workshop'}</p>
                                  </div>
                                </div>

                                {/* Problem Instructions Column */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">What Needs to Be Done (Job Details)</h4>
                                  <div className="bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/10 space-y-2 text-sm">
                                    <div>
                                      <p className="text-slate-500 text-xs font-black uppercase">Reported Problem:</p>
                                      <p className="italic text-slate-200 mt-0.5">"{job.lead.problem_details || 'No problem details booked'}"</p>
                                    </div>
                                    {job.lead.actual_problem && (
                                      <div className="pt-2 border-t border-white/5">
                                        <p className="text-emerald-500 text-xs font-black uppercase">Technician Diagnostic Notes:</p>
                                        <p className="font-semibold text-emerald-400 mt-0.5">{job.lead.actual_problem}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Documents</h4>
                                <LeadPdfButtons lead={job.lead} />
                              </div>

                              {/* Item Pictures Preview */}
                              {job.lead.item_pictures && job.lead.item_pictures.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Appliance / Job Pictures</h4>
                                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                    {job.lead.item_pictures.map((pic: string, pIdx: number) => (
                                      <div key={pIdx} className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-900 group/img">
                                        <img 
                                          src={pic} 
                                          alt="appliance" 
                                          className="w-full h-full object-cover transition-all duration-300 hover:scale-125 cursor-pointer"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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
          {activeJobs.length === 0 && (
            <div className="text-center py-16 text-slate-500 italic">
              {showGateInApproval
                ? 'No approved workshop jobs in queue. Approve gate-ins above to add items here.'
                : 'No workshop jobs in queue. Jobs appear here after call center gate-in approval.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkshopModule;
