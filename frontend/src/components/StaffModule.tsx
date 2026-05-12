import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Save, Loader2, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StaffModule = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Team Form
  const [newTeam, setNewTeam] = useState({
    name: '',
    payment_type: 'commission',
    rate: '',
    salary: ''
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: 'CALL_CENTER' });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState('TECHNICIAN');
  const [generatedLink, setGeneratedLink] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, usersRes] = await Promise.all([
        api.get('/teams'),
        api.get('/users')
      ]);
      setTeams(teamsRes.data.teams);
      setTechnicians(usersRes.data.users);
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
    setSaving(true);
    try {
      const res = await api.post('/users/invite', { role: inviteRole });
      setGeneratedLink(res.data.inviteLink);
    } catch (error) {
      toast.error('Failed to generate invite link');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payment_model: any = { type: newTeam.payment_type };
      if (newTeam.payment_type === 'commission' || newTeam.payment_type === 'salary_commission') {
        payment_model.rate = Number(newTeam.rate);
      }
      if (newTeam.payment_type === 'fixed' || newTeam.payment_type === 'salary_commission') {
        payment_model.salary = Number(newTeam.salary);
      }

      await api.post('/teams', {
        name: newTeam.name,
        payment_model
      });
      toast.success('Team / Payment Model Created');
      setNewTeam({ name: '', payment_type: 'commission', rate: '', salary: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (userId: number, teamId: string) => {
    try {
      await api.post('/teams/assign', { userId, teamId });
      toast.success('Assignment updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update assignment');
    }
  };

  // Edit Team
  const [editTeam, setEditTeam] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', payment_type: 'commission', rate: '', salary: '' });

  const openEditModal = (team: any) => {
    const pm = team.payment_model || {};
    setEditTeam(team);
    setEditForm({
      name: team.name,
      payment_type: pm.type || 'commission',
      rate: pm.rate?.toString() || '',
      salary: pm.salary?.toString() || ''
    });
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam) return;
    setSaving(true);
    try {
      const payment_model: any = { type: editForm.payment_type };
      if (editForm.payment_type === 'commission' || editForm.payment_type === 'salary_commission') payment_model.rate = Number(editForm.rate);
      if (editForm.payment_type === 'fixed' || editForm.payment_type === 'salary_commission') payment_model.salary = Number(editForm.salary);
      await api.put(`/teams/${editTeam.id}`, { name: editForm.name, payment_model });
      toast.success('Team updated!');
      setEditTeam(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? All technicians will be unassigned.`)) return;
    try {
      await api.delete(`/teams/${id}`);
      toast.success('Team deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Teams / Payment Models List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Users className="text-indigo-400" /> Payment Models & Teams
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(team => (
                <div key={team.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl group hover:border-indigo-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-white">{team.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {team.payment_model?.type || 'Standard'}
                      </span>
                      <button onClick={() => openEditModal(team)} className="p-1.5 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-all" title="Edit"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteTeam(team.id, team.name)} className="p-1.5 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm">
                    {team.payment_model?.salary && (
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-500">Fixed Salary:</span> 
                        <span className="font-bold">Rs. {team.payment_model.salary}</span>
                      </div>
                    )}
                    {team.payment_model?.rate && (
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-500">Commission Rate:</span> 
                        <span className="font-bold text-emerald-400">{team.payment_model.rate}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 text-xs text-slate-500 font-medium">
                    {team.users.length} Technicians Assigned
                  </div>
                </div>
              ))}
              {teams.length === 0 && <p className="text-slate-500 italic">No teams created yet.</p>}
            </div>
          </div>

          {/* Technicians List */}
          <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Staff Directory</h2>
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
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                    <th className="pb-4 font-bold">Name</th>
                    <th className="pb-4 font-bold">Role</th>
                    <th className="pb-4 font-bold">Contact</th>
                    <th className="pb-4 font-bold">Status</th>
                    <th className="pb-4 font-bold text-right">Team / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {technicians.map((user: any) => (
                    <tr key={user.id} className={`${!user.is_active ? 'opacity-40' : ''} transition-opacity`}>
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{user.name}</div>
                        <div className="text-xs text-slate-600">{user.email}</div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                          ${user?.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                            user?.role === 'TECHNICIAN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            user?.role === 'CALL_CENTER' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                          {user?.role?.replace('_', ' ') || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-sm">{user.phone}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {user.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role === 'TECHNICIAN' && (
                            <select
                              className="bg-slate-950 text-white text-xs px-2 py-1.5 rounded-lg border border-white/10 outline-none"
                              value={user.team_id || ''}
                              onChange={(e) => handleAssign(user.id, e.target.value)}
                            >
                              <option value="">No Team</option>
                              {teams.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
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

        {/* Create Form */}
        <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-8 h-max sticky top-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <UserPlus className="text-emerald-400" /> Create Team Setup
          </h2>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div className="group relative">
              <input required type="text" value={newTeam.name} onChange={(e) => setNewTeam({...newTeam, name: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Team / Model Name" />
            </div>
            
            <div className="group relative">
              <label className="text-xs font-bold text-slate-500 mb-2 block">Payment Structure</label>
              <select value={newTeam.payment_type} onChange={(e) => setNewTeam({...newTeam, payment_type: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none appearance-none">
                <option value="commission">Pure Commission (%)</option>
                <option value="fixed">Fixed Salary</option>
                <option value="salary_commission">Base Salary + Commission (%)</option>
              </select>
            </div>

            {(newTeam.payment_type === 'fixed' || newTeam.payment_type === 'salary_commission') && (
              <div className="group relative">
                <input required type="number" value={newTeam.salary} onChange={(e) => setNewTeam({...newTeam, salary: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Monthly Salary Amount" />
              </div>
            )}

            {(newTeam.payment_type === 'commission' || newTeam.payment_type === 'salary_commission') && (
              <div className="group relative">
                <input required type="number" max="100" value={newTeam.rate} onChange={(e) => setNewTeam({...newTeam, rate: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Commission Rate (%)" />
              </div>
            )}

            <button type="submit" disabled={saving} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl mt-4 flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Create Model
            </button>
          </form>
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
                <input required type="text" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Password" />
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

      {/* Edit Team Modal */}
      {editTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Edit Team: {editTeam.name}</h3>
            <form onSubmit={handleEditTeam} className="space-y-4">
              <input required type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Team Name" />
              <select value={editForm.payment_type} onChange={(e) => setEditForm({...editForm, payment_type: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none appearance-none">
                <option value="commission">Pure Commission (%)</option>
                <option value="fixed">Fixed Salary</option>
                <option value="salary_commission">Base Salary + Commission (%)</option>
              </select>
              {(editForm.payment_type === 'fixed' || editForm.payment_type === 'salary_commission') && (
                <input required type="number" value={editForm.salary} onChange={(e) => setEditForm({...editForm, salary: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Monthly Salary" />
              )}
              {(editForm.payment_type === 'commission' || editForm.payment_type === 'salary_commission') && (
                <input required type="number" max="100" value={editForm.rate} onChange={(e) => setEditForm({...editForm, rate: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Commission Rate (%)" />
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditTeam(null)} className="flex-1 px-4 py-3 bg-white/5 text-white font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
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
