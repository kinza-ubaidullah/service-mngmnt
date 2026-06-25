import { createSlice } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'crmThemeMode';

const getInitialMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* ignore */
  }
  return 'light';
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: getInitialMode() as ThemeMode },
  reducers: {
    setThemeMode: (state, action: { payload: ThemeMode }) => {
      state.mode = action.payload;
      try {
        localStorage.setItem(STORAGE_KEY, action.payload);
      } catch {
        /* ignore */
      }
    },
    toggleThemeMode: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, state.mode);
      } catch {
        /* ignore */
      }
    },
  },
});

export const { setThemeMode, toggleThemeMode } = themeSlice.actions;
export default themeSlice.reducer;
