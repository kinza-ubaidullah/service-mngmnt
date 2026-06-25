import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, CheckCircle2, Clock, Banknote, User, Phone, MapPin, HandCoins
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import RefreshButton from './RefreshButton';
import { useLiveData } from '../hooks/useLiveData';

interface TechnicianPaymentsModalProps {
  technician: { id: number; name: string };
  onClose: () => void;
  onSettled?: () => void;
}

const formatSAR = (n: number) => `SAR ${Number(n || 0).toLocaleString()}`;

const TechnicianPaymentsModal: React.FC<TechnicianPaymentsModalProps> = ({ technician, onClose, onSettled }) => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending');

  const fetchWallet = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const res = await api.get(`/settlements/${technician.id}`);
      setWallet(res.data);
    } catch {
      toast.error('Failed to load payment details');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['settlements', 'leads'], () => fetchWallet({ silent: true }));

  useEffect(() => { fetchWallet(); }, [technician.id]);

  const receivePayment = async (job: any) => {
    if (!window.confirm(`Receive ${formatSAR(job.amount)} for task ${job.lead_id} (${job.customer?.name})?`)) return;
    setReceivingId(job.id);
    try {
      const res = await api.post(`/settlements/${technician.id}/receive`, { lead_id: job.id });
      toast.success(res.data.message || 'Payment received');
      await fetchWallet({ silent: true });
      onSettled?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record payment');
    } finally {
      setReceivingId(null);
    }
  };

  const jobs: any[] = wallet?.jobs || [];
  const visibleJobs = jobs.filter(j => {
    if (filter === 'pending') return !j.is_settled && j.amount > 0;
    if (filter === 'paid') return j.is_settled;
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="crm-modal border rounded-[2rem] w-full max-w-3xl shadow-2xl my-8 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-lg">
                {technician.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{technician.name} — Task Payments</h3>
                <p className="text-xs text-slate-500">Har task ki payment alag receive hoti hai (no combined payments)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton onClick={refresh} loading={refreshing} />
              <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 transition">
                <X size={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="animate-spin text-mint-500" size={32} />
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 p-6 shrink-0">
                <div className="bg-white/95 border border-slate-200/60 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Collected</p>
                  <p className="text-lg font-black text-white">{formatSAR(wallet?.totalCollected)}</p>
                </div>
                <div className="bg-emerald-500/5 border border-mint-300/40 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Received</p>
                  <p className="text-lg font-black text-mint-600">{formatSAR(wallet?.totalReceived)}</p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Pending ({wallet?.pendingCount || 0} tasks)</p>
                  <p className="text-lg font-black text-rose-400">{formatSAR(wallet?.overdue)}</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-6 shrink-0">
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200/60 w-fit">
                  {([
                    { id: 'pending', label: `Pending (${jobs.filter(j => !j.is_settled && j.amount > 0).length})` },
                    { id: 'paid', label: `Paid (${jobs.filter(j => j.is_settled).length})` },
                    { id: 'all', label: 'All' },
                  ] as const).map(t => (
                    <button key={t.id} onClick={() => setFilter(t.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === t.id ? 'crm-tab-active' : 'text-slate-400 hover:text-slate-800'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-task list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {visibleJobs.length === 0 ? (
                  <div className="text-center py-16 text-slate-600 italic text-sm">
                    {filter === 'pending' ? 'No pending task payments. All clear!' : 'No tasks found.'}
                  </div>
                ) : visibleJobs.map(job => (
                  <div key={job.id}
                    className={`border rounded-2xl p-5 transition-all ${job.is_settled
                      ? 'bg-emerald-500/[0.03] border-emerald-500/15'
                      : 'bg-white/95 border-rose-500/20 hover:border-rose-500/40'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-mint-600 bg-mint-100 border border-indigo-500/25 px-2.5 py-1 rounded-lg">
                            {job.lead_id}
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 uppercase bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded">
                            {job.product_type}
                          </span>
                          {job.is_settled ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-mint-600 bg-mint-100 border border-emerald-500/25 px-2 py-0.5 rounded-full uppercase">
                              <CheckCircle2 size={11} /> Paid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full uppercase">
                              <Clock size={11} /> Pending
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-bold text-slate-300"><User size={12} className="text-slate-500" /> {job.customer?.name}</span>
                          {job.customer?.phone && <span className="flex items-center gap-1"><Phone size={12} className="text-slate-500" /> {job.customer.phone}</span>}
                          {job.customer?.area && <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-500" /> {job.customer.area}</span>}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Completed: {new Date(job.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {job.is_settled && job.settlement?.received_at && (
                            <span className="text-emerald-500/80 ml-2">
                              • Received {new Date(job.settlement.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} by {job.settlement.received_by_name}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase">Amount</p>
                          <p className={`text-lg font-black ${job.is_settled ? 'text-mint-600' : 'text-rose-400'}`}>{formatSAR(job.amount)}</p>
                        </div>
                        {!job.is_settled && job.amount > 0 && (
                          <button
                            onClick={() => receivePayment(job)}
                            disabled={receivingId === job.id}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-1.5 disabled:opacity-60">
                            {receivingId === job.id ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />}
                            Receive
                          </button>
                        )}
                        {job.is_settled && (
                          <div className="p-2.5 bg-mint-100 text-mint-600 rounded-xl border border-mint-300/40">
                            <Banknote size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TechnicianPaymentsModal;
