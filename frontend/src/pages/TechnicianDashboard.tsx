import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../store';
import { logout, setUser } from '../store/slices/authSlice';
import { 
  LogOut, Wrench, ClipboardCheck, CheckCircle2, Package, Wallet, Plus,
  Loader2, X, History, Search, Settings, PhoneOff, Phone, Bell,
  Briefcase, Clock, CheckCircle, RotateCcw, Headphones, SlidersHorizontal,
  User, MapPin, Info, Camera, CreditCard, TrendingDown
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
import TechnicianJobDetailView from '../components/TechnicianJobDetailView';
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

const isVisitToday = (job: Lead) => {
  if (!job.visit_date) return true;
  const d = new Date(job.visit_date);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const TechnicianDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const location = useLocation();
  const urlTab = location.pathname.split('/')[2];
  const activeTab = (urlTab || 'tasks') as 'tasks' | 'history' | 'wallet' | 'workshop' | 'settings';

  useEffect(() => {
    if (!urlTab) {
      navigate('/tech/tasks', { replace: true });
    }
  }, [urlTab, navigate]);

  const setActiveTab = (tab: typeof activeTab) => {
    navigate(`/tech/${tab}`);
  };

  const [jobs, setJobs] = useState<Lead[]>([]);
  const [workshopJobs, setWorkshopJobs] = useState<any[]>([]);

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
  const [detailJobId, setDetailJobId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
        subtitle: `${j.customer?.name || 'Customer'} â€¢ ${j.product_type || 'Job'}${j.is_settled ? ' â€¢ Paid to Admin' : j.is_requested ? ' â€¢ Deposit Requested' : ' â€¢ Pending Return'}`,
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
  const filteredJobs = useMemo(() => jobs.filter(job => {
    if (!matchesLeadSearch(job, jobSearch)) return false;
    if (isGlobalSearch) return true;
    return matchesJobFilter(job, jobFilter, user?.id);
  }), [jobs, jobSearch, isGlobalSearch, jobFilter, user?.id]);

  const listJobs = useMemo(() => {
    if (isGlobalSearch || jobFilter !== 'active') return filteredJobs;
    const today = filteredJobs.filter(isVisitToday);
    return today.length > 0 ? today : filteredJobs;
  }, [filteredJobs, isGlobalSearch, jobFilter]);

  const detailJobFromList = listJobs.find((j) => j.id === detailJobId) ?? null;

  const handleStartWork = async (job: Lead) => {
    if (job.status === 'InProgress') {
      toast.success('Work already in progress');
      return;
    }
    toast('Mark work started — update outcome when job is done', { icon: '🔧' });
  };

  const handleReschedule = (job: Lead) => {
    toast('Contact call center to reschedule this visit', { icon: '📅' });
    if (job.customer?.phone) {
      window.open(`tel:${job.customer.phone}`, '_self');
    }
  };

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
      toast.success('Marked as delivered â€” sent for final approval');
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

  const TAB_LABELS: Record<string, string> = {
    tasks: 'My Jobs',
    workshop: 'Workshop',
    history: 'Job History',
    wallet: 'My Wallet',
    settings: 'Settings',
  };

  const NAV_ITEMS = [
    { id: 'tasks' as const, label: 'My Jobs', icon: Briefcase },
    { id: 'workshop' as const, label: 'Workshop', icon: Package },
    { id: 'history' as const, label: 'History', icon: History },
    { id: 'wallet' as const, label: 'Wallet', icon: Wallet },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const activeJobCount = jobs.filter((j) => matchesJobFilter(j, 'active', user?.id)).length;
  const pendingCount = jobs.filter((j) => j.status === 'PendingApproval' || j.status === 'Assigned').length;
  const completedCount = jobs.filter((j) => matchesJobFilter(j, 'completed', user?.id)).length;
  const returnedCount = jobs.filter(isReturnedJob).length;

  const SUMMARY_CARDS = [
    { label: 'Active Jobs', count: activeJobCount, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Pending', count: pendingCount, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'Completed', count: completedCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Returned', count: returnedCount, icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: 'Wallet Balance', count: formatPKR(walletSummary?.balance || 0), icon: Wallet, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', isMoney: true },
  ];

  const todayHeader = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="crm-shell text-slate-800 flex h-screen overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[220px]' : 'w-0'} shrink-0 crm-sidebar flex flex-col z-20 overflow-hidden transition-all duration-200 border-r border-slate-200/80`}>
        <div className="px-5 py-5 border-b border-slate-200/80 flex items-center gap-3 min-w-[220px]">
          <div className="bg-[#1a73e8] p-2 rounded-lg shadow shadow-blue-500/20">
            <Wrench size={18} className="text-white" />
          </div>
          <h1 className="text-base font-black text-slate-800 tracking-wide">TechPanel</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-w-[220px]">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === id
                  ? 'bg-[#1a73e8] text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/80 shrink-0 min-w-[220px]">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <p className="text-xs font-black text-slate-700 mb-1">Need Help?</p>
            <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">Support available 24/7</p>
            <button className="w-full bg-white border border-blue-200 hover:border-blue-400 text-[#1a73e8] text-[11px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5">
              <Headphones size={12} /> Contact Support
            </button>
          </div>
        </div>
      </aside>

      {/* â”€â”€ Main Panel â”€â”€ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="crm-nav px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-10 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden"
              aria-label="Toggle menu"
            >
              <SlidersHorizontal size={18} />
            </button>
            {activeTab === 'tasks' ? (
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <p className="text-sm sm:text-base font-bold text-slate-700 truncate">Today, {todayHeader}</p>
                <span className="text-xs font-black bg-[#1a73e8] text-white px-3 py-1 rounded-full shrink-0">
                  {listJobs.length} Jobs
                </span>
              </div>
            ) : (
              <h2 className="text-lg font-black text-slate-800">{TAB_LABELS[activeTab] || activeTab}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button type="button" className="relative p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">3</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-[#1a73e8]/10 border border-blue-200 flex items-center justify-center text-[#1a73e8] font-black text-sm">
                {(user?.name || 'T').charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Technician</p>
              </div>
            </div>
            <ThemeToggle />
            <button
              onClick={() => dispatch(logout())}
              className="p-2.5 crm-btn-ghost rounded-xl transition-all border border-slate-200/70 hover:border-red-200 hover:text-red-500"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* â”€â”€ Content â”€â”€ */}
        <main className="flex-1 overflow-hidden relative">

          {/* TASKS TAB â€” Vertical Accordion View */}
          {activeTab === 'tasks' ? (
            <div className="h-full flex flex-col overflow-hidden bg-slate-50/60">
              <div className="px-4 pt-4 pb-2 grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
                {SUMMARY_CARDS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} px-4 py-3 flex items-center gap-3`}>
                      <div className={`p-2 rounded-xl bg-white/80 ${s.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-lg font-black leading-none ${s.color} truncate`}>{s.count}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto crm-scrollbar p-4 pt-2">
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-slate-800">
                          Today&apos;s Jobs <span className="text-slate-400 font-bold">({listJobs.length})</span>
                        </h3>
                        <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-[#1a73e8] p-1.5" />
                      </div>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by name, phone, lead ID..."
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-sm font-medium outline-none focus:border-[#1a73e8]/40 transition-all text-slate-700"
                        />
                      </div>
                      <div className="flex gap-1.5 flex-wrap mt-3">
                        {JOB_FILTERS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setJobFilter(f.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              jobFilter === f.id
                                ? f.id === 'complaint' ? 'bg-rose-500 text-white' : 'bg-[#1a73e8] text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      {loading ? (
                        <div className="flex justify-center items-center py-16">
                          <Loader2 className="animate-spin text-[#1a73e8]" size={28} />
                        </div>
                      ) : listJobs.length === 0 ? (
                        <div className="text-center py-12 px-4">
                          <ClipboardCheck size={36} className="text-slate-300 mx-auto mb-3" />
                          <p className="text-sm font-bold text-slate-400">No jobs match this filter</p>
                        </div>
                      ) : (
                        listJobs.map((job) => {
                          const isReturned = isReturnedJob(job);
                          const isDelivery = isDeliveryJob(job, user?.id);
                          const statusLabel = isReturned ? 'RETURNED' : isDelivery ? 'DELIVERY' : job.status === 'Assigned' ? 'ASSIGNED' : job.status === 'InProgress' ? 'IN PROGRESS' : job.status?.toUpperCase() || 'ASSIGNED';
                          const statusTone = isReturned ? 'returned' : isDelivery ? 'delivery' : job.status === 'Assigned' || job.status === 'InProgress' ? 'assigned' : job.status === 'Completed' ? 'completed' : 'default';

                          return (
                            <TechnicianJobBrief
                              key={job.id}
                              job={job}
                              statusLabel={statusLabel}
                              statusTone={statusTone as any}
                              isDetailOpen={detailJobId === job.id}
                              onExpand={() => setDetailJobId((prev) => (prev === job.id ? null : job.id))}
                              onZoom={setZoomImg}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {detailJobFromList && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setDetailJobId(null)}
                  >
                    <motion.div
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 40, opacity: 0 }}
                      className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
                        <p className="text-sm font-black text-slate-800">{detailJobFromList.lead_id}</p>
                        <button
                          type="button"
                          onClick={() => setDetailJobId(null)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                          aria-label="Close"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      {detailJobFromList.rejection_note && (
                        <div className="bg-rose-50 px-4 py-2 border-b border-rose-100 shrink-0">
                          <p className="text-[10px] font-black uppercase text-rose-600">Rejection Note</p>
                          <p className="text-sm font-semibold text-rose-800">{detailJobFromList.rejection_note}</p>
                        </div>
                      )}
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <TechnicianJobDetailView
                          job={detailJobFromList}
                          user={user}
                          onZoom={setZoomImg}
                          onAction={(j: Lead) => {
                            openOutcomeModal(j);
                            setDetailJobId(null);
                          }}
                          onNoAnswer={() => {
                            handleNoAnswer(detailJobFromList);
                            setDetailJobId(null);
                          }}
                          onMarkDelivered={() => {
                            handleMarkDelivered(detailJobFromList);
                            setDetailJobId(null);
                          }}
                          onHistory={(j: Lead) => setHistoryLead(j)}
                          onStartWork={handleStartWork}
                          onReschedule={handleReschedule}
                        />
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : activeTab === 'workshop' ? (
            <div className="h-full overflow-y-auto crm-scrollbar p-6">
              <WorkshopModule showGateInApproval={false} mode="technician" />
            </div>
          ) : activeTab === 'wallet' ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full overflow-y-auto crm-scrollbar p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">My Wallet</h2>
                  <p className="text-sm text-slate-400">Track your collections & expenses</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpenseModalOpen(true)} className="flex items-center gap-2 bg-[#1a73e8] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
                    <Plus size={16} /> Add Expense
                  </button>
                  <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-mint-600" />
                </div>
              </div>
              <div className="crm-header-banner rounded-3xl p-6 shadow-xl shadow-mint-300/30">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-emerald-700 text-sm font-medium mb-1">Total Collected</p>
                    <h3 className="text-4xl font-black tracking-tight text-slate-800">{formatPKR(walletSummary?.totalCollected || 0)}</h3>
                    {earningsSummary?.commission > 0 && (
                      <p className="text-emerald-600 text-xs mt-1">Commission: {formatPKR(earningsSummary.commission)} ({earningsSummary.rate || 10}%)</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 border-t border-mint-200/60 pt-4">
                  <div>
                    <p className="text-emerald-600 text-[10px] uppercase font-bold mb-1">Expenses</p>
                    <p className="text-lg font-bold text-slate-800">{formatPKR(walletSummary?.totalSpent || 0)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-600 text-[10px] uppercase font-bold mb-1">To Return</p>
                    <p className="text-lg font-bold text-slate-800">{formatPKR(walletSummary?.balance || 0)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-600 text-[10px] uppercase font-bold mb-1">Overdue</p>
                    <p className="text-lg font-bold text-amber-600">{formatPKR(walletDetail?.overdue || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="crm-card border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">All Transactions</h3>
                <p className="text-[10px] text-slate-500 mb-4">Complete wallet activity â€” collections, pending returns, expenses</p>
                {walletTimeline.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No transactions yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto crm-scrollbar">
                    {walletTimeline.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex justify-between items-start gap-3 p-3 rounded-xl border text-xs ${
                          entry.type === 'expense' ? 'bg-rose-500/5 border-rose-500/15'
                          : entry.type === 'pending' ? 'bg-amber-500/5 border-amber-500/15'
                          : entry.type === 'requested' ? 'bg-blue-500/5 border-blue-500/20'
                          : entry.type === 'received' ? 'bg-emerald-500/5 border-emerald-500/15'
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
                          <p className="text-[10px] text-slate-600 mt-1">{entry.date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end">
                          <p className={`font-black ${
                            entry.type === 'expense' ? 'text-rose-400' : entry.type === 'pending' ? 'text-amber-500' : entry.type === 'requested' ? 'text-blue-500' : 'text-emerald-500'
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

              <div className="crm-card border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">My Expenses</h3>
                {expenses.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No expenses recorded. Tap + to add.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto crm-scrollbar">
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
            </motion.div>
          ) : activeTab === 'settings' ? (
            <div className="h-full overflow-y-auto crm-scrollbar p-6">
              <SettingsModule />
            </div>
          ) : (
            /* HISTORY TAB */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full overflow-y-auto crm-scrollbar p-6 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Job History</h2>
                  <p className="text-sm text-slate-400">Recently completed tasks</p>
                </div>
                <RefreshButton onClick={refreshTasksBtn} loading={tasksRefreshing} className="text-mint-600" />
              </div>
              {jobs.filter(j => matchesJobFilter(j, 'completed', user?.id)).length === 0 ? (
                <div className="crm-card-soft border border-slate-200/60 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History size={32} className="text-slate-400" />
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
                      className="crm-card border border-slate-200/70 rounded-2xl p-5 cursor-pointer hover:border-emerald-500/30"
                      onClick={() => setHistoryLead(job)}
                    >
                      <LeadSummaryHeader lead={job} onZoom={setZoomImg} className="mb-3" />
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-blue-500/20 text-blue-500'
                        }`}>
                          {job.status}
                        </span>
                        <span className="text-emerald-600 font-black text-sm">{formatPKR(getFinalAmount(job))}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </main>
      </div>

      {/* â”€â”€ Outcome Modal â”€â”€ */}
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
              <div className="p-6 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/80 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Update Job Outcome</h3>
                  <p className="text-xs text-slate-500">Lead ID: {selectedJob.lead_id}</p>
                </div>
                <button type="button" onClick={() => setOutcomeModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 transition">
                  <X size={20} />
                </button>
              </div>

              <form id="tech-outcome-form" onSubmit={handleOutcomeSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 crm-scrollbar">
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
                        <a href={selectedJob.customer.google_map_link} target="_blank" rel="noreferrer" className="text-amber-600 underline mt-1 inline-block">Open Google Maps â†’</a>
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
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                        outcomeData.status === opt.id
                          ? 'bg-mint-50 border-emerald-500/50 scale-[1.05] shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : 'bg-slate-50 border-slate-200/60 opacity-60'
                      }`}
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
                        <input type="number" value={outcomeData.total_amount} onChange={(e) => setOutcomeData({...outcomeData, total_amount: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" placeholder="0" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advance Taken</label>
                        <input type="number" value={outcomeData.collected_amount} onChange={(e) => setOutcomeData({...outcomeData, collected_amount: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" placeholder="0" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {outcomeData.status === 'Completed' ? 'Amount Collected' : 'Charges'}
                        </label>
                        <input type="number" value={outcomeData.collected_amount} onChange={(e) => setOutcomeData({...outcomeData, collected_amount: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" placeholder="0" />
                      </div>
                      {outcomeData.status === 'Completed' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Warranty</label>
                          <select value={outcomeData.warranty_months} onChange={(e) => setOutcomeData({...outcomeData, warranty_months: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-3 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all appearance-none">
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
                            <button type="button" onClick={() => setOutcomePictures(prev => prev.filter((_, i) => i !== idx))} className="absolute top-0.5 right-0.5 bg-red-500/80 text-white rounded-full p-0.5">
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

      {/* â”€â”€ Expense Modal â”€â”€ */}
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
                    <input type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full crm-input text-slate-800 pl-10 pr-4 py-4 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" placeholder="Amount" />
                  </div>
                  <select value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-4 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all appearance-none">
                    <option value="Petrol">Petrol / Fuel</option>
                    <option value="Food">Food / Meals</option>
                    <option value="Parts">Parts Purchase</option>
                    <option value="Transport">Transport / Rickshaw</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-4 rounded-2xl border border-slate-200/70 focus:border-mint-400 outline-none transition-all" placeholder="Notes (optional)" />
                </div>
                <button type="submit" disabled={expenseLoading} className="w-full crm-btn-primary font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                  {expenseLoading ? <Loader2 className="animate-spin" size={18} /> : <TrendingDown size={18} />}
                  Save Expense
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
      {historyLead && <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />}
    </div>
  );
};
export default TechnicianDashboard;
