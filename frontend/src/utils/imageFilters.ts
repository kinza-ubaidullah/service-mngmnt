export interface FilterPreset {
  id: string;
  name: string;
  css: string;
}

export const INSTAGRAM_FILTERS: FilterPreset[] = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
  { id: 'gingham', name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg)' },
  { id: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { id: 'lark', name: 'Lark', css: 'contrast(0.9) brightness(1.1) saturate(1.2)' },
  { id: 'reyes', name: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { id: 'juno', name: 'Juno', css: 'sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)' },
  { id: 'slumber', name: 'Slumber', css: 'saturate(0.66) brightness(1.05)' },
  { id: 'crema', name: 'Crema', css: 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9)' },
  { id: 'ludwig', name: 'Ludwig', css: 'contrast(1.05) brightness(1.05) saturate(1.2)' },
  { id: 'aden', name: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { id: 'perpetua', name: 'Perpetua', css: 'contrast(1.1) brightness(1.25) saturate(1.1)' },
  { id: 'valencia', name: 'Valencia', css: 'sepia(0.08) contrast(1.08) brightness(1.08) saturate(1.3)' },
  { id: 'willow', name: 'Willow', css: 'grayscale(0.5) contrast(0.95) brightness(0.9)' },
  { id: 'lofi', name: 'Lo-Fi', css: 'saturate(1.1) contrast(1.15)' },
  { id: 'inkwell', name: 'Inkwell', css: 'grayscale(1) brightness(1.1) contrast(1.1)' },
  { id: 'nashville', name: 'Nashville', css: 'sepia(0.25) contrast(1.15) brightness(1.05) saturate(1.2)' },
  { id: 'kelvin', name: 'Kelvin', css: 'sepia(0.15) contrast(1.25) brightness(1.1) saturate(1.4)' },
  { id: 'maven', name: 'Maven', css: 'sepia(0.2) contrast(1.05) brightness(1.05) saturate(1.15)' },
  { id: 'stinson', name: 'Stinson', css: 'sepia(0.1) contrast(0.85) brightness(1.15) saturate(0.75)' },
];

export const getFilterCss = (filterId: string) =>
  INSTAGRAM_FILTERS.find(f => f.id === filterId)?.css || 'none';

export async function applyFilterToImage(src: string, filterId: string): Promise<string> {
  if (filterId === 'normal') return src;

  const filterCss = getFilterCss(filterId);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }
      ctx.filter = filterCss;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
