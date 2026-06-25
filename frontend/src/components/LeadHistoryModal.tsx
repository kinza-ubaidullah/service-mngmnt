import React, { useEffect, useState } from 'react';
import {
  X, MapPin, Phone, MessageCircle, History, User, Wrench, Package,
  Calendar, BadgeCheck, Banknote, ClipboardList, Volume2, Image as ImageIcon,
} from 'lucide-react';
import api from '../services/api';
import { formatPKR, getFinalAmount, getTaskTypeLabel, getLeadProducts, formatProductTypesDisplay } from '../utils/leadHelpers';
import LeadPdfButtons from './LeadPdfButtons';
import LeadImageGallery from './LeadImageGallery';
import CopyButton from './CopyButton';
import CopyText from './CopyText';
import ImageZoomModal from './ImageZoomModal';

interface LeadHistoryModalProps {
  lead: any;
  onClose: () => void;
  extraActions?: React.ReactNode;
}

const fmtDate = (v: any) => (v ? new Date(v).toLocaleString() : null);
const fmtDay = (v: any) => (v ? new Date(v).toLocaleDateString() : null);

const statusBadgeClass = (status: string) => {
  const s = String(status || '').toUpperCase();
  if (s === 'NEW') return 'bg-slate-700 text-white border-slate-600';
  if (s === 'ASSIGNED' || s === 'INPROGRESS') return 'bg-blue-600 text-white border-blue-500';
  if (s === 'COMPLETED') return 'bg-emerald-600 text-white border-emerald-500';
  if (s === 'PENDINGAPPROVAL') return 'bg-amber-500 text-white border-amber-400';
  if (s === 'CANCELLED') return 'bg-rose-600 text-white border-rose-500';
  if (s === 'COMPLAINT' || s === 'REOPENED') return 'bg-rose-500 text-white border-rose-400';
  return 'bg-slate-600 text-white border-slate-500';
};

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
    </div>
  );
};

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string }> = ({
  title, icon, children, accent = 'text-emerald-700',
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
    <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${accent}`}>
      {icon} {title}
    </p>
    {children}
  </div>
);

const LeadHistoryModal: React.FC<LeadHistoryModalProps> = ({ lead, onClose, extraActions }) => {
  const [history, setHistory] = useState<any[]>(lead.history || []);
  const [fullLead, setFullLead] = useState<any>(lead);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/leads/${lead.id}/history`);
        setHistory(res.data.history || []);
        if (res.data.lead) setFullLead({ ...lead, ...res.data.lead });
      } catch {
        setHistory(lead.history || []);
      }
      const phone = lead.customer?.phone;
      if (phone) {
        try {
          const lookup = await api.get(`/leads/lookup?phone=${encodeURIComponent(phone)}`);
          if (lookup.data.found && Array.isArray(lookup.data.history)) {
            setCustomerHistory(lookup.data.history.filter((j: any) => j.lead_id !== lead.lead_id));
          }
        } catch { /* ignore */ }
      }
    };
    load();
  }, [lead.id, lead.lead_id, lead.customer?.phone]);

  const ws = fullLead.workshop_job;
  const taskType = fullLead.status === 'PendingApproval' ? getTaskTypeLabel(fullLead) : null;
  const displayStatus = fullLead.status === 'PendingApproval' ? 'PENDING APPROVAL' : String(fullLead.status || '').toUpperCase();

  const total = Number(fullLead.total_amount || 0);
  const collected = Number(fullLead.collected_amount || 0);
  const agreed = Number(fullLead.agreed_amount || 0);
  const balance = Math.max(0, total - collected);
  const address = fullLead.exact_address || fullLead.customer?.exact_address || fullLead.customer?.area;
  const mapLink = fullLead.customer?.google_map_link;
  const phone = fullLead.customer?.phone;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 crm-modal-overlay backdrop-blur-md">
      <div className="crm-modal bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <CopyText
                  value={fullLead.lead_id}
                  label="Lead ID"
                  className="text-lg font-black text-emerald-700 font-mono"
                />
                <CopyButton value={fullLead.lead_id} label="lead ID" size={15} />
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${statusBadgeClass(fullLead.status)}`}>
                  {displayStatus}
                </span>
                {taskType && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-violet-600 text-white border border-violet-500">
                    {taskType}
                  </span>
                )}
              </div>
            <p className="text-sm text-slate-600 font-medium">
              {formatProductTypesDisplay(fullLead.product_type, fullLead)}
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="text-emerald-700 font-bold">{formatPKR(getFinalAmount(fullLead))}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/50">
          {fullLead.rejection_note && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 mb-1">Rejection Reason</p>
              <p className="text-sm font-semibold text-rose-900">{fullLead.rejection_note}</p>
            </div>
          )}

          {/* Quick contact bar */}
          {phone && (
            <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-2xl">
              <a
                href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl"
              >
                <Phone size={16} /> Call {phone}
              </a>
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
              <CopyButton value={phone} label="phone" size={14} className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Customer" icon={<User size={14} className="text-blue-600" />}>
              <Field label="Name" value={fullLead.customer?.name} />
              <Field label="Phone" value={phone} />
              <Field label="Area" value={fullLead.customer?.area} />
              {address && (
                <p className="text-sm text-slate-700 flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{address}</span>
                </p>
              )}
              {mapLink && (
                <a href={mapLink} target="_blank" rel="noreferrer" className="inline-flex text-sm font-bold text-amber-700 hover:underline">
                  Open in Google Maps →
                </a>
              )}
            </SectionCard>

            <SectionCard title="Job Info" icon={<ClipboardList size={14} className="text-slate-600" />}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Appliance" value={formatProductTypesDisplay(fullLead.product_type, fullLead)} />
                {getLeadProducts(fullLead).length > 1 && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">All Products</p>
                    <div className="flex flex-wrap gap-1.5">
                      {getLeadProducts(fullLead).map((p) => (
                        <span key={p} className="text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-lg">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                <Field label="Technician" value={fullLead.technician?.name || 'Unassigned'} />
                <Field label="Team" value={fullLead.team?.name} />
                <Field label="Visit Date" value={fmtDay(fullLead.visit_date)} />
                <Field label="Created" value={fmtDay(fullLead.created_at)} />
                <Field label="Updated" value={fmtDay(fullLead.updated_at)} />
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Problem & Work" icon={<Wrench size={14} className="text-amber-600" />}>
            {fullLead.problem_details && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Reported Problem</p>
                <p className="text-sm text-slate-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{fullLead.problem_details}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Actual Problem Found" value={fullLead.actual_problem} />
              <Field label="Repair / Parts Used" value={fullLead.repair_details} />
            </div>
            {fullLead.status === 'PendingApproval' && (
              <Field label="Submitted As" value={getTaskTypeLabel(fullLead)} />
            )}
          </SectionCard>

          {(total > 0 || collected > 0 || agreed > 0 || fullLead.warranty_months > 0) && (
            <SectionCard title="Payment & Warranty" icon={<Banknote size={14} className="text-emerald-600" />}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Agreed" value={agreed > 0 ? formatPKR(agreed) : null} />
                <Field label="Total" value={total > 0 ? formatPKR(total) : null} />
                <Field label="Collected" value={collected > 0 ? formatPKR(collected) : null} />
                <Field label="Balance" value={balance > 0 ? formatPKR(balance) : 'SAR 0'} />
              </div>
              {fullLead.warranty_months > 0 && (
                <Field label="Warranty" value={`${fullLead.warranty_months} month(s)`} />
              )}
            </SectionCard>
          )}

          {ws && (
            <SectionCard title="Workshop Job" icon={<Package size={14} className="text-blue-600" />}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Status" value={ws.status} />
                <Field label="Received" value={fmtDay(ws.received_date)} />
                <Field label="Delivered" value={fmtDate(ws.delivered_at)} />
              </div>
              <Field label="Agreed Parts" value={ws.agreed_parts} />
              <Field label="Additional Parts" value={ws.additional_parts} />
            </SectionCard>
          )}

          {fullLead.voice_note && (
            <SectionCard title="Voice Recording" icon={<Volume2 size={14} className="text-violet-600" />}>
              <audio controls src={fullLead.voice_note} className="w-full h-10" />
              <a href={fullLead.voice_note} download={`voice_${fullLead.lead_id}.webm`} className="text-sm font-bold text-violet-700 hover:underline">
                Download recording
              </a>
            </SectionCard>
          )}

          <SectionCard title="Photos" icon={<ImageIcon size={14} className="text-slate-600" />}>
            <LeadImageGallery lead={fullLead} onZoom={(src) => setZoomImg(src)} />
          </SectionCard>

          {customerHistory.length > 0 && (
            <SectionCard title="Customer History" icon={<ClipboardList size={14} className="text-teal-700" />}>
              <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                {customerHistory.map((job: any) => (
                  <div key={job.lead_id} className="flex flex-wrap items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-teal-900">{job.lead_id}</span>
                    <span className="text-slate-600">{job.product_type}</span>
                    <span className="font-bold text-slate-800">{job.status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Status History" icon={<History size={14} className="text-slate-600" />}>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No history recorded.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {history.map((h: any) => (
                  <div key={h.id} className="bg-white border border-slate-200 rounded-xl p-3 text-xs">
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <BadgeCheck size={12} className="text-emerald-600" /> {h.action}
                      </span>
                      <span className="text-slate-500 shrink-0 flex items-center gap-1">
                        <Calendar size={10} /> {fmtDate(h.timestamp)}
                      </span>
                    </div>
                    {h.old_status && h.new_status && (
                      <p className="text-emerald-700 font-bold">{h.old_status} → {h.new_status}</p>
                    )}
                    {h.notes && <p className="text-slate-600 mt-1">{h.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-slate-200 bg-white flex flex-wrap justify-end gap-2 items-center">
          {extraActions}
          <LeadPdfButtons lead={fullLead} />
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold border border-slate-200"
          >
            Close
          </button>
        </div>
      </div>
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
    </div>
  );
};

export default LeadHistoryModal;
