import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  title?: string;
  className?: string;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  loading = false,
  title = 'Refresh',
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={loading}
    className={`text-indigo-400 hover:text-indigo-300 p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all disabled:opacity-50 ${className}`}
  >
    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
  </button>
);

export default RefreshButton;
