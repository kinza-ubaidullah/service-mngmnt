import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { 
  LogOut, Wrench, Package, CheckCircle2, AlertCircle, 
  Clock, Search, Filter, ArrowRight, Loader2, 
  Settings, User, MapPin, ClipboardList, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkshopJob {
  id: number;
  lead_id: number;
  status: string;
  priority: string;
  received_date: string;
  notes: string;
  lead: {
    lead_id: string;
    product_type: string;
    problem_details: string;
    customer: {
      name: string;
      phone: string;
      area: string;
    }
  }
}

const WorkshopDashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWorkshopJobs = async () => {
    try {
      const res = await api.get('/workshop/jobs');
      setJobs(res.data.jobs);
    } catch (error) {
      toast.error('Failed to load workshop jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshopJobs();
  }, []);

  const updateJobStatus = async (jobId: number, status: string) => {
    try {
      await api.patch(`/workshop/jobs/${jobId}/status`, { status });
      toast.success(`Status updated to ${status}`);
      fetchWorkshopJobs();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.lead.lead_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.lead.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    
    if (activeTab === 'received') return matchesSearch && job.status === 'Received';
    if (activeTab === 'ongoing') return matchesSearch && job.status === 'WorkStarted';
    if (activeTab === 'ready') return matchesSearch && job.status === 'Ready';
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900/50 backdrop-blur-2xl border-r border-white/5 flex flex-col z-30">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20">
              <Wrench size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Workshop</h1>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Management Hub</span>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'received', label: 'Incoming Units', icon: Package },
              { id: 'ongoing', label: 'In Repair', icon: Activity },
              { id: 'ready', label: 'Ready for Delivery', icon: CheckCircle2 },
              { id: 'all', label: 'All Inventory', icon: ClipboardList },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                  ${activeTab === item.id 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/5' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'} />
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center font-bold text-white shadow-xl">
              {user?.name?.charAt(0) || 'W'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Workshop Manager</p>
            </div>
          </div>
          <button 
            onClick={() => dispatch(logout())}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-2xl border border-red-500/10 transition-all font-bold text-sm"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-72 flex flex-col min-h-screen">
        <header className="h-24 bg-slate-900/30 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search by Job ID or Customer..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all text-sm font-medium"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6 ml-10">
            <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full border border-amber-500/20 text-xs font-black flex items-center gap-2">
              <Clock size={14} className="animate-pulse" /> LIVE STATUS
            </div>
          </div>
        </header>

        <div className="p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Workshop Inventory</h2>
              <p className="text-slate-500 font-medium mt-1">Manage repairs, parts, and deliveries</p>
            </div>
            <div className="flex gap-2">
              <button className="p-3 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
                <Filter size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job, idx) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 hover:border-amber-500/20 transition-all group overflow-hidden relative"
                  >
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] group-hover:bg-amber-500/10 transition-all"></div>
                    
                    {/* Status Icon */}
                    <div className="w-20 h-20 rounded-3xl bg-slate-950 flex items-center justify-center border border-white/5 shrink-0 relative z-10 shadow-2xl">
                      {job.status === 'Received' && <Package className="text-blue-400" size={32} />}
                      {job.status === 'WorkStarted' && <Activity className="text-amber-400 animate-pulse" size={32} />}
                      {job.status === 'Ready' && <CheckCircle2 className="text-emerald-400" size={32} />}
                      {job.priority === 'High' && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-4 border-slate-900">
                          <AlertCircle size={12} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black bg-white/5 text-slate-400 px-2.5 py-1 rounded-lg border border-white/5 uppercase tracking-widest">{job.lead.lead_id}</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest
                          ${job.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                        `}>
                          {job.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white truncate">{job.lead.product_type}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1 line-clamp-1">{job.lead.problem_details}</p>
                      
                      <div className="flex flex-wrap gap-6 mt-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <User size={14} className="text-amber-500/50" /> {job.lead.customer.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <MapPin size={14} className="text-amber-500/50" /> {job.lead.customer.area}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock size={14} className="text-amber-500/50" /> {new Date(job.received_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0 relative z-10">
                      {job.status === 'Received' && (
                        <button 
                          onClick={() => updateJobStatus(job.id, 'WorkStarted')}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                        >
                          Start Repair <ArrowRight size={18} />
                        </button>
                      )}
                      {job.status === 'WorkStarted' && (
                        <button 
                          onClick={() => updateJobStatus(job.id, 'Ready')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                          Mark as Ready <CheckCircle2 size={18} />
                        </button>
                      )}
                      {job.status === 'Ready' && (
                        <div className="bg-emerald-500/10 text-emerald-400 px-6 py-3 rounded-2xl border border-emerald-500/20 font-black text-sm flex items-center gap-2">
                          <CheckCircle2 size={18} /> Awaiting Pickup
                        </div>
                      )}
                      <button className="p-3 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
                        <Settings size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-900/20 rounded-[3rem] border border-dashed border-white/5">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 text-slate-600">
                    <Package size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-white">No active jobs found</h3>
                  <p className="text-slate-500 mt-2 max-w-xs">There are currently no items in the workshop matching your criteria.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkshopDashboard;
