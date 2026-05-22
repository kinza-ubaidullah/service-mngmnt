import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Save, Loader2, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

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
  
  const togglePassword = (id: number) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const usersRes = await (role === 'ADMIN' ? api.get('/users') : api.get('/users/technicians'));
      setTechnicians(role === 'ADMIN' ? usersRes.data.users : usersRes.data.technicians);
    } catch (error) {
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

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



  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Staff Directory</h2>
              {role === 'ADMIN' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowUserModal(true)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    <UserPlus size={16} /> Create User
                  </button>
                  <button 
                    onClick={() => { setShowInviteModal(true); setGeneratedLink(''); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Save size={16} /> Invite Staff
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                    <th className="pb-4 font-bold">Name</th>
                    <th className="pb-4 font-bold hidden sm:table-cell">Role</th>
                    <th className="pb-4 font-bold hidden md:table-cell">Contact Info</th>
                    {role === 'ADMIN' && <th className="pb-4 font-bold hidden lg:table-cell">Password</th>}
                    <th className="pb-4 font-bold">Status</th>
                    <th className="pb-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {technicians.map((user: any) => (
                    <tr key={user.id} className={`${!user.is_active ? 'opacity-40' : ''} transition-opacity`}>
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{user.name}</div>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                          ${user?.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                            user?.role === 'TECHNICIAN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            user?.role === 'CALL_CENTER' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
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
                              className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                            >
                              {visiblePasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="py-3">
                        <span className={`text-[10px] font-bold ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {user.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
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

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Create System User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="group relative">
                <input required type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Full Name" />
              </div>
              <div className="group relative">
                <input required type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Email Address" />
              </div>
              <div className="group relative">
                <input required type="text" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Phone Number" />
              </div>
              <div className="group relative">
                <input required type={showModalPassword ? "text" : "password"} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-950 text-white pl-4 pr-10 py-3 rounded-xl border border-white/10 outline-none" placeholder="Password" />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="group relative">
                <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none appearance-none">
                  <option value="CALL_CENTER">Call Center Agent</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 px-4 py-3 bg-white/5 text-white font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Invite Staff Member</h3>
            <div className="space-y-6">
              <div className="group relative">
                <label className="text-xs font-bold text-slate-500 mb-2 block">Select Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none appearance-none">
                  <option value="TECHNICIAN">Technician</option>
                  <option value="CALL_CENTER">Call Center Agent</option>
                </select>
              </div>

              {!generatedLink ? (
                <button 
                  onClick={handleGenerateInvite} 
                  disabled={saving}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Generate Invite Link'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-white/10 rounded-xl break-all text-xs font-mono text-emerald-400">
                    {generatedLink}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast.success('Link copied to clipboard!');
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10"
                  >
                    Copy Link
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-3 bg-white/5 text-white font-bold rounded-xl">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffModule;
