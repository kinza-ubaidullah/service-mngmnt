import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { generateInspectionReportPDF } from '../utils/inspectionReportGenerator';
import { generateWorkshopPickupPDF } from '../utils/workshopPickupGenerator';
import { normalizeJobForPdf } from '../utils/pdfJobLoader';

interface LeadPdfButtonsProps {
  lead: any;
  compact?: boolean;
  className?: string;
}

const LeadPdfButtons: React.FC<LeadPdfButtonsProps> = ({ lead, compact = false, className = '' }) => {
  const [loading, setLoading] = useState(false);
  if (!lead) return null;

  const job = normalizeJobForPdf(lead);
  const outcome = job.pending_outcome || '';
  const showInvoice = ['Completed', 'PendingApproval'].includes(job.status) && outcome !== 'InspectionCompleted';
  const showInspection = job.status === 'InspectionCompleted' || outcome === 'InspectionCompleted';
  const showPickup =
    job.status === 'PickedForWorkshop' ||
    outcome === 'WorkshopDelivery' ||
    outcome === 'PickedForWorkshop';

  const btnClass = compact
    ? 'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all'
    : 'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all';

  const runPdf = async (label: string, fn: (job: any) => Promise<void>) => {
    setLoading(true);
    try {
      await fn(job);
    } catch {
      toast.error(`Failed to generate ${label} PDF`);
    } finally {
      setLoading(false);
    }
  };

  const buttons: { label: string; onClick: () => void; colors: string }[] = [];
  if (showInvoice) buttons.push({ label: 'Invoice', onClick: () => runPdf('Invoice', generateInvoicePDF), colors: 'bg-mint-100 hover:bg-indigo-500/20 text-mint-600 border-mint-300/40' });
  if (showInspection) buttons.push({ label: 'Inspection', onClick: () => runPdf('Inspection', generateInspectionReportPDF), colors: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/20' });
  if (showPickup) buttons.push({ label: 'Pickup', onClick: () => runPdf('Pickup', generateWorkshopPickupPDF), colors: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20' });

  if (buttons.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {buttons.map((b) => (
        <button key={b.label} type="button" disabled={loading} onClick={(e) => { e.stopPropagation(); b.onClick(); }} className={`${btnClass} ${b.colors} disabled:opacity-50`}>
          {loading ? <Loader2 size={compact ? 12 : 14} className="animate-spin" /> : <Download size={compact ? 12 : 14} />} {b.label}
        </button>
      ))}
    </div>
  );
};

export default LeadPdfButtons;
