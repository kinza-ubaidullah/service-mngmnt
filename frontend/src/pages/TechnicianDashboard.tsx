import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import { logout, setUser } from '../store/slices/authSlice';
import { 
  LogOut, Wrench, MapPin, Clock, ClipboardCheck, 
  ChevronRight, ChevronDown, CheckCircle2, Package, Wallet, Plus,
  Loader2, Sparkles, X, CreditCard, Info, User, TrendingDown, History, Download,
  AlertCircle, Search, Filter, Activity, Truck, RefreshCw, Settings, Camera, PhoneOff, Phone, Eye, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { generateInspectionReportPDF } from '../utils/inspectionReportGenerator';
import { generateWorkshopPickupPDF } from '../utils/workshopPickupGenerator';
import { generateCompleteRepairPDF } from '../utils/completeRepairGenerator';
import SettingsModule from '../components/SettingsModule';
import WorkshopModule from '../components/WorkshopModule';
import ImageZoomModal from '../components/ImageZoomModal';
import LeadHistoryModal from '../components/LeadHistoryModal';
import { getLeadPictures, getProductPictures, formatPKR, getFinalAmount, matchesLeadSearch } from '../utils/leadHelpers';
import { parseGoogleMapsCoords, getLeadCoords, calculateDistanceKm, formatDistanceKm, hasExactLeadLocation } from '../utils/leadLocation';
import RefreshButton from '../components/RefreshButton';
import ThemeToggle from '../components/ThemeToggle';
import VoiceNoteRecorder from '../components/VoiceNoteRecorder';
import { useLiveData } from '../hooks/useLiveData';
import { useMyLivePosition } from '../hooks/useMyLivePosition';
import LeadSummaryHeader from '../components/LeadSummaryHeader';
import TechnicianJobBrief from '../components/TechnicianJobBrief';
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
  pending_outcome?: string | null;
  rejection_note?: string | null;
  voice_note?: string | null;
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
  workshop_job?: {
    id: number;
    status: string;
    delivery_assigned_to?: number | null;
  } | null;
}

const JOB_FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'delivery', label: 'Ready for Delivery' },
  { id: 'new', label: 'New' },
  { id: 'complaint', label: 'Returned' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
] as const;

const isDeliveryJob = (job: Lead, userId?: number) =>
  !!userId &&
  job.workshop_job?.delivery_assigned_to === userId &&
  job.workshop_job?.status === 'Ready';

const isReturnedJob = (job: Lead) =>
  job.status === 'Complaint' || job.status === 'Reopened';

const matchesJobFilter = (job: Lead, filter: string, userId?: number) => {
  if (filter === 'delivery') return isDeliveryJob(job, userId);
  if (filter === 'active') return !['Completed', 'PickedForWorkshop', 'PendingApproval', 'Cancelled', 'Deleted'].includes(job.status);
  if (filter === 'new') return job.status === 'Assigned' || job.status === 'InProgress';
  if (filter === 'complaint') return isReturnedJob(job);
  if (filter === 'pending') return job.status === 'PendingApproval';
  if (filter === 'completed') return job.status === 'Completed' || job.status === 'PickedForWorkshop' || job.status === 'InspectionCompleted' || job.status === 'PendingApproval';
  return true;
};

interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at?: string;
}

