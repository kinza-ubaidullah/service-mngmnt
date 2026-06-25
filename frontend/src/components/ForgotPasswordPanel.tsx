import React, { useState, useEffect } from 'react';
import {
  Key, Search, Loader2, Copy, MessageCircle, RefreshCw, Link2, UserCog, ShieldAlert, Sparkles,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import RefreshButton from './RefreshButton';

interface ForgotPasswordPanelProps {
  onUserReset?: () => void;
}

const ForgotPasswordPanel: React.FC<ForgotPasswordPanelProps> = ({ onUserReset }) => {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [lastReset, setLastReset] = useState<{ user: any; password: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [newInviteRole, setNewInviteRole] = useState('TECHNICIAN');
  const [newInviteLink, setNewInviteLink] = useState('');

  const fetchInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await api.get('/users/invites/pending');
      setInvites(res.data.invites || []);
    } catch {
      toast.error('Failed to load pending invites');
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setUser(null);
    setLastReset(null);
    try {
      const res = await api.get(`/users/lookup?q=${encodeURIComponent(query.trim())}`);
      if (res.data.found) {
        setUser(res.data.user);
      } else {
        toast.error('No user found — try exact email, phone, or name');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (autoGenerate = false) => {
    if (!user) return;
    if (!autoGenerate && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.patch(`/users/${user.id}/reset-password`, {
        newPassword: autoGenerate ? undefined : password,
        autoGenerate,
      });
      const newPass = res.data.newPassword;
      setLastReset({ user: res.data.user, password: newPass });
      setPassword('');
      toast.success(`Password reset for ${user.name}`);
      onUserReset?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.patch(`/users/${user.id}/disable-2fa`);
      toast.success(res.data.message || `2FA disabled for ${user.name}`);
      setUser({ ...user, totp_enabled: false });
      onUserReset?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = (u: any, pass: string) => {
    const loginUrl = window.location.origin + '/login';
    const text = `Al Jaroshi CRM Login\nName: ${u.name}\nLogin: ${u.email || u.phone}\nPassword: ${pass}\nURL: ${loginUrl}`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied');
  };

  const shareWhatsApp = (u: any, pass: string) => {
    const phone = String(u.phone || '').replace(/[^0-9]/g, '');
    const loginUrl = window.location.origin + '/login';
    const msg = encodeURIComponent(
      `Assalam o Alaikum ${u.name},\n\nAap ka CRM password reset ho gaya hai.\n\nLogin: ${u.email || u.phone}\nPassword: ${pass}\n\nLogin URL: ${loginUrl}\n\n— Al Jaroshi Admin`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const handleResendInvite = async (inviteId: number) => {
    setResendingId(inviteId);
    try {
      const res = await api.post(`/users/invites/${inviteId}/resend`);
      toast.success('New invite link generated');
      navigator.clipboard.writeText(res.data.inviteLink);
      toast.success('Link copied to clipboard');
      fetchInvites();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Resend failed');
    } finally {
      setResendingId(null);
    }
  };

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      const res = await api.post('/users/invite', { role: newInviteRole });
      setNewInviteLink(res.data.inviteLink);
      toast.success('Invite link created');
      fetchInvites();
    } catch {
      toast.error('Failed to generate invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Forgot Password */}
      <div className="crm-card rounded-[2rem] p-8">
        <div className="crm-header-banner rounded-2xl px-6 py-4 mb-6 flex items-center gap-3">
          <Key size={22} className="text-[#1a3d2e]" />
          <div>
            <h2 className="text-lg font-black text-[#1a3d2e]">Forgot Password — Admin Reset</h2>
            <p className="text-xs text-[#2d6a4a]/80">Search staff by email, phone, or name and set a new password</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Email, phone, or staff name..."
            className="crm-input flex-1 rounded-xl py-3 px-4 text-sm"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="crm-btn-primary px-6 py-3 rounded-xl flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Find User
          </button>
        </div>

        {user && (
          <div className="crm-card-soft rounded-2xl p-5 space-y-4 border border-mint-200/50">
            <div className="flex items-start gap-3">
              <div className="crm-icon-box p-2 shrink-0">
                <UserCog size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role?.replace('_', ' ')} · {user.email || '—'} · {user.phone}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`crm-badge ${user.is_active ? 'crm-badge-mint' : 'crm-badge-rose'}`}>
                    <span className={`crm-status-dot ${user.is_active ? 'crm-status-dot--success' : 'crm-status-dot--danger'}`} />
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {user.totp_enabled && (
                    <span className="crm-badge crm-badge-sky flex items-center gap-1">
                      <ShieldAlert size={10} /> 2FA On
                    </span>
                  )}
                </div>
              </div>
            </div>

            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 chars) — or use Auto Generate"
              className="crm-input w-full rounded-xl py-3 px-4 text-sm"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => resetPassword(false)}
                disabled={loading || password.length < 6}
                className="crm-btn-primary px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                Set Password
              </button>
              <button
                type="button"
                onClick={() => resetPassword(true)}
                disabled={loading}
                className="crm-btn-ghost px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <Sparkles size={14} /> Auto Generate
              </button>
              {user.totp_enabled && (
                <button
                  type="button"
                  onClick={handleDisable2FA}
                  disabled={loading}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <Key size={14} /> Disable 2FA
                </button>
              )}
            </div>
          </div>
        )}

        {lastReset && (
          <div className="mt-4 p-5 bg-mint-50 border border-mint-200 rounded-2xl space-y-3">
            <p className="text-sm font-bold text-[#1a3d2e]">Password updated — share with {lastReset.user.name}</p>
            <div className="font-mono text-sm bg-white border border-slate-200 rounded-xl p-3 text-slate-700">
              Login: {lastReset.user.email || lastReset.user.phone}<br />
              Password: <span className="font-black text-mint-600">{lastReset.password}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyCredentials(lastReset.user, lastReset.password)}
                className="crm-btn-ghost px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Copy size={14} /> Copy Credentials
              </button>
              {lastReset.user.phone && (
                <button
                  type="button"
                  onClick={() => shareWhatsApp(lastReset.user, lastReset.password)}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30"
                >
                  <MessageCircle size={14} /> Send via WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resend Invites */}
      <div className="crm-card rounded-[2rem] p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Link2 className="text-mint-600" size={22} />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Resend Staff Invites</h2>
              <p className="text-xs text-slate-500">Pending registration links — resend or create new</p>
            </div>
          </div>
          <RefreshButton onClick={fetchInvites} loading={invitesLoading} />
        </div>

        <div className="flex flex-wrap gap-2 mb-6 p-4 crm-card-soft rounded-xl">
          <select
            value={newInviteRole}
            onChange={(e) => setNewInviteRole(e.target.value)}
            className="crm-input rounded-xl py-2.5 px-3 text-sm"
          >
            <option value="ADMIN">Admin (Recovery)</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="CALL_CENTER">Call Center</option>
            <option value="WORKSHOP_MANAGER">Workshop Manager</option>
          </select>
          <button
            type="button"
            onClick={handleGenerateInvite}
            disabled={loading}
            className="crm-btn-primary px-4 py-2.5 rounded-xl text-sm font-bold"
          >
            New Invite Link
          </button>
        </div>

        {newInviteLink && (
          <div className="mb-6 p-4 bg-mint-50 border border-mint-200 rounded-xl space-y-2">
            <p className="text-xs font-bold text-slate-600 uppercase">Latest invite link</p>
            <p className="text-xs font-mono text-mint-700 break-all">{newInviteLink}</p>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(newInviteLink); toast.success('Copied'); }}
              className="crm-btn-ghost px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        )}

        {invitesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-mint-500" /></div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No pending invite links.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto crm-scrollbar">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 crm-card-soft rounded-xl border border-slate-200/60">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{inv.role?.replace('_', ' ')}</p>
                  <p className="text-[10px] text-slate-500">
                    Created {new Date(inv.created_at).toLocaleString('en-GB')}
                  </p>
                  <p className="text-[10px] font-mono text-mint-600 truncate mt-1">{inv.inviteLink}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(inv.inviteLink); toast.success('Copied'); }}
                    className="crm-btn-ghost px-3 py-2 rounded-lg text-xs font-bold"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResendInvite(inv.id)}
                    disabled={resendingId === inv.id}
                    className="crm-btn-primary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {resendingId === inv.id ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                    Resend
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPanel;
