import React from 'react';
import { Image } from 'lucide-react';

interface LeadImageThumbProps {
  src?: string | null;
  alt?: string;
  className?: string;
  onZoom?: (src: string) => void;
}

const LeadImageThumb: React.FC<LeadImageThumbProps> = ({ src, alt = 'lead', className = 'w-28 h-28', onZoom }) => {
  if (!src) {
    return (
      <div className={`${className} rounded-xl border border-dashed border-slate-200/70 flex items-center justify-center text-slate-600`}>
        <Image size={16} />
      </div>
    );
  }

  return (
    <div
      className={`${className} relative rounded-xl overflow-hidden border border-slate-200/70 bg-white group/img cursor-zoom-in`}
      onClick={(e) => {
        e.stopPropagation();
        onZoom?.(src);
      }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110" />
      <div className="absolute inset-0 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="absolute -top-2 -left-2 w-40 h-40 rounded-2xl overflow-hidden border-2 border-mint-300/60 shadow-2xl shadow-mint-200/40 bg-white">
          <img src={src} alt={`${alt} zoom`} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
};

export default LeadImageThumb;
