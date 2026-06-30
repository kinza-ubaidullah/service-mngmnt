import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { APPLIANCE_OPTIONS, type LeadProductEntry } from '../utils/leadHelpers';
import { compressImageFile } from '../utils/compressImage';

interface LeadProductsEditorProps {
  products: LeadProductEntry[];
  onChange: (products: LeadProductEntry[]) => void;
  className?: string;
}

export default function LeadProductsEditor({ products, onChange, className = '' }: LeadProductsEditorProps) {
  const [productPicker, setProductPicker] = useState('');
  const [imageKeys, setImageKeys] = useState<number[]>(() => products.map((_, i) => i));

  useEffect(() => {
    setImageKeys((prev) => {
      if (prev.length === products.length) return prev;
      return products.map((_, i) => prev[i] ?? Date.now() + i);
    });
  }, [products.length]);

  const removeProduct = (idx: number) => {
    onChange(products.filter((_, i) => i !== idx));
    setImageKeys((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateProduct = (idx: number, patch: Partial<LeadProductEntry>) => {
    onChange(products.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addProduct = () => {
    if (!productPicker || products.some((p) => p.type === productPicker)) return;
    onChange([...products, { type: productPicker, problem: '', images: [] }]);
    setImageKeys((prev) => [...prev, Date.now()]);
    setProductPicker('');
  };

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">
        Appliances / Products
      </label>

      <div className="space-y-3 mb-3">
        {products.map((prod, idx) => (
          <div
            key={`${prod.type}-${idx}-${imageKeys[idx] ?? idx}`}
            className="relative bg-indigo-50/80 border border-indigo-200/70 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 bg-indigo-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-indigo-900 truncate">{prod.type}</span>
              </div>
              <button
                type="button"
                onClick={() => removeProduct(idx)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                title="Remove appliance"
                aria-label={`Remove ${prod.type}`}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-indigo-700 mb-1 uppercase tracking-wider">
                Issue Description
              </label>
              <textarea
                value={prod.problem}
                onChange={(e) => updateProduct(idx, { problem: e.target.value })}
                rows={2}
                placeholder={`Describe issue with ${prod.type}...`}
                className="w-full bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-indigo-200/70 focus:border-indigo-400 outline-none text-sm resize-none placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-indigo-700 mb-1 uppercase tracking-wider">
                {prod.type} Photos
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                key={`prod-img-${idx}-${imageKeys[idx] ?? idx}`}
                className="w-full bg-white text-slate-400 text-[10px] px-3 py-2.5 rounded-xl border border-indigo-200/70 outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-bold file:bg-indigo-500/20 file:text-indigo-700 hover:file:bg-indigo-500/30 transition-all cursor-pointer"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  try {
                    const results = await Promise.all(files.map((f) => compressImageFile(f)));
                    updateProduct(idx, { images: [...prod.images, ...results] });
                  } catch {
                    toast.error('Failed to process images');
                  }
                  e.target.value = '';
                }}
              />
              {prod.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {prod.images.map((img, imgIdx) => (
                    <div
                      key={imgIdx}
                      className="relative group w-16 h-16 rounded-lg overflow-hidden border border-indigo-200/70 bg-white"
                    >
                      <img src={img} alt={`${prod.type}-${imgIdx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          updateProduct(idx, { images: prod.images.filter((_, ii) => ii !== imgIdx) })
                        }
                        className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-90 hover:opacity-100 transition-all"
                        aria-label="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <span className="text-[10px] text-indigo-600 font-bold self-center">
                    {prod.images.length} photo{prod.images.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-xs text-slate-500 mb-3 px-1">No appliance added yet — pick one below.</p>
      )}

      <div className="flex gap-2">
        <select
          value={productPicker}
          onChange={(e) => setProductPicker(e.target.value)}
          className="flex-1 crm-input text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200/70 text-sm"
        >
          <option value="">Add another appliance...</option>
          {APPLIANCE_OPTIONS.filter((o) => !products.some((p) => p.type === o)).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addProduct}
          disabled={!productPicker}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all"
        >
          Add
        </button>
      </div>
      <p className="text-[10px] text-slate-500 mt-2 pl-1">
        Each appliance has its own issue description and photos. Use ✕ to remove any appliance.
      </p>
    </div>
  );
}
