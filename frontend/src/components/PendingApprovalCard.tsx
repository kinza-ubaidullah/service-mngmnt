import React, { useState } from 'react';
import {
  MapPin, Phone, Calendar, Wrench, Package, Truck, ClipboardCheck,
  User, Banknote, Shield, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  getLeadPictures, formatPKR, getFinalAmount, getTaskTypeLabel, formatProductTypesDisplay,
} from '../utils/leadHelpers';
import LeadPdfButtons from './LeadPdfButtons';
import LeadHistoryModal from './LeadHistoryModal';
import PendingApprovalActions from './PendingApprovalActions';
import VoiceNotePlayer from './VoiceNotePlayer';
import CopyText from './CopyText';
import ImageZoomModal from './ImageZoomModal';
import LeadImageThumb from './LeadImageThumb';

interface PendingApprovalCardProps {
  lead: any;
  onApproved?: () => void;
  canApprove?: boolean;
}

const taskMeta = (type: string) => {
  if (type === 'Workshop Pickup') return { icon: Package, color: 'violet', label: 'Pickup' };
  if (type === 'Workshop Delivery') return { icon: Truck, color: 'indigo', label: 'Delivery' };
  if (type === 'Inspection') return { icon: ClipboardCheck, color: 'sky', label: 'Inspection' };
  return { icon: Wrench, color: 'pink', label: 'Repair' };
};

const badgeStyles: Record<string, string> = {
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
};

const borderAccent: Record<string, string> = {
  pink: 'border-l-pink-500',
  violet: 'border-l-violet-500',
  indigo: 'border-l-indigo-500',
  sky: 'border-l-sky-500',
};

