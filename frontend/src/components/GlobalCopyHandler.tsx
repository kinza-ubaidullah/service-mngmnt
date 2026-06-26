import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from './CopyText';

const LEAD_ID_RE = /^\d{2}[A-Z]{3}\d+$/i;
const PHONE_RE = /^[\d+\s()-]{7,18}$/;

/** System-wide double-click copy for IDs, phones, and data-copy-value elements */
export default function GlobalCopyHandler() {
  useEffect(() => {
    const onDoubleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.cursor-copy')) return;

      const marked = target.closest('[data-copy-value]') as HTMLElement | null;
      let text = marked?.dataset.copyValue?.trim() || '';

      if (!text) {
        const raw = (target.textContent || '').trim();
        if (LEAD_ID_RE.test(raw)) text = raw.toUpperCase();
        else if (PHONE_RE.test(raw) && raw.replace(/\D/g, '').length >= 7) {
          text = raw.replace(/\s/g, '');
        }
      }

      if (!text) return;

      e.preventDefault();
      e.stopPropagation();
      const ok = await copyTextToClipboard(text);
      if (ok) toast.success(`Copied: ${text}`, { duration: 1500 });
      else toast.error('Copy failed');
    };

    document.addEventListener('dblclick', onDoubleClick);
    return () => document.removeEventListener('dblclick', onDoubleClick);
  }, []);

  return null;
}
