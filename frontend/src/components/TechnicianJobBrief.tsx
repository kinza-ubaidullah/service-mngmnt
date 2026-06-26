import React from 'react';
import { MapPin, Phone, User, Home, Package, ChevronRight, ChevronDown, Navigation, Wrench, MessageCircle } from 'lucide-react';
import LeadImageThumb from './LeadImageThumb';
import CopyText from './CopyText';
import { getProductPictures } from '../utils/leadHelpers';

type JobBrief = {
  lead_id?: string;
  product_type?: string;
  problem_details?: string;
  item_pictures?: string[] | string | null;
  house_image?: string | null;
  exact_address?: string | null;
  status?: string;
  customer?: {
    name?: string;
    phone?: string;
    area?: string;
    exact_address?: string | null;
    google_map_link?: string | null;
  };
};

interface TechnicianJobBriefProps {
  job: JobBrief;
  statusLabel: string;
  statusTone: 'returned' | 'delivery' | 'assigned' | 'completed' | 'default';
  distanceLabel?: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onZoom?: (src: string) => void;
}

const toneStyles = {
  returned: { badge: 'bg-rose-600 text-white' },
  delivery: { badge: 'bg-violet-600 text-white' },
  assigned: { badge: 'bg-blue-600 text-white' },
  completed: { badge: 'bg-emerald-600 text-white' },
  default: { badge: 'bg-slate-600 text-white' },
};

const TechnicianJobBrief: React.FC<TechnicianJobBriefProps> = ({
  job,
  statusLabel,
  statusTone,
  distanceLabel,
  isExpanded,
  onToggle,
  onZoom,
}) => {
  const tone = toneStyles[statusTone];
  const productPics = getProductPictures(job);
  const area = job.customer?.area || job.exact_address || job.customer?.exact_address || '—';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Top Bar - Blue */}
      <div className="bg-[#1a73e8] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {job.lead_id && (
            <div className="bg-black/20 text-white text-xs font-bold px-3 py-1 rounded-md border border-white/10">
              {job.lead_id}
            </div>
          )}
          {job.product_type && (
            <div className="text-white text-sm font-bold flex items-center gap-1.5">
              <Wrench size={14} className="opacity-80" />
              {job.product_type}
            </div>
          )}
        </div>
        {distanceLabel && (
          <span className="text-xs font-black text-white bg-black/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Navigation size={13} /> {distanceLabel}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Product Image row */}
        <div className="mb-4">
          {productPics[0] ? (
            <LeadImageThumb src={productPics[0]} alt="Product" className="w-[88px] h-[88px] rounded-2xl border border-slate-200" onZoom={onZoom} />
          ) : (
            <div className="w-[88px] h-[88px] rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
              <Package size={24} className="text-slate-300" />
            </div>
          )}
        </div>

        {/* Customer Section */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Customer</p>
            <div className="flex items-center gap-2">
              <User size={18} className="text-[#1a73e8]" />
              <p className="text-xl font-bold text-slate-800">{job.customer?.name || 'Unknown'}</p>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-lg shadow-sm ${tone.badge}`}>
            {statusLabel}
          </span>
        </div>

        {/* Phone Box */}
        <div className="rounded-xl bg-[#ebfcf0] border border-[#a7f3d0] px-4 py-3 mb-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#059669] mb-1">Phone</p>
          <CopyText
            value={job.customer?.phone || ''}
            label="Phone"
            className="text-lg font-black text-[#047857]"
          />
        </div>

        {/* Area Box */}
        <div className="rounded-xl bg-[#fff8e6] border border-[#fde68a] px-4 py-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#b45309] mb-1">Area</p>
          <p className="text-base font-bold text-[#92400e] flex items-center gap-2">
            <MapPin size={16} className="text-[#d97706]" />
            {area}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {job.customer?.phone ? (
            <a href={`tel:${job.customer.phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="flex-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
              <Phone size={18} /> Call
            </a>
          ) : (
            <div className="flex-1 bg-slate-200 text-slate-400 text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
              <Phone size={18} /> Call
            </div>
          )}
          
          {job.customer?.phone ? (
            <a href={`https://wa.me/${job.customer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex-1 bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
               WhatsApp
            </a>
          ) : (
            <div className="flex-1 bg-slate-200 text-slate-400 text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
               WhatsApp
            </div>
          )}

          {job.customer?.google_map_link ? (
            <a href={job.customer.google_map_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex-1 bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
              <MapPin size={18} /> Map
            </a>
          ) : (
            <div className="flex-1 bg-slate-200 text-slate-400 text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
              <MapPin size={18} /> Map
            </div>
          )}
        </div>

        {/* Expand Arrow */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {isExpanded ? <ChevronDown size={28} /> : <ChevronRight size={28} className="rotate-90" />}
        </button>
      </div>
    </div>
  );
};

export default TechnicianJobBrief;

