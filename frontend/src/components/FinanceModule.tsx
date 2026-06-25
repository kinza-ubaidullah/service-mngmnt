import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingDown, TrendingUp, Plus, Loader2, RefreshCw,
  Trash2, CalendarClock, CheckCircle2, X, AlertCircle,
  Repeat, CreditCard, Banknote, ShoppingCart, Activity, Archive
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import LogsModule from './LogsModule';
import TrashModule from './TrashModule';
import RefreshButton from './RefreshButton';
import FinanceDetailModal from './FinanceDetailModal';
import { useLiveData } from '../hooks/useLiveData';

const CATEGORIES = [
  { value: 'Salary', label: '👷 Salary / Wages' },
  { value: 'Rent', label: '🏢 Rent / Office' },
  { value: 'Spare Parts', label: '🔩 Spare Parts' },
  { value: 'Food', label: '🍱 Food / Meals' },
  { value: 'Marketing', label: '📣 Marketing / Ads' },
  { value: 'Vehicle', label: '🚗 Vehicle / Fuel' },
  { value: 'Tools', label: '🔧 Tools / Equipment' },
  { value: 'Petrol', label: '⛽ Petrol' },
  { value: 'Transport', label: '🚌 Transport' },
  { value: 'Utility', label: '💡 Utility Bills' },
  { value: 'Other', label: '📦 Other' },
];

const getCategoryColor = (cat: string) => {
  const map: Record<string, string> = {
    Salary: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    Rent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Spare Parts': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    Food: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Marketing: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Vehicle: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    Tools: 'bg-indigo-500/20 text-mint-600 border-indigo-500/30',
    Petrol: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Transport: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    Utility: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return map[cat] || 'bg-slate-700/50 text-slate-400 border-slate-600/50';
};

const getDaysUntilDue = (nextDue: string) => {
  const diff = new Date(nextDue).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 3600 * 24));
};

const renderCustomFieldInput = (
  field: any,
  values: Record<string, any>,
  setValues: React.Dispatch<React.SetStateAction<Record<string, any>>>
) => {
  const onChange = (val: string) => setValues(prev => ({ ...prev, [field.field_name]: val }));

  if (field.field_type === 'Dropdown') {
    return (
      <select required={field.is_required} value={values[field.field_name] || ''} onChange={e => onChange(e.target.value)}
        className="w-full crm-input text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 text-sm">
        <option value="">-- Select --</option>
        {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.field_type === 'File') {
    return (
      <input type="file" accept="image/*,.pdf" onChange={e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result as string);
        reader.readAsDataURL(file);
      }} className="w-full crm-input text-slate-800 px-3 py-2 rounded-xl border border-slate-200/70 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500 file:text-white" />
    );
  }
  return (
    <input
      type={field.field_type === 'Number' ? 'number' : field.field_type === 'Date' ? 'date' : 'text'}
      required={field.is_required}
      value={values[field.field_name] || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full crm-input text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 text-sm"
    />
  );
};

const CustomDataBadges = ({ data }: { data: Record<string, any> | null }) => {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Object.entries(data).map(([key, val]) => (
        <span key={key} className="text-[10px] bg-mint-100 text-mint-600 border border-mint-300/40 px-2 py-0.5 rounded-lg font-bold">
          {key}: {typeof val === 'string' && val.startsWith('data:') ? '📎 Attached' : String(val)}
        </span>
      ))}
    </div>
  );
};

