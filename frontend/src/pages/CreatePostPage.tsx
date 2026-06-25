import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  X, Globe, ChevronDown, MapPin, Hash, ShoppingBag, ChevronRight,
  Image as ImageIcon, Video, Mic, Smile, BarChart3, User, Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PostMediaEditor, { type PostMediaItem } from '../components/PostMediaEditor';
import { applyFilterToImage, getFilterCss } from '../utils/imageFilters';

const VISIBILITY_OPTIONS = [
  { id: 'Public', label: 'Public', sub: 'Anyone can see this post', icon: Globe },
  { id: 'Team', label: 'Team Only', sub: 'Only your team members', icon: User },
  { id: 'Private', label: 'Private', sub: 'Only you can see this', icon: User },
];

const CreatePostPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('Public');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [location, setLocation] = useState('');
  const [hashtag, setHashtag] = useState('');
  const [product, setProduct] = useState('');
  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const [editingMedia, setEditingMedia] = useState<PostMediaItem | null>(null);
  const [posting, setPosting] = useState(false);
  const [activeMeta, setActiveMeta] = useState<'location' | 'hashtag' | 'product' | null>(null);

  const addFiles = (files: FileList | null, type: 'image' | 'video') => {
    if (!files?.length) return;
    const newItems: PostMediaItem[] = [];
    Array.from(files).forEach(file => {
      const src = URL.createObjectURL(file);
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        originalSrc: src,
        previewSrc: src,
        filter: 'normal',
        file,
      });
    });
    setMedia(prev => [...prev, ...newItems]);
  };

  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id);
      if (item?.originalSrc.startsWith('blob:')) URL.revokeObjectURL(item.originalSrc);
      return prev.filter(m => m.id !== id);
    });
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePost = async () => {
    if (!content.trim() && media.length === 0) {
      toast.error('Add some text or media to post');
      return;
    }
    setPosting(true);
    try {
      const processedMedia = await Promise.all(media.map(async m => {
        if (m.type === 'image') {
          let url = m.originalSrc;
          if (m.filter !== 'normal') url = await applyFilterToImage(m.originalSrc, m.filter);
          else if (m.file) url = await fileToDataUrl(m.file);
          return { type: 'image' as const, url, filter: m.filter };
        }
        const url = m.file ? await fileToDataUrl(m.file) : m.originalSrc;
        return { type: 'video' as const, url, filter: m.filter };
      }));

      await api.post('/posts', {
        content: content.trim(),
        visibility,
        location: location || null,
        hashtags: hashtag || null,
        product_tag: product || null,
        media: processedMedia,
      });

      toast.success('Post published!');
      navigate(-1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const vis = VISIBILITY_OPTIONS.find(v => v.id === visibility) || VISIBILITY_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#12181B] text-white flex flex-col max-w-lg mx-auto relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 shrink-0">
        <button type="button" onClick={() => navigate(-1)} className="p-2 text-slate-300 hover:text-white">
          <X size={22} />
        </button>
        <button
          type="button"
          onClick={handlePost}
          disabled={posting}
          className="bg-[#00A884] hover:bg-[#00c49a] disabled:opacity-50 text-slate-800 font-bold px-6 py-2 rounded-full text-sm transition-all"
        >
          {posting ? 'Posting...' : 'Post'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-28">
        {/* User row */}
        <div className="px-4 pt-4 flex items-start gap-3">
          <div className="w-11 h-11 rounded-full border-2 border-[#00A884] bg-[#1e2a30] flex items-center justify-center shrink-0 overflow-hidden">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-[#00A884]" />
            )}
          </div>
          <div>
            <p className="font-bold text-slate-800">{user?.name || 'You'}</p>
            <button
              type="button"
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
              className="mt-1 flex items-center gap-1.5 bg-[#1e2a30] border border-slate-200/70 rounded-full px-3 py-1 text-xs text-slate-300"
            >
              <Globe size={12} className="text-[#00A884]" />
              {visibility}
              <ChevronDown size={12} />
            </button>
            {showVisibilityMenu && (
              <div className="mt-2 bg-[#1e2a30] border border-slate-200/70 rounded-xl overflow-hidden z-10 relative">
                {VISIBILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setVisibility(opt.id); setShowVisibilityMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-mint-50/80 ${visibility === opt.id ? 'text-[#00A884]' : 'text-slate-300'}`}
                  >
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-[10px] text-slate-500">{opt.sub}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Text input */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 pt-4 pb-2 bg-transparent text-white text-lg placeholder-slate-500 outline-none resize-none min-h-[100px]"
        />

        {/* Media previews */}
        {media.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
              {media.map(item => (
                <div key={item.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingMedia(item)}
                    className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#00A884]/60 bg-[#1e2a30] block"
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.previewSrc}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: getFilterCss(item.filter) }}
                      />
                    ) : (
                      <div className="w-full h-full relative flex items-center justify-center">
                        <video
                          src={item.previewSrc}
                          className="w-full h-full object-cover"
                          style={{ filter: getFilterCss(item.filter) }}
                          muted
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                          <Play size={24} className="text-white" fill="white" />
                          <span className="text-[10px] text-white mt-1 font-bold">Video</span>
                        </div>
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-black shadow-lg"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-28 h-28 shrink-0 rounded-2xl border-2 border-dashed border-[#00A884]/40 flex flex-col items-center justify-center text-[#00A884] hover:bg-[#00A884]/5"
              >
                <ImageIcon size={24} />
                <span className="text-[10px] mt-1 font-bold">Add More</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Tap media to apply Instagram-style filters</p>
          </div>
        )}

        {/* Meta pills */}
        <div className="px-4 flex flex-wrap gap-2">
          {[
            { id: 'location' as const, icon: MapPin, label: 'Location', value: location },
            { id: 'hashtag' as const, icon: Hash, label: 'Hashtag', value: hashtag },
            { id: 'product' as const, icon: ShoppingBag, label: 'Product', value: product },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveMeta(activeMeta === p.id ? null : p.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                p.value ? 'bg-[#00A884]/10 border-[#00A884]/30 text-[#00A884]' : 'bg-[#1e2a30] border-slate-200/70 text-slate-300 hover:border-[#00A884]/30'
              }`}
            >
              <p.icon size={16} className="text-[#00A884]" />
              {p.value || p.label}
            </button>
          ))}
        </div>

        {activeMeta && (
          <div className="px-4 mt-3">
            <input
              autoFocus
              type="text"
              placeholder={activeMeta === 'location' ? 'Add location...' : activeMeta === 'hashtag' ? '#hashtag' : 'Product name...'}
              value={activeMeta === 'location' ? location : activeMeta === 'hashtag' ? hashtag : product}
              onChange={e => {
                if (activeMeta === 'location') setLocation(e.target.value);
                else if (activeMeta === 'hashtag') setHashtag(e.target.value);
                else setProduct(e.target.value);
              }}
              className="w-full bg-[#1e2a30] border border-slate-200/70 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00A884]/50"
            />
          </div>
        )}

        {/* Visibility bar */}
        <button
          type="button"
          onClick={() => setShowVisibilityMenu(true)}
          className="mx-4 mt-6 w-[calc(100%-2rem)] flex items-center gap-4 bg-[#1e2a30] border border-slate-200/70 rounded-2xl px-4 py-4 hover:border-[#00A884]/30 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-[#00A884]/20 flex items-center justify-center shrink-0">
            <vis.icon size={20} className="text-[#00A884]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-800">{vis.label}</p>
            <p className="text-xs text-slate-500">{vis.sub}</p>
          </div>
          <ChevronRight size={20} className="text-slate-500" />
        </button>
      </div>

      {/* Bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#12181B] border-t border-slate-200/70 px-6 py-4 flex justify-between items-center">
        <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-slate-400 hover:text-[#00A884] transition-colors" title="Photos">
          <ImageIcon size={24} />
        </button>
        <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2 text-slate-400 hover:text-[#00A884] transition-colors" title="Videos">
          <Video size={24} />
        </button>
        <button type="button" onClick={() => toast('Voice note — coming soon')} className="p-2 text-slate-400 hover:text-[#00A884] transition-colors" title="Voice">
          <Mic size={24} />
        </button>
        <button type="button" onClick={() => setContent(c => c + ' 😊')} className="p-2 text-slate-400 hover:text-[#00A884] transition-colors" title="Emoji">
          <Smile size={24} />
        </button>
        <button type="button" onClick={() => toast('Poll — coming soon')} className="p-2 text-slate-400 hover:text-[#00A884] transition-colors" title="Poll">
          <BarChart3 size={24} />
        </button>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addFiles(e.target.files, 'image'); e.target.value = ''; }} />
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={e => { addFiles(e.target.files, 'video'); e.target.value = ''; }} />

      {editingMedia && (
        <PostMediaEditor
          media={editingMedia}
          onClose={() => setEditingMedia(null)}
          onSave={updated => {
            setMedia(prev => prev.map(m => m.id === updated.id ? updated : m));
            setEditingMedia(null);
          }}
        />
      )}
    </div>
  );
};

export default CreatePostPage;
