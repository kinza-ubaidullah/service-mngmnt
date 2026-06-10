import React from 'react';
import { Search } from 'lucide-react';

interface GlobalLeadSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

const GlobalLeadSearch: React.FC<GlobalLeadSearchProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search lead ID, name, phone...',
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
      placeholder={placeholder}
      className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white outline-none focus:border-indigo-500/50 transition-all"
    />
  </div>
);

export default GlobalLeadSearch;
