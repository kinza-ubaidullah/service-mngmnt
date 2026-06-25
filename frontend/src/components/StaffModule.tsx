import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Save, Loader2, Trash2, Eye, EyeOff, Key, Shield, Copy, MessageCircle, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import RefreshButton from './RefreshButton';
import ForgotPasswordPanel from './ForgotPasswordPanel';
import ThemeToggle from './ThemeToggle';
import { useLiveData } from '../hooks/useLiveData';

interface StaffModuleProps {
  role?: 'ADMIN' | 'CALL_CENTER';
}

const StaffModule: React.FC<StaffModuleProps> = ({ role = 'ADMIN' }) => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: 'CALL_CENTER' });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState('TECHNICIAN');
  const [generatedLink, setGeneratedLink] = useState('');
  
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [resetModal, setResetModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [lastResetResult, setLastResetResult] = useState<{ user: any; password: string } | null>(null);
  const [staffTab, setStaffTab] = useState<'directory' | 'forgot'>('directory');
  
  const togglePassword = (id: number) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const usersRes = await (role === 'ADMIN' ? api.get('/users') : api.get('/users/technicians'));
      setTechnicians(role === 'ADMIN' ? usersRes.data.users : usersRes.data.technicians);
    } catch (error) {
      toast.error('Failed to load staff data');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['users'], () => fetchData({ silent: true }));

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', newUser);
      toast.success('User created successfully');
      setShowUserModal(false);
      setNewUser({ name: '', email: '', phone: '', password: '', role: 'CALL_CENTER' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent, autoGenerate = false) => {
    e.preventDefault();
    if (!resetModal.user) return;
    if (!autoGenerate && newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`/users/${resetModal.user.id}/reset-password`, {
        newPassword: autoGenerate ? undefined : newPassword,
        autoGenerate,
      });
      const pass = res.data.newPassword || newPassword;
      setLastResetResult({ user: res.data.user || resetModal.user, password: pass });
      toast.success(`Password changed for ${resetModal.user.name}`);
      setResetModal({ open: false, user: null });
      setNewPassword('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const sharePasswordWhatsApp = (u: any, pass: string) => {
    const phone = String(u.phone || '').replace(/[^0-9]/g, '');
    const loginUrl = window.location.origin + '/login';
    const msg = encodeURIComponent(
      `Assalam o Alaikum ${u.name},\n\nAap ka CRM password update ho gaya hai.\n\nLogin: ${u.email || u.phone}\nPassword: ${pass}\n\nURL: ${loginUrl}\n\n— Al Jaroshi Admin`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const handleGenerateInvite = async () => {
    console.log('Generating invite for role:', inviteRole);
    setSaving(true);
    try {
      const res = await api.post('/users/invite', { role: inviteRole });
      console.log('Invite generated successfully:', res.data);
      setGeneratedLink(res.data.inviteLink);
    } catch (error: any) {
      console.error('Invite generation failed:', error.response?.data || error.message);
      toast.error('Failed to generate invite link');
    } finally {
      setSaving(false);
    }
  };



  if (loading && technicians.length === 0) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-mint-500" size={32} /></div>;

  return (
    <div className="space-y-6">
      {role === 'ADMIN' && (
        <div className="crm-tabs rounded-2xl max-w-lg">
          <button
            type="button"
            onClick={() => setStaffTab('directory')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all w-1/2
              ${staffTab === 'directory' ? 'crm-tab-active' : 'crm-tab-idle'}`}
          >
            <Users size={16} /> Staff Directory
          </button>
          <button
            type="button"
            onClick={() => setStaffTab('forgot')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all w-1/2
              ${staffTab === 'forgot' ? 'crm-tab-active' : 'crm-tab-idle'}`}
          >
            <Shield size={16} /> Forgot Password & Resend
          </button>
        </div>
      )}

      {staffTab === 'forgot' && role === 'ADMIN' ? (
        <ForgotPasswordPanel onUserReset={fetchData} />
      ) : (
      <div className="grid grid-cols-1 gap-6">
        
        <div className="space-y-6">
          <div className="crm-card border rounded-[2rem] p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Staff Directory</h2>
              <div className="flex gap-2 items-center">
                <ThemeToggle />
                <RefreshButton onClick={refresh} loading={refreshing} />
              {role === 'ADMIN' && (
                <>
                  <button 
                    onClick={() => setShowUserModal(true)}
                    className="crm-btn-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-mint-300/25"
                  >
                    <UserPlus size={16} /> Create User
                  </button>
                  <button 
                    onClick={() => { setShowInviteModal(true); setGeneratedLink(''); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-mint-300/30"
                  >
                    <Save size={16} /> Invite Staff
                  </button>
                </>
              )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200/70 text-xs uppercase tracking-widest text-slate-500">
                    <th className="pb-4 font-bold">Name</th>
                    <th className="pb-4 font-bold hidden sm:table-cell">Role</th>
                    <th className="pb-4 font-bold hidden md:table-cell">Contact Info</th>
                    {role === 'ADMIN' && <th className="pb-4 font-bold hidden lg:table-cell">Password</th>}
                    <th className="pb-4 font-bold">Status</th>
                    <th className="pb-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {technicians.map((user: any) => (
                    <tr key={user.id} className={`${!user.is_active ? 'opacity-40' : ''} transition-opacity`}>
                      <td className="py-3">
                        <div className="font-bold text-slate-700">{user.name}</div>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                          ${user?.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                            user?.role === 'TECHNICIAN' ? 'bg-emerald-500/20 text-mint-600 border-emerald-500/30' :
                            user?.role === 'CALL_CENTER' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            user?.role === 'WORKSHOP_MANAGER' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-amber-500/20 text-amber-600 border-amber-500/30'}`}>
                          {user?.role?.replace('_', ' ') || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <div className="text-sm text-slate-300 font-medium">{user.email || 'No Email'}</div>
                        <div className="text-xs text-slate-500">{user.phone}</div>
                      </td>
                      {role === 'ADMIN' && (
                        <td className="py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300 text-sm">
                              {visiblePasswords[user.id] ? (user.plain_password || 'Legacy (Encrypted)') : '••••••••'}
                            </span>
                            <button 
                              onClick={() => togglePassword(user.id)}
                              className="text-slate-500 hover:text-mint-600 transition-colors p-1"
                            >
                              {visiblePasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="py-3">
                        <span className={`text-[10px] font-bold ${user.is_active ? 'text-mint-600' : 'text-rose-400'}`}>
                          {user.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {role === 'ADMIN' && (
                            <button
                              onClick={() => { setResetModal({ open: true, user }); setNewPassword(''); setLastResetResult(null); }}
                              className="text-[10px] font-bold px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg border border-amber-500/20 transition-all flex items-center gap-1"
                              title="Change Password"
                            >
                              <Key size={12} /> <span className="hidden sm:inline">Password</span>
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                await api.patch(`/users/${user.id}/toggle-active`);
                                fetchData();
                              } catch { toast.error('Failed'); }
                            }}
                            className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all
                              ${user.is_active
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                : 'bg-mint-100 text-mint-600 border-mint-300/40 hover:bg-emerald-500/20'
                              }`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to PERMANENTLY delete ${user.name}? This action cannot be undone.`)) {
                                try {
                                  await api.delete(`/users/${user.id}`);
                                  toast.success('User deleted successfully');
                                  fetchData();
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || 'Failed to delete user');
                                }
                              }
                            }}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md">
          <div className="crm-modal border rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Create System User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="group relative">
                <input required type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none" placeholder="Full Name" />
              </div>
              <div className="group relative">
                <input required type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none" placeholder="Email Address" />
              </div>
              <div className="group relative">
                <input required type="text" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none" placeholder="Phone Number" />
              </div>
              <div className="group relative">
                <input required type={showModalPassword ? "text" : "password"} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full crm-input text-slate-800 pl-4 pr-10 py-3 rounded-xl border border-slate-200/70 outline-none" placeholder="Password" />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-mint-600 transition-colors"
                >
                  {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="group relative">
                <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none appearance-none">
                  <option value="CALL_CENTER">Call Center Agent</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="WORKSHOP_MANAGER">Workshop Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 px-4 py-3 bg-slate-50 text-slate-800 font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-indigo-500 text-slate-800 font-bold rounded-xl flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Change Password Modal — Admin can change any user's password */}
      {resetModal.open && resetModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md">
          <div className="crm-modal border rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Change Password</h3>
            <p className="text-sm text-slate-500 mb-1">{resetModal.user.name}</p>
            <p className="text-xs text-slate-400 mb-6">{resetModal.user.role?.replace('_', ' ')} · {resetModal.user.email || resetModal.user.phone}</p>
            <form onSubmit={(e) => handleResetPassword(e, false)} className="space-y-4">
              <input
                type="text"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full crm-input px-4 py-3 rounded-xl outline-none"
                placeholder="New password (min 6 characters)"
              />
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving || newPassword.length < 6} className="flex-1 crm-btn-primary px-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save Password'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => handleResetPassword(e, true)}
                  className="crm-btn-ghost px-4 py-3 rounded-xl font-bold flex items-center gap-1"
                >
                  <Sparkles size={14} /> Auto
                </button>
              </div>
              <button type="button" onClick={() => setResetModal({ open: false, user: null })} className="w-full px-4 py-3 bg-slate-50 text-slate-800 font-bold rounded-xl">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {lastResetResult && (
        <div className="crm-card rounded-2xl p-5 border border-mint-300/40 space-y-3">
          <p className="text-sm font-bold text-slate-800">Password updated — {lastResetResult.user.name}</p>
          <div className="font-mono text-sm bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-slate-700">
            Login: {lastResetResult.user.email || lastResetResult.user.phone}<br />
            Password: <span className="font-black text-mint-600">{lastResetResult.password}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`Login: ${lastResetResult.user.email || lastResetResult.user.phone}\nPassword: ${lastResetResult.password}`);
                toast.success('Copied');
              }}
              className="crm-btn-ghost px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Copy size={14} /> Copy
            </button>
            {lastResetResult.user.phone && (
              <button
                type="button"
                onClick={() => sharePasswordWhatsApp(lastResetResult.user, lastResetResult.password)}
                className="bg-emerald-500/15 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-500/30"
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
            )}
            <button type="button" onClick={() => setLastResetResult(null)} className="text-xs text-slate-500 hover:text-slate-700 px-2">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md">
          <div className="crm-modal border rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Invite Staff Member</h3>
            <div className="space-y-6">
              <div className="group relative">
                <label className="text-xs font-bold text-slate-500 mb-2 block">Select Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none appearance-none">
                  <option value="TECHNICIAN">Technician</option>
                  <option value="CALL_CENTER">Call Center Agent</option>
                  <option value="WORKSHOP_MANAGER">Workshop Manager</option>
                </select>
              </div>

              {!generatedLink ? (
                <button 
                  onClick={handleGenerateInvite} 
                  disabled={saving}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-800 font-bold py-3 rounded-xl flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Generate Invite Link'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-slate-200/70 rounded-xl break-all text-xs font-mono text-mint-600">
                    {generatedLink}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast.success('Link copied to clipboard!');
                    }}
                    className="w-full bg-slate-50 hover:bg-mint-50 text-slate-800 font-bold py-3 rounded-xl border border-slate-200/70"
                  >
                    Copy Link
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-3 bg-slate-50 text-slate-800 font-bold rounded-xl">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffModule;
