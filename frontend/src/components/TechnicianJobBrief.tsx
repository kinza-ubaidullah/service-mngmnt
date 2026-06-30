import React from 'react';
import { MapPin, Phone, Package, ChevronDown, MessageCircle, Navigation } from 'lucide-react';
import LeadImageThumb from './LeadImageThumb';
import { getProductPictures } from '../utils/leadHelpers';

type JobBrief = {
  id?: number;
  lead_id?: string;
  product_type?: string;
  problem_details?: string;
  item_pictures?: string[] | string | null;
  house_image?: string | null;
  exact_address?: string | null;
  status?: string;
  created_at?: string;
  visit_date?: string;
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
  isDetailOpen?: boolean;
  onExpand?: () => void;
  onZoom?: (src: string) => void;
}

const toneStyles = {
  returned: { badge: 'bg-rose-100 text-rose-700 border border-rose-200' },
  delivery: { badge: 'bg-violet-100 text-violet-700 border border-violet-200' },
  assigned: { badge: 'bg-blue-100 text-blue-700 border border-blue-200' },
  completed: { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  default: { badge: 'bg-slate-100 text-slate-700 border border-slate-200' },
};

const TechnicianJobBrief: React.FC<TechnicianJobBriefProps> = ({
  job,
  statusLabel,
  statusTone,
  isDetailOpen,
  onExpand,
  onZoom,
}) => {
  const tone = toneStyles[statusTone];
  const productPics = getProductPictures(job as any);
  const area = job.customer?.area || job.exact_address || job.customer?.exact_address || '—';
  const phone = job.customer?.phone || '';
  const mapLink = job.customer?.google_map_link;

  const visitLabel = job.visit_date
    ? new Date(job.visit_date).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 flex items-start gap-3">
        <div className="shrink-0">
          {productPics[0] ? (
            <div onClick={() => onZoom?.(productPics[0])}>
              <LeadImageThumb
                src={productPics[0]}
                alt="Product"
                className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-lg border border-slate-200 object-cover cursor-pointer"
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50">
              <Package size={20} className="text-slate-300" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            {job.lead_id && (
              <span className="text-[11px] font-black text-[#1a73e8] uppercase tracking-wide truncate">
                {job.lead_id}
              </span>
            )}
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${tone.badge}`}>
              {statusLabel}
            </span>
          </div>

          <p className="text-sm font-bold text-slate-800 truncate">{job.customer?.name || 'Unknown'}</p>

          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold mt-1 hover:text-[#1a73e8]"
            >
              <Phone size={11} className="shrink-0" />
              <span className="truncate">{phone}</span>
            </a>
          )}

          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
            <MapPin size={11} className="shrink-0 text-emerald-600" />
            <span className="truncate">{area}</span>
          </div>

          {visitLabel && (
            <p className="text-[10px] text-slate-400 font-semibold mt-1">{visitLabel}</p>
          )}
        </div>
      </div>

      {phone && (
        <div className="px-3 pb-2 flex gap-2">
          <a
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#1a73e8] text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
          >
            <Phone size={12} /> Call
          </a>
          <a
            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle size={12} /> WhatsApp
          </a>
          <a
            href={mapLink || '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#f59e0b] text-white text-[10px] font-bold hover:bg-amber-600 transition-colors"
          >
            <Navigation size={12} /> Navigate
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={onExpand}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-slate-100 bg-slate-50/80 hover:bg-blue-50 text-[11px] font-bold text-slate-600 hover:text-[#1a73e8] transition-colors"
      >
        <ChevronDown size={16} className={`transition-transform duration-200 ${isDetailOpen ? 'rotate-180' : ''}`} />
        {isDetailOpen ? 'Hide details' : 'Details & outcome'}
      </button>
    </div>
  );
};

export default TechnicianJobBrief;
