import React, { useState, useEffect } from 'react';
import { Lock, Shield, Eye, EyeOff, Key, Bell, Smartphone, LogOut, Loader2, Save, MapPin, Trash2, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const SettingsModule = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [securityConfig, setSecurityConfig] = useState({
    mfaEnabled: false,
    sessionLimit: 1,
    loginNotifications: true
  });

  const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
  const [newArea, setNewArea] = useState('');
  const [loadingAreas, setLoadingAreas] = useState(false);

  const fetchAreas = async () => {
    try {
      const res = await api.get('/areas');
      setAreas(res.data.areas);
    } catch (e) {}
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea.trim()) return;
    setLoadingAreas(true);
    try {
      await api.post('/areas', { name: newArea.trim() });
      toast.success('Area added successfully');
      setNewArea('');
      fetchAreas();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add area');
    } finally {
      setLoadingAreas(false);
    }
  };

  const handleDeleteArea = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this area?')) return;
    try {
      await api.delete(`/areas/${id}`);
      toast.success('Area deleted');
      fetchAreas();
    } catch (error) {
      toast.error('Failed to delete area');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Security & Privacy</h2>
          <p className="text-slate-500 font-medium">Manage your credentials and account protection</p>
        </div>
        <div className="bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Shield size={14} /> Shield Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Change Password Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Key size={80} className="text-white" />
          </div>
          
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <Lock className="text-indigo-400" size={20} />
            Change Password
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-5 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-5 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                <input 
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-5 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                  placeholder="Min 8 characters"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New</label>
                <input 
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-5 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> Update Password</>}
            </button>
          </form>
        </motion.div>

        {/* Account Security Settings */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <Shield className="text-emerald-400" size={20} />
              Protection Layer
            </h3>

            <div className="space-y-6">
              {[
                { id: 'mfa', label: 'Multi-Factor Authentication', sub: 'Extra security for your login', icon: Smartphone, color: 'text-blue-400', active: securityConfig.mfaEnabled },
                { id: 'notif', label: 'Login Notifications', sub: 'Alerts for new device sign-ins', icon: Bell, color: 'text-amber-400', active: securityConfig.loginNotifications },
              ].map((setting) => (
                <div key={setting.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-indigo-500/30 transition-all">
                      <setting.icon className={setting.color} size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{setting.label}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{setting.sub}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (setting.id === 'mfa') setSecurityConfig({...securityConfig, mfaEnabled: !securityConfig.mfaEnabled});
                      if (setting.id === 'notif') setSecurityConfig({...securityConfig, loginNotifications: !securityConfig.loginNotifications});
                      toast.success(`${setting.label} updated`);
                    }}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${setting.active ? 'bg-indigo-500' : 'bg-slate-800 border border-white/5'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${setting.active ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8 group hover:bg-red-500/10 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/10 group-hover:border-red-500/30">
                  <LogOut className="text-red-400" size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">Logout Everywhere</p>
                  <p className="text-[10px] text-red-500/60 font-medium uppercase tracking-tighter">Securely log out from all devices</p>
                </div>
              </div>
              <ArrowRight className="text-red-500/40 group-hover:translate-x-1 transition-transform" size={20} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* NEW: Area Management */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <MapPin size={80} className="text-white" />
        </div>
        
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
          <MapPin className="text-blue-400" size={20} />
          Area Management
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          <div>
            <form onSubmit={handleAddArea} className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Add New Service Area</label>
              <div className="flex gap-3">
                <input 
                  type="text"
                  required
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="flex-1 bg-slate-950/50 border border-white/5 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium text-white"
                  placeholder="e.g. Model Town"
                />
                <button 
                  type="submit" 
                  disabled={loadingAreas || !newArea.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {loadingAreas ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Add
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-slate-950/50 rounded-2xl border border-white/5 p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Configured Areas ({areas.length})</h4>
            <div className="space-y-2">
              {areas.length === 0 ? (
                <p className="text-sm text-slate-500 px-2">No areas configured yet.</p>
              ) : (
                areas.map(area => (
                  <div key={area.id} className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 p-3 rounded-xl transition-colors group">
                    <span className="text-sm font-semibold text-slate-200">{area.name}</span>
                    <button 
                      onClick={() => handleDeleteArea(area.id)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                      title="Delete Area"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ArrowRight = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
);

export default SettingsModule;
