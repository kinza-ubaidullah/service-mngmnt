import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { INSTAGRAM_FILTERS, getFilterCss } from '../utils/imageFilters';

export interface PostMediaItem {
  id: string;
  type: 'image' | 'video';
  originalSrc: string;
  previewSrc: string;
  filter: string;
  file?: File;
}

interface PostMediaEditorProps {
  media: PostMediaItem;
  onClose: () => void;
  onSave: (updated: PostMediaItem) => void;
}

const PostMediaEditor: React.FC<PostMediaEditorProps> = ({ media, onClose, onSave }) => {
  const [activeFilter, setActiveFilter] = useState(media.filter);

  useEffect(() => { setActiveFilter(media.filter); }, [media.id, media.filter]);

  const handleSave = () => {
    onSave({ ...media, filter: activeFilter, previewSrc: media.originalSrc });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
        <button type="button" onClick={onClose} className="p-2 text-white"><X size={24} /></button>
        <span className="text-white font-bold">Filters</span>
        <button type="button" onClick={handleSave} className="p-2 text-[#00A884]"><Check size={24} /></button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 bg-black overflow-hidden">
        {media.type === 'image' ? (
          <img
            src={media.originalSrc}
            alt="edit"
            className="max-w-full max-h-[55vh] object-contain rounded-lg"
            style={{ filter: getFilterCss(activeFilter) }}
          />
        ) : (
          <video
            src={media.originalSrc}
            className="max-w-full max-h-[55vh] object-contain rounded-lg"
            style={{ filter: getFilterCss(activeFilter) }}
            autoPlay
            muted
            loop
            playsInline
          />
        )}
      </div>

      <div className="shrink-0 bg-[#12181B] border-t border-white/10 pb-6 pt-4">
        <div className="flex gap-3 overflow-x-auto px-4 custom-scrollbar pb-2">
          {INSTAGRAM_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`shrink-0 flex flex-col items-center gap-1.5 ${activeFilter === f.id ? 'opacity-100' : 'opacity-60'}`}
            >
              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${activeFilter === f.id ? 'border-[#00A884]' : 'border-transparent'}`}>
                {media.type === 'image' ? (
                  <img src={media.originalSrc} alt={f.name} className="w-full h-full object-cover" style={{ filter: f.css }} />
                ) : (
                  <div className="w-full h-full bg-[#1e2a30] flex items-center justify-center text-[10px] text-white" style={{ filter: f.css }}>▶</div>
                )}
              </div>
              <span className={`text-[10px] font-bold ${activeFilter === f.id ? 'text-[#00A884]' : 'text-slate-400'}`}>{f.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostMediaEditor;
