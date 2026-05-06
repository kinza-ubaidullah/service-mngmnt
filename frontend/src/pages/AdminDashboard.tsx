import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { 
  LogOut, LayoutDashboard, Users, ClipboardList, 
  Wrench, IndianRupee, AlertCircle,
  Activity, ArrowUpRight, Clock, Settings, Loader2, Download, RotateCcw, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion } from 'framer-motion';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import JobMap from '../components/JobMap';
import WorkshopModule from '../components/WorkshopModule';
import FinanceModule from '../components/FinanceModule';
import StaffModule from '../components/StaffModule';
import SettingsModule from '../components/SettingsModule';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [data, setData] = useState<any>(null);
  const [earningsReport, setEarningsReport] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('Overview');

  const fetchData = async () => {
    try {
      const [statsRes, earningsRes, chartRes] = await Promise.all([
        api.get('/dashboard/admin/stats'),
        api.get('/finance/technician-report'),
        api.get('/finance/chart-data')
      ]);
      setData(statsRes.data);
      setEarningsReport(earningsRes.data.report);
      setChartData(chartRes.data.chartData);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
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
          onClick={fetchData} 
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <RotateCcw size={20} /> Retry Loading
        </button>
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: ClipboardList, label: 'Service Leads' },
    { icon: Wrench, label: 'Workshop' },
    { icon: Users, label: 'Staff Management' },
    { icon: IndianRupee, label: 'Finance' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
      
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-slate-900/50 border-r border-white/5 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <LayoutDashboard size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">ServiceOS</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveTab(item.label)}
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 bg-slate-900/30 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8">
          <div>
            <h2 className="text-lg font-bold text-white">Dashboard Overview</h2>
            <p className="text-xs text-slate-400 font-medium">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 text-xs font-bold flex items-center gap-2">
              <Activity size={14} className="animate-pulse" /> Live Stats
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {activeTab === 'Overview' ? (
            <>
              {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Revenue', value: `PKR ${data.stats.revenue}`, icon: IndianRupee, color: 'text-indigo-400', bg: 'bg-indigo-500/10', trend: '+12%' },
              { label: 'New Leads', value: data.stats.newLeads, icon: ClipboardList, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 'Fresh' },
              { label: 'Field Jobs', value: data.stats.assignedJobs, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'In Progress' },
              { label: 'Workshop Jobs', value: data.stats.workshopJobs, icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10', trend: 'Repairing' },
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all group relative overflow-hidden"
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
                  <h3 className="text-2xl font-black text-white mt-1">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Recent Leads Table */}
            <div className="xl:col-span-2 bg-slate-900/60 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/[0.02] to-transparent">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Clock size={20} className="text-indigo-400" />
                  Recent Operations
                </h3>
                <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  View All <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="px-8 py-4">Lead ID</th>
                      <th className="px-8 py-4">Customer</th>
                      <th className="px-8 py-4">Product</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Technician</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.recentLeads.map((lead: any, idx: number) => (
                      <tr key={idx} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                        <td className="px-8 py-5">
                          <span className="font-mono text-sm font-bold text-indigo-300">{lead.lead_id}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm font-bold text-slate-200">{lead.customer.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{lead.customer.area}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                            {lead.product_type}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide border
                              ${lead.status === 'New' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                lead.status === 'Assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                lead.status === 'Completed' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                lead.status === 'Reopened' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-slate-800 text-slate-300 border-slate-700'}
                            `}>
                              {lead.status.toUpperCase()}
                            </span>
                            {lead.is_warranty_claim && (
                              <span className="px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[9px] font-black tracking-tighter">
                                WARRANTY
                              </span>
                            )}
                            <div className="flex items-center gap-2">
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
                        <td className="px-8 py-5 text-right text-xs font-bold text-slate-500 group-hover:text-indigo-400 transition-colors">
                          {lead.technician?.name || 'Unassigned'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* NEW: Map Visualization */}
            <div className="xl:col-span-3 h-[400px]">
              <JobMap leads={data.recentLeads} technicians={data.technicians} />
            </div>

            {/* Recent Leads Table (Moved into a grid later) */}

            {/* Quick Actions / Alerts */}
            <div className="space-y-6">
              {/* Financial Performance Chart */}
              <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
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

              <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-400" />
                  Attention Needed
                </h3>
                <div className="space-y-4">
                  {[
                    { label: '3 Jobs overdue', sub: 'North Region Team', color: 'bg-red-500' },
                    { label: '2 Parts pending', sub: 'Workshop Section', color: 'bg-amber-500' },
                    { label: '1 Refund request', sub: 'Customer Ali Raza', color: 'bg-indigo-500' },
                  ].map((alert, idx) => (
                    <div key={idx} className="flex items-center gap-4 group cursor-pointer">
                      <div className={`w-1 h-10 ${alert.color} rounded-full`}></div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{alert.label}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{alert.sub}</p>
                      </div>
                    </div>
                  ))}
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
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-400">
                  <IndianRupee size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Technician Earnings & Commissions</h3>
                  <p className="text-sm text-slate-500">Performance based on completed jobs (10% Default Rate)</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technician</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Jobs Done</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gross Revenue</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Commission Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {earningsReport.map((tech: any) => (
                    <tr key={tech.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                            {tech.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-200">{tech.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold border border-slate-700">
                          {tech.jobCount} Jobs
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-slate-300">Rs. {tech.totalRevenue.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-emerald-400">Rs. {tech.totalCommission.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
            </>
          ) : activeTab === 'Workshop' ? (
            <WorkshopModule />
          ) : activeTab === 'Finance' ? (
            <FinanceModule />
          ) : activeTab === 'Staff Management' ? (
            <StaffModule />
          ) : (
            <SettingsModule />
          )
        }

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
