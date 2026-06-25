import React from 'react';
import { MapPin, Phone, User, Home, Package } from 'lucide-react';
import LeadImageThumb from './LeadImageThumb';
import CopyText from './CopyText';
import { getProductPictures } from '../utils/leadHelpers';

interface LeadSummaryHeaderProps {
  lead: {
    lead_id?: string;
    product_type?: string;
    problem_details?: string;
    item_pictures?: string[] | string | null;
    house_image?: string | null;
    exact_address?: string | null;
    customer?: {
      name?: string;
      phone?: string;
      area?: string;
      exact_address?: string | null;
    };
  };
  onZoom?: (src: string) => void;
  showProblem?: boolean;
  className?: string;
  distanceLabel?: string | null;
}

const LeadSummaryHeader: React.FC<LeadSummaryHeaderProps> = ({
  lead,
  onZoom,
  showProblem = false,
  className = '',
  distanceLabel,
}) => {
  const productPics = getProductPictures(lead);
  const address = lead.exact_address || lead.customer?.exact_address || lead.customer?.area || 'No address';

  return (
    <div className={`flex gap-3 min-w-0 ${className}`}>
      <div className="flex gap-2 shrink-0">
        {lead.house_image ? (
          <div className="relative">
            <LeadImageThumb
              src={lead.house_image}
              alt="Location"
              className="w-24 h-24 shrink-0"
              onZoom={onZoom}
            />
            <span className="absolute bottom-0 left-0 right-0 text-[8px] font-black uppercase text-white bg-slate-900/70 text-center py-0.5 rounded-b-xl flex items-center justify-center gap-0.5">
              <Home size={8} /> Location
            </span>
          </div>
        ) : null}
        {productPics[0] ? (
          <div className="relative">
            <LeadImageThumb
              src={productPics[0]}
              alt={lead.product_type || 'Product'}
              className="w-24 h-24 shrink-0"
              onZoom={onZoom}
            />
            <span className="absolute bottom-0 left-0 right-0 text-[8px] font-black uppercase text-white bg-emerald-800/80 text-center py-0.5 rounded-b-xl flex items-center justify-center gap-0.5">
              <Package size={8} /> Product
            </span>
          </div>
        ) : !lead.house_image ? (
          <LeadImageThumb src={null} alt="No image" className="w-24 h-24 shrink-0" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          {lead.lead_id && (
            <CopyText
              value={lead.lead_id}
              label="Lead ID"
              className="text-[10px] font-mono font-bold text-mint-600 bg-mint-100 px-2 py-0.5 rounded border border-mint-300/40"
            />
          )}
          {lead.product_type && (
            <span className="text-[10px] font-bold text-slate-600">{lead.product_type}</span>
          )}
          {distanceLabel && (
            <span className="text-[10px] font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
              {distanceLabel}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
          <User size={12} className="text-slate-500 shrink-0" />
          {lead.customer?.name || 'Unknown customer'}
        </p>
        <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 truncate">
          <Phone size={11} className="text-emerald-600 shrink-0" />
          {lead.customer?.phone ? (
            <CopyText value={lead.customer.phone} label="Phone" className="truncate font-semibold" />
          ) : '—'}
        </p>
        <p className="text-xs text-slate-600 flex items-start gap-1.5 mt-0.5 line-clamp-2">
          <MapPin size={11} className="text-amber-600 shrink-0 mt-0.5" />
          {address}
        </p>
        {showProblem && lead.problem_details && (
          <p className="text-[11px] text-amber-700 mt-1.5 line-clamp-2 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
            {lead.problem_details}
          </p>
        )}
      </div>
    </div>
  );
};

export default LeadSummaryHeader;
