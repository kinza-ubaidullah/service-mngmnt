import React, { useEffect, useState } from 'react';
import {
  X, MapPin, Phone, MessageCircle, Wrench, Package, Home,
  Volume2, Image as ImageIcon, ClipboardList, Banknote,
} from 'lucide-react';
import api from '../services/api';
import {
  formatPKR,
  getFinalAmount,
  getTaskTypeLabel,
  getLeadProductEntries,
  formatProductTypesDisplay,
} from '../utils/leadHelpers';
import LeadPdfButtons from './LeadPdfButtons';
import CopyButton from './CopyButton';
import CopyText from './CopyText';
import ImageZoomModal from './ImageZoomModal';
import LeadImageThumb from './LeadImageThumb';

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

const Field: React.FC<{ label: string; value?: React.ReactNode; className?: string }> = ({ label, value, className = '' }) => {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-slate-800 break-words">{value}</div>
    </div>
  );
};

const LeadHistoryModal: React.FC<LeadHistoryModalProps> = ({ lead, onClose, extraActions }) => {
  const [fullLead, setFullLead] = useState<any>(lead);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/leads/${lead.id}/history`);
        if (res.data.lead) setFullLead({ ...lead, ...res.data.lead });
      } catch {
        /* keep passed lead */
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
  const productEntries = getLeadProductEntries(fullLead);

  const total = Number(fullLead.total_amount || 0);
  const collected = Number(fullLead.collected_amount || 0);
  const agreed = Number(fullLead.agreed_amount || 0);
  const balance = Math.max(0, total - collected);
  const finalAmount = getFinalAmount(fullLead);
  const address = fullLead.exact_address || fullLead.customer?.exact_address || fullLead.customer?.area;
  const mapLink = fullLead.customer?.google_map_link;
  const phone = fullLead.customer?.phone;
  const showPayment = total > 0 || collected > 0 || agreed > 0 || finalAmount > 0 || fullLead.warranty_months > 0;

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
                {finalAmount > 0 && (
                  <>
                    <span className="text-slate-400 mx-1.5">•</span>
                    <span className="text-emerald-700 font-bold">{formatPKR(finalAmount)}</span>
                  </>
                )}
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

        {/* Scrollable body — sequential flow */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-5 custom-scrollbar bg-slate-50/50">
          {fullLead.rejection_note && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 mb-1">Rejection Reason</p>
              <p className="text-sm font-semibold text-rose-900">{fullLead.rejection_note}</p>
            </div>
          )}

          {phone && (
            <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-2xl">
              <a
                href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl"
              >
                <Phone size={16} /> Call
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

          {/* 1. Lead details — flex layout */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                <ClipboardList size={14} /> Lead Details
              </p>
            </div>
            <div className="p-4 flex flex-col sm:flex-row gap-4 sm:gap-5">
              {/* House location */}
              <div className="shrink-0 flex flex-col items-center sm:items-start">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center gap-1">
                  <Home size={11} className="text-amber-600" /> House Location
                </p>
                {fullLead.house_image ? (
                  <LeadImageThumb
                    src={fullLead.house_image}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl border border-slate-200"
                    onZoom={setZoomImg}
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1">
                    <Home size={22} className="opacity-40" />
                    <span className="text-[10px] font-semibold">No photo</span>
                  </div>
                )}
              </div>

              {/* Customer + job fields */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Field label="Customer Name" value={fullLead.customer?.name} />
                  <Field label="Phone" value={phone} />
                  <Field label="Area" value={fullLead.customer?.area} />
                  <Field label="Technician" value={fullLead.technician?.name || 'Unassigned'} />
                  <Field label="Team" value={fullLead.team?.name} />
                  <Field label="Visit Date" value={fmtDay(fullLead.visit_date)} />
                  <Field label="Created" value={fmtDay(fullLead.created_at)} />
                  <Field label="Updated" value={fmtDay(fullLead.updated_at)} />
                </div>

                {(address || mapLink) && (
                  <div className="flex flex-wrap items-start gap-3 pt-3 border-t border-slate-100">
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 shrink-0">
                      <MapPin size={16} className="text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Address / Location</p>
                      {address && <p className="text-sm font-semibold text-slate-800">{address}</p>}
                      {mapLink && (
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex mt-1.5 text-sm font-bold text-amber-700 hover:underline"
                        >
                          Open in Google Maps →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 2. Products — one after another */}
          {productEntries.map((entry, idx) => (
            <section
              key={`${entry.type}-${idx}`}
              className="bg-white border border-indigo-200/80 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/80 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm font-black text-indigo-900">{entry.type}</p>
              </div>
              <div className="p-4 flex flex-col sm:flex-row gap-4 sm:gap-5">
                {/* Photos — left */}
                <div className="shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                    <ImageIcon size={12} /> Issue Photos
                  </p>
                  {entry.images.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {entry.images.map((img, imgIdx) => (
                        <LeadImageThumb
                          key={imgIdx}
                          src={img}
                          className="w-24 h-24 rounded-xl border border-slate-200"
                          onZoom={setZoomImg}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>

                {/* Description — right */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Issue Description</p>
                  <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed min-h-[6rem] sm:min-h-0">
                    {entry.problem.trim() || 'No description provided for this appliance.'}
                  </p>
                </div>
              </div>
            </section>
          ))}

          {/* Technician findings (if any) */}
          {(fullLead.actual_problem || fullLead.repair_details) && (
            <section className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/80">
                <p className="text-xs font-black uppercase tracking-widest text-amber-800 flex items-center gap-2">
                  <Wrench size={14} /> Technician Findings
                </p>
              </div>
              <div className="p-4 flex flex-col sm:flex-row gap-4">
                {fullLead.actual_problem && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Actual Problem</p>
                    <p className="text-sm text-slate-800 bg-amber-50/50 border border-amber-100 rounded-xl p-3">{fullLead.actual_problem}</p>
                  </div>
                )}
                {fullLead.repair_details && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Repair / Parts</p>
                    <p className="text-sm text-slate-800 bg-amber-50/50 border border-amber-100 rounded-xl p-3">{fullLead.repair_details}</p>
                  </div>
                )}
              </div>
              {fullLead.status === 'PendingApproval' && (
                <p className="px-4 pb-4 text-xs font-bold text-violet-700">Submitted as: {getTaskTypeLabel(fullLead)}</p>
              )}
            </section>
          )}

          {showPayment && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                  <Banknote size={14} /> Payment & Warranty
                </p>
              </div>
              <div className="px-4 py-2 grid grid-cols-2 gap-x-4">
                <Field label="Agreed" value={agreed > 0 ? formatPKR(agreed) : null} />
                <Field label="Total" value={total > 0 ? formatPKR(total) : null} />
                <Field label="Collected" value={collected > 0 ? formatPKR(collected) : null} />
                <Field label="Balance" value={balance > 0 ? formatPKR(balance) : null} />
                {fullLead.warranty_months > 0 && (
                  <Field label="Warranty" value={`${fullLead.warranty_months} month(s)`} />
                )}
              </div>
            </section>
          )}

          {ws && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-black uppercase tracking-widest text-blue-700 flex items-center gap-2">
                  <Package size={14} /> Workshop Job
                </p>
              </div>
              <div className="px-4 py-2 grid grid-cols-2 gap-x-4">
                <Field label="Status" value={ws.status} />
                <Field label="Received" value={fmtDay(ws.received_date)} />
                <Field label="Delivered" value={fmtDate(ws.delivered_at)} />
                <Field label="Agreed Parts" value={ws.agreed_parts} />
                <Field label="Additional Parts" value={ws.additional_parts} />
              </div>
            </section>
          )}

          {fullLead.voice_note && (
            <section className="bg-white border border-violet-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-violet-700 flex items-center gap-2 mb-3">
                <Volume2 size={14} /> Voice Recording
              </p>
              <audio controls src={fullLead.voice_note} className="w-full h-10" />
            </section>
          )}

          {customerHistory.length > 0 && (
            <section className="bg-white border border-teal-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-teal-100 bg-teal-50/80">
                <p className="text-xs font-black uppercase tracking-widest text-teal-800">Previous Jobs (Same Customer)</p>
              </div>
              <div className="p-3 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                {customerHistory.map((job: any) => (
                  <div key={job.lead_id} className="flex flex-wrap items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-teal-900">{job.lead_id}</span>
                    <span className="text-slate-600">{job.product_type}</span>
                    <span className="font-bold text-slate-800">{job.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
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
