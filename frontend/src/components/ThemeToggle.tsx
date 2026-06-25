import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Moon, Sun } from 'lucide-react';
import type { RootState } from '../store';
import { toggleThemeMode } from '../store/slices/themeSlice';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleThemeMode())}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all font-bold text-xs
        ${isDark
          ? 'bg-slate-800/80 border-slate-600 text-amber-300 hover:bg-slate-700'
          : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-mint-50 hover:border-mint-300'
        } ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {showLabel && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
};

export default ThemeToggle;
