import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const mode = useSelector((state: RootState) => state.theme.mode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('crm-dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('crm-dark');
      root.style.colorScheme = 'light';
    }
  }, [mode]);

  return <>{children}</>;
};

export default ThemeProvider;
