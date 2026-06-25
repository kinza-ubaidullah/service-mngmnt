import React from 'react';
import { Home, Package, Camera, ZoomIn } from 'lucide-react';
import { getLabeledLeadImages, type LabeledLeadImage } from '../utils/leadHelpers';

interface LeadImageGalleryProps {
  lead: any;
  onZoom?: (src: string) => void;
  className?: string;
}

const categoryIcon = (category: LabeledLeadImage['category']) => {
  if (category === 'house') return <Home size={11} />;
  if (category === 'product') return <Package size={11} />;
  return <Camera size={11} />;
};

const categoryBadge = (category: LabeledLeadImage['category']) => {
  if (category === 'house') return 'bg-amber-100 text-amber-600 border-amber-300/50';
  if (category === 'product') return 'bg-mint-100 text-mint-600 border-mint-300/50';
  return 'bg-blue-100 text-blue-600 border-blue-300/50';
};

const LeadImageGallery: React.FC<LeadImageGalleryProps> = ({ lead, onZoom, className = '' }) => {
  const images = getLabeledLeadImages(lead);
  if (images.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">No images attached to this lead.</p>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${className}`}>
      {images.map((img, i) => (
        <div key={i} className="bg-white border border-slate-200/70 rounded-2xl overflow-hidden">
          <div className="relative group">
            <img
              src={img.src}
              alt={img.title}
              className="w-full h-36 sm:h-40 object-cover cursor-pointer"
              onClick={() => onZoom?.(img.src)}
            />
            {onZoom && (
              <button
                type="button"
                onClick={() => onZoom(img.src)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="View full size"
              >
                <ZoomIn size={13} />
              </button>
            )}
          </div>
          <div className="p-2.5 space-y-1">
            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${categoryBadge(img.category)}`}>
              {categoryIcon(img.category)} {img.title}
            </span>
            <p className="text-[10px] text-slate-500 leading-snug">{img.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LeadImageGallery;
