import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { 
  ClipboardList, 
  Wrench, DollarSign, AlertCircle,
  Activity, ArrowUpRight, Clock, Loader2, RotateCcw, X, Search, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion } from 'framer-motion';
import WorkshopModule from '../components/WorkshopModule';
import FinanceModule from '../components/FinanceModule';
import StaffModule from '../components/StaffModule';
import SettingsModule from '../components/SettingsModule';
import LeadHistoryModal from '../components/LeadHistoryModal';
import PendingApprovalActions from '../components/PendingApprovalActions';
import PendingApprovalCard from '../components/PendingApprovalCard';
import LogsModule from '../components/LogsModule';
import TrashModule from '../components/TrashModule';
import ImageZoomModal from '../components/ImageZoomModal';
import LeadImageThumb from '../components/LeadImageThumb';
import CopyText from '../components/CopyText';
import RefreshButton from '../components/RefreshButton';
import TechnicianPaymentsModal from '../components/TechnicianPaymentsModal';
import { useLiveData } from '../hooks/useLiveData';
import { matchesLeadSearch, isRejectedLead } from '../utils/leadHelpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import FinalApprovalListPage from '../components/admin/FinalApprovalListPage';
import RecentOperationsListPage from '../components/admin/RecentOperationsListPage';
import LeadsOverviewPage from '../components/admin/LeadsOverviewPage';
import LeadsCategoryRoute from '../components/admin/LeadsCategoryRoute';
import AdminTopNav from '../components/admin/AdminTopNav';

