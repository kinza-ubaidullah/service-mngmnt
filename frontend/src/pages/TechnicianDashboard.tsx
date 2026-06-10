import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout, setUser } from '../store/slices/authSlice';
import { 
  LogOut, Wrench, MapPin, Clock, ClipboardCheck, 
  ChevronRight, CheckCircle2, Package, Wallet, Plus,
  Loader2, Sparkles, X, CreditCard, Info, User, TrendingDown, History, Download,
  AlertCircle, Search, Filter, Activity, Truck, RefreshCw, Settings, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { generateInspectionReportPDF } from '../utils/inspectionReportGenerator';
import { generateWorkshopPickupPDF } from '../utils/workshopPickupGenerator';
import SettingsModule from '../components/SettingsModule';
import TechnicianWorkshopView from '../components/TechnicianWorkshopView';
import ImageZoomModal from '../components/ImageZoomModal';
import LeadHistoryModal from '../components/LeadHistoryModal';
import { socket } from '../services/socket';
import { getLeadPictures, formatPKR, getFinalAmount, matchesLeadSearch } from '../utils/leadHelpers';
import { parseGoogleMapsCoords } from '../utils/leadLocation';
import RefreshButton from '../components/RefreshButton';
import VoiceNoteRecorder from '../components/VoiceNoteRecorder';
import { useLiveData } from '../hooks/useLiveData';
import { compressImageFile } from '../utils/compressImage';

interface Lead {
  id: number;
  lead_id: string;
  status: string;
  product_type: string;
  problem_details?: string;
  actual_problem?: string;
  repair_details?: string;
  created_at: string;
  visit_date: string;
  exact_address?: string;
  item_pictures?: string[];
  house_image?: string;
  agreed_amount?: number;
  total_amount?: number;
  collected_amount?: number;
  warranty_months?: number;
  lat?: number;
  lng?: number;
  customer: {
    name: string;
    phone: string;
    area: string;
    exact_address?: string;
    google_map_link?: string;
  };
}

const JOB_FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'new', label: 'New' },
  { id: 'complaint', label: 'Complaint' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
] as const;

