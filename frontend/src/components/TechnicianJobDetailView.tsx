import React from 'react';
import { MapPin, Phone, User, Package, Navigation, Wrench, Download, Eye, PhoneOff, ClipboardCheck, Truck, MessageCircle, FileText, Calendar, RotateCcw, Play } from 'lucide-react';
import CopyText from './CopyText';
import { getProductPictures, getLeadPictures, formatPKR } from '../utils/leadHelpers';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { generateInspectionReportPDF } from '../utils/inspectionReportGenerator';
import { generateWorkshopPickupPDF } from '../utils/workshopPickupGenerator';
import { generateCompleteRepairPDF } from '../utils/completeRepairGenerator';

const isDeliveryJob = (job: any, userId?: number) =>
  !!userId &&
  job.workshop_job?.delivery_assigned_to === userId &&
  job.workshop_job?.status === 'Ready';

const statusBadge = (job: any, isReturned: boolean, isDelivery: boolean) => {
  if (isReturned) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (isDelivery) return 'bg-violet-100 text-violet-700 border-violet-200';
  if (job.status === 'Assigned' || job.status === 'InProgress') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (job.status === 'PendingApproval') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (job.status === 'Completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function TechnicianJobDetailView({
  job,
  user,
  onZoom,
  onAction,
  onNoAnswer,
  onMarkDelivered,
  onHistory,
  onStartWork,
  onReschedule,
}: any) {
  if (!job) return null;

  const productPics = getProductPictures(job);
  const allPics = getLeadPictures(job);
  const extraProductPics = productPics.slice(1);
  const isDelivery = isDeliveryJob(job, user?.id);
  const isReturned = job.status === 'Complaint' || job.status === 'Reopened';
  const statusLabel = isReturned ? 'RETURNED' : isDelivery ? 'DELIVERY' : job.status === 'InProgress' ? 'IN PROGRESS' : job.status?.toUpperCase() || 'ASSIGNED';
  const visitLabel = job.visit_date
    ? new Date(job.visit_date).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
  const canAct = !['Completed', 'PickedForWorkshop', 'PendingApproval'].includes(job.status) && !isDelivery;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Job header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-black text-slate-800 truncate">{job.lead_id}</h2>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${statusBadge(job, isReturned, isDelivery)}`}>
            {statusLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onHistory(job)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
        >
          <Eye size={14} /> History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto crm-scrollbar p-5 space-y-5">
        {/* Customer + quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
              <User size={13} /> Customer Information
            </h3>
            <div className="flex gap-4">
              <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white">
                {productPics[0] ? (
                  <img
                    src={productPics[0]}
                    alt="Appliance"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                    onClick={() => onZoom(productPics[0])}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="text-slate-300" size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Name</p>
                  <p className="text-sm font-bold text-slate-800">{job.customer?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    {job.customer?.phone}
                    <CopyText value={job.customer?.phone} label="" />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Area</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{job.customer?.area || job.exact_address || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-3 gap-2 content-start">
            <a
              href={`tel:${job.customer?.phone}`}
              className="flex flex-col items-center justify-center gap-1.5 bg-[#1a73e8] hover:bg-blue-700 text-white py-4 rounded-xl text-[11px] font-bold transition-colors shadow-sm"
            >
              <Phone size={18} /> Call
            </a>
            <a
              href={`https://wa.me/${job.customer?.phone?.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 bg-[#059669] hover:bg-emerald-700 text-white py-4 rounded-xl text-[11px] font-bold transition-colors shadow-sm"
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
            <a
              href={job.customer?.google_map_link || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 bg-[#f59e0b] hover:bg-amber-600 text-white py-4 rounded-xl text-[11px] font-bold transition-colors shadow-sm"
            >
              <Navigation size={18} /> Navigate
            </a>
          </div>
        </div>

        {/* Issue description */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
            <FileText size={13} /> Issue Description
          </h3>
          <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
            {job.product_type ? `[${job.product_type}]: ` : ''}
            {job.problem_details || 'No description provided.'}
          </p>
        </div>

        {/* Attachments */}
        {allPics.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Attachments</h3>
            <div className="flex gap-2 flex-wrap">
              {allPics.slice(0, 6).map((pic: string, idx: number) => (
                <img
                  key={idx}
                  src={pic}
                  alt={`Attachment ${idx + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400"
                  onClick={() => onZoom(pic)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment</p>
            <p className="text-xs font-bold text-slate-600">Agreed Amount</p>
            <p className="text-sm font-black text-emerald-600">
              {job.agreed_amount ? formatPKR(job.agreed_amount) : formatPKR(job.total_amount || 0)}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Appliance</p>
            <p className="text-sm font-bold text-slate-800 line-clamp-2">{job.product_type || '—'}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <Calendar size={11} /> Visit Date
            </p>
            <p className="text-sm font-bold text-slate-800">{visitLabel}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Outcome</p>
            <p className="text-sm font-bold text-slate-800">{job.pending_outcome || job.status || 'Pending'}</p>
          </div>
        </div>

        {/* Notes */}
        {(job.actual_problem || job.repair_details || job.rejection_note) && (
          <div className="bg-[#fffdf7] border border-amber-200 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase text-amber-700 tracking-wider flex items-center gap-2 mb-3">
              <Wrench size={13} /> Notes
            </h3>
            {job.rejection_note && (
              <p className="text-sm text-rose-700 font-semibold mb-2">Rejection: {job.rejection_note}</p>
            )}
            {job.actual_problem && (
              <p className="text-sm text-slate-700 mb-1"><span className="font-bold">Problem:</span> {job.actual_problem}</p>
            )}
            {job.repair_details && (
              <p className="text-sm text-slate-700"><span className="font-bold">Repairs:</span> {job.repair_details}</p>
            )}
          </div>
        )}

        {extraProductPics.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Additional Photos</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 crm-scrollbar">
              {extraProductPics.map((pic: string, idx: number) => (
                <img
                  key={idx}
                  src={pic}
                  alt="Additional"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 shrink-0"
                  onClick={() => onZoom(pic)}
                />
              ))}
            </div>
          </div>
        )}

        {(['Completed', 'InspectionCompleted', 'PickedForWorkshop', 'PendingApproval'].includes(job.status)) && (
          <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-3">
              <Download size={13} /> Documents
            </h3>
            <div className="flex flex-wrap gap-2">
              {(job.status === 'Completed' || (job.status === 'PendingApproval' && job.pending_outcome === 'Completed')) && (
                <button type="button" onClick={() => generateInvoicePDF(job)} className="text-xs font-bold px-3 py-2 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200 hover:bg-blue-100 flex items-center gap-2">
                  <Download size={14} /> Repair PDF
                </button>
              )}
              {job.workshop_job?.status === 'Delivered' && (
                <button type="button" onClick={() => generateCompleteRepairPDF(job)} className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-2">
                  <Download size={14} /> Complete PDF
                </button>
              )}
              {(job.status === 'InspectionCompleted' || (job.status === 'PendingApproval' && job.pending_outcome === 'InspectionCompleted')) && (
                <button type="button" onClick={() => generateInspectionReportPDF(job)} className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center gap-2">
                  <Download size={14} /> Inspection PDF
                </button>
              )}
              {(job.status === 'PickedForWorkshop' || (job.status === 'PendingApproval' && job.pending_outcome === 'PickedForWorkshop')) && (
                <button type="button" onClick={() => generateWorkshopPickupPDF(job)} className="text-xs font-bold px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-2">
                  <Download size={14} /> Pickup PDF
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 border-t border-slate-200 bg-white p-4 flex flex-wrap gap-2 justify-end">
        {canAct && (
          <>
            <button
              type="button"
              onClick={onNoAnswer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-rose-200 text-rose-600 bg-white hover:bg-rose-50 font-bold text-sm transition-colors"
            >
              <PhoneOff size={16} /> No Answer
            </button>
            <button
              type="button"
              onClick={() => onReschedule?.(job)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 bg-white hover:bg-amber-50 font-bold text-sm transition-colors"
            >
              <RotateCcw size={16} /> Reschedule
            </button>
            {job.status === 'Assigned' && (
              <button
                type="button"
                onClick={() => onStartWork?.(job)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors"
              >
                <Play size={16} /> Start Work
              </button>
            )}
            <button
              type="button"
              onClick={() => onAction(job)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors"
            >
              <ClipboardCheck size={16} /> Complete Job
            </button>
          </>
        )}
        {isDelivery && (
          <button
            type="button"
            onClick={onMarkDelivered}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors"
          >
            <Truck size={16} /> Mark Delivered
          </button>
        )}
      </div>
    </div>
  );
}
