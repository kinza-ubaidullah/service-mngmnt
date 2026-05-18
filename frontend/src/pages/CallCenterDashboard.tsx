import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { LogOut, PhoneCall, Plus, ClipboardList, MapPin, User, Settings, Loader2, Sparkles, Activity, X, Calendar, Wrench, Users, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import JobMap from '../components/JobMap';
import StaffModule from '../components/StaffModule';
import WorkshopModule from '../components/WorkshopModule';
import FinanceModule from '../components/FinanceModule';
import { socket } from '../services/socket';

interface Lead {
  id: number;
  lead_id: string;
  status: string;
  product_type: string;
  problem_details: string;
  exact_address?: string;
  created_at: string;
  customer: {
    name: string;
    phone: string;
    area: string;
    google_map_link?: string;
  };
}

interface Technician {
  id: number;
  name: string;
  location_name?: string;
  specialization?: string;
  team: { name: string } | null;
  lat?: number | null;
  lng?: number | null;
  assigned_jobs?: any[];
}

const CallCenterDashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  // Data States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
  const [fetchingLeads, setFetchingLeads] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'operations' | 'teams' | 'workshop' | 'wallet'>(() => (sessionStorage.getItem('callCenterActiveTab') as 'operations' | 'teams' | 'workshop' | 'wallet') || 'operations');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    sessionStorage.setItem('callCenterActiveTab', activeTab);
  }, [activeTab]);

  // Form States
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_area: '',
    exact_address: '',
    google_map_link: '',
    product_type: 'Fridge',
    problem_details: '',
    house_image: '',
    item_pictures: [] as string[],
  });

  // Assign Modal States
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [assignForm, setAssignForm] = useState({ technician_id: '', visit_date: '' });
  const [assigning, setAssigning] = useState(false);

  // Edit Modal States
  const [editModal, setEditModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [editForm, setEditForm] = useState({
    customer_name: '', customer_phone: '', customer_area: '', exact_address: '', google_map_link: '', product_type: '', problem_details: ''
  });
  const [editing, setEditing] = useState(false);

  // Customer Insights
  const [customerInsight, setCustomerInsight] = useState<any>(null);

  // Fetch Data
  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data.leads);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setFetchingLeads(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await api.get('/users/technicians');
      setTechnicians(res.data.technicians);
    } catch (error) {
      toast.error('Failed to load technicians');
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await api.get('/areas');
      setAreas(res.data.areas);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchTechnicians();
    fetchAreas();

    // Connect to WebSockets for live tracking
    socket.connect();
    socket.emit('join_room', 'operations');

    socket.on('tech_location_changed', (data: { techId: number; lat: number; lng: number }) => {
      console.log('Realtime location update received in CallCenterDashboard:', data);
      setTechnicians((prevTechs) =>
        prevTechs.map((tech) =>
          tech.id === Number(data.techId)
            ? { ...tech, lat: Number(data.lat), lng: Number(data.lng) }
            : tech
        )
      );
    });

    return () => {
      socket.off('tech_location_changed');
      socket.disconnect();
    };
  }, []);

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'customer_phone' && value.length >= 10) {
      handleCustomerLookup(value);
    }
  };

  const handleCustomerLookup = async (phone: string) => {
    try {
      const res = await api.get(`/leads/lookup?phone=${phone}`);
      if (res.data.found) {
        setCustomerInsight(res.data);
        // Auto-fill details if customer found
        setFormData(prev => ({
          ...prev,
          customer_name: res.data.customer.name,
          customer_area: res.data.customer.area,
          exact_address: res.data.customer.address
        }));
        toast.success(`Repeat Customer: ${res.data.customer.name} (${res.data.stats.jobCount} Jobs)`, {
            icon: '🔄',
            duration: 4000
        });
      } else {
        setCustomerInsight(null);
      }
    } catch (e) {
      console.error('Lookup error', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/leads', formData);
      toast.success('Lead created successfully!');
      setFormData({
        customer_name: '', customer_phone: '', customer_area: '', exact_address: '', google_map_link: '', product_type: 'Fridge', problem_details: '', house_image: '', item_pictures: [],
      });
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating lead');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.lead || !assignForm.technician_id) return;
    
    setAssigning(true);
    try {
      await api.patch(`/leads/${assignModal.lead.id}/assign`, assignForm);
      toast.success('Lead assigned successfully!');
      setAssignModal({ isOpen: false, lead: null });
      fetchLeads(); // Refresh table
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error assigning lead');
    } finally {
      setAssigning(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customer.phone.includes(searchTerm);
      
    if (statusFilter === 'active') {
      return matchesSearch && lead.status !== 'Completed';
    } else if (statusFilter === 'completed') {
      return matchesSearch && lead.status === 'Completed';
    }
    return matchesSearch;
  });

  const openAssignModal = (lead: Lead) => {
    // Set default visit date to tomorrow at 10:00 AM for convenience
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const formattedDate = tomorrow.toISOString().slice(0, 16);

    setAssignModal({ isOpen: true, lead });
    setAssignForm({ technician_id: '', visit_date: formattedDate });
  };

  const openEditModal = (lead: Lead) => {
    setEditModal({ isOpen: true, lead });
    setEditForm({
      customer_name: lead.customer.name,
      customer_phone: lead.customer.phone,
      customer_area: lead.customer.area || '',
      exact_address: lead.exact_address || '',
      google_map_link: lead.customer.google_map_link || '',
      product_type: lead.product_type || 'Fridge',
      problem_details: lead.problem_details || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.lead) return;
    setEditing(true);
    try {
      await api.put(`/leads/${editModal.lead.id}`, editForm);
      toast.success('Lead updated successfully!');
      setEditModal({ isOpen: false, lead: null });
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating lead');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px]"></div>
      </div>

      {/* Glassmorphic Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-20"
      >
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <PhoneCall size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Dispatch Center <Sparkles size={16} className="text-indigo-400" />
            </h1>
            <p className="text-xs text-slate-400 font-medium">Live Operations Control</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 bg-slate-950/40 p-1 rounded-xl border border-white/5 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('operations')} 
            className={`px-4 py-2 whitespace-nowrap rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'operations' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Operations & Map
          </button>
          <button 
            onClick={() => setActiveTab('teams')} 
            className={`px-4 py-2 whitespace-nowrap rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'teams' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Teams Setup
          </button>
          <button 
            onClick={() => setActiveTab('workshop')} 
            className={`px-4 py-2 whitespace-nowrap rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'workshop' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Workshop
          </button>
          <button 
            onClick={() => setActiveTab('wallet')} 
            className={`px-4 py-2 whitespace-nowrap rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'wallet' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Wallet & Finance
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="text-sm font-medium text-slate-300">Online</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="font-medium text-slate-200">{user?.name}</span>
          </div>

          <button onClick={() => dispatch(logout())} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20 hover:scale-105">
            <LogOut size={16} /> <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </motion.nav>
      
      <main className="flex-1 flex flex-col p-3 lg:p-6 md:p-8 max-w-[1800px] w-full mx-auto relative z-10">
        {activeTab === 'teams' ? (
          <StaffModule role="CALL_CENTER" />
        ) : activeTab === 'workshop' ? (
          <WorkshopModule />
        ) : activeTab === 'wallet' ? (
          <FinanceModule />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 flex-1">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="lg:col-span-4 flex flex-col h-full">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden flex flex-col flex-1 shadow-2xl">
            <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg"><Plus className="text-indigo-400" size={18} /></div>
                New Service Request
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1 flex flex-col">
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-slate-400 border-b border-white/5 pb-2">
                  <User size={16} className="text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Customer Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="group relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Customer Name</label>
                    <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300" placeholder="Enter full name" />
                  </div>
                  <div className="group relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Phone Number</label>
                    <input required type="tel" name="customer_phone" value={formData.customer_phone} onChange={handleChange} className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300" placeholder="Enter phone number" />
                  </div>
                  <div className="group relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Area Name</label>
                    <select 
                      required 
                      name="customer_area" 
                      value={formData.customer_area} 
                      onChange={handleChange} 
                      className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300 appearance-none"
                    >
                      <option value="" disabled>-- Select Area --</option>
                      {areas.map(area => (
                        <option key={area.id} value={area.name}>{area.name}</option>
                      ))}
                      {/* Allow manual entry if areas list is empty, though UI says select */}
                      {areas.length === 0 && <option value="Unknown">No areas configured</option>}
                    </select>
                  </div>
                  <div className="group relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Home Location Link (Google Maps)</label>
                    <input type="url" name="google_map_link" value={formData.google_map_link} onChange={handleChange} className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300" placeholder="Google map URL" />
                  </div>
                  <div className="group relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 pl-1">House Picture</label>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="w-full bg-slate-950/50 text-slate-400 text-xs px-4 py-3 rounded-xl border border-white/10 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 transition-all cursor-pointer" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({...formData, house_image: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {formData.house_image && (
                        <p className="text-[10px] text-emerald-400 font-bold pl-1 flex items-center gap-1">
                          ● House Image Selected
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="group relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 pl-1">Item Pictures (Upload from device)</label>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        className="w-full bg-slate-950/50 text-slate-400 text-xs px-4 py-3 rounded-xl border border-white/10 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 transition-all cursor-pointer" 
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          const base64Promises = files.map(file => {
                            return new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result as string);
                              reader.readAsDataURL(file);
                            });
                          });
                          const results = await Promise.all(base64Promises);
                          setFormData({...formData, item_pictures: results as string[]});
                        }}
                      />
                      {formData.item_pictures.length > 0 && (
                        <p className="text-[10px] text-emerald-400 font-bold pl-1 flex items-center gap-1">
                          ● {formData.item_pictures.length} Images Selected
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer History Insights */}
                  {customerInsight && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Customer History</span>
                        <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">REPEAT</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Total Spent</p>
                          <p className="text-sm font-bold text-slate-200">$ {customerInsight.stats.totalSpent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Total Jobs</p>
                          <p className="text-sm font-bold text-slate-200">{customerInsight.stats.jobCount} Jobs</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-indigo-500/20">
                         <p className="text-[10px] text-slate-500 font-bold uppercase">Last Service</p>
                         <p className="text-xs text-slate-300 font-medium">
                            {new Date(customerInsight.stats.lastJobDate).toLocaleDateString()} - 
                            <span className="text-indigo-400 ml-1 uppercase">{customerInsight.stats.lastJobStatus}</span>
                         </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-5 flex-1">
                <div className="flex items-center gap-3 text-slate-400 border-b border-white/5 pb-2">
                  <Settings size={16} className="text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Service Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-slate-400 mb-2 pl-1">Appliance Type</label>
                    <select required name="product_type" value={formData.product_type} onChange={handleChange} className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300 appearance-none">
                      <option value="Fridge">❄️ Refrigerator / Fridge</option>
                      <option value="AC">💨 Air Conditioner</option>
                      <option value="WashingMachine">🧺 Washing Machine</option>
                      <option value="Microwave">♨️ Microwave</option>
                      <option value="Other">🔧 Other Appliance</option>
                    </select>
                  </div>
                  <div className="group relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Problem Description</label>
                    <textarea name="problem_details" value={formData.problem_details} onChange={handleChange} rows={3} className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300 resize-none" placeholder="Enter issue details..."></textarea>
                  </div>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full mt-auto bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none border border-indigo-400/20">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                {loading ? 'Processing...' : 'Dispatch Lead'}
              </motion.button>
            </form>
          </div>
        </motion.div>

            {/* Right Column: Leads Table */}
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-8 flex flex-col h-full gap-4">
              
              {/* JobMap Section */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl p-2 h-[350px] shrink-0">
                <JobMap leads={leads} technicians={technicians} onAssign={openAssignModal} />
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden flex flex-col flex-1 min-h-[400px] shadow-2xl">
                <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-transparent to-white/[0.02] flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg"><Activity className="text-blue-400" size={18} /></div>
                    <h2 className="text-lg font-bold text-white">Live Operations Feed</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Search leads..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500 text-white placeholder-slate-500 w-48"
                    />
                    <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 py-1.5 px-4 rounded-full text-xs font-bold tracking-wider hidden sm:block">
                      {leads.filter(l => l.status !== 'Completed').length} ACTIVE
                    </span>
                  </div>
                </div>

                {/* Status Filter Row */}
                <div className="px-8 py-3 bg-white/[0.01] border-b border-white/5 flex flex-wrap gap-2 items-center justify-between shrink-0">
                  <div className="flex gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                    {[
                      { id: 'active', label: 'Current Leads', count: leads.filter(l => l.status !== 'Completed').length },
                      { id: 'completed', label: 'Past Leads', count: leads.filter(l => l.status === 'Completed').length },
                      { id: 'all', label: 'All History', count: leads.length }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${statusFilter === tab.id ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider pl-2">
                    Showing {filteredLeads.length} leads
                  </span>
                </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {fetchingLeads ? (
                <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
              ) : filteredLeads.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 py-12">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 bg-slate-800/50 rounded-full mb-6 border border-white/5">
                    <ClipboardList size={48} className="text-slate-600" />
                  </motion.div>
                  <p className="text-xl font-medium text-slate-400">No leads found</p>
                  <p className="text-sm mt-2 text-slate-600">Awaiting new service dispatches or check active filters.</p>
                </div>
              ) : (
                <div className="grid gap-3 p-4">
                  <AnimatePresence>
                    {filteredLeads.map((lead, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                        key={lead.id} 
                        className="group bg-slate-950/40 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 flex items-center gap-6 transition-all duration-300"
                      >
                        {/* ID Block */}
                        <div className="shrink-0 flex flex-col items-center justify-center bg-slate-900 border border-white/10 rounded-xl p-3 min-w-[110px]">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Lead ID</span>
                          <span className="font-mono text-sm font-bold text-indigo-300">{lead.lead_id}</span>
                        </div>

                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-slate-200 truncate">{lead.customer.name}</h4>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5"><MapPin size={12} className="text-emerald-400/70" /> {lead.customer.area}</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                            <span className="font-mono text-slate-500">{lead.customer.phone}</span>
                          </div>
                        </div>

                        {/* Product & Issue */}
                        <div className="flex-1 hidden xl:block min-w-0">
                          <div className="inline-flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300 border border-white/5 mb-1.5">
                            {lead.product_type}
                          </div>
                          <p className="text-xs text-slate-500 truncate pr-4">{lead.problem_details || 'Standard inspection required.'}</p>
                        </div>

                        {/* Status & Actions */}
                        <div className="shrink-0 flex flex-col items-end gap-2 min-w-[140px]">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-sm border text-center w-full
                            ${lead.status === 'New' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/10'}
                          `}>
                            {lead.status === 'New' ? '● NEW LEAD' : lead.status.toUpperCase()}
                          </span>

                          {/* Quick Contact Buttons (Always shown or if assigned, user asked for "after assigning") */}
                          {lead.status !== 'New' && (
                            <div className="flex w-full gap-1 mt-1">
                              <a href={`tel:${lead.customer.phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1.5 rounded flex justify-center items-center transition-colors" title="Call">
                                <PhoneCall size={12} />
                              </a>
                              <a href={`https://wa.me/${lead.customer.phone.replace(/[^0-9]/g, '')}`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 py-1.5 rounded flex justify-center items-center transition-colors" title="WhatsApp">
                                {/* SVG/Text for Whatsapp */}
                                <span className="text-[10px] font-bold">WA</span>
                              </a>
                              {lead.customer.google_map_link && (
                                <a href={lead.customer.google_map_link} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-1.5 rounded flex justify-center items-center transition-colors" title="Location">
                                  <MapPin size={12} />
                                </a>
                              )}
                            </div>
                          )}

                          {lead.status === 'New' ? (
                            <button 
                              onClick={() => openAssignModal(lead)}
                              className="w-full bg-white/5 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 text-xs font-bold py-1.5 rounded border border-white/10 hover:border-indigo-500/50 transition-colors"
                            >
                              Assign
                            </button>
                          ) : (
                            <button 
                              onClick={() => openAssignModal(lead)}
                              className="w-full bg-white/5 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 text-[10px] font-bold py-1.5 rounded border border-white/10 hover:border-blue-500/50 transition-colors"
                            >
                              Reassign
                            </button>
                          )}

                          <div className="flex w-full gap-1 mt-0.5">
                            <button 
                              onClick={() => openEditModal(lead)}
                              className="flex-1 bg-white/5 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 text-[10px] font-bold py-1 rounded border border-white/10 hover:border-orange-500/50 transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(lead.id)}
                              className="flex-1 bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold py-1 rounded border border-white/10 hover:border-red-500/50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </main>

      {/* Assign Modal Overlay */}
      <AnimatePresence>
        {assignModal.isOpen && assignModal.lead && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wrench className="text-indigo-400" />
                  Dispatch Assignment
                </h3>
                <button onClick={() => setAssignModal({ isOpen: false, lead: null })} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssign} className="p-6 space-y-6">
                
                {/* Lead Summary inside Modal */}
                <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Lead</span>
                    <span className="font-mono text-sm font-bold text-indigo-300">{assignModal.lead.lead_id}</span>
                  </div>
                  <div className="text-sm text-slate-300 font-medium">{assignModal.lead.customer.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12}/> {assignModal.lead.customer.area}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Technician</label>
                    <select 
                      required 
                      value={assignForm.technician_id} 
                      onChange={(e) => setAssignForm({...assignForm, technician_id: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300 appearance-none"
                    >
                      <option value="" disabled>-- Choose a Technician --</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.specialization ? `[${t.specialization}]` : ''} — {t.location_name || 'No Location'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-400"/> Scheduled Visit
                    </label>
                    <input 
                      type="datetime-local" 
                      required
                      value={assignForm.visit_date}
                      onChange={(e) => setAssignForm({...assignForm, visit_date: e.target.value})}
                      className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setAssignModal({ isOpen: false, lead: null })} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-colors border border-white/5">
                    Cancel
                  </button>
                  <button type="submit" disabled={assigning} className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex justify-center items-center gap-2 border border-indigo-400/20 disabled:opacity-50">
                    {assigning ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Dispatch'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {editModal.isOpen && editModal.lead && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="text-orange-400" size={18} />
                  Edit Lead: {editModal.lead.lead_id}
                </h3>
                <button type="button" onClick={() => setEditModal({ isOpen: false, lead: null })} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label>
                    <input required type="text" value={editForm.customer_name} onChange={e => setEditForm({...editForm, customer_name: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                    <input required type="tel" value={editForm.customer_phone} onChange={e => setEditForm({...editForm, customer_phone: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Area</label>
                    <select required value={editForm.customer_area} onChange={e => setEditForm({...editForm, customer_area: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-orange-500 outline-none">
                      <option value="" disabled>-- Select Area --</option>
                      {areas.map(area => <option key={area.id} value={area.name}>{area.name}</option>)}
                      {areas.length === 0 && <option value={editForm.customer_area}>{editForm.customer_area}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Google Map Link</label>
                    <input type="url" value={editForm.google_map_link} onChange={e => setEditForm({...editForm, google_map_link: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Appliance Type</label>
                    <select required value={editForm.product_type} onChange={e => setEditForm({...editForm, product_type: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-orange-500 outline-none">
                      <option value="Fridge">❄️ Refrigerator / Fridge</option>
                      <option value="AC">💨 Air Conditioner</option>
                      <option value="WashingMachine">🧺 Washing Machine</option>
                      <option value="Microwave">♨️ Microwave</option>
                      <option value="Other">🔧 Other Appliance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Problem Details</label>
                    <textarea rows={3} value={editForm.problem_details} onChange={e => setEditForm({...editForm, problem_details: e.target.value})} className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-orange-500 outline-none resize-none" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditModal({ isOpen: false, lead: null })} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-colors border border-white/5">
                    Cancel
                  </button>
                  <button type="submit" disabled={editing} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2 border border-orange-400/20 disabled:opacity-50">
                    {editing ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.5); }
      `}</style>
    </div>
  );
};

export default CallCenterDashboard;
