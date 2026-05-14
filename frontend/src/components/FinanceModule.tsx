import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, Plus, Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FinanceModule = () => {
  const [reinvestments, setReinvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Rent',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reinvRes, statsRes] = await Promise.all([
        api.get('/finance/reinvestments'),
        api.get('/dashboard/admin/stats')
      ]);
      setReinvestments(reinvRes.data.reinvestments);
      setStats(statsRes.data.stats);
    } catch (error) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance/reinvestments', formData);
      toast.success('Reinvestment added successfully');
      setShowModal(false);
      setFormData({ amount: '', category: 'Rent', description: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      toast.error('Failed to save reinvestment');
    } finally {
      setSaving(false);
    }
  };

  const totalReinvested = reinvestments.reduce((sum, item) => sum + Number(item.amount), 0);
  const availableBalance = stats ? stats.revenue - totalReinvested : 0;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Total Business Revenue</p>
          <h3 className="text-3xl lg:text-4xl font-black mb-2">$ {stats?.revenue?.toLocaleString() || 0}</h3>
          <p className="text-xs text-indigo-200">Total revenue generated from all completed jobs</p>
        </div>
        
        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <p className="text-rose-100 text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Total Reinvestments</p>
          <h3 className="text-3xl lg:text-4xl font-black mb-2">$ {totalReinvested.toLocaleString()}</h3>
          <p className="text-xs text-rose-200">Capital spent on business growth and operations</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Net Available Balance</p>
          <h3 className="text-3xl lg:text-4xl font-black mb-2">$ {availableBalance.toLocaleString()}</h3>
          <p className="text-xs text-emerald-200">Total Revenue minus Total Reinvestments</p>
        </div>
      </div>

      {/* Reinvestments Table */}
      <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingDown className="text-rose-400" /> Reinvestments & Major Expenses
          </h2>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} /> Add Reinvestment
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                <th className="pb-4 font-bold">Date</th>
                <th className="pb-4 font-bold">Category</th>
                <th className="pb-4 font-bold">Description</th>
                <th className="pb-4 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reinvestments.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 text-sm text-slate-300 font-medium">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="py-4">
                    <span className="bg-white/5 text-slate-300 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                      {item.category.replace('Reinvestment: ', '')}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-slate-400 max-w-xs truncate">{item.description}</td>
                  <td className="py-4 text-right">
                    <span className="text-sm font-black text-rose-400">- $ {Number(item.amount).toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reinvestments.length === 0 && (
            <div className="text-center py-12 text-slate-500 italic">No reinvestments recorded yet.</div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-6">Add Business Reinvestment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="group relative">
                <div className="absolute left-4 top-3 text-slate-500"><DollarSign size={16}/></div>
                <input required type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 outline-none" placeholder="Amount" />
              </div>
              <div className="group relative">
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none appearance-none">
                  <option value="Rent">Advance Rent</option>
                  <option value="Tools">Workshop Tools</option>
                  <option value="Parts">Bulk Parts Purchase</option>
                  <option value="Vehicle">Vehicle Purchase / Maintenance</option>
                  <option value="Marketing">Marketing / Ads</option>
                  <option value="Other">Other Reinvestment</option>
                </select>
              </div>
              <div className="group relative">
                <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-950 text-slate-400 px-4 py-3 rounded-xl border border-white/10 outline-none" />
              </div>
              <div className="group relative">
                <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 outline-none resize-none" placeholder="Purpose / Description" rows={3}></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-white/5 text-white font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save Record'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;
