import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout, setUser } from '../store/slices/authSlice';
import { 
  LogOut, Wrench, MapPin, Clock, ClipboardCheck, 
  ChevronRight, CheckCircle2, Package, Wallet, Plus,
  Loader2, Sparkles, X, CreditCard, Info, User, TrendingDown, History, Download,
  AlertCircle, Search, Filter, Activity, Truck, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { socket } from '../services/socket';

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

  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'wallet' | 'workshop'>(() => (sessionStorage.getItem('techActiveTab') as 'tasks' | 'history' | 'wallet' | 'workshop') || 'tasks');
  const [jobs, setJobs] = useState<Lead[]>([]);
  const [workshopJobs, setWorkshopJobs] = useState<any[]>([]);

  useEffect(() => {
    sessionStorage.setItem('techActiveTab', activeTab);
  }, [activeTab]);
  const [loading, setLoading] = useState(true);
  const [workshopSearch, setWorkshopSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
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

  // Calculate distance between two coordinates in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDistanceDisplay = (mapLink?: string) => {
    if (!mapLink || !user?.lat || !user?.lng) return null;
    const match = mapLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      const dist = calculateDistance(user.lat, user.lng, lat, lng);
      return `${dist.toFixed(1)} km away`;
    }
    return null;
  };

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

    // Establish WebSocket Connection and start Geolocation tracking
    socket.connect();
    console.log('Technician socket connecting...');

    let watchId: number | null = null;
    if (navigator.geolocation && user?.id) {
      console.log('Starting Geolocation watcher for technician:', user.id);
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`Live location update: lat ${latitude}, lng ${longitude}`);
          
          // Emit coordinate update over WebSocket channel
          socket.emit('location_update', {
            userId: Number(user.id),
            lat: latitude,
            lng: longitude
          });
        },
        (error) => {
          console.warn('Geolocation access failed/timeout:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    } else {
      console.warn('Browser Geolocation is not supported or User ID is missing.');
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.disconnect();
    };
  }, [user?.id]);

  const filteredJobs = jobs.filter(job => 
    job.lead_id.toLowerCase().includes(jobSearch.toLowerCase()) ||
    (job.customer?.name || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
    (job.customer?.phone || '').includes(jobSearch)
  );

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
      fetchWorkshopJobs();
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
      dispatch(setUser(res.data.user));
      setActiveTab('tasks');
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

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full relative z-10 pb-24">
        
        {/* Profile Completion Warning Removed */}

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
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'history' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <History size={18} /> History
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'wallet' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Wallet size={18} /> Wallet
          </button>
        </div>

        {activeTab === 'tasks' ? (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Active Tasks</h2>
                <p className="text-sm text-slate-400">
                  {jobs.filter(j => j.status === 'Assigned' || j.status === 'InProgress' || j.status === 'Reopened').length} pending jobs
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48 group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search tasks..." 
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-emerald-500/50 transition-all text-white"
                  />
                </div>
                <button onClick={fetchJobs} className="p-2 text-emerald-400 bg-slate-900/50 hover:bg-emerald-500/10 rounded-xl transition border border-white/5">
                  <RefreshCw size={20} />
                </button>
              </div>
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
                  {filteredJobs
                    .filter(j => j.status !== 'Completed' && j.status !== 'PickedForWorkshop')
                    .map((job, idx) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => { 
                        setSelectedJob(job); 
                        setOutcomeData({
                          status: 'Completed',
                          actual_problem: '',
                          repair_details: '',
                          total_amount: '',
                          collected_amount: '',
                          warranty_months: '3'
                        });
                        setOutcomeModalOpen(true); 
                      }}
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
                      <div className="flex flex-col gap-1 text-slate-400 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-emerald-500/70" />
                          <span className="truncate flex-1">{job.customer?.area}</span>
                          {getDistanceDisplay(job.customer?.google_map_link) && (
                            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                              {getDistanceDisplay(job.customer?.google_map_link)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <a href={`tel:${job.customer?.phone?.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold py-2.5 rounded-xl border border-blue-500/20 transition-all flex items-center justify-center gap-1">
                          Call
                        </a>
                        <a href={`https://wa.me/${job.customer?.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 rounded-xl border border-emerald-500/20 transition-all flex items-center justify-center gap-1">
                          WhatsApp
                        </a>
                        {job.customer?.google_map_link && (
                          <a href={job.customer?.google_map_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold py-2.5 rounded-xl border border-amber-500/20 transition-all flex items-center justify-center gap-1">
                            Location
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
            <div className="flex justify-between items-end mb-6">
               <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Workshop Management</h2>
                  <p className="text-sm text-slate-400">{workshopJobs.filter((j:any) => j.status !== 'Ready').length} units in progress</p>
               </div>
               <div className="bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full border border-amber-500/20 text-[10px] font-black flex items-center gap-1.5">
                 <Activity size={12} className="animate-pulse" /> LIVE
               </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search Job ID or Name..."
                  value={workshopSearch}
                  onChange={(e) => setWorkshopSearch(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              <select 
                value={workshopFilter}
                onChange={(e) => setWorkshopFilter(e.target.value)}
                className="bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
              >
                <option value="all">All Status</option>
                <option value="Received">Received</option>
                <option value="WorkStarted">Repairing</option>
                <option value="Ready">Ready</option>
              </select>
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
                {workshopJobs
                  .filter(job => {
                    const matchesSearch = job.lead.lead_id.toLowerCase().includes(workshopSearch.toLowerCase()) || 
                                         job.lead.customer.name.toLowerCase().includes(workshopSearch.toLowerCase());
                    const matchesFilter = workshopFilter === 'all' || job.status === workshopFilter;
                    return matchesSearch && matchesFilter;
                  })
                  .map((job:any, idx:number) => {
                  const days = Math.floor((new Date().getTime() - new Date(job.received_date).getTime()) / (1000 * 3600 * 24)) + 1;
                  return (
                    <motion.div 
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-2">
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
                         <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${days > 3 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                            Day {days}
                         </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-white mb-0.5">{job.lead?.product_type}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                           <User size={12} className="text-emerald-500/50" /> {job.lead?.customer?.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">"{job.lead?.problem_details}"</p>
                      </div>

                      <div className="flex gap-2">
                         {job.status === 'Received' && (
                           <button 
                             onClick={() => updateWorkshopStatus(job.id, 'WorkStarted')}
                             className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                           >
                             <Activity size={14} /> Start Repair
                           </button>
                         )}
                         {job.status === 'WorkStarted' && (
                           <button 
                             onClick={() => updateWorkshopStatus(job.id, 'Ready')}
                             className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                           >
                             <CheckCircle2 size={14} /> Mark as Ready
                           </button>
                         )}
                         {job.status === 'Ready' && (
                           <button 
                             onClick={() => updateWorkshopStatus(job.id, 'Delivered')}
                             className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                           >
                              <Truck size={14} /> Mark as Delivered
                           </button>
                         )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

        ) : activeTab === 'wallet' ? (
          /* WALLET TAB */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-emerald-100 text-sm font-medium mb-1">Today's Total Sale</p>
                  <h3 className="text-4xl font-black tracking-tight">Rs. {walletSummary?.totalCollected || 0}</h3>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Wallet size={24} className="text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                <div>
                  <p className="text-emerald-200 text-[10px] uppercase tracking-wider font-bold mb-1">Total Expenses</p>
                  <p className="text-xl font-bold">Rs. {walletSummary?.totalSpent || 0}</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-[10px] uppercase tracking-wider font-bold mb-1">Outstanding Balance (To Return)</p>
                  <p className="text-xl font-bold">Rs. {walletSummary?.balance || 0}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* HISTORY TAB */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-end mb-6">
               <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Job History</h2>
                  <p className="text-sm text-slate-400">Recently completed tasks</p>
               </div>
            </div>
            {jobs.filter(j => j.status === 'Completed' || j.status === 'PickedForWorkshop').length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-12 text-center">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                   <History size={32} className="text-slate-600" />
                 </div>
                 <h3 className="text-white font-bold mb-1">No History</h3>
                 <p className="text-sm text-slate-500">You haven't completed any jobs yet.</p>
               </div>
            ) : (
              <div className="space-y-4">
                {jobs.filter(j => j.status === 'Completed' || j.status === 'PickedForWorkshop').map((job, idx) => (
                  <motion.div 
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                             {job.lead_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                             ${job.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}
                          `}>
                             {job.status}
                          </span>
                       </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{job.customer?.name}</h3>
                    <p className="text-xs text-slate-400">{job.product_type} • {job.customer?.area}</p>
                  </motion.div>
                ))}
              </div>
            )}
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
                    <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs pointer-events-none">Actual Problem Found</label>
                  </div>

                  <div className="group relative">
                    <textarea 
                      value={outcomeData.repair_details}
                      onChange={(e) => setOutcomeData({...outcomeData, repair_details: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all resize-none peer placeholder-transparent" 
                      placeholder="Details"
                      rows={2}
                    ></textarea>
                    <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs pointer-events-none">
                      {outcomeData.status === 'Completed' ? 'Work Performed / Parts Used' : 
                       outcomeData.status === 'PickedForWorkshop' ? 'Agreed Parts to Change (Warranty)' : 
                       'Inspection Notes & Recommendations'}
                    </label>
                  </div>

                  {outcomeData.status === 'PickedForWorkshop' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group relative">
                        <div className="absolute left-4 top-3.5 text-slate-500"><CreditCard size={14}/></div>
                        <input 
                          type="number"
                          value={outcomeData.total_amount}
                          onChange={(e) => setOutcomeData({...outcomeData, total_amount: e.target.value})}
                          className="w-full bg-slate-950 text-white pl-9 pr-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all placeholder-transparent peer" 
                          placeholder="Deal Amount"
                        />
                        <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:left-9 peer-focus:left-4 pointer-events-none">
                          Deal Amount
                        </label>
                      </div>
                      <div className="group relative">
                        <div className="absolute left-4 top-3.5 text-slate-500"><CreditCard size={14}/></div>
                        <input 
                          type="number"
                          value={outcomeData.collected_amount}
                          onChange={(e) => setOutcomeData({...outcomeData, collected_amount: e.target.value})}
                          className="w-full bg-slate-950 text-white pl-9 pr-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all placeholder-transparent peer" 
                          placeholder="Advance Taken"
                        />
                        <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:left-9 peer-focus:left-4 pointer-events-none">
                          Advance Taken
                        </label>
                      </div>
                    </div>
                  ) : (
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
                        <label className="absolute left-4 top-[-8px] bg-slate-900 px-1 text-[10px] font-bold text-slate-500 peer-focus:text-emerald-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:left-9 peer-focus:left-4 pointer-events-none">
                          {outcomeData.status === 'Completed' ? 'Amount Collected' : 'Charges'}
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
                  )}
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
