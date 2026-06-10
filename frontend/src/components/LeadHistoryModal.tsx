import React, { useEffect, useState } from 'react';
import { X, MapPin, Phone, MessageCircle, Download, History, User, Wrench } from 'lucide-react';
import api from '../services/api';
import { getLeadPictures, formatPKR, getFinalAmount } from '../utils/leadHelpers';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import ImageZoomModal from './ImageZoomModal';

interface LeadHistoryModalProps {
  lead: any;
  onClose: () => void;
}

const LeadHistoryModal: React.FC<LeadHistoryModalProps> = ({ lead, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [fullLead, setFullLead] = useState<any>(lead);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const pics = getLeadPictures(fullLead);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/leads/${lead.id}/history`);
        setHistory(res.data.history || []);
        if (res.data.lead) setFullLead(res.data.lead);
      } catch {
        setHistory([]);
      }
    };
    load();
  }, [lead.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl my-8 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-white">{fullLead.lead_id} — Full History</h3>
            <p className="text-xs text-slate-500 mt-1">{fullLead.status} • {formatPKR(getFinalAmount(fullLead))}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-2 text-sm">
              <p className="flex items-center gap-2 font-bold text-white"><User size={14} /> {fullLead.customer?.name}</p>
              <div className="flex gap-3">
                <a href={`tel:${fullLead.customer?.phone}`} className="text-blue-400 text-xs flex items-center gap-1"><Phone size={12} /> Call</a>
                <a href={`https://wa.me/${fullLead.customer?.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-400 text-xs flex items-center gap-1"><MessageCircle size={12} /> WhatsApp</a>
              </div>
              <p className="text-xs text-slate-400 flex items-start gap-1"><MapPin size={12} className="mt-0.5" /> {fullLead.exact_address || fullLead.customer?.exact_address || fullLead.customer?.area}</p>
              {fullLead.customer?.google_map_link && (
                <a href={fullLead.customer.google_map_link} target="_blank" rel="noreferrer" className="text-amber-400 text-xs underline">Open in Google Maps</a>
              )}
            </div>
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-indigo-400 font-bold"><Wrench size={14} /> {fullLead.product_type}</p>
              <p className="text-xs text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">{fullLead.problem_details || 'No description'}</p>
              {fullLead.actual_problem && <p className="text-xs text-slate-300"><b>Found:</b> {fullLead.actual_problem}</p>}
              {fullLead.repair_details && <p className="text-xs text-slate-300"><b>Repair:</b> {fullLead.repair_details}</p>}
              <p className="text-emerald-400 font-black">{formatPKR(getFinalAmount(fullLead))}</p>
              {fullLead.warranty_months > 0 && <p className="text-amber-400 text-xs">Warranty: {fullLead.warranty_months} month(s)</p>}
            </div>
          </div>

          {pics.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Images</p>
              <div className="flex gap-2 overflow-x-auto">
                {pics.map((pic, i) => (
                  <img key={i} src={pic} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/10 cursor-pointer shrink-0"
                    onClick={() => setZoomImg(pic)} />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-4">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-3 flex items-center gap-1"><History size={12} /> Status History</p>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No history recorded.</p>
              ) : history.map((h: any) => (
                <div key={h.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs">
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="font-bold text-slate-300">{h.action}</span>
                    <span>{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                  {h.old_status && h.new_status && (
                    <p className="text-indigo-400">{h.old_status} → {h.new_status}</p>
                  )}
                  {h.notes && <p className="text-slate-500 mt-1">{h.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex justify-end gap-2">
          {(fullLead.status === 'Completed' || fullLead.collected_amount) && (
            <button onClick={() => generateInvoicePDF(fullLead)} className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold flex items-center gap-1">
              <Download size={14} /> PDF Invoice
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs font-bold">Close</button>
        </div>
      </div>
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
    </div>
  );
};

export default LeadHistoryModal;
