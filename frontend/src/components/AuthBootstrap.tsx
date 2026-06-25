import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import { logout, setUser } from '../store/slices/authSlice';

type AuthBootstrapContextValue = {
  authReady: boolean;
};

const AuthBootstrapContext = createContext<AuthBootstrapContextValue>({ authReady: false });

export const useAuthReady = () => useContext(AuthBootstrapContext).authReady;

export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const stored = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!stored) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        const response = await api.get('/auth/me', { timeout: 12000 });
        if (!cancelled && response.data?.user) {
          dispatch(setUser(response.data.user));
        } else if (!cancelled) {
          dispatch(logout());
        }
      } catch (error) {
        console.error('Auth bootstrap error:', error);
        if (!cancelled) dispatch(logout());
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (!authReady) {
    return (
      <div className="crm-shell min-h-screen flex items-center justify-center text-slate-800 font-bold">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-mint-400 border-t-transparent rounded-full animate-spin" />
          <p className="animate-pulse text-slate-600">Loading ServiceOS...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthBootstrapContext.Provider value={{ authReady }}>
      {children}
    </AuthBootstrapContext.Provider>
  );
};

export default AuthBootstrap;
