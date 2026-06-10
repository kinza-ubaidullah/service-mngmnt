import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Loader2, TrendingUp, TrendingDown, Banknote, User, Wrench, MapPin, Phone,
  Calendar, FileText, Shield, Image as ImageIcon, ExternalLink, Equal
} from 'lucide-react';
import RefreshButton from './RefreshButton';
import ImageZoomModal from './ImageZoomModal';
import { getLeadPictures, formatPKR } from '../utils/leadHelpers';

type DetailType = 'revenue' | 'expenses' | 'net';

interface FinanceDetailModalProps {
  type: DetailType;
  data: any;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const titles: Record<DetailType, { label: string; icon: React.ReactNode; color: string }> = {
  revenue: { label: 'Revenue Breakdown', icon: <TrendingUp size={20} />, color: 'text-indigo-400' },
  expenses: { label: 'Expense Breakdown', icon: <TrendingDown size={20} />, color: 'text-rose-400' },
  net: { label: 'Net Balance Breakdown', icon: <Banknote size={20} />, color: 'text-emerald-400' },
};

const LeadImages = ({ item, onZoom }: { item: any; onZoom: (src: string) => void }) => {
  const pics = item.pictures?.length ? item.pictures : getLeadPictures(item);
  if (!pics.length) return null;
  return (
    <div className="flex gap-2 flex-wrap mt-3">
      {pics.map((pic: string, i: number) => (
        <button key={i} type="button" onClick={() => onZoom(pic)}
          className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500/50 hover:ring-2 hover:ring-indigo-500/30 transition-all shrink-0">
          <img src={pic} alt={`lead-${i}`} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
};

const DetailBlock = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
};

const RevenueRow = ({ item, onZoom }: { item: any; onZoom: (src: string) => void }) => (
  <div className="bg-slate-950/60 border border-indigo-500/15 rounded-2xl p-5">
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Images column */}
      {(item.pictures?.length || getLeadPictures(item).length > 0) && (
        <div className="shrink-0">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ImageIcon size={11} /> Lead Photos
          </p>
          <LeadImages item={item} onZoom={onZoom} />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-lg">{item.lead_id}</span>
          <span className="text-[10px] font-bold text-white uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded">{item.product_type}</span>
          {item.warranty_months > 0 && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
              <Shield size={10} /> {item.warranty_months}mo warranty
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-bold text-slate-300"><User size={12} className="text-indigo-400" /> {item.customer?.name}</span>
          {item.customer?.phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {item.customer.phone}</span>}
          {item.customer?.area && <span className="flex items-center gap-1.5"><MapPin size={12} /> {item.customer.area}</span>}
          <span className="flex items-center gap-1.5"><Wrench size={12} className="text-indigo-400" /> Tech: <span className="text-slate-200 font-bold">{item.technician?.name || 'Unassigned'}</span></span>
          {item.technician?.phone && <span className="flex items-center gap-1.5"><Phone size={12} /> Tech: {item.technician.phone}</span>}
          <span className="flex items-center gap-1.5"><Calendar size={12} /> Completed: {formatDate(item.completed_at)}</span>
          {item.visit_date && <span className="flex items-center gap-1.5"><Calendar size={12} /> Visit: {formatDate(item.visit_date)}</span>}
        </div>

        {(item.exact_address || item.customer?.exact_address) && (
          <p className="text-xs text-slate-400 flex items-start gap-1.5">
            <MapPin size={12} className="mt-0.5 shrink-0 text-emerald-400" />
            {item.exact_address || item.customer?.exact_address}
            {item.customer?.google_map_link && (
              <a href={item.customer.google_map_link} target="_blank" rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 ml-1 inline-flex items-center gap-0.5">
                <ExternalLink size={11} /> Maps
              </a>
            )}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <DetailBlock label="Customer Issue" value={item.problem_details} />
          <DetailBlock label="Actual Problem" value={item.actual_problem} />
          <DetailBlock label="Repair Done" value={item.repair_details} />
        </div>
      </div>

      <div className="text-right shrink-0 lg:border-l lg:border-white/5 lg:pl-4">
        <p className="text-[10px] font-black text-slate-500 uppercase">Collected</p>
        <p className="text-2xl font-black text-indigo-400">{formatPKR(item.amount)}</p>
        {item.agreed_amount > 0 && item.agreed_amount !== item.amount && (
          <p className="text-[10px] text-slate-500 mt-1">Agreed: {formatPKR(item.agreed_amount)}</p>
        )}
        {item.total_amount > 0 && item.total_amount !== item.amount && (
          <p className="text-[10px] text-slate-500">Total: {formatPKR(item.total_amount)}</p>
        )}
      </div>
    </div>
  </div>
);

const ExpenseRow = ({ item, onZoom }: { item: any; onZoom: (src: string) => void }) => {
  const lead = item.lead;
  return (
    <div className="bg-slate-950/60 border border-rose-500/15 rounded-2xl p-5">
      <div className="flex flex-col lg:flex-row gap-4">
        {lead && (lead.pictures?.length || getLeadPictures(lead).length > 0) && (
          <div className="shrink-0">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ImageIcon size={11} /> Linked Lead Photos
            </p>
            <LeadImages item={lead} onZoom={onZoom} />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border bg-rose-500/10 text-rose-400 border-rose-500/25">{item.category}</span>
            {lead?.lead_id && (
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded">{lead.lead_id}</span>
            )}
            {item.recipient_name && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                Paid to: {item.recipient_name}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-200 font-medium">{item.description || 'No description'}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
            <span>Recorded by: <span className="text-slate-200 font-bold">{item.recorded_by}</span> ({item.recorded_by_role})</span>
            {item.recorded_by_phone && <span className="flex items-center gap-1"><Phone size={11} /> {item.recorded_by_phone}</span>}
            <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(item.date)}</span>
          </div>

          {lead && (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <FileText size={11} /> Linked Task Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-400">
                <span>Task: <span className="text-slate-200 font-bold">{lead.product_type}</span></span>
                <span>Customer: <span className="text-slate-200 font-bold">{lead.customer?.name}</span></span>
                <span>Tech: <span className="text-slate-200 font-bold">{lead.technician?.name || 'N/A'}</span></span>
                {lead.customer?.phone && <span>Phone: {lead.customer.phone}</span>}
                {lead.customer?.area && <span>Area: {lead.customer.area}</span>}
              </div>
              {lead.problem_details && <p className="text-xs text-slate-500">Issue: {lead.problem_details}</p>}
            </div>
          )}

          {item.custom_data && Object.keys(item.custom_data).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(item.custom_data).map(([k, v]) => (
                <span key={k} className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-bold">
                  {k}: {typeof v === 'string' && v.startsWith('data:') ? '📎 File' : String(v)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right shrink-0 lg:border-l lg:border-white/5 lg:pl-4">
          <p className="text-[10px] font-black text-slate-500 uppercase">Amount</p>
          <p className="text-2xl font-black text-rose-400">− {formatPKR(item.amount)}</p>
        </div>
      </div>
    </div>
  );
};

const NetCalculation = ({ data }: { data: any }) => {
  const lines: any[] = data?.netLines || [];
  if (!lines.length) return null;

  return (
    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-5 space-y-3">
      <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
        <Equal size={14} /> Net Balance Calculation
      </h4>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className={`flex justify-between items-start gap-3 text-sm p-3 rounded-xl border ${
            line.type === 'revenue' ? 'bg-indigo-500/5 border-indigo-500/15' : 'bg-rose-500/5 border-rose-500/15'
          }`}>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-200">{line.sign} {line.label}</p>
              <p className="text-[11px] text-slate-500 truncate">{line.sub}</p>
            </div>
            <span className={`font-black shrink-0 ${line.type === 'revenue' ? 'text-indigo-400' : 'text-rose-400'}`}>
              {line.sign} {formatPKR(line.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className={`flex justify-between items-center pt-3 border-t border-white/10 font-black text-base ${
        (data?.netBalance ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
      }`}>
        <span>= Net Balance</span>
        <span>{(data?.netBalance ?? 0) < 0 ? '− ' : ''}{formatPKR(Math.abs(data?.netBalance ?? 0))}</span>
      </div>
      <p className="text-[10px] text-slate-500">
        Formula: Revenue ({formatPKR(data?.totalRevenue)}) − Expenses ({formatPKR(data?.totalExpenses)}) = Net ({formatPKR(data?.netBalance)})
      </p>
    </div>
  );
};

const FinanceDetailModal: React.FC<FinanceDetailModalProps> = ({ type, data, loading, onClose, onRefresh, refreshing }) => {
  const meta = titles[type];
  const revenueItems: any[] = data?.revenueItems || [];
  const expenseItems: any[] = data?.expenseItems || [];
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-4xl shadow-2xl my-8 flex flex-col max-h-[92vh]"
        >
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-white/5 ${meta.color}`}>{meta.icon}</div>
              <div>
                <h3 className="text-lg font-black text-white">{meta.label}</h3>
                <p className="text-xs text-slate-500">Complete task details with photos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton onClick={onRefresh} loading={refreshing} />
              <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 p-6 shrink-0">
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Revenue</p>
                  <p className="text-lg font-black text-indigo-400">{formatPKR(data?.totalRevenue)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{revenueItems.length} task{revenueItems.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Expenses</p>
                  <p className="text-lg font-black text-rose-400">{formatPKR(data?.totalExpenses)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{expenseItems.length} record{expenseItems.length !== 1 ? 's' : ''}</p>
                </div>
                <div className={`border rounded-2xl p-4 ${(data?.netBalance ?? 0) >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net</p>
                  <p className={`text-lg font-black ${(data?.netBalance ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(data?.netBalance ?? 0) < 0 ? '− ' : ''}{formatPKR(Math.abs(data?.netBalance ?? 0))}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar">
                {(type === 'net') && <NetCalculation data={data} />}

                {(type === 'revenue' || type === 'net') && (
                  <div>
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TrendingUp size={14} /> Revenue by Task ({revenueItems.length})
                    </h4>
                    <div className="space-y-3">
                      {revenueItems.length === 0 ? (
                        <p className="text-center py-8 text-slate-600 italic text-sm">No completed job revenue yet.</p>
                      ) : revenueItems.map(item => <RevenueRow key={item.id} item={item} onZoom={setZoomImg} />)}
                    </div>
                  </div>
                )}

                {(type === 'expenses' || type === 'net') && (
                  <div>
                    <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TrendingDown size={14} /> Expenses ({expenseItems.length})
                    </h4>
                    <div className="space-y-3">
                      {expenseItems.length === 0 ? (
                        <p className="text-center py-8 text-slate-600 italic text-sm">No expenses recorded yet.</p>
                      ) : expenseItems.map(item => <ExpenseRow key={item.id} item={item} onZoom={setZoomImg} />)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
    </>
  );
};

export default FinanceDetailModal;
