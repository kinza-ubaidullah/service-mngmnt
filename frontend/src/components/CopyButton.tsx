import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  value?: string | number | null;
  label?: string;
  size?: number;
  className?: string;
  title?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ value, label, size = 14, className = '', title }) => {
  const [copied, setCopied] = useState(false);

  const text = value == null ? '' : String(value);
  if (!text) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || `Copy ${label || text}`}
      className={`inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-mint-600 hover:bg-mint-100/60 transition-colors ${className}`}
    >
      {copied ? <Check size={size} className="text-mint-600" /> : <Copy size={size} />}
    </button>
  );
};

export default CopyButton;
