import React from 'react';
import { getLeadProductEntries } from '../utils/leadHelpers';

interface LeadProductsTreeProps {
  lead: {
    products?: Array<{ product_type: string; problem_details?: string | null }>;
    product_type?: string | null;
    problem_details?: string | null;
    item_pictures?: string[] | string | null;
    house_image?: string | null;
  };
  compact?: boolean;
  className?: string;
}

export default function LeadProductsTree({ lead, compact = false, className = '' }: LeadProductsTreeProps) {
  const entries = getLeadProductEntries(lead);

  return (
    <div className={`space-y-2 ${className}`}>
      {entries.map((entry, idx) => (
        <div
          key={`${entry.type}-${idx}`}
          className={`relative pl-4 border-l-2 border-indigo-200 ${idx < entries.length - 1 ? 'pb-1' : ''}`}
        >
          <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-white" />
          <div className={`${compact ? 'space-y-0.5' : 'space-y-1'}`}>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200">
              {entry.type}
            </span>
            <p className={`text-slate-600 ${compact ? 'text-[11px] line-clamp-2' : 'text-xs'} leading-relaxed`}>
              {entry.problem.trim() || 'No issue description yet.'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
