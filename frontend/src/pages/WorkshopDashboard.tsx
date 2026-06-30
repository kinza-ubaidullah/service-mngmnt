import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { LogOut, Wrench, Sparkles, Settings, Loader2, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import WorkshopModule from '../components/WorkshopModule';
import SettingsModule from '../components/SettingsModule';
import ThemeToggle from '../components/ThemeToggle';

const WorkshopDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const location = useLocation();
  const urlTab = location.pathname.split('/')[2];
  const activeTab = (urlTab || 'workshop') as 'workshop' | 'settings';

  useEffect(() => {
    if (!urlTab) {
      navigate('/workshop/workshop', { replace: true });
    }
  }, [urlTab, navigate]);

  const setActiveTab = (tab: typeof activeTab) => {
    navigate(`/workshop/${tab}`);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="crm-shell flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="text-amber-500 animate-spin mb-4" size={40} />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Authenticating Workshop Access...</p>
      </div>
    );
  }

  return (
    <div className="crm-shell text-slate-800 flex flex-col font-sans selection:bg-mint-200/50 min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-mint-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-orange-600/5 blur-[100px]" />
      </div>

      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="crm-nav backdrop-blur-xl px-6 py-4 flex justify-between items-center sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <div className="crm-icon-box p-2 rounded-lg shadow-lg shadow-mint-300/25">
            <Wrench size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-wide flex items-center gap-2">
              Workshop Panel <Sparkles size={14} className="text-amber-600" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Repair Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400 font-medium">Workshop Manager</p>
            <p className="text-sm font-bold text-slate-800">{user.name}</p>
          </div>



          <ThemeToggle />
          <button
            onClick={() => dispatch(logout())}
            className="p-2.5 crm-btn-ghost rounded-xl transition-all border border-slate-200/70 hover:border-mint-300/50"
          >
            <LogOut size={18} />
          </button>
        </div>
      </motion.nav>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full relative z-10 pb-24">
        <div className="flex crm-tabs rounded-2xl mb-8 shadow-xl max-w-md">
          <button
            onClick={() => setActiveTab('workshop')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
              ${activeTab === 'workshop' ? 'crm-tab-active shadow-sm' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Wrench size={18} /> Workshop
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
              ${activeTab === 'settings' ? 'crm-tab-active shadow-sm' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Settings size={18} /> Settings
          </button>
        </div>

        {activeTab === 'workshop' && <WorkshopModule showGateInApproval />}
        {activeTab === 'settings' && <SettingsModule />}
      </main>
    </div>
  );
};

export default WorkshopDashboard;
