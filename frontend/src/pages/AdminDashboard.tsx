import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { 
  LogOut, LayoutDashboard, Users, ClipboardList, 
  Wrench, DollarSign, AlertCircle,
  Activity, ArrowUpRight, Clock, Settings, Loader2, Download, RotateCcw, Trash2, Menu, X, Search, FileText, Image
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion } from 'framer-motion';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { generateInspectionReportPDF } from '../utils/inspectionReportGenerator';
import { generateWorkshopPickupPDF } from '../utils/workshopPickupGenerator';
import WorkshopModule from '../components/WorkshopModule';
import FinanceModule from '../components/FinanceModule';
import StaffModule from '../components/StaffModule';
import SettingsModule from '../components/SettingsModule';
import LeadsModule from '../components/LeadsModule';
import LogsModule from '../components/LogsModule';
import TrashModule from '../components/TrashModule';
import ImageZoomModal from '../components/ImageZoomModal';
import RefreshButton from '../components/RefreshButton';
import TechnicianPaymentsModal from '../components/TechnicianPaymentsModal';
import { useLiveData } from '../hooks/useLiveData';
import { matchesLeadSearch } from '../utils/leadHelpers';
import GlobalLeadSearch from '../components/GlobalLeadSearch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const getLeadPictures = (lead: any): string[] => {
  if (!lead?.item_pictures) return [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  try { return JSON.parse(lead.item_pictures); } catch { return []; }
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [data, setData] = useState<any>(null);
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

  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('adminActiveTab') || 'Overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const [statsRes, earningsRes, chartRes, walletsRes] = await Promise.all([
        api.get('/dashboard/admin/stats'),
        api.get('/finance/technician-report'),
        api.get('/finance/chart-data'),
        api.get('/settlements/all').catch(() => ({ data: { wallets: [] } }))
      ]);
      const walletMap = Object.fromEntries((walletsRes.data.wallets || []).map((w: any) => [w.id, w]));
      const report = (earningsRes.data?.report || []).map((t: any) => ({
        ...t,
        overdue: walletMap[t.id]?.overdue || 0,
        pendingCount: walletMap[t.id]?.pendingCount || 0,
      }));
      setEarningsReport(report);
      setData(statsRes.data || { stats: { revenue: 0, newLeads: 0, assignedJobs: 0, workshopJobs: 0 }, recentLeads: [], technicians: [] });
      setChartData(chartRes.data?.chartData || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['all', 'leads', 'workshop', 'finance', 'dashboard', 'users'], () => fetchData({ silent: true }));

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} className="text-red-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Failed to Load Dashboard</h2>
        <p className="text-slate-400 mb-8 font-medium">There was a problem connecting to the server. Please check your connection or try again.</p>
        <button 
          onClick={() => fetchData()} 
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <RotateCcw size={20} /> Retry Loading
        </button>
      </div>
    );
  }

  const handleGlobalSearch = async () => {
    const q = globalSearch.trim();
    if (!q) return;
    try {
      const res = await api.get('/leads');
      const allLeads = res.data.leads || res.data || [];
      const match = allLeads.find((l: any) => matchesLeadSearch(l, q));
      setLeadsSearch(q);
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

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: ClipboardList, label: 'Service Leads' },
    { icon: Wrench, label: 'Workshop' },
    { icon: Users, label: 'Staff Management' },
    { icon: DollarSign, label: 'Finance' },
    { icon: Activity, label: 'System Logs' },
    { icon: Trash2, label: 'Trash Bin' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Attention Details Modal */}
      {selectedAttention && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${selectedAttention.color}`}></div>
                <h3 className="text-xl font-bold text-white">{selectedAttention.label}</h3>
              </div>
              <button 
                onClick={() => setSelectedAttention(null)}
                className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedAttention.details?.map((detail: any, idx: number) => (
                <div key={idx} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">{detail.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{detail.desc}</p>
                    </div>
                    {detail.id && (
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 shrink-0">
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

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen w-64 bg-slate-900 border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <LayoutDashboard size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">ServiceOS</h1>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => {
                setActiveTab(item.label);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${activeTab === item.label ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
              `}
            >
              <item.icon size={18} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => dispatch(logout())}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        
        {/* Top Header */}
        <header className="h-20 bg-slate-900/30 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">Dashboard Overview</h2>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">Welcome back, {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 justify-end max-w-md ml-4">
            <GlobalLeadSearch
              value={globalSearch}
              onChange={setGlobalSearch}
              onSubmit={handleGlobalSearch}
              placeholder="Search lead ID (any tab)..."
              className="flex-1 max-w-xs hidden sm:block"
            />
            <RefreshButton onClick={refresh} loading={refreshing} />
            <div className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border border-indigo-500/20 text-[10px] lg:text-xs font-bold flex items-center gap-2 shrink-0">
              <Activity size={14} className="animate-pulse" /> <span className="hidden sm:inline">Live Stats</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
          
          {activeTab === 'Overview' ? (
            <>
              {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {[
              { label: 'Total Revenue', value: `PKR ${Number(data?.stats?.revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-indigo-400', bg: 'bg-indigo-500/10', trend: '+12%', tab: 'Finance' },
              { label: 'New Leads', value: data?.stats?.newLeads || 0, icon: ClipboardList, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 'Fresh', tab: 'Service Leads' },
              { label: 'Field Jobs', value: data?.stats?.assignedJobs || 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'In Progress', tab: 'Service Leads' },
              { label: 'Workshop Jobs', value: data?.stats?.workshopJobs || 0, icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10', trend: 'Repairing', tab: 'Workshop' },
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                onClick={() => setActiveTab(stat.tab)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-900/60 border border-white/5 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] hover:border-indigo-500/30 transition-all group relative overflow-hidden cursor-pointer"
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-3xl opacity-50 transition-all group-hover:scale-150`}></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                    <stat.icon size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-6 relative z-10">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-lg lg:text-2xl font-black text-white mt-1">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-8">
            
            {/* Recent Leads Table */}
            <div className="xl:col-span-2 bg-slate-900/60 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-5 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-white/[0.02] to-transparent gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Clock size={20} className="text-indigo-400" />
                  Recent Operations
                </h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48 group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search recent leads..." 
                      value={recentSearch}
                      onChange={(e) => setRecentSearch(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-indigo-500/50 transition-all text-white"
                    />
                  </div>
                  <RefreshButton onClick={refresh} loading={refreshing} />
                  <button onClick={() => setActiveTab('Service Leads')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors shrink-0">
                    View All <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="px-4 lg:px-8 py-4">Lead ID</th>
                      <th className="px-4 lg:px-8 py-4">Photo</th>
                      <th className="px-4 lg:px-8 py-4">Customer</th>
                      <th className="px-4 lg:px-8 py-4 hidden md:table-cell">Product</th>
                      <th className="px-4 lg:px-8 py-4">Status</th>
                      <th className="px-4 lg:px-8 py-4 text-right hidden sm:table-cell">Technician</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {((data?.recentLeads || []).filter((lead: any) => matchesLeadSearch(lead, recentSearch))).map((lead: any, idx: number) => (
                      <tr key={idx} onClick={() => setSelectedLead(lead)} className="group hover:bg-white/[0.02] transition-colors cursor-pointer text-sm">
                        <td className="px-8 py-5">
                          <span className="font-mono text-sm font-bold text-indigo-300">{lead.lead_id}</span>
                        </td>
                        <td className="px-4 lg:px-8 py-4">
                          {getLeadPictures(lead).length > 0 ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-slate-900">
                              <img src={getLeadPictures(lead)[0]} alt="machine" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-slate-600">
                              <Image size={14} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 lg:px-8 py-4">
                          <div className="text-sm font-bold text-slate-200">{lead.customer.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{lead.customer.area}</div>
                        </td>
                        <td className="px-4 lg:px-8 py-4 hidden md:table-cell">
                          <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                            {lead.product_type}
                          </span>
                        </td>
                        <td className="px-4 lg:px-8 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide border
                              ${lead.status === 'New' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                lead.status === 'Assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                lead.status === 'PendingApproval' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 
                                lead.status === 'Completed' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                lead.status === 'InspectionCompleted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                lead.status === 'PickedForWorkshop' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                lead.status === 'Reopened' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-slate-800 text-slate-300 border-slate-700'}
                            `}>
                              {lead.status === 'PendingApproval' ? 'PENDING APPROVAL' : 
                               lead.status === 'InspectionCompleted' ? 'INSPECTION DONE' :
                               lead.status === 'PickedForWorkshop' ? 'WORKSHOP PICKUP' :
                               lead.status.toUpperCase()}
                            </span>
                            {lead.is_warranty_claim && (
                              <span className="px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[9px] font-black tracking-tighter">
                                WARRANTY
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              {lead.status === 'PendingApproval' && (
                                <button 
                                  onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    try {
                                      await api.post(`/leads/${lead.id}/approve`);
                                      toast.success('Job Approved!');
                                      fetchData();
                                    } catch (e) { toast.error('Failed to approve'); }
                                  }}
                                  className="p-1.5 bg-white/5 hover:bg-pink-500/20 text-slate-400 hover:text-pink-400 rounded-lg transition-all border border-white/5 hover:border-pink-500/20 font-bold text-xs"
                                  title="Approve Job"
                                >
                                  Approve
                                </button>
                              )}
                              {lead.status === 'InspectionCompleted' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); generateInspectionReportPDF(lead); }}
                                  className="p-1.5 bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-lg transition-all border border-white/5 hover:border-amber-500/20"
                                  title="Download Inspection PDF"
                                >
                                  <FileText size={14} />
                                </button>
                              )}
                              {lead.status === 'PickedForWorkshop' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); generateWorkshopPickupPDF(lead); }}
                                  className="p-1.5 bg-white/5 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 rounded-lg transition-all border border-white/5 hover:border-orange-500/20"
                                  title="Download Workshop Pickup PDF"
                                >
                                  <FileText size={14} />
                                </button>
                              )}
                              {lead.status === 'Completed' && (
                                <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); generateInvoicePDF(lead); }}
                                    className="p-1.5 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-all border border-white/5 hover:border-indigo-500/20"
                                    title="Download Invoice"
                                  >
                                    <Download size={14} />
                                  </button>
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      const reason = prompt('Reason for reopening?');
                                      if (reason) {
                                        try {
                                          await api.patch(`/leads/${lead.id}/reopen`, { reason });
                                          toast.success('Job Reopened!');
                                          fetchData();
                                        } catch (e) { toast.error('Failed to reopen'); }
                                      }
                                    }}
                                    className="p-1.5 bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-lg transition-all border border-white/5 hover:border-amber-500/20"
                                    title="Reopen Job (Complaint)"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={async (e) => { 
                                  e.stopPropagation();
                                  if (window.confirm(`Delete lead ${lead.lead_id}? This cannot be undone.`)) {
                                    try {
                                      await api.delete(`/leads/${lead.id}`);
                                      toast.success('Lead deleted');
                                      fetchData();
                                    } catch { toast.error('Failed to delete'); }
                                  }
                                }}
                                className="p-1.5 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all border border-white/5 hover:border-red-500/20"
                                title="Delete Lead"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-8 py-4 text-right text-xs font-bold text-slate-500 group-hover:text-indigo-400 transition-colors hidden sm:table-cell">
                          {lead.technician?.name || 'Unassigned'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions / Alerts */}
            <div className="space-y-6">
              {/* Financial Performance Chart */}
              <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-5 lg:p-8 shadow-2xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Activity size={16} className="text-indigo-400" />
                  Weekly Performance
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px'}}
                        itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '20px'}} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-5 lg:p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-400" />
                    Attention Needed
                  </h3>
                  <RefreshButton onClick={refresh} loading={refreshing} />
                </div>
                <div className="space-y-4">
                  {data?.attentionNeeded?.length > 0 ? (
                    data.attentionNeeded.map((alert: any, idx: number) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedAttention(alert)}
                        className="flex items-center gap-4 group cursor-pointer bg-white/[0.02] p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.04]"
                      >
                        <div className={`w-1 h-10 ${alert.color} rounded-full`}></div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{alert.label}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{alert.sub}</p>
                        </div>
                        <div className="bg-white/5 p-1.5 rounded-lg text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">
                          <ArrowUpRight size={14} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <Activity className="mx-auto text-emerald-500 mb-2" size={24} />
                      <p className="text-sm font-bold text-emerald-400">All Clear!</p>
                      <p className="text-xs text-slate-500 mt-1">No items require your attention right now.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* NEW: Technician Earnings Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-5 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-400">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Technician Earnings & Commissions</h3>
                  <p className="text-sm text-slate-500">Performance based on completed jobs (10% Default Rate)</p>
                </div>
              </div>
              <RefreshButton onClick={refresh} loading={refreshing} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technician</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Jobs</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Revenue</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Commission</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest">Pending Payments</th>
                    <th className="px-4 lg:px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
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
                          <span className="font-bold text-slate-200">{tech.name}</span>
                        </button>
                      </td>
                      <td className="px-4 lg:px-8 py-4 text-center">
                        <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold border border-slate-700">
                          {tech.jobCount} Jobs
                        </span>
                      </td>
                      <td className="px-4 lg:px-8 py-4 hidden sm:table-cell">
                        <span className="text-sm font-bold text-slate-300">$ {tech.totalRevenue.toLocaleString()}</span>
                      </td>
                      <td className="px-4 lg:px-8 py-4">
                        <span className="text-sm font-black text-emerald-400">PKR {tech.totalCommission.toLocaleString()}</span>
                      </td>
                      <td className="px-4 lg:px-8 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${Number(tech.overdue || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            PKR {Number(tech.overdue || 0).toLocaleString()}
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
                          className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold px-4 py-2 rounded-xl border border-indigo-500/20 transition-all">
                          Task Payments
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTechChart && (
              <div className="p-6 border-t border-white/5 bg-slate-950/30">
                <h4 className="text-sm font-bold text-white mb-4">
                  Weekly Sales — {selectedTechChart.name}
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buildTechWeeklyChart(selectedTechChart.jobs || [])}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue (PKR)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Click technician name again to hide chart</p>
              </div>
            )}
          </motion.div>
            </>
          ) : activeTab === 'Service Leads' ? (
            <LeadsModule externalSearch={leadsSearch} />
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
          ) : (
            <SettingsModule />
          )
        }

        </div>
      </main>
      {/* Selected Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-3xl p-8 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="text-indigo-400">{selectedLead.lead_id}</span>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide border
                  ${selectedLead.status === 'New' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    selectedLead.status === 'Assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                    selectedLead.status === 'PendingApproval' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 
                    selectedLead.status === 'Completed' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    'bg-slate-800 text-slate-300 border-slate-700'}
                `}>
                  {selectedLead.status === 'PendingApproval' ? 'PENDING APPROVAL' : selectedLead.status.toUpperCase()}
                </span>
              </h3>
              <button onClick={() => setSelectedLead(null)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Customer Details</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Name</p>
                      <p className="font-bold text-white text-lg">{selectedLead.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-bold text-white">{selectedLead.customer?.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Area</p>
                      <p className="font-bold text-white">{selectedLead.customer?.area}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Exact Address</p>
                      <p className="font-bold text-white text-sm">{selectedLead.exact_address || selectedLead.customer?.exact_address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Assignment Info</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Technician</p>
                      <p className="font-bold text-white">{selectedLead.technician?.name || 'Unassigned'}</p>
                    </div>
                    {selectedLead.visit_date && (
                      <div>
                        <p className="text-xs text-slate-500">Visit Date</p>
                        <p className="font-bold text-white">{new Date(selectedLead.visit_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Job Details</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Product</p>
                      <p className="font-bold text-white">{selectedLead.product_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Reported Problem</p>
                      <p className="font-medium text-slate-300 text-sm bg-white/5 p-3 rounded-xl mt-1">{selectedLead.problem_details}</p>
                    </div>
                  </div>
                </div>

                {getLeadPictures(selectedLead).length > 0 && (
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Machine Pictures</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {getLeadPictures(selectedLead).map((pic: string, idx: number) => (
                        <div key={idx} className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0 cursor-pointer hover:ring-2 hover:ring-pink-500/50" onClick={() => setZoomImg(pic)}>
                          <img src={pic} alt={`machine-${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedLead.status === 'Completed' || selectedLead.status === 'PendingApproval' || selectedLead.status === 'Reopened' || selectedLead.status === 'InspectionCompleted' || selectedLead.status === 'PickedForWorkshop') && (
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Outcome</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500">Actual Problem Found</p>
                        <p className="font-medium text-slate-300 text-sm">{selectedLead.actual_problem || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Repair Details</p>
                        <p className="font-medium text-slate-300 text-sm">{selectedLead.repair_details || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Amount</p>
                          <p className="font-black text-white text-lg">PKR {Number(selectedLead.total_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Collected</p>
                          <p className="font-black text-white text-lg">PKR {Number(selectedLead.collected_amount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs text-slate-500">Warranty Given</p>
                        <p className="font-bold text-amber-400">{selectedLead.warranty_months} Month(s)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              {selectedLead.status === 'PendingApproval' && (
                <button 
                  onClick={async () => {
                    try {
                      await api.post(`/leads/${selectedLead.id}/approve`);
                      toast.success('Job Approved!');
                      setSelectedLead(null);
                      fetchData();
                    } catch (e) { toast.error('Failed to approve'); }
                  }}
                  className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-xl transition-all shadow-lg shadow-pink-500/20"
                >
                  Approve Job
                </button>
              )}
              {selectedLead.status === 'InspectionCompleted' && (
                <button onClick={() => generateInspectionReportPDF(selectedLead)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
                  <FileText size={18} /> Inspection PDF
                </button>
              )}
              {selectedLead.status === 'PickedForWorkshop' && (
                <button onClick={() => generateWorkshopPickupPDF(selectedLead)}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2">
                  <FileText size={18} /> Workshop Pickup PDF
                </button>
              )}
              {selectedLead.status === 'Completed' && (
                <button 
                  onClick={() => generateInvoicePDF(selectedLead)}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  <Download size={18} /> Download Invoice
                </button>
              )}
              <button onClick={() => setSelectedLead(null)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
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
