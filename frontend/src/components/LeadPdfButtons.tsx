import React from 'react';
import { Download } from 'lucide-react';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { generateInspectionReportPDF } from '../utils/inspectionReportGenerator';
import { generateWorkshopPickupPDF } from '../utils/workshopPickupGenerator';

interface LeadPdfButtonsProps {
  lead: any;
  compact?: boolean;
  className?: string;
}

const LeadPdfButtons: React.FC<LeadPdfButtonsProps> = ({ lead, compact = false, className = '' }) => {
  if (!lead) return null;

  const outcome = lead.pending_outcome || '';
  const showInvoice = ['Completed', 'PendingApproval'].includes(lead.status) && outcome !== 'InspectionCompleted';
  const showInspection = lead.status === 'InspectionCompleted' || outcome === 'InspectionCompleted';
  const showPickup =
    lead.status === 'PickedForWorkshop' ||
    outcome === 'WorkshopDelivery' ||
    outcome === 'PickedForWorkshop';

  const btnClass = compact
    ? 'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all'
    : 'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all';

  const buttons: { label: string; onClick: () => void; colors: string }[] = [];
  if (showInvoice) buttons.push({ label: 'Invoice', onClick: () => generateInvoicePDF(lead), colors: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20' });
  if (showInspection) buttons.push({ label: 'Inspection', onClick: () => generateInspectionReportPDF(lead), colors: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20' });
  if (showPickup) buttons.push({ label: 'Pickup', onClick: () => generateWorkshopPickupPDF(lead), colors: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20' });

  if (buttons.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {buttons.map((b) => (
        <button key={b.label} type="button" onClick={(e) => { e.stopPropagation(); b.onClick(); }} className={`${btnClass} ${b.colors}`}>
          <Download size={compact ? 12 : 14} /> {b.label}
        </button>
      ))}
    </div>
  );
};

export default LeadPdfButtons;
