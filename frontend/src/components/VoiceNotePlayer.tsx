import React from 'react';
import { Download, Mic } from 'lucide-react';

interface VoiceNotePlayerProps {
  src?: string | null;
  title?: string;
  compact?: boolean;
}

const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ src, title = 'Voice Note', compact = false }) => {
  if (!src) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `voice_note_${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <audio controls src={src} className="h-8 max-w-[180px]" />
        <button type="button" onClick={handleDownload} className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200" title="Download recording">
          <Download size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 flex items-center gap-1.5">
        <Mic size={12} /> {title}
      </p>
      <audio controls src={src} className="w-full" />
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900"
      >
        <Download size={14} /> Download recording
      </button>
    </div>
  );
};

export default VoiceNotePlayer;
