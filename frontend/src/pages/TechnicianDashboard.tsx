import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout, setUser } from '../store/slices/authSlice';
import { 
  LogOut, Wrench, MapPin, Clock, ClipboardCheck, 
  ChevronRight, CheckCircle2, Package, Wallet, Plus,
  Loader2, Sparkles, X, CreditCard, Info, User, TrendingDown, History, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { generateInvoicePDF } from '../utils/invoiceGenerator';

interface Lead {
  id: number;
  lead_id: string;
  status: string;
  product_type: string;
  problem_details: string;
  created_at: string;
  visit_date: string;
  item_pictures?: string[];
  customer: {
    name: string;
    phone: string;
    area: string;
    exact_address: string;
    google_map_link?: string;
  };
}

interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const TechnicianDashboard = () => {
  console.log('--- TechnicianDashboard Rendering ---');
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  console.log('Tech Auth State:', { isAuthenticated, role: user?.role });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="text-emerald-500 animate-spin mb-4" size={40} />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Authenticating Technician...</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'tasks' | 'wallet' | 'profile' | 'workshop'>('tasks');
  const [jobs, setJobs] = useState<Lead[]>([]);
  const [workshopJobs, setWorkshopJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Lead | null>(null);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  
  // Wallet State
  const [walletSummary, setWalletSummary] = useState<any>(null);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'Petrol',
    description: ''
  });

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    location_name: user?.location_name || '',
    lat: user?.lat || null,
    lng: user?.lng || null,
    specialization: user?.specialization || '',
    address: user?.address || '',
    profile_picture: user?.profile_picture || ''
  });

  const fetchJobs = async () => {
    try {
      const res = await api.get('/leads/technician/my-jobs');
      setJobs(res.data.leads || []);
    } catch (error) {
      toast.error('Failed to load your jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      const [summaryRes, expensesRes, earningsRes] = await Promise.all([
        api.get('/expenses/wallet-summary'),
        api.get('/expenses/my-expenses'),
        api.get('/finance/my-summary')
      ]);
      setWalletSummary(summaryRes.data.summary || { balance: 0, totalCollected: 0, totalSpent: 0 });
      setExpenses(expensesRes.data.expenses || []);
      setEarningsSummary(earningsRes.data || { commission: 0, rate: 0 });
    } catch (error) {
      console.error('Wallet fetch error', error);
    }
  };

  const fetchWorkshopJobs = async () => {
    try {
      const res = await api.get('/workshop/jobs');
      setWorkshopJobs(res.data.jobs || []);
    } catch (error) {
      console.error('Failed to load workshop jobs');
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchWalletData();
    fetchWorkshopJobs();
  }, []);

  const updateWorkshopStatus = async (jobId: number, status: string) => {
    try {
      await api.patch(`/workshop/jobs/${jobId}/status`, { status });
      toast.success(`Machine is now ${status}`);
      fetchWorkshopJobs();
      fetchJobs();
    } catch (error) {
      toast.error('Failed to update workshop status');
    }
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    
    setLoading(true);
    try {
      await api.patch(`/leads/${selectedJob.id}/outcome`, outcomeData);
      toast.success('Job outcome updated!');
      setOutcomeModalOpen(false);
      setSelectedJob(null);
      fetchJobs();
      fetchWalletData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseLoading(true);
    try {
      await api.post('/expenses', expenseForm);
      toast.success('Expense added!');
      setExpenseModalOpen(false);
      setExpenseForm({ amount: '', category: 'Petrol', description: '' });
      fetchWalletData();
    } catch (error: any) {
      toast.error('Failed to add expense');
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/users/profile', profileForm);
      toast.success('Profile updated!');
      // Update local storage/redux if needed
      dispatch(setUser(res.data.user));
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    toast.loading('Getting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfileForm({
          ...profileForm,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          location_name: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`
        });
        toast.dismiss();
        toast.success('Location updated');
      },
      () => {
        toast.dismiss();
        toast.error('Failed to get location');
      }
    );
  };

  // Outcome Form State
  const [outcomeData, setOutcomeData] = useState({
    status: 'Completed',
    actual_problem: '',
    repair_details: '',
    total_amount: '',
    collected_amount: '',
    warranty_months: '3'
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-blue-600/5 blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg shadow-lg shadow-emerald-500/20">
            <Wrench size={20} className="text-white" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              TechPanel <Sparkles size={14} className="text-emerald-400" />
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400 font-medium">Technician</p>
            <p className="text-sm font-bold text-white">{user?.name}</p>
          </div>
          <button 
            onClick={() => dispatch(logout())}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 hover:border-white/20"
          >
            <LogOut size={18} />
          </button>
        </div>
      </motion.nav>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full relative z-10 pb-24">
        
        {/* Profile Completion Warning */}
        {(!user?.location_name || !user?.specialization) && activeTab !== 'profile' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg text-white shadow-lg shadow-amber-500/20">
                <Info size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Profile Incomplete</p>
                <p className="text-[10px] text-amber-200/70 font-medium">Please set your location & specialization to receive jobs.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-3 py-2 rounded-lg"
            >
              Set Now
            </button>
          </motion.div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 mb-8 shadow-xl">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
              ${activeTab === 'tasks' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <ClipboardCheck size={18} /> Tasks
          </button>
          <button 
            onClick={() => setActiveTab('workshop')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'workshop' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Package size={18} /> Workshop
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'wallet' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Wallet size={18} /> Wallet
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'profile' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <User size={18} /> Profile
          </button>
        </div>

        {activeTab === 'tasks' ? (
          <>
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white">Active Tasks</h2>
                <p className="text-sm text-slate-400">
                  {jobs.filter(j => j.status === 'Assigned' || j.status === 'InProgress' || j.status === 'Reopened').length} pending jobs
                </p>
              </div>
              <button onClick={fetchJobs} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition">
                <Clock size={20} />
              </button>
            </div>

            {loading ? (
              <div className="h-64 flex justify-center items-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              </div>
            ) : jobs.filter(j => j.status !== 'Completed' && j.status !== 'PickedForWorkshop').length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck size={32} className="text-slate-600" />
                </div>
                <h3 className="text-white font-bold mb-1">All Caught Up!</h3>
                <p className="text-sm text-slate-500">You have no active tasks at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {jobs
                    .filter(j => j.status !== 'Completed' && j.status !== 'PickedForWorkshop')
                    .map((job, idx) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => { setSelectedJob(job); setOutcomeModalOpen(true); }}
                      className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-emerald-500/40 transition-all active:scale-[0.98] cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                            {job.lead_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                            ${job.status === 'Assigned' ? 'bg-blue-500/20 text-blue-400' : 
                              job.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}
                          `}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.status === 'Completed' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); generateInvoicePDF(job); }}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                              title="Download Invoice"
                            >
                              <Download size={14} />
                            </button>
                          )}
                          <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1">{job.customer?.name}</h3>
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                        <MapPin size={14} className="text-emerald-500/70" />
                        <span className="truncate flex-1">{job.customer?.area}</span>
                        {job.customer?.google_map_link && (
                          <a 
                            href={job.customer?.google_map_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20 flex items-center gap-1 text-[10px] font-bold"
                          >
                            <MapPin size={12} /> Navigate
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 mb-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Appliance</span>
                          <span className="text-sm font-semibold text-slate-200">{job.product_type}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Visit Date</span>
                          <span className="text-sm font-semibold text-slate-200">
                            {job.visit_date ? new Date(job.visit_date).toLocaleDateString() : 'Today'}
                          </span>
                        </div>
                      </div>

                      {/* Item Pictures Preview */}
                      {job.item_pictures && job.item_pictures.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 custom-scrollbar">
                           {job.item_pictures.map((pic: string, pIdx: number) => (
                             <img 
                               key={pIdx} 
                               src={pic} 
                               alt="item" 
                               className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                             />
                           ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : activeTab === 'workshop' ? (
          /* WORKSHOP TAB */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="mb-6">
               <h2 className="text-2xl font-bold text-white">Workshop Inventory</h2>
               <p className="text-sm text-slate-400">{workshopJobs.filter((j:any) => j.status !== 'Ready').length} Machines under repair</p>
            </div>

            {workshopJobs.length === 0 ? (
               <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-12 text-center">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Package size={32} className="text-slate-600" />
                 </div>
                 <h3 className="text-white font-bold mb-1">Workshop Empty</h3>
                 <p className="text-sm text-slate-500">No machines have been picked up for repair yet.</p>
               </div>
            ) : (
              <div className="space-y-4">
                {workshopJobs.map((job:any, idx:number) => (
                  <motion.div 
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-slate-900/60 border border-white/10 rounded-2xl p-5"
                  >
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                          {job.lead.lead_id}
                       </span>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                          ${job.status === 'Ready' ? 'bg-emerald-500/20 text-emerald-400' : 
                            job.status === 'WorkStarted' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}
                       `}>
                          {job.status}
                       </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{job.lead?.product_type}</h3>
                    <p className="text-xs text-slate-400 mb-4">{job.lead?.customer?.name} - {job.lead?.customer?.area}</p>

                    <div className="flex gap-2">
                       {job.status === 'Received' && (
                         <button 
                           onClick={() => updateWorkshopStatus(job.id, 'WorkStarted')}
                           className="flex-1 bg-blue-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20"
                         >
                           Start Repair
                         </button>
                       )}
                       {job.status === 'WorkStarted' && (
                         <button 
                           onClick={() => updateWorkshopStatus(job.id, 'Ready')}
                           className="flex-1 bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20"
                         >
                           Mark Ready
                         </button>
                       )}
                       {job.status === 'Ready' && (
                         <div className="flex-1 bg-emerald-500/10 text-emerald-400 text-center py-3 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase">
                            Ready for Delivery
                         </div>
                       )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : activeTab === 'wallet' ? (
          /* WALLET TAB */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            {/* Wallet Cards */}
            <div className="grid grid-cols-1 gap-4">
              {/* Cash in Hand Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Current Cash in Hand</p>
                <h3 className="text-4xl font-black mb-6">
                  <span className="text-xl mr-1 opacity-70">PKR</span>
                  {walletSummary?.balance || 0}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-100 uppercase opacity-60">Collected</p>
                    <p className="text-lg font-bold">Rs. {walletSummary?.totalCollected || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-100 uppercase opacity-60">Spent</p>
                    <p className="text-lg font-bold">Rs. {walletSummary?.totalSpent || 0}</p>
                  </div>
                </div>
              </div>

              {/* Estimated Earning Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Estimated Earning</p>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Rate: {earningsSummary?.rate || 10}%</span>
                </div>
                <h3 className="text-4xl font-black mb-6">
                  <span className="text-xl mr-1 opacity-70">PKR</span>
                  {earningsSummary?.commission || 0}
                </h3>
                
                <p className="text-[10px] text-blue-200/70 italic font-medium">This is your calculated commission share from total revenue.</p>
              </div>
            </div>

            {/* Quick Actions */}
            <button 
              onClick={() => setExpenseModalOpen(true)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                  <TrendingDown size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Record Expense</p>
                  <p className="text-xs text-slate-500 font-medium">Fuel, Parts, Food, etc.</p>
                </div>
              </div>
              <Plus size={20} className="text-slate-600 group-hover:text-white transition-colors" />
            </button>

            {/* Recent Expenses List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                <History size={16} /> Recent Expenses
              </div>
              
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-slate-600 italic text-sm">No expenses recorded yet.</div>
              ) : (
                expenses.map((exp, idx) => (
                  <motion.div 
                    key={exp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs">
                        {exp.category.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{exp.category}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">- Rs. {exp.amount}</p>
                      <p className="text-[10px] text-slate-600 truncate max-w-[100px]">{exp.description}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          /* PROFILE TAB */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                  <User size={48} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
                <p className="text-xs text-slate-500">This information will be visible to Call Center</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="group relative">
                  <input 
                    type="text" 
                    value={profileForm.name} 
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    className="w-full bg-slate-950 text-white px-4 py-4 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all" 
                    placeholder="Full Name" 
                  />
                  <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500">Name</label>
                </div>

                <div className="group relative">
                  <input 
                    type="text" 
                    value={profileForm.specialization} 
                    onChange={(e) => setProfileForm({...profileForm, specialization: e.target.value})}
                    className="w-full bg-slate-950 text-white px-4 py-4 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all" 
                    placeholder="Specialization (e.g. AC, Fridge, Washing Machine)" 
                  />
                  <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500">Specialization</label>
                </div>

                <div className="flex gap-2">
                  <div className="group relative flex-1">
                    <input 
                      type="text" 
                      readOnly
                      value={profileForm.location_name} 
                      className="w-full bg-slate-950 text-white px-4 py-4 rounded-2xl border border-white/10 outline-none opacity-80" 
                      placeholder="Location" 
                    />
                    <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500">Current Location</label>
                  </div>
                  <button 
                    type="button" 
                    onClick={getCurrentLocation}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 rounded-2xl border border-emerald-500/20 transition-all"
                  >
                    <MapPin size={20} />
                  </button>
                </div>

                <div className="group relative">
                  <textarea 
                    value={profileForm.address} 
                    onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                    className="w-full bg-slate-950 text-white px-4 py-4 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all resize-none" 
                    placeholder="Base Address / Area" 
                    rows={3}
                  ></textarea>
                  <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500">Address</label>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Save Profile
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </main>

      {/* Outcome Modal (Existing) */}
      <AnimatePresence>
        {outcomeModalOpen && selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                  <h3 className="text-lg font-bold text-white">Update Job Outcome</h3>
                  <p className="text-xs text-slate-500">Lead ID: {selectedJob.lead_id}</p>
                </div>
                <button onClick={() => setOutcomeModalOpen(false)} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleOutcomeSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <User size={14} className="text-emerald-400" /> {selectedJob.customer?.name}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <MapPin size={14} className="text-emerald-500/50 mt-0.5" /> {selectedJob.customer?.exact_address}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Completed', label: 'Fixed', icon: CheckCircle2, color: 'text-emerald-400' },
                    { id: 'PickedForWorkshop', label: 'Pickup', icon: Package, color: 'text-blue-400' },
                    { id: 'InspectionCompleted', label: 'Inspect', icon: Info, color: 'text-amber-400' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOutcomeData({...outcomeData, status: opt.id})}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all
                        ${outcomeData.status === opt.id 
                          ? 'bg-white/10 border-emerald-500/50 scale-[1.05] shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                          : 'bg-white/5 border-white/5 opacity-60'
                        }
                      `}
                    >
                      <opt.icon size={20} className={opt.color} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{opt.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="group relative">
                    <textarea 
                      required
                      value={outcomeData.actual_problem}
                      onChange={(e) => setOutcomeData({...outcomeData, actual_problem: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all resize-none peer placeholder-transparent" 
                      placeholder="Problem"
                      rows={2}
                    ></textarea>
                    <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs">Actual Problem Found</label>
                  </div>

                  <div className="group relative">
                    <textarea 
                      value={outcomeData.repair_details}
                      onChange={(e) => setOutcomeData({...outcomeData, repair_details: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all resize-none peer placeholder-transparent" 
                      placeholder="Details"
                      rows={2}
                    ></textarea>
                    <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs">
                      {outcomeData.status === 'Completed' ? 'Work Performed / Parts Used' : 
                       outcomeData.status === 'PickedForWorkshop' ? 'Reason for Pickup & Accessories' : 
                       'Inspection Notes & Recommendations'}
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="group relative">
                      <div className="absolute left-4 top-3.5 text-slate-500"><CreditCard size={14}/></div>
                      <input 
                        type="number"
                        value={outcomeData.collected_amount}
                        onChange={(e) => setOutcomeData({...outcomeData, collected_amount: e.target.value})}
                        className="w-full bg-slate-950 text-white pl-9 pr-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all placeholder-transparent peer" 
                        placeholder="Amount"
                      />
                      <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:left-9 peer-focus:left-4">
                        {outcomeData.status === 'Completed' ? 'Amount Collected' : 'Charges / Advance'}
                      </label>
                    </div>

                    {outcomeData.status === 'Completed' && (
                      <div className="group relative">
                        <select 
                          value={outcomeData.warranty_months}
                          onChange={(e) => setOutcomeData({...outcomeData, warranty_months: e.target.value})}
                          className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all appearance-none"
                        >
                          <option value="0">No Warranty</option>
                          <option value="1">1 Month</option>
                          <option value="3">3 Months</option>
                          <option value="6">6 Months</option>
                          <option value="12">1 Year</option>
                        </select>
                        <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500">Warranty</label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setOutcomeModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/5">Back</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} Complete
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {expenseModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-lg font-bold text-white">Record Expense</h3>
                <button onClick={() => setExpenseModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition"><X size={20} /></button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="group relative">
                    <div className="absolute left-4 top-3.5 text-slate-500"><CreditCard size={16}/></div>
                    <input 
                      type="number" 
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="w-full bg-slate-950 text-white pl-10 pr-4 py-4 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all" 
                      placeholder="Amount"
                    />
                  </div>

                  <div className="group relative">
                    <select 
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-4 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all appearance-none"
                    >
                      <option value="Petrol">Petrol / Fuel</option>
                      <option value="Food">Food / Meals</option>
                      <option value="Parts">Parts Purchase</option>
                      <option value="Transport">Transport / Rickshaw</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="group relative">
                    <input 
                      type="text" 
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-4 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all" 
                      placeholder="Notes (optional)"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={expenseLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
                >
                  {expenseLoading ? <Loader2 className="animate-spin" size={18} /> : <TrendingDown size={18} />}
                  Save Expense
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TechnicianDashboard;
