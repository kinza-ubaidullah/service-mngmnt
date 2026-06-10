import React, { useState } from 'react';
import { CheckCircle2, MapPin, User, Wrench } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getLeadPictures, formatPKR, getFinalAmount } from '../utils/leadHelpers';
import LeadPdfButtons from './LeadPdfButtons';
import ImageZoomModal from './ImageZoomModal';

interface PendingApprovalCardProps {
  lead: any;
  onApproved?: () => void;
  canApprove?: boolean;
}

const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({ lead, onApproved, canApprove = false }) => {
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const pics = getLeadPictures(lead);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.post(`/leads/${lead.id}/approve`);
      toast.success('Job approved!');
      onApproved?.();
    } catch {
      toast.error('Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-pink-950/40 to-slate-900/80 border border-pink-500/30 rounded-3xl p-6 shadow-xl shadow-pink-500/10">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest bg-pink-500/10 px-2 py-1 rounded border border-pink-500/20">
            Pending Final Approval
          </span>
          <h3 className="text-xl font-black text-white mt-2">{lead.lead_id}</h3>
          <p className="text-xs text-pink-300/80 mt-1">
            Outcome: {lead.pending_outcome || 'Completed'} • Tech: {lead.technician?.name || 'N/A'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Amount Collected</p>
          <p className="text-2xl font-black text-emerald-400">{formatPKR(getFinalAmount(lead))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 text-white font-bold"><User size={14} className="text-pink-400" /> {lead.customer?.name}</p>
          <p className="flex items-center gap-2 text-slate-400 text-xs"><Wrench size={14} /> {lead.product_type}</p>
          <p className="flex items-start gap-2 text-slate-400 text-xs"><MapPin size={14} className="mt-0.5 shrink-0" /> {lead.exact_address || lead.customer?.area}</p>
          <p className="text-xs text-amber-400/90 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg">{lead.problem_details}</p>
        </div>
        <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 space-y-2 text-xs">
          <p><span className="text-slate-500">Actual Problem:</span> <span className="text-slate-200">{lead.actual_problem || '—'}</span></p>
          <p><span className="text-slate-500">Work Done:</span> <span className="text-slate-200">{lead.repair_details || '—'}</span></p>
          <p><span className="text-slate-500">Warranty:</span> <span className="text-amber-400 font-bold">{lead.warranty_months || 0} month(s)</span></p>
        </div>
      </div>

      {pics.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Product Pictures</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pics.map((pic, i) => (
              <img
                key={i}
                src={pic}
                alt={`product-${i}`}
                className="w-24 h-24 rounded-xl object-cover border-2 border-pink-500/30 cursor-pointer hover:scale-105 transition-transform shrink-0"
                onClick={() => setZoomImg(pic)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-xl text-sm transition-all disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {approving ? 'Approving...' : 'Approve Job'}
          </button>
        )}
        <LeadPdfButtons lead={lead} />
        {lead.customer?.google_map_link && (
          <a href={lead.customer.google_map_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold">
            <MapPin size={14} /> Location
          </a>
        )}
      </div>
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
    </div>
  );
};

export default PendingApprovalCard;
