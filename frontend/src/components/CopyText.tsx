import React from 'react';
import toast from 'react-hot-toast';

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
}

interface CopyTextProps {
  value?: string | number | null;
  label?: string;
  className?: string;
  children?: React.ReactNode;
  as?: 'span' | 'div';
}

const CopyText: React.FC<CopyTextProps> = ({
  value,
  label,
  className = '',
  children,
  as: Tag = 'span',
}) => {
  const text = value == null ? '' : String(value);
  if (!text) return null;

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await copyTextToClipboard(text);
    if (ok) toast.success(`${label || 'Copied'}: ${text}`, { duration: 1500 });
    else toast.error('Copy failed');
  };

  return (
    <Tag
      onDoubleClick={handleDoubleClick}
      className={`cursor-copy select-text ${className}`}
      title={`Double-click to copy ${label || text}`}
    >
      {children ?? text}
    </Tag>
  );
};

export default CopyText;