const FinanceModule = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'recurring' | 'logs' | 'trash'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customDataValues, setCustomDataValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [detailModal, setDetailModal] = useState<'revenue' | 'expenses' | 'net' | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Salary',
    description: '',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    frequency: 'Monthly',
    due_day: '1',
    recipient_id: '',
    recipient_name: ''
  });

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const [expRes, recurRes, statsRes, usersRes, customRes] = await Promise.all([
        api.get('/finance/reinvestments'),
        api.get('/finance/recurring'),
        api.get('/dashboard/admin/stats'),
        api.get('/users'),
        api.get('/finance/custom-fields?module=RecurringPayment').catch(() => ({ data: { fields: [] } }))
      ]);
      setExpenses(expRes.data.reinvestments || []);
      setSchedules(recurRes.data.schedules || []);
      setStats(statsRes.data.stats || null);
      setUsers(usersRes.data.users || []);
      setCustomFields(customRes.data.fields || []);
    } catch {
      toast.error('Failed to load financial data');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['finance', 'dashboard'], () => fetchData({ silent: true }));

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, custom_data: formData.is_recurring ? customDataValues : null };
      if (formData.recipient_name) {
        payload.description = payload.description ? `${formData.recipient_name} - ${payload.description}` : `Payment to ${formData.recipient_name}`;
      }
      await api.post('/finance/reinvestments', payload);
      toast.success(formData.is_recurring ? '📅 Recurring schedule created!' : '✅ Expense recorded!');
      setShowModal(false);
      setFormData({ amount: '', category: 'Salary', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false, frequency: 'Monthly', due_day: '1', recipient_id: '', recipient_name: '' });
      setCustomDataValues({});
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Move this record to Trash? You can restore it later.')) return;
    try {
      await api.delete(`/finance/reinvestments/${id}`);
      toast.success('Moved to Trash');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const fetchDetailData = async (opts?: { silent?: boolean }) => {
    try {
      if (opts?.silent) setDetailRefreshing(true);
      else setDetailLoading(true);
      const res = await api.get('/finance/summary-details');
      setDetailData(res.data);
    } catch {
      toast.error('Failed to load finance details');
    } finally {
      if (opts?.silent) setDetailRefreshing(false);
      else setDetailLoading(false);
    }
  };

  const openDetailModal = async (type: 'revenue' | 'expenses' | 'net') => {
    setDetailModal(type);
    await fetchDetailData();
  };

  const handlePayNow = async (schedule: any) => {
    setPayingId(schedule.id);
    try {
      await api.post(`/finance/recurring/${schedule.id}/pay`);
      toast.success(`✅ Payment of SAR ${Number(schedule.amount).toLocaleString()} recorded for ${schedule.category}`);
      fetchData();
    } catch { toast.error('Failed to record payment'); }
    finally { setPayingId(null); }
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const revenue = stats?.revenue || 0;
  const net = revenue - totalExpenses;

  const overdueSchedules = schedules.filter(s => getDaysUntilDue(s.next_due) <= 0);
  const upcomingSchedules = schedules.filter(s => getDaysUntilDue(s.next_due) > 0);

  if (loading && expenses.length === 0 && schedules.length === 0) return (
    <div className="flex flex-col justify-center items-center h-96 gap-4">
      <RefreshCw className="animate-spin text-mint-500" size={32} />
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Financial Data...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.button type="button" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          onClick={() => openDetailModal('revenue')}
          className="relative overflow-hidden crm-header-banner rounded-[2rem] p-7 text-white shadow-xl shadow-indigo-900/30 text-left w-full cursor-pointer hover:scale-[1.02] hover:shadow-mint-300/25 transition-all group">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-mint-50 rounded-full blur-3xl" />
          <TrendingUp size={28} className="mb-3 opacity-80" />
          <p className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest mb-1">Total Revenue</p>
          <h3 className="text-3xl font-black">SAR {revenue.toLocaleString()}</h3>
          <p className="text-indigo-200/70 text-xs mt-1">From all completed jobs</p>
          <p className="text-indigo-200/50 text-[10px] mt-2 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Click for task-wise details →</p>
        </motion.button>

        <motion.button type="button" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          onClick={() => openDetailModal('expenses')}
          className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-red-600 rounded-[2rem] p-7 text-white shadow-xl shadow-red-900/30 text-left w-full cursor-pointer hover:scale-[1.02] hover:shadow-rose-500/20 transition-all group">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-mint-50 rounded-full blur-3xl" />
          <TrendingDown size={28} className="mb-3 opacity-80" />
          <p className="text-rose-200 text-[11px] font-bold uppercase tracking-widest mb-1">Total Expenses</p>
          <h3 className="text-3xl font-black">SAR {totalExpenses.toLocaleString()}</h3>
          <p className="text-rose-200/70 text-xs mt-1">{expenses.length} recorded expenses</p>
          <p className="text-rose-200/50 text-[10px] mt-2 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Click for expense details →</p>
        </motion.button>

        <motion.button type="button" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          onClick={() => openDetailModal('net')}
          className={`relative overflow-hidden bg-gradient-to-br ${net >= 0 ? 'from-emerald-500 to-teal-600 shadow-emerald-900/30' : 'from-rose-700 to-red-800 shadow-red-900/30'} rounded-[2rem] p-7 text-white shadow-xl text-left w-full cursor-pointer hover:scale-[1.02] transition-all group`}>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-mint-50 rounded-full blur-3xl" />
          <Banknote size={28} className="mb-3 opacity-80" />
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-1">Net Balance</p>
          <h3 className="text-3xl font-black">SAR {Math.abs(net).toLocaleString()}</h3>
          <p className="text-white/60 text-xs mt-1">{net < 0 ? '⚠️ Expenses exceed revenue' : '✅ Revenue - Expenses'}</p>
          <p className="text-white/40 text-[10px] mt-2 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Click for full breakdown →</p>
        </motion.button>
      </div>

      {/* Recurring Overdue Alert */}
      {overdueSchedules.length > 0 && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-center gap-4">
          <AlertCircle className="text-rose-400 shrink-0" size={22} />
          <div>
            <p className="text-rose-300 font-black text-sm">{overdueSchedules.length} Overdue Payment{overdueSchedules.length > 1 ? 's' : ''}!</p>
            <p className="text-rose-500 text-xs mt-0.5">
              {overdueSchedules.map(s => `${s.category} (SAR ${Number(s.amount).toLocaleString()})`).join(' • ')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Tabs + Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap crm-card border rounded-2xl p-1 gap-1">
          {([
            { id: 'expenses' as const, label: 'All Expenses', icon: ShoppingCart },
            { id: 'recurring' as const, label: `Recurring ${schedules.length > 0 ? `(${schedules.length})` : ''}`, icon: Repeat },
            { id: 'logs' as const, label: 'Logs', icon: Activity },
            { id: 'trash' as const, label: 'Trash', icon: Archive },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'crm-tab-active shadow-sm shadow-mint-300/25' : 'text-slate-400 hover:text-slate-800'}`}>
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={refresh} loading={refreshing} />
          <button onClick={() => setShowModal(true)}
            className="crm-btn-primary active:scale-95 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-mint-300/25">
            <Plus size={16} /> Add {formData.is_recurring ? 'Schedule' : 'Expense'}
          </button>
        </div>
      </div>

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="crm-card border rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200/60 bg-slate-50/80">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {expenses.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-400 font-medium whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 max-w-[200px] truncate">{item.description || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-rose-400">− SAR {Number(item.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(item.id)}
                        className="p-2 bg-white/0 hover:bg-red-500/20 text-slate-600 hover:text-red-400 rounded-xl border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="text-center py-16 text-slate-600 italic text-sm">No expenses recorded yet. Click "Add Expense" to start tracking.</div>
            )}
          </div>
        </div>
      )}

      {/* RECURRING SCHEDULES TAB */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          {overdueSchedules.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertCircle size={14} /> Overdue Payments</h3>
              <div className="space-y-3">
                {overdueSchedules.map(s => (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-rose-500/5 border border-rose-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center shrink-0">
                        <CreditCard className="text-rose-400" size={22} />
                      </div>
                      <div>
                        <p className="font-black text-white">{s.category}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.description || 'No description'}</p>
                        <CustomDataBadges data={s.custom_data} />
                        <p className="text-[11px] text-rose-400 font-bold mt-1">
                          {Math.abs(getDaysUntilDue(s.next_due))} days OVERDUE · {s.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <span className="text-lg font-black text-rose-400">SAR {Number(s.amount).toLocaleString()}</span>
                      <button onClick={() => handlePayNow(s)} disabled={payingId === s.id}
                        className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-60">
                        {payingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Pay Now
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2.5 bg-slate-50 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl border border-slate-200/60 transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {upcomingSchedules.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarClock size={14} /> Upcoming Payments</h3>
              <div className="space-y-3">
                {upcomingSchedules.map(s => {
                  const days = getDaysUntilDue(s.next_due);
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className={`crm-card border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${days <= 3 ? 'border-amber-500/30' : 'border-slate-200/60'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${days <= 3 ? 'bg-amber-500/10' : 'bg-mint-100'}`}>
                          <Repeat className={days <= 3 ? 'text-amber-600' : 'text-mint-600'} size={22} />
                        </div>
                        <div>
                          <p className="font-black text-white">{s.category}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.description || 'No description'}</p>
                          <CustomDataBadges data={s.custom_data} />
                          <p className={`text-[11px] font-bold mt-1 ${days <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                            Due in {days} day{days !== 1 ? 's' : ''} · {s.frequency}
                            {s.last_paid && ` · Last paid: ${new Date(s.last_paid).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-auto">
                        <span className={`text-lg font-black ${days <= 3 ? 'text-amber-600' : 'text-mint-600'}`}>SAR {Number(s.amount).toLocaleString()}</span>
                        <button onClick={() => handlePayNow(s)} disabled={payingId === s.id}
                          className="crm-btn-primary text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-mint-300/25 disabled:opacity-60">
                          {payingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Pay Now
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-2.5 bg-slate-50 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl border border-slate-200/60 transition-all">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {schedules.length === 0 && (
            <div className="text-center py-20 text-slate-600 italic text-sm">
              No recurring schedules. Add one using the "Add Expense" button and toggle "Recurring Payment".
              <p className="mt-2 text-xs text-slate-500">Custom fields can be configured in Settings → Finance Custom Fields.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <LogsModule moduleFilter="Finance" title="Finance Activity Logs" />
      )}

      {activeTab === 'trash' && (
        <TrashModule modelFilter="Expense" title="Finance Trash" />
      )}

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="crm-modal border rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">
                  {formData.is_recurring ? '📅 Add Recurring Schedule' : '💸 Record Expense'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-800 transition-colors p-1">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div className="relative">
                  <div className="absolute left-4 top-3.5 text-slate-500 text-sm font-bold">SAR</div>
                  <input required type="number" min="1" value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full crm-input text-slate-800 pl-14 pr-4 py-3 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 transition-colors"
                    placeholder="0" />
                </div>

                {/* Category */}
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 transition-colors appearance-none">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>

                {/* Recipient Dropdown (Only for Salary) */}
                {formData.category === 'Salary' && (
                  <select 
                    value={formData.recipient_id} 
                    onChange={e => {
                      const user = users.find(u => u.id === Number(e.target.value));
                      setFormData({ ...formData, recipient_id: e.target.value, recipient_name: user?.name || '' });
                    }}
                    className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 transition-colors appearance-none"
                  >
                    <option value="">-- Select Staff / Employee --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role?.replace('_', ' ')})</option>
                    ))}
                  </select>
                )}

                {/* Description */}
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 transition-colors resize-none"
                  placeholder="Additional Details (optional)" rows={2} />

                {/* Date (only for one-time) */}
                {!formData.is_recurring && (
                  <input type="date" required value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-white text-slate-300 px-4 py-3 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 transition-colors" />
                )}

                {/* Recurring Toggle */}
                <div className="flex items-center justify-between bg-white/95 px-4 py-3 rounded-xl border border-slate-200/70">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Recurring Payment</p>
                    <p className="text-[11px] text-slate-500">Auto-schedule monthly/weekly payments</p>
                  </div>
                  <button type="button" onClick={() => setFormData({ ...formData, is_recurring: !formData.is_recurring })}
                    className={`w-12 h-6 rounded-full transition-all relative ${formData.is_recurring ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${formData.is_recurring ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {/* Recurring Options */}
                {formData.is_recurring && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Frequency</label>
                        <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                          className="w-full crm-input text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 text-sm">
                          <option value="Monthly">Monthly</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                          {formData.frequency === 'Weekly' ? 'Day of Week (1=Mon)' : 'Day of Month'}
                        </label>
                        <input type="number" min="1" max={formData.frequency === 'Weekly' ? 7 : 28} value={formData.due_day}
                          onChange={e => setFormData({ ...formData, due_day: e.target.value })}
                          className="w-full crm-input text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200/70 outline-none focus:border-mint-400 text-sm" />
                      </div>
                    </div>
                    
                    {/* Dynamic Custom Fields */}
                    {customFields.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/70 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Additional Fields</p>
                        {customFields.map((field: any) => (
                          <div key={field.id}>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                              {field.field_name}{field.is_required ? ' *' : ''}
                            </label>
                            {renderCustomFieldInput(field, customDataValues, setCustomDataValues)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-50 hover:bg-mint-50 text-slate-800 font-bold rounded-xl transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 px-4 py-3 crm-btn-primary font-black rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-mint-300/25 disabled:opacity-60">
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {detailModal && (
        <FinanceDetailModal
          type={detailModal}
          data={detailData}
          loading={detailLoading}
          onClose={() => setDetailModal(null)}
          onRefresh={() => fetchDetailData({ silent: true })}
          refreshing={detailRefreshing}
        />
      )}
    </div>
  );
};

export default FinanceModule;