const getLeadPictures = (lead: any): string[] => {
  if (!lead?.item_pictures) return [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  try { return JSON.parse(lead.item_pictures); } catch { return []; }
};

const emptyDashboard = {
  stats: { revenue: 0, newLeads: 0, assignedJobs: 0, workshopJobs: 0, totalLeads: 0 },
  recentLeads: [],
  pendingApprovalLeads: [],
  rejectedLeads: [],
  technicians: [],
  attentionNeeded: [],
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const adminSubPath = location.pathname.replace(/^\/admin\/?/, '');
  const isOverviewSubPage = adminSubPath === 'final-approval' || adminSubPath === 'recent-operations';
  const isLeadsRoute = adminSubPath === 'leads' || adminSubPath.startsWith('leads/');

  const [data, setData] = useState<any>(emptyDashboard);
  const [dashboardStale, setDashboardStale] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [earningsReport, setEarningsReport] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSearch, setRecentSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [leadsSearch, setLeadsSearch] = useState('');
  const [selectedTechChart, setSelectedTechChart] = useState<any | null>(null);
  const [selectedAttention, setSelectedAttention] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [paymentsTech, setPaymentsTech] = useState<{ id: number; name: string } | null>(null);
  const [chartPeriod, setChartPeriod] = useState('this-week');

  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('adminActiveTab') || 'Overview');

  useEffect(() => {
    sessionStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isLeadsRoute) {
      setActiveTab('Service Leads');
    } else if (isOverviewSubPage) {
      setActiveTab('Overview');
    }
  }, [adminSubPath, isLeadsRoute, isOverviewSubPage]);

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);

      const statsRes = await Promise.allSettled([api.get('/dashboard/admin/stats')]);
      const stats = statsRes[0].status === 'fulfilled' ? statsRes[0].value.data : null;

      if (!stats) {
        const reason = statsRes[0].status === 'rejected' ? statsRes[0].reason : null;
        const status = reason?.response?.status;
        console.error('Dashboard stats failed:', reason || 'empty');
        if (status === 401) {
          dispatch(logout());
          navigate('/login');
          return;
        }
        if (opts?.silent) {
          setDashboardStale(true);
          return;
        }
        setEarningsReport((prev) => prev.length ? prev : []);
        if (!data || data === emptyDashboard) setData(emptyDashboard);
        setDashboardStale(true);
        toast.error('Could not refresh dashboard — showing last loaded data');
        return;
      }

      setDashboardStale(false);
      setHasLoadedOnce(true);
      setData(stats || emptyDashboard);
      if (!opts?.silent) setLoading(false);

      const [earningsRes, chartRes, walletsRes] = await Promise.allSettled([
        api.get('/finance/technician-report'),
        api.get('/finance/chart-data'),
        api.get('/settlements/all'),
      ]);

      const earnings = earningsRes.status === 'fulfilled' ? earningsRes.value.data : null;
      const chart = chartRes.status === 'fulfilled' ? chartRes.value.data : null;
      const wallets = walletsRes.status === 'fulfilled' ? walletsRes.value.data : { wallets: [] };

      const walletMap = Object.fromEntries((wallets.wallets || []).map((w: any) => [w.id, w]));
      const report = (earnings?.report || []).map((t: any) => ({
        ...t,
        overdue: walletMap[t.id]?.overdue || 0,
        pendingCount: walletMap[t.id]?.pendingCount || 0,
      }));
      setEarningsReport(report);
      setChartData(chart?.chartData || []);
    } catch (error) {
      console.error('Dashboard load error:', error);
      if (opts?.silent) {
        setDashboardStale(true);
        return;
      }
      if (!data || data === emptyDashboard) {
        setEarningsReport([]);
        setData(emptyDashboard);
        setChartData([]);
      }
      setDashboardStale(true);
      toast.error('Could not load dashboard — retry or check connection');
    } finally {
      setLoading(false);
    }
  };

  const skipDashboardBlock = isOverviewSubPage || isLeadsRoute;

  const { refresh, refreshing } = useLiveData(
    ['dashboard', 'finance', 'leads'],
    () => fetchData({ silent: true }),
    { pollIntervalMs: 60000 }
  );

  useEffect(() => {
    fetchData({ silent: skipDashboardBlock });
  }, []);

  const handleNavigateTab = (tab: string) => {
    if (tab === 'Overview') navigate('/admin');
    else if (tab === 'Service Leads') navigate('/admin/leads');
    else if (tab === 'Settings' || tab === 'Trash Bin') navigate('/admin');
    else navigate('/admin');
    setActiveTab(tab);
  };

  const handleGlobalSearch = async () => {
    const q = globalSearch.trim();
    if (!q) return;
    try {
      const res = await api.get('/leads');
      const allLeads = res.data.leads || res.data || [];
      const match = allLeads.find((l: any) => matchesLeadSearch(l, q));
      setLeadsSearch(q);
      navigate('/admin/leads');
      setActiveTab('Service Leads');
      if (match) {
        toast.success(`Found: ${match.lead_id}`);
      } else {
        toast.error('No lead found');
      }
    } catch {
      toast.error('Search failed');
    }
  };

  if (loading && !hasLoadedOnce && !skipDashboardBlock) {
    return (
      <div className="crm-shell flex flex-col min-h-screen">
        <AdminTopNav
          activeTab={activeTab}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          onGlobalSearchSubmit={handleGlobalSearch}
          onNavigateTab={handleNavigateTab}
          onNavigatePath={(path) => navigate(path)}
          onLogout={() => dispatch(logout())}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-mint-500" size={40} />
        </div>
      </div>
    );
  }

  const buildTechWeeklyChart = (jobs: any[]) => {
    const chartMap: Record<string, { date: string; revenue: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      chartMap[dateStr] = { date: dateStr, revenue: 0 };
    }
    (jobs || []).forEach((j: any) => {
      const dateStr = new Date(j.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (chartMap[dateStr]) chartMap[dateStr].revenue += Number(j.collected_amount || 0);
    });
    return Object.values(chartMap);
  };

  return (
    <div className="crm-shell text-slate-800 flex flex-col font-sans min-h-screen">
      <AdminTopNav
        activeTab={activeTab}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        onGlobalSearchSubmit={handleGlobalSearch}
        onNavigateTab={handleNavigateTab}
        onNavigatePath={(path) => navigate(path)}
        onLogout={() => dispatch(logout())}
      />
      
      {/* Attention Details Modal */}
      {selectedAttention && (
        <div className="fixed inset-0 crm-modal-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="crm-modal border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${selectedAttention.color}`}></div>
                <h3 className="text-xl font-bold text-slate-800">{selectedAttention.label}</h3>
              </div>
              <button 
                onClick={() => setSelectedAttention(null)}
                className="text-slate-400 hover:text-slate-800 p-2 hover:bg-mint-50/80 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedAttention.details?.map((detail: any, idx: number) => (
                <div key={idx} className="bg-white border border-slate-200/60 rounded-2xl p-4 hover:border-slate-200/70 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">{detail.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{detail.desc}</p>
                    </div>
                    {detail.id && (
                      <span className="text-[10px] font-mono font-bold text-mint-600 bg-mint-100 px-2 py-1 rounded border border-mint-300/40 shrink-0">
                        {detail.id}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!selectedAttention.details || selectedAttention.details.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">No specific details available.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 max-w-[1600px] w-full mx-auto p-4 lg:p-6 space-y-5 lg:space-y-6">
          {dashboardStale && (
            <div className="flex flex-wrap items-center justify-between gap-3 crm-card border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800 font-medium">Live refresh failed — showing last saved data.</p>
              <button
                type="button"
                onClick={() => fetchData()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100"
              >
                <RotateCcw size={14} /> Retry
              </button>
            </div>
          )}
          <Routes>
            <Route
              path="final-approval"
              element={<FinalApprovalListPage onBack={() => navigate('/admin')} />}
            />
            <Route
              path="recent-operations"
              element={<RecentOperationsListPage onBack={() => navigate('/admin')} />}
            />
            <Route path="leads" element={<LeadsOverviewPage externalSearch={leadsSearch} />} />
            <Route path="leads/:category" element={<LeadsCategoryRoute />} />
            <Route path="*" element={
          <>
          {activeTab === 'Overview' ? (
            <>
              {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 min-w-0">
            {[
              { label: 'Total Revenue', value: `SAR ${Number(data?.stats?.revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-mint-600', bg: 'bg-mint-100', trend: '+12%', tab: 'Finance' },
              { label: 'New Leads', value: data?.stats?.newLeads || 0, icon: ClipboardList, color: 'text-mint-600', bg: 'bg-mint-100', trend: 'Fresh', tab: 'Service Leads' },
              { label: 'Field Jobs', value: data?.stats?.assignedJobs || 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'Active', tab: 'Service Leads' },
              { label: 'Workshop', value: data?.stats?.workshopJobs || 0, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10', trend: 'Open', tab: 'Workshop' },
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                onClick={() => {
                  if (stat.tab === 'Service Leads') {
                    navigate('/admin/leads');
                    setActiveTab('Service Leads');
                  } else {
                    navigate('/admin');
                    setActiveTab(stat.tab);
                  }
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="crm-card border p-3 lg:p-5 rounded-2xl hover:border-mint-300/60 transition-all group relative overflow-hidden cursor-pointer min-w-0"
              >
                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${stat.bg} blur-3xl opacity-40`} />
                <div className="flex justify-between items-start relative z-10 gap-2">
                  <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl shrink-0`}>
                    <stat.icon size={18} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[4rem]">
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-4 relative z-10 min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{stat.label}</p>
                  <h3 className="text-base lg:text-xl font-black text-slate-900 mt-0.5 truncate">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Final Approval + Recent Operations */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 min-w-0 max-w-full">
            <section className="crm-card border rounded-2xl flex flex-col shadow-lg min-w-0 max-w-full self-start">
              <div className="p-4 lg:p-5 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={18} className="text-pink-500 shrink-0" />
                  Final Approval
                  <span className="text-xs font-black bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full border border-pink-200">
                    {(data?.pendingApprovalLeads || []).length}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/admin/final-approval')}
                  className="text-xs font-bold text-slate-500 hover:text-mint-600 flex items-center gap-1 shrink-0"
                >
                  View All <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="p-4 lg:p-5 flex-1 min-h-0 overflow-visible">
                {(data?.pendingApprovalLeads || []).length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-2xl py-10 text-center">
                    <ClipboardList size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">No tasks awaiting approval</p>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <PendingApprovalCard
                      lead={(data?.pendingApprovalLeads || [])[0]}
                      canApprove
                      onApproved={() => fetchData({ silent: true })}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Recent Operations preview */}
            <div className="crm-card border rounded-2xl overflow-hidden flex flex-col shadow-lg min-w-0 max-w-full">
              <div className="p-4 lg:p-5 border-b border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Clock size={18} className="text-mint-600 shrink-0" />
                  Recent Operations
                </h3>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
                  <div className="relative flex-1 min-w-[140px] sm:w-40 group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      value={recentSearch}
                      onChange={(e) => setRecentSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200/60 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-mint-400/50 text-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/recent-operations')}
                    className="text-xs font-bold text-slate-500 hover:text-mint-600 flex items-center gap-1 shrink-0"
                  >
                    View All <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {((data?.recentLeads || []).filter((lead: any) => lead.status !== 'PendingApproval' && matchesLeadSearch(lead, recentSearch))).slice(0, 5).map((lead: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedLead(lead)}
                    className="w-full text-left p-4 hover:bg-slate-50/80 flex gap-3 items-start min-w-0"
                  >
                    <LeadImageThumb src={getLeadPictures(lead)[0]} className="w-12 h-12 shrink-0" onZoom={setZoomImg} />
                    <div className="min-w-0 flex-1">
                      <CopyText value={lead.lead_id} label="Lead ID" className="text-[10px] font-mono font-bold text-mint-600" />
                      <p className="text-sm font-bold text-slate-800 truncate">{lead.customer?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{lead.product_type} · {lead.technician?.name || 'Unassigned'}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto max-w-full">
                <table className="w-full text-left table-auto">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3 hidden xl:table-cell">Customer</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Tech</th>
                      <th className="px-4 py-3 text-right w-20">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {((data?.recentLeads || []).filter((lead: any) => lead.status !== 'PendingApproval' && matchesLeadSearch(lead, recentSearch))).slice(0, 5).map((lead: any, idx: number) => (
                      <tr key={idx} onClick={() => setSelectedLead(lead)} className="group hover:bg-slate-50/80 transition-colors cursor-pointer text-sm">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <LeadImageThumb src={getLeadPictures(lead)[0]} className="w-10 h-10 shrink-0" onZoom={setZoomImg} />
                            <CopyText value={lead.lead_id} label="Lead ID" className="font-mono text-xs font-bold text-mint-600 truncate max-w-[7rem]" />
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell max-w-[10rem]">
                          <div className="text-sm font-bold text-slate-700 truncate">{lead.customer.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{lead.customer.area}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[8rem]">
                          <span className="text-xs font-semibold text-slate-600 truncate block">{lead.product_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap
                              ${lead.status === 'New' ? 'bg-mint-100 text-mint-600 border-mint-300/40' : 
                                lead.status === 'Assigned' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                                lead.status === 'Completed' ? 'bg-mint-100 text-mint-600 border-mint-300/40' :
                                'bg-slate-100 text-slate-600 border-slate-200'}
                            `}>
                            {lead.status === 'InspectionCompleted' ? 'INSPECTION' :
                             lead.status === 'PickedForWorkshop' ? 'PICKUP' :
                             isRejectedLead(lead) ? 'REJECTED' : lead.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-slate-500 truncate max-w-[6rem]">
                          {lead.technician?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => setSelectedLead(lead)} className="p-1.5 bg-slate-50 hover:bg-mint-100 text-slate-600 rounded-lg border border-slate-200/60">
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Rejected submissions */}
          {(data?.rejectedLeads || []).length > 0 && (
            <div className="crm-card border border-rose-200/60 rounded-[2rem] overflow-hidden shadow-xl">
              <div className="p-5 lg:p-8 border-b border-rose-200/60 bg-rose-50/50">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <AlertCircle size={20} className="text-rose-500" />
                  Rejected Submissions
                  <span className="text-xs font-black bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full">{(data?.rejectedLeads || []).length}</span>
                </h3>
              </div>
              <div className="divide-y divide-slate-200/60">
                {(data?.rejectedLeads || []).map((lead: any) => (
                  <div key={lead.id} className="p-4 lg:px-8 lg:py-5 flex flex-wrap justify-between gap-3 hover:bg-rose-50/30 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <div>
                      <p className="font-mono font-bold text-mint-600 text-sm">{lead.lead_id}</p>
                      <p className="text-sm font-semibold text-slate-800">{lead.customer?.name} · {lead.product_type}</p>
                      <p className="text-xs text-rose-600 mt-1 font-medium">{lead.rejection_note}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{lead.technician?.name || 'Unassigned'}</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }} className="mt-2 text-mint-600 font-bold flex items-center gap-1 ml-auto">
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Performance + Attention Needed */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 min-w-0 max-w-full">
            <div className="crm-card border rounded-2xl p-4 lg:p-6 shadow-lg min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity size={16} className="text-mint-600" />
                  Weekly Performance
                </h3>
                <select
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-mint-400"
                >
                  <option value="this-week">This Week</option>
                  <option value="last-week">Last Week</option>
                </select>
              </div>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a'}}
                        itemStyle={{fontSize: '12px', fontWeight: 'bold', color: '#334155'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '20px'}} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="crm-card border rounded-2xl p-4 lg:p-6 shadow-lg min-w-0">
                <div className="flex justify-between items-center gap-2 mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    Attention Needed
                  </h3>
                  <RefreshButton onClick={refresh} loading={refreshing} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {data?.attentionNeeded?.length > 0 ? (
                    data.attentionNeeded.map((alert: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAttention(alert)}
                        className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left group"
                      >
                        <div className={`w-full h-1 rounded-full ${alert.color}`} />
                        <p className="text-2xl font-black text-slate-800">
                          {(alert.label.match(/^(\d+)/) || [])[1] || '—'}
                        </p>
                        <p className="text-[11px] font-bold text-slate-600 leading-tight group-hover:text-slate-800">
                          {alert.label.replace(/^\d+\s*/, '')}
                        </p>
                        <ArrowUpRight size={14} className="text-slate-400 group-hover:text-mint-600 ml-auto" />
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <Activity className="mx-auto text-emerald-500 mb-2" size={24} />
                      <p className="text-sm font-bold text-mint-600">All Clear!</p>
                      <p className="text-xs text-slate-500 mt-1">No items require attention.</p>
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* NEW: Technician Earnings Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="crm-card border rounded-2xl overflow-hidden shadow-lg min-w-0 max-w-full"
          >
            <div className="p-4 lg:p-6 border-b border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400 shrink-0">
                  <DollarSign size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base lg:text-lg font-bold text-slate-800">Technician Earnings</h3>
                  <p className="text-xs text-slate-500">Commissions & pending payments</p>
                </div>
              </div>
              <RefreshButton onClick={refresh} loading={refreshing} />
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technician</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Jobs</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Revenue</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Commission</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest">Pending Payments</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {(earningsReport || []).map((tech: any) => (
                    <tr key={tech.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-4 lg:px-8 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedTechChart(selectedTechChart?.id === tech.id ? null : tech)}
                          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                            {tech.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-700">{tech.name}</span>
                        </button>
                      </td>
                      <td className="px-4 lg:px-8 py-4 text-center">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                          {tech.jobCount} Jobs
                        </span>
                      </td>
                      <td className="px-4 lg:px-8 py-4 hidden sm:table-cell">
                        <span className="text-sm font-bold text-slate-800">SAR {tech.totalRevenue.toLocaleString()}</span>
                      </td>
                      <td className="px-4 lg:px-8 py-4">
                        <span className="text-sm font-black text-mint-600">SAR {tech.totalCommission.toLocaleString()}</span>
                      </td>
                      <td className="px-4 lg:px-8 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${Number(tech.overdue || 0) > 0 ? 'text-rose-400' : 'text-mint-600'}`}>
                            SAR {Number(tech.overdue || 0).toLocaleString()}
                          </span>
                          {tech.pendingCount > 0 && (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                              {tech.pendingCount} task{tech.pendingCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-8 py-4 text-right">
                        <button
                          onClick={() => setPaymentsTech({ id: tech.id, name: tech.name })}
                          className="bg-mint-100 hover:bg-indigo-500/20 text-mint-600 text-xs font-bold px-4 py-2 rounded-xl border border-mint-300/40 transition-all">
                          Task Payments
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTechChart && (
              <div className="p-6 border-t border-slate-200/60 bg-white/30">
                <h4 className="text-sm font-bold text-slate-800 mb-4">
                  Weekly Sales — {selectedTechChart.name}
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buildTechWeeklyChart(selectedTechChart.jobs || [])}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue (SAR)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Click technician name again to hide chart</p>
              </div>
            )}
          </motion.div>
            </>
          ) : activeTab === 'Workshop' ? (
            <WorkshopModule />
          ) : activeTab === 'Finance' ? (
            <FinanceModule />
          ) : activeTab === 'Staff Management' ? (
            <StaffModule role="ADMIN" />
          ) : activeTab === 'System Logs' ? (
            <LogsModule />
          ) : activeTab === 'Trash Bin' ? (
            <TrashModule />
          ) : activeTab === 'Settings' ? (
            <SettingsModule />
          ) : activeTab === 'Service Leads' ? (
            <Navigate to="/admin/leads" replace />
          ) : (
            <Navigate to="/admin" replace />
          )}
          </>
            } />
          </Routes>
        </div>
      </main>
      {/* Selected Lead Modal */}
      {selectedLead && (
        <LeadHistoryModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          extraActions={selectedLead.status === 'PendingApproval' && (
            <PendingApprovalActions
              lead={selectedLead}
              showView={false}
              layout="stack"
              onDone={() => {
                setSelectedLead(null);
                fetchData();
              }}
            />
          )}
        />
      )}

      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />

      {paymentsTech && (
        <TechnicianPaymentsModal
          technician={paymentsTech}
          onClose={() => setPaymentsTech(null)}
          onSettled={() => fetchData({ silent: true })}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