const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({ lead, onApproved, canApprove = false }) => {
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pics = getLeadPictures(lead).slice(0, 6);
  const taskType = getTaskTypeLabel(lead);
  const meta = taskMeta(taskType);
  const TaskIcon = meta.icon;
  const productLabel = formatProductTypesDisplay(lead.product_type, lead);
  const collected = formatPKR(getFinalAmount(lead));

  return (
    <>
      <article className={`w-full max-w-full min-w-0 crm-card rounded-2xl border border-slate-200/70 border-l-4 ${borderAccent[meta.color]} shadow-sm overflow-visible`}>
        {/* Summary — always visible */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 min-w-0">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`p-2 rounded-xl border shrink-0 ${badgeStyles[meta.color]}`}>
                <TaskIcon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <CopyText
                    value={lead.lead_id || ''}
                    label="Lead ID"
                    className="text-[11px] font-mono font-black text-mint-700 bg-mint-50 px-2 py-0.5 rounded-md border border-mint-200"
                  />
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeStyles[meta.color]}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black text-slate-800 break-words">
                  {lead.customer?.name || 'Unknown customer'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 break-words">
                  {productLabel}
                  {lead.customer?.area && <> · {lead.customer.area}</>}
                </p>
                <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {lead.customer?.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      <CopyText value={lead.customer.phone} label="Phone" className="font-semibold" />
                    </span>
                  )}
                  {lead.technician?.name && (
                    <span>Tech: <strong>{lead.technician.name}</strong></span>
                  )}
                </p>
              </div>
            </div>
            <div className="shrink-0 sm:text-right bg-mint-50 border border-mint-200/60 rounded-xl px-4 py-2 self-start">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Collected</p>
              <p className="text-xl font-black text-mint-600">{collected}</p>
            </div>
          </div>

          {/* Quick preview */}
          {(lead.actual_problem || lead.repair_details) && !expanded && (
            <div className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 line-clamp-2">
              {lead.actual_problem && <span><strong>Problem:</strong> {lead.actual_problem}</span>}
              {lead.actual_problem && lead.repair_details && ' · '}
              {lead.repair_details && <span><strong>Work:</strong> {lead.repair_details}</span>}
            </div>
          )}

          {/* Thumbnails — wrap, no horizontal scroll */}
          {(pics.length > 0 || lead.house_image) && (
            <div className="flex flex-wrap gap-2.5">
              {lead.house_image && (
                <LeadImageThumb src={lead.house_image} alt="Location" className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl" onZoom={setZoomImg} />
              )}
              {pics.map((pic, i) => (
                <img
                  key={i}
                  src={pic}
                  alt=""
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-mint-300/50 transition-shadow"
                  onClick={() => setZoomImg(pic)}
                />
              ))}
            </div>
          )}

          {lead.voice_note && !expanded && (
            <VoiceNotePlayer src={lead.voice_note} title="Voice note" />
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2 text-xs">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><User size={11} /> Customer</p>
                {lead.problem_details && <p><span className="text-slate-500">Reported:</span> {lead.problem_details}</p>}
                {lead.visit_date && (
                  <p className="flex items-center gap-1 text-slate-600">
                    <Calendar size={11} /> {new Date(lead.visit_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2 text-xs">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><FileText size={11} /> Technician submission</p>
                <p><span className="text-slate-500">Actual problem:</span> {lead.actual_problem || '—'}</p>
                <p><span className="text-slate-500">Work done:</span> {lead.repair_details || '—'}</p>
                <p className="flex items-center gap-1">
                  <Shield size={11} className="text-amber-600" />
                  Warranty: {lead.warranty_months || 0} mo
                </p>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="text-center rounded-lg bg-white py-1.5 border border-slate-100">
                    <p className="text-[8px] text-slate-400 uppercase font-bold">Agreed</p>
                    <p className="text-xs font-black">{Number(lead.agreed_amount) > 0 ? formatPKR(lead.agreed_amount) : '—'}</p>
                  </div>
                  <div className="text-center rounded-lg bg-white py-1.5 border border-slate-100">
                    <p className="text-[8px] text-slate-400 uppercase font-bold">Total</p>
                    <p className="text-xs font-black">{Number(lead.total_amount) > 0 ? formatPKR(lead.total_amount) : '—'}</p>
                  </div>
                  <div className="text-center rounded-lg bg-mint-50 py-1.5 border border-mint-100">
                    <p className="text-[8px] text-mint-600 uppercase font-bold flex items-center justify-center gap-0.5"><Banknote size={9} /> Paid</p>
                    <p className="text-xs font-black text-mint-600">{Number(lead.collected_amount) > 0 ? formatPKR(lead.collected_amount) : '—'}</p>
                  </div>
                </div>
              </div>
              {lead.voice_note && <div className="lg:col-span-2"><VoiceNotePlayer src={lead.voice_note} title="Voice note" /></div>}
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full sm:w-auto text-xs font-bold text-slate-500 hover:text-mint-600 flex items-center justify-center sm:justify-start gap-1 transition-colors py-2"
          >
            {expanded ? <><ChevronUp size={14} /> Hide details</> : <><ChevronDown size={14} /> Show full details</>}
          </button>
        </div>

        {/* Actions — always visible */}
        <footer className="px-4 sm:px-5 py-3 border-t border-slate-200/60 bg-slate-50/90 flex flex-wrap items-center gap-2 shrink-0">
          {canApprove && (
            <PendingApprovalActions lead={lead} onDone={onApproved} onView={() => setViewOpen(true)} />
          )}
          <LeadPdfButtons lead={lead} compact />
          {lead.customer?.google_map_link && (
            <a
              href={lead.customer.google_map_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold"
            >
              <MapPin size={13} /> Map
            </a>
          )}
        </footer>
      </article>

      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />

      {viewOpen && (
        <LeadHistoryModal
          lead={lead}
          onClose={() => setViewOpen(false)}
          extraActions={
            canApprove ? (
              <PendingApprovalActions
                lead={lead}
                showView={false}
                onDone={() => { setViewOpen(false); onApproved?.(); }}
                layout="stack"
              />
            ) : undefined
          }
        />
      )}
    </>
  );
};

export default PendingApprovalCard;