const TechnicianDashboard = () => {
  console.log('--- TechnicianDashboard Rendering ---');
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  const [expandedJobIds, setExpandedJobIds] = useState<Set<number>>(new Set());
  const [walletDetail, setWalletDetail] = useState<any>(null);

  // Wallet State
  const [walletSummary, setWalletSummary] = useState<any>(null);
  const [requestingDepositId, setRequestingDepositId] = useState<number | null>(null);
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

  const livePosition = useMyLivePosition(user?.id);

  const getDistanceDisplay = (job: Lead) => {
    const techLat = livePosition?.lat ?? user?.lat;
    const techLng = livePosition?.lng ?? user?.lng;
    if (techLat == null || techLng == null) return null;
    if (!hasExactLeadLocation(job)) return null;
    const [lat, lng] = getLeadCoords(job);
    const dist = calculateDistanceKm(techLat, techLng, lat, lng);
    return formatDistanceKm(dist);
  };

  const toggleJobExpanded = (jobId: number) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleNoAnswer = async (job: Lead) => {
    if (!window.confirm('Customer did not answer? This will return the lead to Unassigned for reassignment.')) return;
    try {
      await api.patch(`/leads/${job.id}/technician-no-answer`, {
        reason: 'Customer did not answer phone',
      });
      toast.success('Lead returned to unassigned queue');
      fetchJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to return lead');
    }
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
  }, [user?.id, isAuthenticated]);

  const buildWalletTimeline = () => {
    const entries: {
      id: string;
      originalJob?: any;
      date: Date;
      title: string;
      subtitle: string;
      amount: number;
      type: 'income' | 'expense' | 'pending' | 'requested' | 'received';
    }[] = [];

    (walletDetail?.jobs || walletDetail?.completedJobs || []).forEach((j: any) => {
      entries.push({
        id: `job-${j.id}`,
        originalJob: j,
        date: new Date(j.completed_at || j.updated_at || Date.now()),
        title: j.lead_id,
        subtitle: `${j.customer?.name || 'Customer'} • ${j.product_type || 'Job'}${j.is_settled ? ' • Paid to Admin' : j.is_requested ? ' • Deposit Requested' : ' • Pending Return'}`,
        amount: Number(j.amount ?? j.collected_amount ?? 0),
        type: j.is_settled ? 'received' : j.is_requested ? 'requested' : 'pending',
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

  const handleRequestDeposit = async (jobId: number) => {
    try {
      setRequestingDepositId(jobId);
      const res = await api.post(`/settlements/request`, { lead_id: jobId });
      toast.success(res.data.message || 'Deposit requested successfully');
      fetchWalletData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to request deposit');
    } finally {
      setRequestingDepositId(null);
    }
  };

  const isGlobalSearch = jobSearch.trim().length > 0;
  const filteredJobs = jobs.filter(job => {
    if (!matchesLeadSearch(job, jobSearch)) return false;
    if (isGlobalSearch) return true;
    return matchesJobFilter(job, jobFilter, user?.id);
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

  const handleMarkDelivered = async (job: Lead) => {
    if (!job.workshop_job?.id) return toast.error('No workshop job linked');
    if (!window.confirm(`Mark ${job.lead_id} as delivered to customer?`)) return;
    try {
      await api.patch(`/workshop/jobs/${job.workshop_job.id}/status`, { status: 'Delivered' });
      toast.success('Marked as delivered — sent for final approval');
      fetchJobs();
      fetchWalletData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark delivered');
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
        status: outcomeData.status,
        actual_problem: outcomeData.actual_problem,
        repair_details: outcomeData.repair_details,
        total_amount: outcomeData.total_amount || outcomeData.collected_amount || undefined,
        collected_amount: outcomeData.collected_amount || outcomeData.total_amount || undefined,
        warranty_months: outcomeData.warranty_months,
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
    const outcomeType =
      job.pending_outcome === 'PickedForWorkshop' ? 'PickedForWorkshop'
      : job.pending_outcome === 'InspectionCompleted' ? 'InspectionCompleted'
      : 'Completed';
    setOutcomeData({
      status: outcomeType,
      actual_problem: job.actual_problem || '',
      repair_details: job.repair_details || '',
      total_amount: job.total_amount != null ? String(job.total_amount) : '',
      collected_amount: job.collected_amount != null ? String(job.collected_amount) : '',
      warranty_months: job.warranty_months != null ? String(job.warranty_months) : '3',
    });
    setOutcomePictures(getProductPictures(job));
    setVoiceNote(job.voice_note || '');
    setOutcomeModalOpen(true);
  };

  const resetOutcomeForm = () => {
    setOutcomeData({ status: 'Completed', actual_problem: '', repair_details: '', total_amount: '', collected_amount: '', warranty_months: '3' });
    setOutcomePictures([]);
    setVoiceNote('');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="crm-shell flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="text-emerald-500 animate-spin mb-4" size={40} />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Authenticating Technician...</p>
      </div>
    );
  }

  return (
    <div className="crm-shell text-slate-800 flex flex-col font-sans selection:bg-mint-200/50 min-h-screen">
      
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-mint-300/25 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-sky-soft/40 blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="crm-nav backdrop-blur-xl px-6 py-4 flex justify-between items-center sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <div className="crm-icon-box p-2 rounded-lg shadow-lg shadow-mint-300/30">
            <Wrench size={20} className="text-white" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-wide flex items-center gap-2">
              TechPanel <Sparkles size={14} className="text-mint-600" />
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400 font-medium">Technician</p>
            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
          </div>



          <ThemeToggle />
          <button 
            onClick={() => dispatch(logout())}
            className="p-2.5 crm-btn-ghost rounded-xl transition-all border border-slate-200/70 hover:border-mint-300/50"
          >
            <LogOut size={18} />
          </button>
        </div>
      </motion.nav>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full relative z-10 pb-24">
        
        {/* Profile Completion Warning Removed */}

        {/* Tab Switcher */}
        <div className="flex crm-tabs rounded-2xl mb-8 shadow-xl">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
              ${activeTab === 'tasks' ? 'crm-tab-active shadow-sm' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <ClipboardCheck size={18} /> Tasks
          </button>
          <button 
            onClick={() => setActiveTab('workshop')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'workshop' ? 'crm-tab-active shadow-sm' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Package size={18} /> Workshop
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'history' ? 'crm-tab-active shadow-sm' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <History size={18} /> History
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'wallet' ? 'crm-tab-active shadow-sm' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Wallet size={18} /> Wallet
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] sm:text-sm transition-all
              ${activeTab === 'settings' ? 'crm-tab-active shadow-sm' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Settings size={18} /> Settings
          </button>
        </div>

        {activeTab === 'tasks' ? (
          <>
            <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">My Jobs</h2>
                <p className="text-sm text-slate-400">
                  {jobs.filter(j => matchesJobFilter(j, 'active', user?.id)).length} active • {jobs.filter(j => isReturnedJob(j)).length} returned
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48 group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mint-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search lead ID, name, phone (any tab)..." 
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full crm-card-soft border border-slate-200/60 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-mint-400/50 transition-all text-slate-800"
                  />
                </div>
                <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-mint-600 hover:text-emerald-300" />
              </div>
            </div>

            <div className="flex flex-wrap gap-1 crm-card-soft p-1 rounded-xl border border-slate-200/60 mb-6">
              {JOB_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setJobFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    jobFilter === f.id
                      ? f.id === 'complaint' ? 'bg-rose-400 text-white' : f.id === 'delivery' ? 'crm-tab-active' : 'crm-tab-active'
                      : 'text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {f.label}
                  <span className="ml-1 opacity-70">({jobs.filter(j => matchesJobFilter(j, f.id, user?.id)).length})</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="h-64 flex justify-center items-center">
                <Loader2 className="animate-spin text-mint-500" size={32} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="crm-card-soft border border-slate-200/60 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck size={32} className="text-slate-600" />
                </div>
                <h3 className="text-slate-800 font-bold mb-1">No Jobs Found</h3>
                <p className="text-sm text-slate-500">No jobs match the current filter.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <AnimatePresence mode="popLayout">
                  {filteredJobs.map((job, idx) => {
                    const isReturned = isReturnedJob(job);
                    const isDelivery = isDeliveryJob(job, user?.id);
                    const distanceLabel = getDistanceDisplay(job);
                    const extraProductPics = getProductPictures(job).slice(1);
                    const isExpanded = expandedJobIds.has(job.id);
                    const statusLabel = isReturned ? 'RETURNED' : isDelivery ? 'READY FOR DELIVERY' : job.status;
                    const statusTone = isReturned
                      ? 'returned'
                      : isDelivery
                      ? 'delivery'
                      : job.status === 'Assigned'
                      ? 'assigned'
                      : job.status === 'Completed'
                      ? 'completed'
                      : 'default';
                    return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="space-y-0"
                    >
                      <TechnicianJobBrief
                        job={job}
                        statusLabel={statusLabel}
                        statusTone={statusTone}
                        distanceLabel={distanceLabel}
                        isExpanded={isExpanded}
                        onToggle={() => toggleJobExpanded(job.id)}
                        onZoom={setZoomImg}
                      />

                      {job.rejection_note && (
                        <div className="mx-1 -mt-1 mb-1 rounded-b-xl border border-rose-300 border-t-0 bg-rose-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Admin Rejection Note</p>
                          <p className="text-xs font-semibold text-rose-800 mt-0.5">{job.rejection_note}</p>
                        </div>
                      )}

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key={`expand-${job.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            className="overflow-hidden -mt-1"
                          >
                            <div className="mx-1 rounded-b-2xl border border-t-0 border-slate-200 bg-white px-4 pb-5 pt-4 space-y-4 shadow-sm">
                              {/* Location Image */}
                              {job.house_image && (
                                <div className="mb-4">
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Location Image</p>
                                  <img 
                                    src={job.house_image} 
                                    alt="Location" 
                                    className="w-full max-h-48 object-cover rounded-xl border border-slate-200 cursor-pointer hover:ring-2 hover:ring-emerald-500" 
                                    onClick={() => setZoomImg(job.house_image as string)}
                                  />
                                </div>
                              )}

                              {job.problem_details && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                                  <p className="text-xs font-black uppercase tracking-wider text-amber-800 mb-1">Full Issue Description</p>
                                  <p className="text-base font-semibold text-amber-950 leading-relaxed">{job.problem_details}</p>
                                </div>
                              )}

                              {(job.agreed_amount || getFinalAmount(job) > 0) && (
                                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                                  <p className="text-xs font-black uppercase tracking-wider text-emerald-800 mb-1">Payment</p>
                                  <p className="text-lg font-black text-emerald-900">
                                    {job.agreed_amount ? `Agreed: ${formatPKR(job.agreed_amount)}` : `Amount: ${formatPKR(getFinalAmount(job))}`}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Appliance</p>
                                  <p className="text-base font-bold text-slate-900">{job.product_type}</p>
                                </div>
                                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Visit Date</p>
                                  <p className="text-base font-bold text-slate-900">
                                    {job.visit_date ? new Date(job.visit_date).toLocaleDateString() : 'Today'}
                                  </p>
                                </div>
                              </div>

                              {/* PDF Buttons - Available if job has outcome submitted */}
                              {(['Completed', 'InspectionCompleted', 'PickedForWorkshop', 'PendingApproval'].includes(job.status)) && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {/* Determine which PDF to show based on outcome */}
                                  {(job.status === 'Completed' || (job.status === 'PendingApproval' && job.pending_outcome === 'Completed')) && (
                                    <button type="button" onClick={() => generateInvoicePDF(job)} className="text-sm font-bold px-4 py-2 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200 flex items-center gap-2 w-full sm:w-auto justify-center">
                                      <Download size={16} /> On-Site Repair PDF
                                    </button>
                                  )}
                                  
                                  {/* If it was a workshop delivery (Complete Repair) */}
                                  {job.workshop_job?.status === 'Delivered' && (
                                    <button type="button" onClick={() => generateCompleteRepairPDF(job)} className="text-sm font-bold px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 w-full sm:w-auto justify-center">
                                      <Download size={16} /> Complete Repair PDF
                                    </button>
                                  )}

                                  {(job.status === 'InspectionCompleted' || (job.status === 'PendingApproval' && job.pending_outcome === 'InspectionCompleted')) && (
                                    <button type="button" onClick={() => generateInspectionReportPDF(job)} className="text-sm font-bold px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-2 w-full sm:w-auto justify-center">
                                      <Download size={16} /> Inspection PDF
                                    </button>
                                  )}

                                  {(job.status === 'PickedForWorkshop' || (job.status === 'PendingApproval' && job.pending_outcome === 'PickedForWorkshop')) && (
                                    <button type="button" onClick={async () => {
                                      try { await generateWorkshopPickupPDF(job); } catch { toast.error('Failed to generate Pickup PDF'); }
                                    }} className="text-sm font-bold px-4 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-2 w-full sm:w-auto justify-center">
                                      <Download size={16} /> Pickup PDF
                                    </button>
                                  )}
                                </div>
                              )}

                              {extraProductPics.length > 0 && (
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">More Photos</p>
                                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                    {extraProductPics.map((pic: string, pIdx: number) => (
                                      <img
                                        key={pIdx}
                                        src={pic}
                                        alt="Product"
                                        className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500"
                                        onClick={() => setZoomImg(pic)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setHistoryLead(job)} className="flex-1 min-w-[140px] bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold py-3.5 rounded-xl border border-slate-200 flex items-center justify-center gap-2">
                                  <Eye size={18} /> View Details
                                </button>
                                {!['Completed', 'PickedForWorkshop', 'PendingApproval'].includes(job.status) && !isDelivery && (
                                  <>
                                    <button type="button" onClick={() => handleNoAnswer(job)} className="flex-1 min-w-[140px] bg-rose-50 hover:bg-rose-100 text-rose-800 text-sm font-bold py-3.5 rounded-xl border border-rose-200 flex items-center justify-center gap-2">
                                      <PhoneOff size={18} /> No Answer
                                    </button>
                                    <button type="button" onClick={() => openOutcomeModal(job)} className="flex-1 min-w-[140px] bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
                                      <ClipboardCheck size={18} /> Update Outcome
                                    </button>
                                  </>
                                )}
                                {isDelivery && (
                                  <button type="button" onClick={() => handleMarkDelivered(job)} className="flex-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
                                    <Truck size={18} /> Mark Delivered
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : activeTab === 'workshop' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <WorkshopModule showGateInApproval={false} mode="technician" />
          </motion.div>
        ) : activeTab === 'wallet' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">My Wallet</h2>
              <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-mint-600 hover:text-emerald-300" />
            </div>
            <div className="crm-header-banner rounded-3xl p-6 text-white shadow-xl shadow-mint-300/30">
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

            <div className="crm-card border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-1">All Transactions</h3>
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
                          : entry.type === 'requested'
                          ? 'bg-blue-500/5 border-blue-500/20'
                          : entry.type === 'received'
                          ? 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-slate-50/80 border-slate-200/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-slate-700 font-bold">{entry.title}</p>
                          {entry.type === 'requested' && (
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-200">Processing</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[10px] mt-0.5 truncate">{entry.subtitle}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {entry.date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <p className={`font-black ${
                          entry.type === 'expense' ? 'text-rose-400' :
                          entry.type === 'pending' ? 'text-amber-500' :
                          entry.type === 'requested' ? 'text-blue-500' :
                          'text-emerald-500'
                        }`}>
                          {entry.type === 'expense' ? '-' : '+'}{formatPKR(entry.amount)}
                        </p>
                        {entry.type === 'pending' && entry.amount > 0 && entry.originalJob?.id && (
                          <button
                            onClick={() => handleRequestDeposit(entry.originalJob.id)}
                            disabled={requestingDepositId === entry.originalJob.id}
                            className="mt-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {requestingDepositId === entry.originalJob.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Deposit to Admin
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {walletDetail?.settlements?.length > 0 && (
              <div className="crm-card border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Received Payments</h3>
                <div className="space-y-2">
                  {walletDetail.settlements.filter((s: any) => s.is_received).map((s: any) => (
                    <div key={s.id} className="flex justify-between text-xs bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                      <span className="text-slate-300">{s.description}</span>
                      <span className="text-mint-600 font-bold">{formatPKR(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="crm-card border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">My Expenses</h3>
              {expenses.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No expenses recorded. Tap + to add.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between text-xs bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl">
                      <div>
                        <p className="text-slate-700 font-bold">{exp.category}</p>
                        <p className="text-slate-500">{exp.description || new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-rose-400 font-bold">-{formatPKR(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(walletDetail?.jobs?.length > 0 || walletDetail?.completedJobs?.length > 0) && (
              <div className="crm-card border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">Task Payments</h3>
                <p className="text-[10px] text-slate-500 mb-3">Har task ki payment admin ko alag jama hoti hai</p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(walletDetail.jobs || walletDetail.completedJobs || []).map((j: any) => {
                    const settled = !!j.is_settled;
                    return (
                      <div key={j.id} className={`p-3 rounded-xl border text-xs ${settled ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-rose-500/5 border-rose-500/20'}`}>
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-slate-700 font-bold truncate">{j.lead_id} — {j.customer?.name}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">
                              {j.product_type ? `${j.product_type} • ` : ''}
                              {new Date(j.completed_at || j.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              {settled && j.settlement?.received_at && (
                                <span className="text-emerald-500"> • Paid {new Date(j.settlement.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black ${settled ? 'text-mint-600' : 'text-rose-400'}`}>{formatPKR(j.amount ?? j.collected_amount)}</p>
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
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Job History</h2>
                  <p className="text-sm text-slate-400">Recently completed tasks</p>
               </div>
               <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-mint-600 hover:text-emerald-300" />
            </div>
            {jobs.filter(j => matchesJobFilter(j, 'completed', user?.id)).length === 0 ? (
              <div className="crm-card-soft border border-slate-200/60 rounded-3xl p-12 text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <History size={32} className="text-slate-600" />
                 </div>
                 <h3 className="text-slate-800 font-bold mb-1">No History</h3>
                 <p className="text-sm text-slate-500">You haven't completed any jobs yet.</p>
               </div>
            ) : (
              <div className="space-y-4">
                {jobs.filter(j => matchesJobFilter(j, 'completed', user?.id)).map((job, idx) => (
                  <motion.div 
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="crm-card backdrop-blur-xl border border-slate-200/70 rounded-2xl p-5 cursor-pointer hover:border-emerald-500/30"
                    onClick={() => setHistoryLead(job)}
                  >
                    <LeadSummaryHeader lead={job} onZoom={setZoomImg} className="mb-3" />
                    <div className="flex justify-between items-start">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                          ${job.status === 'Completed' ? 'bg-emerald-500/20 text-mint-600' : 'bg-blue-500/20 text-blue-400'}
                       `}>
                          {job.status}
                       </span>
                       <span className="text-mint-600 font-black text-sm">{formatPKR(getFinalAmount(job))}</span>
                    </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="crm-modal border rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/80 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Update Job Outcome</h3>
                  <p className="text-xs text-slate-500">Lead ID: {selectedJob.lead_id}</p>
                </div>
                <button type="button" onClick={() => setOutcomeModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 transition">
                  <X size={20} />
                </button>
              </div>

              <form id="tech-outcome-form" onSubmit={handleOutcomeSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 custom-scrollbar">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <User size={14} className="text-mint-600" /> {selectedJob.customer?.name}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-600 bg-white p-2 rounded-lg">
                    <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">{selectedJob.customer?.area}</p>
                      <p>{selectedJob.exact_address || selectedJob.customer?.exact_address || 'No exact address'}</p>
                      {selectedJob.customer?.google_map_link && (
                        <a href={selectedJob.customer.google_map_link} target="_blank" rel="noreferrer" className="text-amber-600 underline mt-1 inline-block">Open Google Maps →</a>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                    <p className="text-[10px] font-black uppercase text-amber-500 mb-1">Reported Issue</p>
                    {selectedJob.problem_details || 'No description'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Completed', label: 'Fixed', icon: CheckCircle2, color: 'text-mint-600' },
                    { id: 'PickedForWorkshop', label: 'Pickup', icon: Package, color: 'text-blue-400' },
                    { id: 'InspectionCompleted', label: 'Inspect', icon: Info, color: 'text-amber-600' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOutcomeData({...outcomeData, status: opt.id})}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all
                        ${outcomeData.status === opt.id 
                          ? 'bg-mint-50 border-emerald-500/50 scale-[1.05] shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                          : 'bg-slate-50 border-slate-200/60 opacity-60'
                        }
                      `}
                    >
                      <opt.icon size={20} className={opt.color} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{opt.label}</span>
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
                      className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all resize-none" 
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
                      className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all resize-none" 
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
                          className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" 
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advance Taken</label>
                        <input 
                          type="number"
                          value={outcomeData.collected_amount}
                          onChange={(e) => setOutcomeData({...outcomeData, collected_amount: e.target.value})}
                          className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" 
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
                          className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" 
                          placeholder="0"
                        />
                      </div>
                      {outcomeData.status === 'Completed' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Warranty</label>
                          <select 
                            value={outcomeData.warranty_months}
                            onChange={(e) => setOutcomeData({...outcomeData, warranty_months: e.target.value})}
                            className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all appearance-none"
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
                      className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-mint-400 file:text-slate-800"
                    />
                    {outcomePictures.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {outcomePictures.map((pic, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200/70 shrink-0">
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
              </form>

              <div className="shrink-0 p-6 border-t border-slate-200/60 bg-slate-50/80 flex gap-3">
                <button type="button" onClick={() => { setOutcomeModalOpen(false); setOutcomePictures([]); }} className="flex-1 bg-white hover:bg-slate-50 text-slate-800 font-bold py-4 rounded-2xl transition-all border border-slate-200/60">Back</button>
                <button type="submit" form="tech-outcome-form" disabled={outcomeLoading} className="flex-1 crm-btn-primary font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                  {outcomeLoading ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} Submit Outcome
                </button>
              </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="crm-modal border rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/80">
                <h3 className="text-lg font-bold text-slate-800">Record Expense</h3>
                <button onClick={() => setExpenseModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 transition"><X size={20} /></button>
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
                      className="w-full crm-input text-slate-800 pl-10 pr-4 py-4 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" 
                      placeholder="Amount"
                    />
                  </div>

                  <div className="group relative">
                    <select 
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                      className="w-full crm-input text-slate-800 px-4 py-4 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all appearance-none"
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
                      className="w-full crm-input text-slate-800 px-4 py-4 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" 
                      placeholder="Notes (optional)"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={expenseLoading}
                  className="w-full crm-btn-primary font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
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
