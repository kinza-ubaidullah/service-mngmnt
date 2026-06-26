import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Loader2, TrendingUp, TrendingDown, Banknote, User, Wrench, MapPin, Phone,
  Calendar, FileText, Shield, Image as ImageIcon, ExternalLink, Equal
} from 'lucide-react';
import RefreshButton from './RefreshButton';
import ImageZoomModal from './ImageZoomModal';
import CopyText from './CopyText';
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
  revenue: { label: 'Revenue Breakdown', icon: <TrendingUp size={20} />, color: 'text-emerald-600' },
  expenses: { label: 'Expense Breakdown', icon: <TrendingDown size={20} />, color: 'text-rose-600' },
  net: { label: 'Net Balance Breakdown', icon: <Banknote size={20} />, color: 'text-emerald-600' },
};

const LeadImages = ({ item, onZoom, label = 'Product Photos' }: { item: any; onZoom: (src: string) => void; label?: string }) => {
  const pics = item.pictures?.length ? item.pictures : getLeadPictures(item);
  if (!pics.length) return null;
  return (
    <div className="shrink-0">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        <ImageIcon size={11} /> {label}
      </p>
      <div className="flex gap-2 flex-wrap">
        {pics.map((pic: string, i: number) => (
          <button key={i} type="button" onClick={() => onZoom(pic)}
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-emerald-400 hover:ring-2 hover:ring-emerald-200 transition-all shrink-0 shadow-sm">
            <img src={pic} alt={`product-${i}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

const DetailBlock = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
};

const RevenueRow = ({ item, onZoom }: { item: any; onZoom: (src: string) => void }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
    <div className="flex flex-col lg:flex-row gap-5">
      <LeadImages item={item} onZoom={onZoom} label="Product Photos" />

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CopyText value={item.lead_id} label="Lead ID" className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg" />
          <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{item.product_type}</span>
          {item.warranty_months > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <Shield size={10} /> {item.warranty_months}mo warranty
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
          <span className="flex items-center gap-1.5 font-semibold text-slate-800"><User size={12} className="text-emerald-600" /> {item.customer?.name}</span>
          {item.customer?.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={12} className="text-slate-400" />
              <CopyText value={item.customer.phone} label="Phone" className="font-mono text-slate-800" />
            </span>
          )}
          {item.customer?.area && <span className="flex items-center gap-1.5"><MapPin size={12} /> {item.customer.area}</span>}
          <span className="flex items-center gap-1.5">
            <Wrench size={12} className="text-emerald-600" />
            Tech: <span className="text-slate-800 font-bold">{item.technician?.name || 'Unassigned'}</span>
          </span>
          {item.technician?.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={12} /> Tech: <CopyText value={item.technician.phone} label="Tech phone" className="font-mono text-slate-800" />
            </span>
          )}
          <span className="flex items-center gap-1.5"><Calendar size={12} /> Completed: {formatDate(item.completed_at)}</span>
          {item.visit_date && <span className="flex items-center gap-1.5"><Calendar size={12} /> Visit: {formatDate(item.visit_date)}</span>}
        </div>

        {(item.exact_address || item.customer?.exact_address) && (
          <p className="text-sm text-slate-600 flex items-start gap-1.5">
            <MapPin size={12} className="mt-0.5 shrink-0 text-emerald-600" />
            {item.exact_address || item.customer?.exact_address}
            {item.customer?.google_map_link && (
              <a href={item.customer.google_map_link} target="_blank" rel="noreferrer"
                className="text-emerald-600 hover:underline ml-1 inline-flex items-center gap-0.5">
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

      <div className="text-right shrink-0 lg:border-l lg:border-slate-200 lg:pl-5">
        <p className="text-[10px] font-black text-slate-500 uppercase">Collected</p>
        <p className="text-2xl font-black text-emerald-600">{formatPKR(item.amount)}</p>
        {item.agreed_amount > 0 && item.agreed_amount !== item.amount && (
          <p className="text-xs text-slate-500 mt-1">Agreed: {formatPKR(item.agreed_amount)}</p>
        )}
        {item.total_amount > 0 && item.total_amount !== item.amount && (
          <p className="text-xs text-slate-500">Total: {formatPKR(item.total_amount)}</p>
        )}
      </div>
    </div>
  </div>
);

const ExpenseRow = ({ item, onZoom }: { item: any; onZoom: (src: string) => void }) => {
  const lead = item.lead;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-5">
        {lead && <LeadImages item={lead} onZoom={onZoom} label="Linked Product Photos" />}

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border bg-rose-50 text-rose-700 border-rose-200">{item.category}</span>
            {lead?.lead_id && (
              <CopyText value={lead.lead_id} label="Lead ID" className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded" />
            )}
            {item.recipient_name && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Paid to: {item.recipient_name}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-800 font-medium">{item.description || 'No description'}</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <User size={11} /> Recorded By (Technician / Staff)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-slate-600">
              <span>Name: <span className="text-slate-900 font-bold">{item.recorded_by}</span></span>
              <span>Role: <span className="text-slate-900 font-semibold">{item.recorded_by_role || '—'}</span></span>
              {item.recorded_by_phone && (
                <span className="flex items-center gap-1">
                  <Phone size={11} /> Phone:{' '}
                  <CopyText value={item.recorded_by_phone} label="Phone" className="font-mono text-slate-900 font-bold" />
                </span>
              )}
              <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(item.date)}</span>
            </div>
          </div>

          {lead && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <FileText size={11} /> Linked Job Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-slate-600">
                <span>Product: <span className="text-slate-900 font-bold">{lead.product_type}</span></span>
                <span>Customer: <span className="text-slate-900 font-bold">{lead.customer?.name}</span></span>
                <span>Field Tech: <span className="text-slate-900 font-bold">{lead.technician?.name || 'N/A'}</span></span>
                {lead.customer?.phone && (
                  <span>Customer Phone: <CopyText value={lead.customer.phone} label="Phone" className="font-mono text-slate-900 font-bold" /></span>
                )}
                {lead.customer?.area && <span>Area: {lead.customer.area}</span>}
                {lead.amount > 0 && (
                  <span>Collected: <span className="text-emerald-700 font-bold">{formatPKR(lead.amount)}</span></span>
                )}
              </div>
              {lead.problem_details && <p className="text-sm text-slate-700">Issue: {lead.problem_details}</p>}
              {lead.repair_details && <p className="text-sm text-slate-600">Repair: {lead.repair_details}</p>}
            </div>
          )}

          {item.custom_data && Object.keys(item.custom_data).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(item.custom_data).map(([k, v]) => (
                <span key={k} className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg font-bold">
                  {k}: {typeof v === 'string' && v.startsWith('data:') ? '📎 File' : String(v)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right shrink-0 lg:border-l lg:border-slate-200 lg:pl-5">
          <p className="text-[10px] font-black text-slate-500 uppercase">Amount</p>
          <p className="text-2xl font-black text-rose-600">− {formatPKR(item.amount)}</p>
        </div>
      </div>
    </div>
  );
};

const NetCalculation = ({ data }: { data: any }) => {
  const lines: any[] = data?.netLines || [];
  if (!lines.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
        <Equal size={14} /> Net Balance Calculation
      </h4>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className={`flex justify-between items-start gap-3 text-sm p-3 rounded-xl border ${
            line.type === 'revenue' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800">{line.sign} {line.label}</p>
              <p className="text-xs text-slate-600 truncate">{line.sub}</p>
            </div>
            <span className={`font-black shrink-0 ${line.type === 'revenue' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {line.sign} {formatPKR(line.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className={`flex justify-between items-center pt-3 border-t border-slate-200 font-black text-base ${
        (data?.netBalance ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
      }`}>
        <span>= Net Balance</span>
        <span>{(data?.netBalance ?? 0) < 0 ? '− ' : ''}{formatPKR(Math.abs(data?.netBalance ?? 0))}</span>
      </div>
      <p className="text-xs text-slate-500">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-4xl shadow-2xl my-8 flex flex-col max-h-[92vh]"
        >
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-[2rem]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-white border border-slate-200 ${meta.color}`}>{meta.icon}</div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{meta.label}</h3>
                <p className="text-xs text-slate-500">Complete job details · product photos · tech info · double-click ID/phone to copy</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton onClick={onRefresh} loading={refreshing} />
              <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition">
                <X size={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 p-6 shrink-0 bg-slate-50/50">
                <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Revenue</p>
                  <p className="text-lg font-black text-emerald-700">{formatPKR(data?.totalRevenue)}</p>
                  <p className="text-xs text-slate-500 mt-1">{revenueItems.length} task{revenueItems.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Expenses</p>
                  <p className="text-lg font-black text-rose-600">{formatPKR(data?.totalExpenses)}</p>
                  <p className="text-xs text-slate-500 mt-1">{expenseItems.length} record{expenseItems.length !== 1 ? 's' : ''}</p>
                </div>
                <div className={`bg-white border rounded-2xl p-4 shadow-sm ${(data?.netBalance ?? 0) >= 0 ? 'border-emerald-200' : 'border-rose-200'}`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Net</p>
                  <p className={`text-lg font-black ${(data?.netBalance ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {(data?.netBalance ?? 0) < 0 ? '− ' : ''}{formatPKR(Math.abs(data?.netBalance ?? 0))}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar bg-white">
                {(type === 'net') && <NetCalculation data={data} />}

                {(type === 'revenue' || type === 'net') && (
                  <div>
                    <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TrendingUp size={14} /> Revenue by Task ({revenueItems.length})
                    </h4>
                    <div className="space-y-3">
                      {revenueItems.length === 0 ? (
                        <p className="text-center py-8 text-slate-500 italic text-sm">No completed job revenue yet.</p>
                      ) : revenueItems.map(item => <RevenueRow key={item.id} item={item} onZoom={setZoomImg} />)}
                    </div>
                  </div>
                )}

                {(type === 'expenses' || type === 'net') && (
                  <div>
                    <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TrendingDown size={14} /> Expenses ({expenseItems.length})
                    </h4>
                    <div className="space-y-3">
                      {expenseItems.length === 0 ? (
                        <p className="text-center py-8 text-slate-500 italic text-sm">No expenses recorded yet.</p>
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
