import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { Lock, Shield, Eye, EyeOff, Key, Smartphone, LogOut, Loader2, Save, MapPin, Trash2, Plus, Search, UserCog, Moon, Mail, Phone, IdCard } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import CopyButton from './CopyButton';
import { setUser } from '../store/slices/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const SettingsModule = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const isAdmin = user?.role === 'ADMIN';

  const [emailValue, setEmailValue] = useState(user?.email || '');
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    setEmailValue(user?.email || '');
  }, [user?.email]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailValue.trim();
    if (trimmed === (user?.email || '')) {
      toast('No changes to save', { icon: 'ℹ️' });
      return;
    }
    setEmailSaving(true);
    try {
      const res = await api.patch('/users/profile', { email: trimmed });
      if (res.data.user) dispatch(setUser(res.data.user));
      toast.success('Email updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [securityConfig, setSecurityConfig] = useState({
    mfaEnabled: false,
    canUse2FA: false,
    loginNotifications: true,
  });
  const [twoFASetup, setTwoFASetup] = useState<{ otpauthUrl: string; secret: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [disable2FAForm, setDisable2FAForm] = useState({ password: '', code: '' });
  const [twoFALoading, setTwoFALoading] = useState(false);

  const [resetQuery, setResetQuery] = useState('');
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
  const [newArea, setNewArea] = useState('');
  const [loadingAreas, setLoadingAreas] = useState(false);

  const [customFields, setCustomFields] = useState<any[]>([]);
  const [newField, setNewField] = useState({ name: '', type: 'Text', options: '', is_required: false });
  const [loadingFields, setLoadingFields] = useState(false);

  const fetchAreasAndFields = async () => {
    try {
      const [areasRes, fieldsRes] = await Promise.all([
        api.get('/areas'),
        api.get('/finance/custom-fields?module=RecurringPayment').catch(() => ({ data: { fields: [] } }))
      ]);
      setAreas(areasRes.data.areas || []);
      setCustomFields(fieldsRes.data.fields || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchAreasAndFields();
    api.get('/auth/2fa/status').then((res) => {
      setSecurityConfig((prev) => ({
        ...prev,
        mfaEnabled: !!res.data.enabled,
        canUse2FA: !!res.data.canUse2FA,
      }));
    }).catch(() => {});
  }, []);

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea.trim()) return;
    setLoadingAreas(true);
    try {
      await api.post('/areas', { name: newArea.trim() });
      toast.success('Area added successfully');
      setNewArea('');
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
      fetchAreasAndFields();
    } catch (error) {
      toast.error('Failed to delete area');
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.name.trim()) return;
    setLoadingFields(true);
    try {
      const optionsArray = newField.type === 'Dropdown' ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : [];
      await api.post('/finance/custom-fields', {
        module: 'RecurringPayment',
        field_name: newField.name.trim(),
        field_type: newField.type,
        options: optionsArray,
        is_required: newField.is_required
      });
      toast.success('Custom field added');
      setNewField({ name: '', type: 'Text', options: '', is_required: false });
      fetchAreasAndFields();
    } catch (error) {
      toast.error('Failed to add custom field');
    } finally {
      setLoadingFields(false);
    }
  };

  const handleDeleteField = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this custom field?')) return;
    try {
      await api.delete(`/finance/custom-fields/${id}`);
      toast.success('Custom field deleted');
      fetchAreasAndFields();
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const handleStart2FA = async () => {
    setTwoFALoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setTwoFASetup({ otpauthUrl: res.data.otpauthUrl, secret: res.data.secret });
      toast.success('Scan QR code with Google Authenticator');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start 2FA setup');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFACode.trim()) return;
    setTwoFALoading(true);
    try {
      await api.post('/auth/2fa/enable', { code: twoFACode.trim() });
      setSecurityConfig((prev) => ({ ...prev, mfaEnabled: true }));
      setTwoFASetup(null);
      setTwoFACode('');
      toast.success('2FA enabled successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid code');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setTwoFALoading(true);
    try {
      await api.post('/auth/2fa/disable', disable2FAForm);
      setSecurityConfig((prev) => ({ ...prev, mfaEnabled: false }));
      setDisable2FAForm({ password: '', code: '' });
      toast.success('2FA disabled');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleLookupUser = async () => {
    if (!resetQuery.trim()) return;
    setResetLoading(true);
    try {
      const res = await api.get(`/users/lookup?q=${encodeURIComponent(resetQuery.trim())}`);
      setResetUser(res.data.found ? res.data.user : null);
      if (!res.data.found) toast.error('No user found with that email or phone');
    } catch {
      toast.error('Lookup failed');
    } finally {
      setResetLoading(false);
    }
  };

  const handleAdminResetPassword = async (autoGenerate = false) => {
    if (!resetUser) return;
    if (!autoGenerate && !resetPassword.trim()) return;
    setResetLoading(true);
    try {
      const res = await api.patch(`/users/${resetUser.id}/reset-password`, {
        newPassword: autoGenerate ? undefined : resetPassword,
        autoGenerate,
      });
      const pass = res.data.newPassword;
      toast.success(`Password reset for ${resetUser.name}${pass ? `: ${pass}` : ''}`);
      if (pass) {
        navigator.clipboard.writeText(`Login: ${resetUser.email || resetUser.phone}\nPassword: ${pass}`);
        toast.success('Credentials copied');
      }
      setResetPassword('');
      setResetUser(null);
      setResetQuery('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
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
        <div className="bg-mint-100 text-mint-600 px-4 py-2 rounded-full border border-mint-300/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Shield size={14} /> Shield Active
        </div>
      </div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="crm-card border rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Moon className="text-mint-600" size={22} />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Appearance</h3>
            <p className="text-xs text-slate-500">Switch between light and dark mode</p>
          </div>
        </div>
        <ThemeToggle showLabel />
      </motion.div>

      {/* Account Information */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="crm-card border rounded-[2.5rem] p-8 shadow-2xl"
      >
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
          <IdCard className="text-mint-600" size={20} />
          Account Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.name || '—'}</p>
              <CopyButton value={user?.name} label="name" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><IdCard size={11} /> User ID</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800 font-mono">#{user?.id ?? '—'}</p>
              <CopyButton value={user?.id} label="user ID" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Phone size={11} /> Phone</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">{user?.phone || '—'}</p>
              <CopyButton value={user?.phone} label="phone" />
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <Mail size={13} /> Email Address
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="w-full bg-white border border-slate-200/60 rounded-2xl py-4 px-5 pr-12 outline-none focus:border-mint-400/50 focus:ring-4 focus:ring-mint-300/5 transition-all text-sm font-medium"
                placeholder="you@example.com"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CopyButton value={user?.email} label="email" size={16} />
              </div>
            </div>
            <button
              type="submit"
              disabled={emailSaving}
              className="crm-btn-primary font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-mint-300/25 active:scale-[0.98] disabled:opacity-50"
            >
              {emailSaving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={16} /> Update Email</>}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 ml-1">Your email is used for login and account recovery.</p>
        </form>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Change Password Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="crm-card border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Key size={80} className="text-white" />
          </div>
          
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Lock className="text-mint-600" size={20} />
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
                  className="w-full bg-white border border-slate-200/60 rounded-2xl py-4 px-5 outline-none focus:border-mint-400/50 focus:ring-4 focus:ring-mint-300/5 transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
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
                  className="w-full bg-white border border-slate-200/60 rounded-2xl py-4 px-5 outline-none focus:border-mint-400/50 focus:ring-4 focus:ring-mint-300/5 transition-all text-sm font-medium"
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
                  className="w-full bg-white border border-slate-200/60 rounded-2xl py-4 px-5 outline-none focus:border-mint-400/50 focus:ring-4 focus:ring-mint-300/5 transition-all text-sm font-medium"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full crm-btn-primary font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-mint-300/25 active:scale-[0.98] mt-4"
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
          <div className="crm-card border rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
              <Shield className="text-mint-600" size={20} />
              Two-Factor Authentication (2FA)
            </h3>

            {!securityConfig.canUse2FA ? (
              <p className="text-sm text-slate-500">2FA is not available for your account type.</p>
            ) : securityConfig.mfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-mint-50 border border-mint-200 rounded-2xl">
                  <Smartphone className="text-mint-600" size={20} />
                  <div>
                    <p className="text-sm font-bold text-mint-700">2FA is active</p>
                    <p className="text-[10px] text-mint-600/80">Google Authenticator required at login</p>
                  </div>
                </div>
                <input
                  type="password"
                  placeholder="Your password"
                  value={disable2FAForm.password}
                  onChange={(e) => setDisable2FAForm({ ...disable2FAForm, password: e.target.value })}
                  className="w-full crm-input rounded-xl py-3 px-4 text-sm"
                />
                <input
                  type="text"
                  placeholder="6-digit authenticator code"
                  value={disable2FAForm.code}
                  onChange={(e) => setDisable2FAForm({ ...disable2FAForm, code: e.target.value })}
                  className="w-full crm-input rounded-xl py-3 px-4 text-sm"
                />
                <button
                  type="button"
                  onClick={handleDisable2FA}
                  disabled={twoFALoading}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold py-3 rounded-xl border border-red-500/20"
                >
                  {twoFALoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Disable 2FA'}
                </button>
              </div>
            ) : twoFASetup ? (
              <div className="space-y-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(twoFASetup.otpauthUrl)}`}
                  alt="2FA QR Code"
                  className="mx-auto rounded-xl border border-slate-200/70 bg-white p-2"
                />
                <p className="text-[10px] text-slate-500 text-center font-mono break-all">{twoFASetup.secret}</p>
                <input
                  type="text"
                  placeholder="Enter 6-digit code from app"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  className="w-full crm-input rounded-xl py-3 px-4 text-sm text-center tracking-widest"
                />
                <button
                  type="button"
                  onClick={handleEnable2FA}
                  disabled={twoFALoading}
                  className="w-full crm-btn-primary font-bold py-3 rounded-xl"
                >
                  {twoFALoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirm & Enable 2FA'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Protect your account with Google Authenticator. Required at every login once enabled.
                </p>
                <button
                  type="button"
                  onClick={handleStart2FA}
                  disabled={twoFALoading}
                  className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold py-4 rounded-2xl border border-blue-500/20 flex items-center justify-center gap-2"
                >
                  {twoFALoading ? <Loader2 className="animate-spin" size={18} /> : <><Smartphone size={18} /> Enable Google Authenticator 2FA</>}
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="crm-card border rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-3">
                <UserCog className="text-amber-600" size={20} />
                Forgot Password — Admin Reset
              </h3>
              <p className="text-xs text-slate-500 mb-6">Search any staff member by email or phone and set a new password.</p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={resetQuery}
                  onChange={(e) => setResetQuery(e.target.value)}
                  placeholder="Email or phone number"
                  className="flex-1 bg-white border border-slate-200/60 rounded-xl py-3 px-4 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={handleLookupUser}
                  disabled={resetLoading}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-4 rounded-xl border border-amber-500/20"
                >
                  {resetLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                </button>
              </div>
              {resetUser && (
                <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200/60">
                  <p className="text-sm font-bold text-slate-800">{resetUser.name} <span className="text-slate-500 font-normal">({resetUser.role})</span></p>
                  <p className="text-xs text-slate-500">{resetUser.email || '—'} · {resetUser.phone}</p>
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="w-full bg-white border border-slate-200/60 rounded-xl py-3 px-4 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdminResetPassword(false)}
                    disabled={resetLoading || resetPassword.length < 6}
                    className="w-full crm-btn-primary font-bold py-3 rounded-xl disabled:opacity-50"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminResetPassword(true)}
                    disabled={resetLoading}
                    className="w-full crm-btn-ghost font-bold py-3 rounded-xl"
                  >
                    Auto Generate & Copy
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">Full tools: Admin → Staff Management → Forgot Password & Resend</p>
                </div>
              )}
            </div>
          )}

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
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="crm-card border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <MapPin size={80} className="text-white" />
          </div>
          
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
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
                    className="flex-1 bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium text-white"
                    placeholder="e.g. Model Town"
                  />
                  <button 
                    type="submit" 
                    disabled={loadingAreas || !newArea.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-slate-800 font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {loadingAreas ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Add
                  </button>
                </div>
              </form>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200/60 p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Configured Areas ({areas.length})</h4>
              <div className="space-y-2">
                {areas.length === 0 ? (
                  <p className="text-sm text-slate-500 px-2">No areas configured yet.</p>
                ) : (
                  areas.map(area => (
                    <div key={area.id} className="flex items-center justify-between bg-slate-50/80 hover:bg-white/[0.05] border border-slate-200/60 p-3 rounded-xl transition-colors group">
                      <span className="text-sm font-semibold text-slate-700">{area.name}</span>
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
      )}

      {/* NEW: Custom Fields Management */}
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="crm-card border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Plus size={80} className="text-white" />
          </div>
          
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Plus className="text-pink-400" size={20} />
            Finance Custom Fields
          </h3>
          <p className="text-sm text-slate-400 mb-6">Add custom fields for Recurring Payments — payment title, vendor name, notes, attachment, status, etc.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            <div>
              <form onSubmit={handleAddField} className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Add New Field</label>
                <div className="flex gap-3">
                  <input 
                    type="text"
                    required
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    className="flex-1 bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all text-sm font-medium text-white"
                    placeholder="Field Name"
                  />
                  <select 
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all text-sm font-medium text-white"
                  >
                    <option value="Text">Text</option>
                    <option value="Number">Number</option>
                    <option value="Date">Date</option>
                    <option value="Dropdown">Dropdown</option>
                    <option value="File">File / Attachment</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={newField.is_required} onChange={e => setNewField({ ...newField, is_required: e.target.checked })}
                    className="rounded border-white/20 bg-white text-pink-500" />
                  Required field
                </label>
                {newField.type === 'Dropdown' && (
                  <input 
                    type="text"
                    required
                    value={newField.options}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    className="w-full bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:border-pink-500/50 transition-all text-sm font-medium text-white"
                    placeholder="Comma separated options (e.g. Paid, Pending, Cancelled)"
                  />
                )}
                <button 
                  type="submit" 
                  disabled={loadingFields || !newField.name.trim()}
                  className="bg-pink-500 hover:bg-pink-600 text-slate-800 font-bold py-3 px-6 rounded-xl flex items-center justify-center w-full gap-2 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50"
                >
                  {loadingFields ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Add Field
                </button>
              </form>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200/60 p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Configured Fields ({customFields.length})</h4>
              <div className="space-y-2">
                {customFields.length === 0 ? (
                  <p className="text-sm text-slate-500 px-2">No custom fields yet.</p>
                ) : (
                  customFields.map(field => (
                    <div key={field.id} className="flex flex-col bg-slate-50/80 hover:bg-white/[0.05] border border-slate-200/60 p-3 rounded-xl transition-colors group">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">{field.field_name}{field.is_required ? ' *' : ''}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase border border-slate-700 px-2 py-0.5 rounded">{field.field_type}</span>
                          <button 
                            onClick={() => handleDeleteField(field.id)}
                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                            title="Delete Field"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {field.field_type === 'Dropdown' && field.options && (
                        <p className="text-xs text-slate-500 mt-2">Options: {field.options.join(', ')}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const ArrowRight = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
);

export default SettingsModule;