const matchesJobFilter = (job: Lead, filter: string) => {
  if (filter === 'active') return !['Completed', 'PickedForWorkshop', 'PendingApproval', 'Cancelled', 'Deleted'].includes(job.status);
  if (filter === 'new') return job.status === 'Assigned' || job.status === 'InProgress';
  if (filter === 'complaint') return job.status === 'Complaint' || job.status === 'Reopened';
  if (filter === 'pending') return job.status === 'PendingApproval';
  if (filter === 'completed') return job.status === 'Completed' || job.status === 'PickedForWorkshop' || job.status === 'InspectionCompleted';
  return true;
};

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

  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'wallet' | 'workshop' | 'settings'>(() => (sessionStorage.getItem('techActiveTab') as 'tasks' | 'history' | 'wallet' | 'workshop' | 'settings') || 'tasks');
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
  const [outcomeData, setOutcomeData] = useState({
    status: 'Completed',
    actual_problem: '',
    repair_details: '',
    total_amount: '',
    collected_amount: '',
    warranty_months: '3'
  });
  const [outcomePictures, setOutcomePictures] = useState<string[]>([]);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<string>('active');
  const [voiceNote, setVoiceNote] = useState<string>('');
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [walletDetail, setWalletDetail] = useState<any>(null);

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

  const getDistanceDisplay = (job: Lead) => {
    if (!user?.lat || !user?.lng) return null;
    let lat: number | null = job.lat ?? null;
    let lng: number | null = job.lng ?? null;
    if (lat == null || lng == null) {
      const parsed = parseGoogleMapsCoords(job.customer?.google_map_link);
      if (parsed) { lat = parsed[0]; lng = parsed[1]; }
    }
    if (lat == null || lng == null) return null;
    const dist = calculateDistance(user.lat, user.lng, lat, lng);
    return `${dist.toFixed(1)} km away`;
  };

  const fetchJobs = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const res = await api.get('/leads/technician/my-jobs');
      setJobs(res.data.leads || []);
    } catch (error) {
      toast.error('Failed to load your jobs');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const refreshTasks = async (opts?: { silent?: boolean }) => {
    await Promise.all([fetchJobs(opts), fetchWalletData()]);
  };

  const { refresh: refreshTasksBtn, refreshing: tasksRefreshing } = useLiveData(
    ['leads', 'workshop', 'expenses', 'settlements'],
    () => refreshTasks({ silent: true })
  );

  const fetchWalletData = async () => {
    try {
      const [summaryRes, expensesRes, earningsRes, settlementRes] = await Promise.all([
        api.get('/expenses/wallet-summary'),
        api.get('/expenses/my-expenses'),
        api.get('/finance/my-summary'),
        user?.id ? api.get(`/settlements/${user.id}`).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);
      setWalletSummary(summaryRes.data.summary || { balance: 0, totalCollected: 0, totalSpent: 0 });
      setExpenses(expensesRes.data.expenses || []);
      setEarningsSummary(earningsRes.data || { commission: 0, rate: 0 });
      setWalletDetail(settlementRes.data);
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
    if (!isAuthenticated || !user?.id) return;

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
    };
  }, [user?.id, isAuthenticated]);

  const buildWalletTimeline = () => {
    const entries: {
      id: string;
      date: Date;
      title: string;
      subtitle: string;
      amount: number;
      type: 'income' | 'expense' | 'pending' | 'received';
    }[] = [];

    (walletDetail?.jobs || walletDetail?.completedJobs || []).forEach((j: any) => {
      entries.push({
        id: `job-${j.id}`,
        date: new Date(j.completed_at || j.updated_at || Date.now()),
        title: j.lead_id,
        subtitle: `${j.customer?.name || 'Customer'} • ${j.product_type || 'Job'}${j.is_settled ? ' • Paid to Admin' : ' • Pending Return'}`,
        amount: Number(j.amount ?? j.collected_amount ?? 0),
        type: j.is_settled ? 'received' : 'pending',
      });
    });

    expenses.forEach((exp) => {
      entries.push({
        id: `exp-${exp.id}`,
        date: new Date(exp.date || exp.created_at || Date.now()),
        title: exp.category || 'Expense',
        subtitle: exp.description || 'Recorded expense',
        amount: Number(exp.amount || 0),
        type: 'expense',
      });
    });

    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const walletTimeline = buildWalletTimeline();

  const isGlobalSearch = jobSearch.trim().length > 0;
  const filteredJobs = jobs.filter(job => {
    if (!matchesLeadSearch(job, jobSearch)) return false;
    if (isGlobalSearch) return true;
    return matchesJobFilter(job, jobFilter);
  });

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
    
    setOutcomeLoading(true);
    try {
      const compressedPics = outcomePictures.length > 0
        ? await Promise.all(outcomePictures.map(async (pic) => {
            if (!pic.startsWith('data:image')) return pic;
            try {
              const res = await fetch(pic);
              const blob = await res.blob();
              const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
              return compressImageFile(file, 1000, 0.75);
            } catch { return pic; }
          }))
        : undefined;
      await api.patch(`/leads/${selectedJob.id}/outcome`, {
        ...outcomeData,
        item_pictures: compressedPics,
        voice_note: voiceNote || undefined
      });
      toast.success('Job outcome submitted for approval!');
      setOutcomeModalOpen(false);
      setSelectedJob(null);
      resetOutcomeForm();
      fetchJobs();
      fetchWalletData();
      fetchWorkshopJobs();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Update failed';
      toast.error(msg);
    } finally {
      setOutcomeLoading(false);
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

  const openOutcomeModal = (job: Lead) => {
    setSelectedJob(job);
    setOutcomeData({ status: 'Completed', actual_problem: '', repair_details: '', total_amount: '', collected_amount: '', warranty_months: '3' });
    setOutcomePictures([]);
    setVoiceNote('');
    setOutcomeModalOpen(true);
  };

  const resetOutcomeForm = () => {
    setOutcomeData({ status: 'Completed', actual_problem: '', repair_details: '', total_amount: '', collected_amount: '', warranty_months: '3' });
    setOutcomePictures([]);
    setVoiceNote('');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="text-emerald-500 animate-spin mb-4" size={40} />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Authenticating Technician...</p>
      </div>
    );
  }

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
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'settings' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Settings size={18} /> Settings
          </button>
        </div>

        {activeTab === 'tasks' ? (
          <>
            <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">My Jobs</h2>
                <p className="text-sm text-slate-400">
                  {jobs.filter(j => matchesJobFilter(j, 'active')).length} active • {jobs.filter(j => j.status === 'Complaint' || j.status === 'Reopened').length} complaints
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48 group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search lead ID, name, phone (any tab)..." 
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-emerald-500/50 transition-all text-white"
                  />
                </div>
                <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-emerald-400 hover:text-emerald-300" />
              </div>
            </div>

            <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-xl border border-white/5 mb-6">
              {JOB_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setJobFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    jobFilter === f.id
                      ? f.id === 'complaint' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                  <span className="ml-1 opacity-70">({jobs.filter(j => matchesJobFilter(j, f.id)).length})</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="h-64 flex justify-center items-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck size={32} className="text-slate-600" />
                </div>
                <h3 className="text-white font-bold mb-1">No Jobs Found</h3>
                <p className="text-sm text-slate-500">No jobs match the current filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredJobs.map((job, idx) => {
                    const isComplaint = job.status === 'Complaint' || job.status === 'Reopened';
                    const pics = getLeadPictures(job);
                    return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`backdrop-blur-xl border rounded-2xl p-5 transition-all group ${
                        isComplaint
                          ? 'bg-red-950/30 border-red-500/40 shadow-lg shadow-red-500/10'
                          : 'bg-slate-900/60 border-white/10 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                            {job.lead_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                            ${isComplaint ? 'bg-red-500/20 text-red-400' :
                              job.status === 'Assigned' ? 'bg-blue-500/20 text-blue-400' : 
                              job.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}
                          `}>
                            {isComplaint ? 'COMPLAINT' : job.status}
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
                          {job.status === 'InspectionCompleted' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); generateInspectionReportPDF(job); }}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors border border-amber-500/20"
                              title="Inspection PDF"
                            >
                              <Download size={14} />
                            </button>
                          )}
                          {job.status === 'PickedForWorkshop' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); generateWorkshopPickupPDF(job); }}
                              className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20"
                              title="Pickup PDF"
                            >
                              <Download size={14} />
                            </button>
                          )}
                          <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1">{job.customer?.name}</h3>
                      <div className="text-sm text-amber-300/95 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-3">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1">Customer Issue / Complaint</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.problem_details || 'No description provided.'}</p>
                      </div>
                      {(job.agreed_amount || getFinalAmount(job) > 0) && (
                        <p className="text-xs text-emerald-400 font-bold mb-2">
                          {job.agreed_amount ? `Agreed: ${formatPKR(job.agreed_amount)}` : `Amount: ${formatPKR(getFinalAmount(job))}`}
                        </p>
                      )}
                      <div className="flex flex-col gap-1 text-slate-400 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-emerald-500/70" />
                          <span className="truncate flex-1">{job.customer?.area}</span>
                          {getDistanceDisplay(job) && (
                            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                              {getDistanceDisplay(job)}
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

                      {pics.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 custom-scrollbar">
                           {pics.map((pic: string, pIdx: number) => (
                             <img 
                               key={pIdx} 
                               src={pic} 
                               alt="item" 
                               className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500/50"
                               onClick={() => setZoomImg(pic)}
                             />
                           ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button type="button" onClick={() => setHistoryLead(job)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold py-2.5 rounded-xl border border-white/10 flex items-center justify-center gap-1">
                          <History size={14} /> History
                        </button>
                        {!['Completed', 'PickedForWorkshop', 'PendingApproval'].includes(job.status) && (
                          <button type="button" onClick={() => openOutcomeModal(job)} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1">
                            <ClipboardCheck size={14} /> Update Outcome
                          </button>
                        )}
                        {job.status === 'Completed' && (
                          <button type="button" onClick={() => generateInvoicePDF(job)} className="flex-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold py-2.5 rounded-xl border border-indigo-500/20 flex items-center justify-center gap-1">
                            <Download size={14} /> Invoice
                          </button>
                        )}
                        {job.status === 'InspectionCompleted' && (
                          <button type="button" onClick={() => generateInspectionReportPDF(job)} className="flex-1 bg-amber-500/10 text-amber-400 text-xs font-bold py-2.5 rounded-xl border border-amber-500/20 flex items-center justify-center gap-1">
                            <Download size={14} /> Inspection
                          </button>
                        )}
                        {job.status === 'PickedForWorkshop' && (
                          <button type="button" onClick={() => generateWorkshopPickupPDF(job)} className="flex-1 bg-blue-500/10 text-blue-400 text-xs font-bold py-2.5 rounded-xl border border-blue-500/20 flex items-center justify-center gap-1">
                            <Download size={14} /> Pickup
                          </button>
                        )}
                      </div>
                    </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : activeTab === 'workshop' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TechnicianWorkshopView />
          </motion.div>
        ) : activeTab === 'wallet' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">My Wallet</h2>
              <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-emerald-400 hover:text-emerald-300" />
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-emerald-100 text-sm font-medium mb-1">Total Collected</p>
                  <h3 className="text-4xl font-black tracking-tight">{formatPKR(walletSummary?.totalCollected || 0)}</h3>
                  {earningsSummary?.commission > 0 && (
                    <p className="text-emerald-200 text-xs mt-1">Commission: {formatPKR(earningsSummary.commission)} ({earningsSummary.rate || 10}%)</p>
                  )}
                </div>
                <button onClick={() => setExpenseModalOpen(true)} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition">
                  <Plus size={24} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-white/20 pt-4">
                <div>
                  <p className="text-emerald-200 text-[10px] uppercase font-bold mb-1">Expenses</p>
                  <p className="text-lg font-bold">{formatPKR(walletSummary?.totalSpent || 0)}</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-[10px] uppercase font-bold mb-1">To Return</p>
                  <p className="text-lg font-bold">{formatPKR(walletSummary?.balance || 0)}</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-[10px] uppercase font-bold mb-1">Overdue</p>
                  <p className="text-lg font-bold text-amber-200">{formatPKR(walletDetail?.overdue || 0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-1">All Transactions</h3>
              <p className="text-[10px] text-slate-500 mb-4">Complete wallet activity — collections, pending returns, expenses</p>
              {walletTimeline.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No transactions yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {walletTimeline.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex justify-between items-start gap-3 p-3 rounded-xl border text-xs ${
                        entry.type === 'expense'
                          ? 'bg-rose-500/5 border-rose-500/15'
                          : entry.type === 'pending'
                          ? 'bg-amber-500/5 border-amber-500/15'
                          : entry.type === 'received'
                          ? 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-slate-200 font-bold">{entry.title}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5 truncate">{entry.subtitle}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {entry.date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-black ${
                          entry.type === 'expense' ? 'text-rose-400' :
                          entry.type === 'pending' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {entry.type === 'expense' ? '-' : '+'}{formatPKR(entry.amount)}
                        </p>
                        <span className={`text-[9px] font-black uppercase ${
                          entry.type === 'expense' ? 'text-rose-500' :
                          entry.type === 'pending' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {entry.type === 'expense' ? 'Expense' : entry.type === 'pending' ? 'Pending' : 'Received'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {walletDetail?.settlements?.length > 0 && (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3">Received Payments</h3>
                <div className="space-y-2">
                  {walletDetail.settlements.filter((s: any) => s.is_received).map((s: any) => (
                    <div key={s.id} className="flex justify-between text-xs bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                      <span className="text-slate-300">{s.description}</span>
                      <span className="text-emerald-400 font-bold">{formatPKR(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">My Expenses</h3>
              {expenses.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No expenses recorded. Tap + to add.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between text-xs bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                      <div>
                        <p className="text-slate-200 font-bold">{exp.category}</p>
                        <p className="text-slate-500">{exp.description || new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-rose-400 font-bold">-{formatPKR(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(walletDetail?.jobs?.length > 0 || walletDetail?.completedJobs?.length > 0) && (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-1">Task Payments</h3>
                <p className="text-[10px] text-slate-500 mb-3">Har task ki payment admin ko alag jama hoti hai</p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(walletDetail.jobs || walletDetail.completedJobs || []).map((j: any) => {
                    const settled = !!j.is_settled;
                    return (
                      <div key={j.id} className={`p-3 rounded-xl border text-xs ${settled ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-rose-500/5 border-rose-500/20'}`}>
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-slate-200 font-bold truncate">{j.lead_id} — {j.customer?.name}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">
                              {j.product_type ? `${j.product_type} • ` : ''}
                              {new Date(j.completed_at || j.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              {settled && j.settlement?.received_at && (
                                <span className="text-emerald-500"> • Paid {new Date(j.settlement.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black ${settled ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPKR(j.amount ?? j.collected_amount)}</p>
                            <span className={`text-[9px] font-black uppercase ${settled ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {settled ? 'Paid to Admin' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : activeTab === 'settings' ? (
          <SettingsModule />
        ) : (
          /* HISTORY TAB */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-end mb-6">
               <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Job History</h2>
                  <p className="text-sm text-slate-400">Recently completed tasks</p>
               </div>
               <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-emerald-400 hover:text-emerald-300" />
            </div>
            {jobs.filter(j => matchesJobFilter(j, 'completed')).length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-12 text-center">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                   <History size={32} className="text-slate-600" />
                 </div>
                 <h3 className="text-white font-bold mb-1">No History</h3>
                 <p className="text-sm text-slate-500">You haven't completed any jobs yet.</p>
               </div>
            ) : (
              <div className="space-y-4">
                {jobs.filter(j => matchesJobFilter(j, 'completed')).map((job, idx) => (
                  <motion.div 
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-emerald-500/30"
                    onClick={() => setHistoryLead(job)}
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
                       <span className="text-emerald-400 font-black text-sm">{formatPKR(getFinalAmount(job))}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{job.customer?.name}</h3>
                    <p className="text-xs text-slate-400">{job.product_type} • {job.customer?.area}</p>
                    <p className="text-xs text-amber-400/80 mt-2 line-clamp-2">{job.problem_details}</p>
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
                  <div className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/50 p-2 rounded-lg">
                    <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">{selectedJob.customer?.area}</p>
                      <p>{selectedJob.exact_address || selectedJob.customer?.exact_address || 'No exact address'}</p>
                      {selectedJob.customer?.google_map_link && (
                        <a href={selectedJob.customer.google_map_link} target="_blank" rel="noreferrer" className="text-amber-400 underline mt-1 inline-block">Open Google Maps →</a>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                    <p className="text-[10px] font-black uppercase text-amber-500 mb-1">Reported Issue</p>
                    {selectedJob.problem_details || 'No description'}
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
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actual Problem Found</label>
                    <textarea 
                      required
                      value={outcomeData.actual_problem}
                      onChange={(e) => setOutcomeData({...outcomeData, actual_problem: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all resize-none" 
                      placeholder="Describe the actual problem..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {outcomeData.status === 'Completed' ? 'Work Performed / Parts Used' : 
                       outcomeData.status === 'PickedForWorkshop' ? 'Agreed Parts to Change (Warranty)' : 
                       'Inspection Notes & Recommendations'}
                    </label>
                    <textarea 
                      value={outcomeData.repair_details}
                      onChange={(e) => setOutcomeData({...outcomeData, repair_details: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all resize-none" 
                      placeholder="Enter details..."
                      rows={2}
                    />
                  </div>

                  {outcomeData.status === 'PickedForWorkshop' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deal Amount</label>
                        <input 
                          type="number"
                          value={outcomeData.total_amount}
                          onChange={(e) => setOutcomeData({...outcomeData, total_amount: e.target.value})}
                          className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all" 
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advance Taken</label>
                        <input 
                          type="number"
                          value={outcomeData.collected_amount}
                          onChange={(e) => setOutcomeData({...outcomeData, collected_amount: e.target.value})}
                          className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all" 
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {outcomeData.status === 'Completed' ? 'Amount Collected' : 'Charges'}
                        </label>
                        <input 
                          type="number"
                          value={outcomeData.collected_amount}
                          onChange={(e) => setOutcomeData({...outcomeData, collected_amount: e.target.value})}
                          className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-emerald-500 outline-none transition-all" 
                          placeholder="0"
                        />
                      </div>
                      {outcomeData.status === 'Completed' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Warranty</label>
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
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voice Note (optional)</label>
                    <VoiceNoteRecorder value={voiceNote} onChange={setVoiceNote} />
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pt-2">
                      <Camera size={12} /> Machine Photos
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        try {
                          const results = await Promise.all(files.map(f => compressImageFile(f)));
                          setOutcomePictures(prev => [...prev, ...results].slice(0, 6));
                        } catch { toast.error('Failed to process photos'); }
                        e.target.value = '';
                      }}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-2xl border border-white/10 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-white"
                    />
                    {outcomePictures.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {outcomePictures.map((pic, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                            <img src={pic} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setOutcomePictures(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-0.5 right-0.5 bg-red-500/80 text-white rounded-full p-0.5">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setOutcomeModalOpen(false); setOutcomePictures([]); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/5">Back</button>
                  <button type="submit" disabled={outcomeLoading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                    {outcomeLoading ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} Submit Outcome
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
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
      {historyLead && <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />}
    </div>
  );
};

export default TechnicianDashboard;
