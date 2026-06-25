import React from 'react';
import { MapPin, Phone, User, Home, Package, ChevronRight, ChevronDown, Navigation, Wrench } from 'lucide-react';
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
  returned: {
    accent: 'from-rose-500 to-red-600',
    border: 'border-rose-300',
    badge: 'bg-rose-600 text-white',
    headerText: 'text-white',
  },
  delivery: {
    accent: 'from-violet-500 to-purple-600',
    border: 'border-violet-300',
    badge: 'bg-violet-600 text-white',
    headerText: 'text-white',
  },
  assigned: {
    accent: 'from-sky-500 to-blue-600',
    border: 'border-sky-200',
    badge: 'bg-blue-600 text-white',
    headerText: 'text-white',
  },
  completed: {
    accent: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200',
    badge: 'bg-emerald-600 text-white',
    headerText: 'text-white',
  },
  default: {
    accent: 'from-slate-600 to-slate-700',
    border: 'border-slate-200',
    badge: 'bg-slate-600 text-white',
    headerText: 'text-white',
  },
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
    <div className={`rounded-2xl border-2 ${tone.border} bg-white overflow-hidden shadow-md`}>
      {/* Header — lead ID + product + distance */}
      <div className={`bg-gradient-to-r ${tone.accent} px-4 py-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {job.lead_id && (
              <CopyText
                value={job.lead_id}
                label="Lead ID"
                className="text-sm font-mono font-black text-white bg-black/20 px-3 py-1 rounded-lg border border-white/30"
              />
            )}
            {job.product_type && (
              <span className="text-sm font-bold text-white/95 flex items-center gap-1.5">
                <Wrench size={14} className="opacity-90" />
                {job.product_type}
              </span>
            )}
          </div>
          {distanceLabel && (
            <span className="text-xs font-black text-white bg-black/25 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
              <Navigation size={13} /> {distanceLabel}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Photos — larger, easy to tap */}
        <div className="flex gap-3">
          {job.house_image && (
            <div className="shrink-0">
              <LeadImageThumb src={job.house_image} alt="Location" className="w-[88px] h-[88px] rounded-xl" onZoom={onZoom} />
              <p className="text-[10px] font-black uppercase text-slate-500 text-center mt-1 flex items-center justify-center gap-1">
                <Home size={10} /> Location
              </p>
            </div>
          )}
          {productPics[0] ? (
            <div className="shrink-0">
              <LeadImageThumb src={productPics[0]} alt="Product" className="w-[88px] h-[88px] rounded-xl" onZoom={onZoom} />
              <p className="text-[10px] font-black uppercase text-slate-500 text-center mt-1 flex items-center justify-center gap-1">
                <Package size={10} /> Product
              </p>
            </div>
          ) : !job.house_image ? (
            <LeadImageThumb src={null} alt="No image" className="w-[88px] h-[88px] rounded-xl" />
          ) : null}
        </div>

        {/* Customer name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Customer</p>
            <p className="text-xl font-black text-slate-900 leading-tight flex items-center gap-2">
              <User size={20} className="text-blue-500 shrink-0" />
              <span className="truncate">{job.customer?.name || 'Unknown'}</span>
            </p>
          </div>
          <span className={`shrink-0 text-xs font-black uppercase tracking-wide px-3 py-1.5 rounded-lg shadow-sm ${tone.badge}`}>
            {statusLabel}
          </span>
        </div>

        {/* Phone — prominent, easy to read & copy */}
        {job.customer?.phone && (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-1">Phone</p>
            <CopyText
              value={job.customer.phone}
              label="Phone"
              className="text-lg font-mono font-black text-emerald-900 flex items-center gap-2"
            />
          </div>
        )}

        {/* Area */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Area</p>
          <p className="text-base font-bold text-amber-950 flex items-center gap-2">
            <MapPin size={16} className="text-amber-600 shrink-0" />
            {area}
          </p>
        </div>

        {/* Issue — prominent when collapsed */}
        {!isExpanded && job.problem_details && (
          <div className="rounded-xl bg-amber-100/80 border-2 border-amber-300 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 mb-1.5">Reported Issue</p>
            <p className="text-base font-semibold text-amber-950 leading-relaxed">
              {job.problem_details}
            </p>
          </div>
        )}

        {/* Expand bar — full width, clear CTA */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border-2
            ${isExpanded
              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800'}
          `}
        >
          {isExpanded ? (
            <>
              <ChevronDown size={20} />
              Hide details
            </>
          ) : (
            <>
              <ChevronRight size={20} />
              Show call, map & actions
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TechnicianJobBrief;
