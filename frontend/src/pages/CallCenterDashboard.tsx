import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { LogOut, PhoneCall, Plus, ClipboardList, MapPin, User, Settings, Loader2, Sparkles, Activity, X, Calendar, Wrench, Trash2, Info, Eye, UserMinus, RotateCcw, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import TechnicianTrackingMap from '../components/TechnicianTrackingMap';
import { useMergedTechnicians } from '../hooks/useLiveTechnicians';
import TechnicianWorkloadFilter from '../components/TechnicianWorkloadFilter';
import PendingApprovalCard from '../components/PendingApprovalCard';
import { matchesLeadSearch, buildLeadsLocationKey, filterLeadsByTechnician, filterLeadsByTeam, countActiveJobsForTechnician, isAssignedTaskStatus, filterLeadsForAssignedTab, countLeadsForFilter, filterLeadsByStatusTab, isMapVisibleLead, isCancellableLead, isCompletedLead, countActiveOperationalLeads, formatSAR, APPLIANCE_OPTIONS, parseProductTypes, formatProductTypesDisplay, getLeadProducts, hasVoiceNote, type LeadFeedFilter } from '../utils/leadHelpers';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import GlobalLeadSearch from '../components/GlobalLeadSearch';
import LeadPdfButtons from '../components/LeadPdfButtons';
import { compressImageFile } from '../utils/compressImage';
import RefreshButton from '../components/RefreshButton';
import ThemeToggle from '../components/ThemeToggle';
import { useLiveData } from '../hooks/useLiveData';
import { parseGoogleMapsCoords, resolveLocationFromLink } from '../utils/leadLocation';
import WorkshopModule from '../components/WorkshopModule';
import SettingsModule from '../components/SettingsModule';
import LeadHistoryModal from '../components/LeadHistoryModal';
import ImageZoomModal from '../components/ImageZoomModal';
import LeadImageThumb from '../components/LeadImageThumb';
import CopyText from '../components/CopyText';

interface Lead {
  id: number;
  lead_id: string;
  status: string;
  product_type: string;
  problem_details: string;
  exact_address?: string;
  house_image?: string;
  item_pictures?: string[] | any;
  created_at: string;
  visit_date?: string;
  lat?: number;
  lng?: number;
  team_id?: number | null;
  voice_note?: string | null;
  rejection_note?: string | null;
  customer: {
    name: string;
    phone: string;
    area: string;
    google_map_link?: string;
  };
  technician?: {
    id: number;
    name: string;
  } | null;
}

interface Technician {
  id: number;
  name: string;
  location_name?: string;
  specialization?: string;
  team_id?: number | null;
  team?: { name: string };
  lat?: number | null;
  lng?: number | null;
  assigned_jobs?: any[];
}

interface Team {
  id: number;
  name: string;
}

const TECH_FILTER_TABS = ['assigned', 'inprogress', 'delay', 'pending', 'all'] as const;

const CallCenterDashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  // Data States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fetchingLeads, setFetchingLeads] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'operations' | 'workshop' | 'settings'>(() => (sessionStorage.getItem('callCenterActiveTab') as 'operations' | 'workshop' | 'settings') || 'operations');
  const [statusFilter, setStatusFilter] = useState<LeadFeedFilter>('new');
  const [technicianFilter, setTechnicianFilter] = useState<number | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    sessionStorage.setItem('callCenterActiveTab', activeTab);
  }, [activeTab]);

  const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_area: '',
    exact_address: '',
    google_map_link: '',
    products: ['Washing Machine'] as string[],
    payment_confirmed: false,
    agreed_amount: '',
    problem_details: '',
    house_image: '',
    item_pictures: [] as string[],
    lat: null as number | null,
    lng: null as number | null,
  });
  const [locationPreview, setLocationPreview] = useState<string | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);

  // Assign Modal States
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [assignForm, setAssignForm] = useState({ technician_id: '', visit_date: '' });
  const [assigning, setAssigning] = useState(false);

  // Edit Modal States
  const [editModal, setEditModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [editForm, setEditForm] = useState({
    customer_name: '', 
    customer_phone: '', 
    customer_area: '', 
    exact_address: '', 
    google_map_link: '', 
    products: [] as string[],
    problem_details: '',
    house_image: '',
    item_pictures: [] as string[],
    lat: null as number | null,
    lng: null as number | null,
  });
  const [editLocationPreview, setEditLocationPreview] = useState<string | null>(null);
  const [editProductPicker, setEditProductPicker] = useState('');
  const [editing, setEditing] = useState(false);

  // Customer Insights
  const [customerInsight, setCustomerInsight] = useState<any>(null);
  const [areaSearch, setAreaSearch] = useState('');
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [productPicker, setProductPicker] = useState('');
  const houseFileRef = useRef<HTMLInputElement>(null);
  const itemFileRef = useRef<HTMLInputElement>(null);

  const mergedTechnicians = useMergedTechnicians(technicians);

  // Fetch Data
  const fetchLeads = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setFetchingLeads(true);
      const res = await api.get('/leads');
      setLeads(res.data.leads);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      if (!opts?.silent) setFetchingLeads(false);
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

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data.teams || []);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAll = async (opts?: { silent?: boolean }) => {
    await Promise.all([fetchLeads(opts), fetchTechnicians(), fetchTeams()]);
  };

  const { refresh, refreshing } = useLiveData(['leads', 'workshop', 'all'], () => refreshAll({ silent: true }));

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
    fetchTeams();
  }, []);

  useEffect(() => {
    if (!TECH_FILTER_TABS.includes(statusFilter as typeof TECH_FILTER_TABS[number])) {
      setTechnicianFilter('all');
      setTeamFilter('all');
    }
  }, [statusFilter]);

  const applyMapLinkToForm = async <T extends { lat: number | null; lng: number | null }>(
    link: string,
    setter: React.Dispatch<React.SetStateAction<T>>,
    previewSetter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (!link.trim()) {
      previewSetter(null);
      setter((prev) => ({ ...prev, lat: null, lng: null }));
      return;
    }
    const direct = parseGoogleMapsCoords(link);
    if (direct) {
      setter((prev) => ({ ...prev, lat: direct[0], lng: direct[1] }));
      previewSetter(`📍 Exact location: ${direct[0].toFixed(5)}, ${direct[1].toFixed(5)}`);
      return;
    }
    setResolvingLocation(true);
    const resolved = await resolveLocationFromLink(link);
    setResolvingLocation(false);
    if (resolved) {
      setter((prev) => ({ ...prev, lat: resolved.lat, lng: resolved.lng }));
      previewSetter(`📍 Exact location: ${resolved.lat.toFixed(5)}, ${resolved.lng.toFixed(5)}`);
    } else {
      previewSetter('⚠ Paste full Google Maps link for exact pin location');
      setter((prev) => ({ ...prev, lat: null, lng: null }));
    }
  };

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'customer_phone' && value.length >= 10) {
      handleCustomerLookup(value);
    }
    if (name === 'google_map_link') {
      applyMapLinkToForm(value, setFormData, setLocationPreview);
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
    if (!formData.customer_name.trim() || !formData.customer_phone.trim() || !formData.customer_area.trim()) {
      toast.error('Please fill customer name, phone and area');
      return;
    }
    if (formData.products.length === 0) {
      toast.error('Add at least one appliance/product');
      return;
    }
    setLoading(true);
    try {
      const { products, ...rest } = formData;
      const payload = {
        ...rest,
        products: products.map((p) => ({ product_type: p })),
        product_type: products.join(', '),
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim(),
        customer_area: formData.customer_area.trim(),
        google_map_link: formData.google_map_link?.trim() || '',
        house_image: formData.house_image || '',
        item_pictures: formData.item_pictures || [],
        agreed_amount: formData.payment_confirmed ? formData.agreed_amount : '',
      };
      await api.post('/leads', payload);
      toast.success('Lead created successfully!');
      setFormData({
        customer_name: '', customer_phone: '', customer_area: '', exact_address: '', google_map_link: '', products: ['Washing Machine'], problem_details: '', house_image: '', item_pictures: [], payment_confirmed: false, agreed_amount: '', lat: null, lng: null,
      });
      setProductPicker('');
      setCustomerInsight(null);
      setLocationPreview(null);
      setAreaSearch('');
      if (houseFileRef.current) houseFileRef.current.value = '';
      if (itemFileRef.current) itemFileRef.current.value = '';
      setFormKey((k) => k + 1);
      fetchLeads();
    } catch (error: any) {
      if (error.response?.status === 409) {
        const existing = error.response?.data?.existingLead;
        toast.error(
          existing?.lead_id
            ? `Active lead ${existing.lead_id} already exists for this phone (${existing.status}). Complete or cancel it first.`
            : error.response?.data?.message || 'An active lead already exists for this phone number',
          { duration: 7000, icon: '⚠️' }
        );
      } else {
        const msg = error.response?.data?.message || error.response?.data?.detail || 'Error creating lead';
        const hint = error.response?.data?.hint;
        toast.error(hint ? `${msg}. ${hint}` : msg, { duration: 9000 });
      }
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
      setStatusFilter('assigned');
      await refreshAll({ silent: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error assigning lead');
    } finally {
      setAssigning(false);
    }
  };

  const isGlobalSearch = searchTerm.trim().length > 0;
  const showTechFilter =
    TECH_FILTER_TABS.includes(statusFilter as typeof TECH_FILTER_TABS[number]) || technicianFilter !== 'all';

  const handleMapTechnicianSelect = (id: number | 'all') => {
    setTechnicianFilter(id);
    if (id !== 'all') {
      setStatusFilter('assigned');
      setTeamFilter('all');
    }
  };

  const statusFilteredLeads = useMemo(() => {
    let result = leads.filter((lead) => matchesLeadSearch(lead, searchTerm));
    if (isGlobalSearch) return result;

    if (statusFilter === 'assigned') {
      return filterLeadsForAssignedTab(result, technicianFilter, teamFilter);
    }

    return filterLeadsByStatusTab(result, statusFilter as LeadFeedFilter);
  }, [leads, searchTerm, isGlobalSearch, statusFilter, technicianFilter, teamFilter]);

  const filteredLeads = useMemo(() => {
    if (isGlobalSearch || statusFilter === 'assigned') return statusFilteredLeads;
    if (!showTechFilter) return statusFilteredLeads;
    let result = statusFilteredLeads;
    if (technicianFilter !== 'all') result = filterLeadsByTechnician(result, technicianFilter);
    if (teamFilter !== 'all') result = filterLeadsByTeam(result, teamFilter);
    return result;
  }, [statusFilteredLeads, isGlobalSearch, statusFilter, showTechFilter, technicianFilter, teamFilter]);

  const mapLeads = useMemo(() => {
    const operational = leads.filter(isMapVisibleLead);
    if (statusFilter === 'new') return operational.filter((l) => l.status === 'New' || l.status === 'Complaint');
    if (showTechFilter && (technicianFilter !== 'all' || teamFilter !== 'all')) {
      let result = operational;
      if (technicianFilter !== 'all') result = filterLeadsByTechnician(result, technicianFilter);
      if (teamFilter !== 'all') result = filterLeadsByTeam(result, teamFilter);
      return result;
    }
    return operational;
  }, [leads, statusFilter, showTechFilter, technicianFilter, teamFilter]);

  const feedTabCounts = useMemo(() => ({
    new: countLeadsForFilter(leads, 'new'),
    assigned: countLeadsForFilter(leads, 'assigned'),
    inprogress: countLeadsForFilter(leads, 'inprogress'),
    pending: countLeadsForFilter(leads, 'pending'),
    completed: countLeadsForFilter(leads, 'completed'),
    cancelled: countLeadsForFilter(leads, 'cancelled'),
    delay: countLeadsForFilter(leads, 'delay'),
    deleted: countLeadsForFilter(leads, 'deleted'),
    voice: countLeadsForFilter(leads, 'voice'),
    all: countLeadsForFilter(leads, 'all'),
  }), [leads]);

  const mapLocationKey = useMemo(() => buildLeadsLocationKey(mapLeads), [mapLeads]);

  const openAssignModal = (lead: Lead) => {
    // Set default visit date to tomorrow at 10:00 AM for convenience
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const formattedDate = tomorrow.toISOString().slice(0, 16);

    setAssignModal({ isOpen: true, lead });
    setAssignForm({
      technician_id: technicianFilter !== 'all' ? String(technicianFilter) : (lead.technician?.id ? String(lead.technician.id) : ''),
      visit_date: formattedDate,
    });
  };

  const handleReopenComplaint = async (lead: Lead) => {
    const reason = prompt('Reason for reopening as complaint?');
    if (!reason?.trim()) return;
    try {
      await api.patch(`/leads/${lead.id}/reopen`, { reason: reason.trim() });
      toast.success('Job reopened as complaint');
      fetchLeads({ silent: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reopen');
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditModal({ isOpen: true, lead });
    setEditForm({
      customer_name: lead.customer.name,
      customer_phone: lead.customer.phone,
      customer_area: lead.customer.area || '',
      exact_address: lead.exact_address || '',
      google_map_link: lead.customer.google_map_link || '',
      products: getLeadProducts(lead).length ? getLeadProducts(lead) : [lead.product_type || 'Washing Machine'],
      problem_details: lead.problem_details || '',
      house_image: lead.house_image || '',
      item_pictures: lead.item_pictures || [],
      lat: lead.lat ?? null,
      lng: lead.lng ?? null,
    });
    if (lead.lat != null && lead.lng != null) {
      setEditLocationPreview(`📍 Exact location: ${Number(lead.lat).toFixed(5)}, ${Number(lead.lng).toFixed(5)}`);
    } else {
      setEditLocationPreview(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.lead) return;
    setEditing(true);
    try {
      const products = editForm.products.length ? editForm.products : ['Washing Machine'];
      const res = await api.put(`/leads/${editModal.lead.id}`, {
        ...editForm,
        products: products.map((p) => ({ product_type: p })),
        product_type: products.join(', '),
      });
      const updated = res.data.lead;
      setLeads((prev) =>
        prev.map((l) =>
          l.id === updated.id
            ? {
                ...l,
                ...updated,
                customer: updated.customer || l.customer,
                lat: updated.lat ?? editForm.lat ?? l.lat,
                lng: updated.lng ?? editForm.lng ?? l.lng,
              }
            : l
        )
      );
      toast.success('Lead updated successfully!');
      setEditModal({ isOpen: false, lead: null });
      fetchLeads({ silent: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating lead');
    } finally {
      setEditing(false);
    }
  };

  const handleUnassign = async (lead: Lead, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm(`Unassign ${lead.lead_id}?`)) return;
    try {
      await api.patch(`/leads/${lead.id}/unassign`);
      toast.success('Lead unassigned');
      fetchLeads();
    } catch {
      toast.error('Failed to unassign');
    }
  };

  const handleCancelLead = async (lead: Lead | any) => {
    if (!window.confirm(`Mark lead ${lead.lead_id} as Cancelled? It will be removed from the map.`)) return;
    try {
      await api.patch(`/leads/${lead.id}/cancel`);
      toast.success('Lead cancelled');
      fetchLeads({ silent: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel lead');
    }
  };

  const startRepeatService = (lead: Lead) => {
    setActiveTab('operations');
    setFormData((prev) => ({
      ...prev,
      customer_name: lead.customer.name,
      customer_phone: lead.customer.phone,
      customer_area: lead.customer.area || '',
      exact_address: lead.exact_address || '',
      google_map_link: lead.customer.google_map_link || '',
      products: parseProductTypes(lead.product_type).length ? parseProductTypes(lead.product_type) : [lead.product_type || 'Washing Machine'],
      problem_details: '',
      house_image: '',
      item_pictures: [],
      payment_confirmed: false,
      agreed_amount: '',
      lat: lead.lat ?? null,
      lng: lead.lng ?? null,
    }));
    handleCustomerLookup(lead.customer.phone);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(`Creating new task for ${lead.customer.name} — previous history linked`);
  };

  const handleGlobalSearch = () => {
    const q = searchTerm.trim();
    if (!q) return;
    setActiveTab('operations');
    const match = leads.find((l) => matchesLeadSearch(l, q));
    if (match) toast.success(`Found: ${match.lead_id}`);
    else toast.error('No lead found');
  };

  const handleDelete = async (id: number, status: string) => {
    if (status !== 'New') {
      toast.error('Only unassigned (New) leads can be deleted');
      return;
    }
    if (!confirm('Move this unassigned lead to the Bin?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead moved to Bin successfully!');
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete lead');
    }
  };

  return (
    <div className="crm-shell text-slate-800 flex flex-col font-sans selection:bg-mint-200/50 min-h-screen w-full max-w-[100vw]">
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px]"></div>
      </div>

      {/* Navbar — single row, no page scroll */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="crm-nav backdrop-blur-xl px-3 lg:px-5 py-2.5 flex items-center gap-3 shrink-0 z-20 border-b border-slate-200/50 min-h-[56px]"
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-mint-300/25">
            <PhoneCall size={20} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base lg:text-lg font-bold text-slate-800 tracking-wide flex items-center gap-2 leading-tight">
              Dispatch Center <Sparkles size={14} className="text-mint-600" />
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Live Operations</p>
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto custom-scrollbar">
          <div className="flex gap-1.5 crm-tabs rounded-xl w-max mx-auto lg:mx-0">
          <button 
            onClick={() => setActiveTab('operations')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'operations' ? 'crm-tab-active shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Leads & Map
          </button>
          <button 
            onClick={() => setActiveTab('workshop')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'workshop' ? 'crm-tab-active shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Workshop
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'settings' ? 'crm-tab-active shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
          >
            <Settings size={14} /> Settings
          </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <GlobalLeadSearch
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); if (v.trim()) setActiveTab('operations'); }}
            onSubmit={handleGlobalSearch}
            placeholder="Search lead ID..."
            className="w-36 hidden xl:block"
          />
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-slate-600">Online</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 max-w-[120px]">
            <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-slate-800 text-xs shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="font-medium text-slate-700 text-sm truncate">{user?.name}</span>
          </div>

          <ThemeToggle />
          <button onClick={() => dispatch(logout())} className="flex items-center gap-1.5 crm-btn-ghost px-3 py-2 rounded-xl transition-all border border-slate-200/70 hover:border-mint-300/50">
            <LogOut size={15} /> <span className="text-xs font-semibold hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </motion.nav>
      
      <main className="flex-1 p-3 lg:p-6 max-w-[1800px] w-full mx-auto relative z-10">
        {activeTab === 'workshop' ? (
          <WorkshopModule />
        ) : activeTab === 'settings' ? (
          <SettingsModule />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="lg:col-span-4">
              <div className="crm-card backdrop-blur-xl rounded-3xl border border-slate-200/70 overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-slate-200/60 bg-gradient-to-r from-white/[0.02] to-transparent">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-500/20 rounded-lg"><Plus className="text-mint-600" size={18} /></div>
                    New Service Request
                  </h2>
                </div>
                
                <form key={formKey} onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-400 border-b border-slate-200/60 pb-2">
                      <User size={16} className="text-mint-600" />
                      <h3 className="text-xs font-bold uppercase tracking-widest">Customer Details</h3>
                    </div>
                    
                    <div className="space-y-3.5">
                      <div className="group relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Customer Name</label>
                        <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200 outline-none transition-all duration-300" placeholder="Enter full name" />
                      </div>
                      <div className="group relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Phone Number</label>
                        <input required type="tel" name="customer_phone" value={formData.customer_phone} onChange={handleChange} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200 outline-none transition-all duration-300" placeholder="Enter phone number" />
                      </div>

                      {customerInsight?.found && (
                        <div className="rounded-xl border border-teal-300/50 bg-teal-50/80 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-black text-teal-800 uppercase tracking-wider">Returning Customer</p>
                            <span className="text-[10px] font-bold bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded-full">
                              {customerInsight.stats?.jobCount ?? 0} past job{(customerInsight.stats?.jobCount ?? 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-sm text-teal-900">
                            Total spent: <strong>{formatSAR(customerInsight.stats?.totalSpent ?? 0)}</strong>
                            {customerInsight.stats?.lastJobDate && (
                              <span className="text-teal-700"> · Last visit: {new Date(customerInsight.stats.lastJobDate).toLocaleDateString()}</span>
                            )}
                          </p>
                          {(customerInsight.history || []).length > 0 && (
                            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1.5">
                              {(customerInsight.history as any[]).slice(0, 8).map((job: any) => (
                                <div key={job.lead_id} className="flex items-center justify-between gap-2 text-[11px] bg-white/70 rounded-lg px-2.5 py-1.5 border border-teal-200/60">
                                  <span className="font-mono font-bold text-teal-800">{job.lead_id}</span>
                                  <span className="text-teal-700 truncate">{job.product_type}</span>
                                  <span className={`font-bold shrink-0 ${job.status === 'Completed' ? 'text-emerald-600' : job.status === 'Cancelled' ? 'text-rose-500' : 'text-amber-600'}`}>
                                    {job.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-teal-700">New task will stay linked to this customer profile and full history.</p>
                        </div>
                      )}
                      <div className="group relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Area (Search)</label>
                        <input
                          required
                          list="area-options"
                          name="customer_area"
                          value={formData.customer_area}
                          onChange={(e) => { setAreaSearch(e.target.value); handleChange(e); }}
                          className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 focus:border-mint-400 outline-none"
                          placeholder="Type to search area e.g. Makkah..."
                        />
                        <datalist id="area-options">
                          {areas.filter(a => !areaSearch || a.name.toLowerCase().includes(areaSearch.toLowerCase())).map(area => (
                            <option key={area.id} value={area.name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/70">
                        <div>
                          <p className="text-sm font-bold text-slate-800">Payment Confirmed on Call?</p>
                          <p className="text-[11px] text-slate-500">Customer agreed price before visit</p>
                        </div>
                        <button type="button" onClick={() => setFormData({ ...formData, payment_confirmed: !formData.payment_confirmed })}
                          className={`w-12 h-6 rounded-full relative transition-all ${formData.payment_confirmed ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.payment_confirmed ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {formData.payment_confirmed && (
                        <input type="number" name="agreed_amount" value={formData.agreed_amount} onChange={handleChange}
                          placeholder="Agreed Amount (SAR)" required
                          className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-emerald-500/30 outline-none" />
                      )}
                      <div className="group relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Home Location Link (Google Maps)</label>
                        <input type="url" name="google_map_link" value={formData.google_map_link} onChange={handleChange} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200 outline-none transition-all duration-300" placeholder="Paste Google Maps link for exact location" />
                        {resolvingLocation && <p className="text-[10px] text-amber-600 font-bold pl-1 mt-1">Resolving location from link...</p>}
                        {locationPreview && !resolvingLocation && <p className="text-[10px] text-mint-600 font-bold pl-1 mt-1">{locationPreview}</p>}
                      </div>
                      <div className="group relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 pl-1">House Picture</label>
                        <div className="flex flex-col gap-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            ref={houseFileRef}
                            key={`house-${formKey}`}
                            className="w-full bg-white text-slate-400 text-xs px-4 py-3 rounded-xl border border-slate-200/70 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/20 file:text-mint-600 hover:file:bg-indigo-500/30 transition-all cursor-pointer" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const compressed = await compressImageFile(file);
                                setFormData(prev => ({ ...prev, house_image: compressed }));
                              } catch { toast.error('Failed to process house image'); }
                            }}
                          />
                          {formData.house_image && (
                            <p className="text-[10px] text-mint-600 font-bold pl-1 flex items-center gap-1">
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
                            ref={itemFileRef}
                            key={`items-${formKey}`}
                            className="w-full bg-white text-slate-400 text-xs px-4 py-3 rounded-xl border border-slate-200/70 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/20 file:text-mint-600 hover:file:bg-indigo-500/30 transition-all cursor-pointer" 
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (!files.length) return;
                              try {
                                const results = await Promise.all(files.map(f => compressImageFile(f)));
                                setFormData(prev => ({ ...prev, item_pictures: [...prev.item_pictures, ...results] }));
                              } catch { toast.error('Failed to process item pictures'); }
                            }}
                          />
                          {formData.item_pictures.length > 0 && (
                            <p className="text-[10px] text-mint-600 font-bold pl-1 flex items-center gap-1">
                              ● {formData.item_pictures.length} Item Pictures Selected
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="group relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Appliances / Products</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {formData.products.map((p) => (
                            <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
                              {p}
                              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, products: prev.products.filter((x) => x !== p) }))} className="text-indigo-500 hover:text-rose-600"><X size={12} /></button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <select value={productPicker} onChange={(e) => setProductPicker(e.target.value)} className="flex-1 crm-input text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200/70 text-sm">
                            <option value="">Add appliance...</option>
                            {APPLIANCE_OPTIONS.filter((o) => !formData.products.includes(o)).map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => {
                            if (!productPicker || formData.products.includes(productPicker)) return;
                            setFormData((prev) => ({ ...prev, products: [...prev.products, productPicker] }));
                            setProductPicker('');
                          }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Add</button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Select multiple products if customer has more than one appliance.</p>
                      </div>
                      <div className="group relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Problem Description</label>
                        <textarea name="problem_details" value={formData.problem_details} onChange={handleChange} rows={3} className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200 outline-none transition-all duration-300 resize-none" placeholder="Enter issue details..."></textarea>
                      </div>
                    </div>
                  </div>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-slate-800 font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 border border-indigo-400/20">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    {loading ? 'Processing...' : 'Dispatch Lead'}
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Right: map + leads feed */}
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-8 flex flex-col gap-4">
              <div className="shrink-0">
                <TechnicianTrackingMap
                  height="380px"
                  leads={mapLeads}
                  technicians={mergedTechnicians}
                  onAssign={openAssignModal}
                  onUnassign={handleUnassign}
                  onCancel={handleCancelLead}
                  showOnlyUnassigned={statusFilter === 'new' && technicianFilter === 'all'}
                  locationKey={mapLocationKey}
                  onRefresh={refresh}
                  refreshing={refreshing || fetchingLeads}
                  selectedTechnicianId={technicianFilter}
                  onSelectTechnician={handleMapTechnicianSelect}
                />
              </div>

              <div className="crm-card backdrop-blur-xl rounded-3xl border border-slate-200/70 overflow-hidden shadow-2xl">
                <div className="px-6 lg:px-8 py-5 border-b border-slate-200/60 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg"><Activity className="text-blue-400" size={18} /></div>
                    <h2 className="text-lg font-bold text-slate-800">Live Operations Feed</h2>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <RefreshButton onClick={refresh} loading={refreshing || fetchingLeads} />
                    <input 
                      type="text" 
                      placeholder="Search all leads (ID, name, phone...)" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white border border-slate-200/70 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-mint-400 text-slate-800 placeholder-slate-500 w-48"
                    />
                    <span className="bg-mint-100 border border-mint-300/40 text-mint-600 py-1.5 px-4 rounded-full text-xs font-bold tracking-wider hidden sm:block">
                      {countActiveOperationalLeads(leads)} ACTIVE
                    </span>
                  </div>
                </div>

                {/* Status Filter Row */}
                <div className="px-4 lg:px-8 py-3 bg-white/[0.01] border-b border-slate-200/60 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-1 crm-tabs rounded-xl max-w-full">
                    {([
                      { id: 'new', label: 'Unassigned', count: feedTabCounts.new },
                      { id: 'assigned', label: 'Assigned Tasks', count: feedTabCounts.assigned },
                      { id: 'inprogress', label: 'In Progress', count: feedTabCounts.inprogress },
                      { id: 'pending', label: 'Pending Approval', count: feedTabCounts.pending },
                      { id: 'voice', label: 'Voice Notes', count: feedTabCounts.voice },
                      { id: 'completed', label: 'Completed', count: feedTabCounts.completed },
                      { id: 'cancelled', label: 'Cancelled', count: feedTabCounts.cancelled },
                      { id: 'delay', label: 'Delayed', count: feedTabCounts.delay },
                      { id: 'deleted', label: 'Bin / Deleted', count: feedTabCounts.deleted },
                      { id: 'all', label: 'All History', count: feedTabCounts.all },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${statusFilter === tab.id ? 'crm-tab-active shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                      >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider pl-2 ${isGlobalSearch ? 'text-amber-600' : 'text-slate-500'}`}>
                    {isGlobalSearch
                      ? `Search: ${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''} (all sections)`
                      : statusFilter === 'assigned'
                      ? `${filteredLeads.length} assigned task${filteredLeads.length !== 1 ? 's' : ''}${technicianFilter !== 'all' ? ` · ${technicians.find((t) => t.id === technicianFilter)?.name}` : ''}${teamFilter !== 'all' ? ` · ${teams.find((t) => t.id === teamFilter)?.name}` : ''}`
                      : technicianFilter !== 'all'
                      ? `${filteredLeads.length} job${filteredLeads.length !== 1 ? 's' : ''} for ${technicians.find((t) => t.id === technicianFilter)?.name || 'technician'}`
                      : `Showing ${filteredLeads.length} leads`}
                  </span>
                </div>

                {showTechFilter && (
                  <TechnicianWorkloadFilter
                    technicians={technicians}
                    leads={leads}
                    teams={teams}
                    technicianFilter={technicianFilter}
                    teamFilter={teamFilter}
                    onTechnicianFilter={setTechnicianFilter}
                    onTeamFilter={setTeamFilter}
                    statusFilter={statusFilter}
                  />
                )}

                <div className="p-2">
                  {fetchingLeads ? (
                    <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-mint-500" size={40} /></div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center text-slate-500 py-12">
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 bg-slate-800/50 rounded-full mb-6 border border-slate-200/60">
                        <ClipboardList size={48} className="text-slate-600" />
                      </motion.div>
                      <p className="text-xl font-medium text-slate-400">No leads found</p>
                      <p className="text-sm mt-2 text-slate-600">
                        {isGlobalSearch ? 'No lead matches your search across all sections.' : 'Awaiting new dispatches or check active filters.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 p-4">
                      <AnimatePresence>
                        {statusFilter === 'pending' ? (
                          filteredLeads.length === 0 ? null : (
                            <div className="space-y-4">
                              {filteredLeads.map((lead) => (
                                <PendingApprovalCard key={lead.id} lead={lead} canApprove onApproved={fetchLeads} />
                              ))}
                            </div>
                          )
                        ) : statusFilter === 'voice' ? (
                          filteredLeads.length === 0 ? null : (
                            <div className="space-y-4">
                              {filteredLeads.map((lead) => (
                                <div key={lead.id} className="crm-card border border-violet-200 rounded-2xl p-5 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <CopyText value={lead.lead_id} label="Lead ID" className="font-mono font-bold text-violet-700" />
                                    <span className="text-xs font-bold text-slate-600">{lead.customer?.name} · {formatProductTypesDisplay(lead.product_type, lead)}</span>
                                  </div>
                                  <VoiceNotePlayer src={lead.voice_note!} title={`Recording — ${lead.lead_id}`} />
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => setViewLead(lead)} className="text-xs font-bold text-indigo-700 hover:underline">View full details</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : filteredLeads.map((lead, idx) => {
                          const isAssigned = lead.status === 'Assigned';
                          const isDeleted = lead.status === 'Deleted';
                          return (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                              key={lead.id} 
                              className={`group border rounded-2xl p-4 lg:p-5 grid grid-cols-1 xl:grid-cols-[auto_auto_1fr_1fr_auto] gap-4 xl:gap-5 items-start xl:items-center transition-all duration-300 max-w-full ${
                                isAssigned 
                                  ? 'bg-blue-950/20 border-blue-500/25 hover:border-blue-500/40 shadow-lg shadow-blue-500/[0.02]' 
                                  : isDeleted
                                  ? 'bg-red-950/10 border-red-500/10 opacity-70'
                                  : 'bg-white/90 border-slate-200/60 hover:border-mint-300/60'
                              }`}
                            >
                              {/* ID Block */}
                              <div className="shrink-0 flex flex-col items-center justify-center crm-modal border rounded-xl p-3 min-w-[100px]">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Lead ID</span>
                                <CopyText value={lead.lead_id} label="Lead ID" className="font-mono text-xs font-bold text-mint-600" />
                              </div>

                              {/* Image Thumbnail with hover + click zoom */}
                              <div className="shrink-0">
                                <LeadImageThumb
                                  src={(() => {
                                    const pics = lead.item_pictures
                                      ? (Array.isArray(lead.item_pictures) ? lead.item_pictures : (() => { try { return JSON.parse(lead.item_pictures); } catch { return []; } })())
                                      : [];
                                    return pics[0] || lead.house_image || null;
                                  })()}
                                  className="w-28 h-28"
                                  onZoom={setZoomImg}
                                />
                              </div>

                              {/* Customer Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-base font-bold text-slate-800 truncate">{lead.customer.name}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                                  <span className="flex items-center gap-1"><MapPin size={11} className="text-emerald-600" /> {lead.customer.area}</span>
                                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                  <CopyText value={lead.customer.phone} label="Phone" className="font-mono text-slate-700" />
                                </div>
                                {lead.technician && (
                                  <div className="inline-flex items-center gap-2 mt-2 bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-black">
                                    <Wrench size={12} className="text-blue-600 shrink-0" />
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
                                    Assigned: {lead.technician.name}
                                  </div>
                                )}
                              </div>

                              {/* Product & Issue */}
                              <div className="flex-1 hidden xl:block min-w-0">
                                <div className="inline-flex flex-wrap items-center gap-1.5 mb-1">
                                  {parseProductTypes(lead.product_type).length > 0
                                    ? getLeadProducts(lead).map((p) => (
                                      <span key={p} className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-800 border border-slate-200">{p}</span>
                                    ))
                                    : <span className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-800 border border-slate-200">{lead.product_type}</span>}
                                </div>
                                <p className="text-xs text-slate-500 truncate pr-4">{lead.problem_details || 'Standard inspection required.'}</p>
                                {hasVoiceNote(lead) && (
                                  <div className="mt-2">
                                    <VoiceNotePlayer src={lead.voice_note!} title="Pickup / Service Recording" compact />
                                  </div>
                                )}
                              </div>

                              {/* Status & Actions */}
                              <div className="shrink-0 flex flex-col items-stretch xl:items-end gap-2 w-full xl:w-[170px] min-w-0">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider shadow-sm border text-center w-full uppercase
                                  ${lead.status === 'New' 
                                    ? 'bg-mint-100 text-mint-600 border-mint-300/40' 
                                    : lead.status === 'Assigned'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : lead.status === 'Deleted'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-mint-100 text-mint-600 border-mint-300/40'}
                                `}>
                                  {lead.status === 'New' ? '● NEW LEAD' : `● ${lead.status}`}
                                </span>

                                {/* Quick Contact Buttons (Always shown as requested) */}
                                <div className="flex w-full gap-1">
                                  <a href={`tel:${lead.customer.phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-1.5 rounded flex justify-center items-center transition-colors text-xs font-bold" title="Call">
                                    Call
                                  </a>
                                  <a href={`https://wa.me/${lead.customer.phone.replace(/[^0-9]/g, '')}`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="flex-1 bg-mint-100 hover:bg-emerald-500/20 text-mint-600 border border-mint-300/40 py-1.5 rounded flex justify-center items-center transition-colors text-xs font-bold" title="WhatsApp">
                                    WA
                                  </a>
                                  {lead.customer.google_map_link && (
                                    <a href={lead.customer.google_map_link} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 py-1.5 rounded flex justify-center items-center transition-colors text-xs font-bold" title="Location">
                                      Map
                                    </a>
                                  )}
                                </div>

                                {!isDeleted && (
                                  <LeadPdfButtons lead={lead} compact className="w-full justify-end" />
                                )}

                                <div className="flex flex-wrap w-full gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewLead(lead)}
                                    className="flex-1 min-w-[4.5rem] bg-indigo-500/15 hover:bg-indigo-500/30 text-mint-600 text-[10px] font-bold py-1.5 rounded border border-mint-300/40 transition-all flex items-center justify-center gap-1"
                                  >
                                    <Eye size={12} /> View
                                  </button>
                                  {lead.status === 'New' || lead.status === 'Complaint' ? (
                                    <button 
                                      onClick={() => openAssignModal(lead)}
                                      className="flex-1 min-w-[4.5rem] bg-indigo-500/15 hover:bg-indigo-500/30 text-mint-600 text-xs font-bold py-1.5 rounded border border-mint-300/40 transition-all"
                                    >
                                      Assign
                                    </button>
                                  ) : !isDeleted && lead.status !== 'Cancelled' && (
                                    <>
                                      <button 
                                        onClick={() => openAssignModal(lead)}
                                        className="flex-1 min-w-[4.5rem] bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 rounded border border-slate-200 transition-all"
                                      >
                                        Reassign
                                      </button>
                                      {['Assigned', 'InProgress'].includes(lead.status) && (
                                        <button
                                          onClick={(e) => handleUnassign(lead, e)}
                                          className="flex-1 min-w-[4.5rem] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 text-[10px] font-bold py-1.5 rounded border border-amber-500/20 transition-all flex items-center justify-center gap-0.5"
                                          title="Unassign"
                                        >
                                          <UserMinus size={12} /> Unassign
                                        </button>
                                      )}
                                    </>
                                  )}

                                  {isCancellableLead(lead) && (
                                    <button
                                      onClick={() => handleCancelLead(lead)}
                                      className="flex-1 min-w-[4.5rem] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-bold py-1.5 rounded border border-rose-500/20 transition-all"
                                    >
                                      Cancel
                                    </button>
                                  )}

                                  {isCompletedLead(lead) && (
                                    <>
                                      <button
                                        onClick={() => handleReopenComplaint(lead)}
                                        className="flex-1 min-w-[4.5rem] bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-[10px] font-bold py-1.5 rounded border border-rose-300/40 transition-all flex items-center justify-center gap-0.5"
                                      >
                                        <RotateCcw size={11} /> Reopen
                                      </button>
                                      <button
                                        onClick={() => startRepeatService(lead)}
                                        className="flex-1 min-w-[4.5rem] bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 text-[10px] font-bold py-1.5 rounded border border-teal-400/30 transition-all"
                                      >
                                        New Task
                                      </button>
                                    </>
                                  )}

                                  <button 
                                    onClick={() => openEditModal(lead)}
                                    className="flex-1 min-w-[4.5rem] bg-slate-50 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 text-[10px] font-bold py-1.5 rounded border border-slate-200/60 hover:border-orange-500/30 transition-all"
                                  >
                                    Edit
                                  </button>

                                  {(lead.status === 'New' || lead.status === 'Complaint') && (
                                    <button 
                                      onClick={() => handleDelete(lead.id, lead.status)}
                                      className="flex-1 min-w-[4.5rem] bg-slate-50 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold py-1.5 rounded border border-slate-200/60 hover:border-red-500/30 transition-all"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="crm-modal border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/80">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="text-mint-600" />
                  Dispatch Assignment
                </h3>
                <button onClick={() => setAssignModal({ isOpen: false, lead: null })} className="text-slate-400 hover:text-slate-800 transition-colors bg-slate-50 hover:bg-mint-50 p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssign} className="p-6 space-y-6">
                
                {/* Lead Summary inside Modal */}
                <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Lead</span>
                    <span className="font-mono text-sm font-bold text-mint-600">{assignModal.lead.lead_id}</span>
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
                      className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200 outline-none transition-all duration-300 appearance-none"
                    >
                      <option value="" disabled>-- Choose a Technician --</option>
                      {technicians.map(t => {
                        const activeJobs = t.assigned_jobs?.length ?? countActiveJobsForTechnician(t.id, leads);
                        return (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.specialization ? `[${t.specialization}]` : ''} — {activeJobs} active job{activeJobs !== 1 ? 's' : ''}
                        </option>
                      );})}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Calendar size={14} className="text-mint-600"/> Scheduled Visit
                    </label>
                    <input 
                      type="datetime-local" 
                      required
                      value={assignForm.visit_date}
                      onChange={(e) => setAssignForm({...assignForm, visit_date: e.target.value})}
                      className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200 outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setAssignModal({ isOpen: false, lead: null })} className="flex-1 crm-btn-ghost font-medium py-3 px-4 rounded-xl transition-colors border border-slate-200/60">
                    Cancel
                  </button>
                  <button type="submit" disabled={assigning} className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-lg shadow-mint-300/25 transition-all flex justify-center items-center gap-2 border border-indigo-400/20 disabled:opacity-50">
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 crm-modal-overlay backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="crm-modal border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/80 shrink-0">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="text-orange-400" size={18} />
                  Edit Lead: {editModal.lead.lead_id}
                </h3>
                <button type="button" onClick={() => setEditModal({ isOpen: false, lead: null })} className="text-slate-400 hover:text-slate-800 transition-colors bg-slate-50 hover:bg-mint-50 p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label>
                    <input required type="text" value={editForm.customer_name} onChange={e => setEditForm({...editForm, customer_name: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200/70 focus:border-mint-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                    <input required type="tel" value={editForm.customer_phone} onChange={e => setEditForm({...editForm, customer_phone: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200/70 focus:border-mint-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Area</label>
                    <input
                      required
                      type="text"
                      list="edit-area-options"
                      value={editForm.customer_area}
                      onChange={e => setEditForm({...editForm, customer_area: e.target.value})}
                      className="w-full crm-input text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200/70 focus:border-mint-400 outline-none"
                      placeholder="Type to search area..."
                    />
                    <datalist id="edit-area-options">
                      {areas.map(area => <option key={area.id} value={area.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Google Map Link</label>
                    <input
                      type="url"
                      value={editForm.google_map_link}
                      onChange={async (e) => {
                        const link = e.target.value;
                        setEditForm((prev) => ({ ...prev, google_map_link: link }));
                        await applyMapLinkToForm(link, setEditForm, setEditLocationPreview);
                      }}
                      className="w-full crm-input text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200/70 focus:border-mint-400 outline-none"
                      placeholder="Paste Google Maps link for exact location"
                    />
                    {editLocationPreview && <p className="text-[10px] text-mint-600 font-bold mt-1">{editLocationPreview}</p>}
                  </div>
                  
                  {/* Current Image Previews */}
                  {(editForm.house_image || editForm.item_pictures.length > 0) && (
                    <div className="bg-white border border-slate-200/60 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Current Images</p>
                      <div className="flex flex-wrap gap-2">
                        {editForm.house_image && (
                          <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200/70 cursor-pointer">
                            <img src={editForm.house_image} alt="house" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-all">
                              <span className="text-[8px] text-slate-800 font-bold">House</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditForm({...editForm, house_image: ''})}
                              className="absolute top-1 right-1 bg-rose-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black opacity-0 group-hover:opacity-100 transition-all"
                            >✕</button>
                          </div>
                        )}
                        {editForm.item_pictures.map((pic, idx) => (
                          <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200/70 cursor-pointer">
                            <img src={pic} alt={`item-${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-all">
                              <span className="text-[8px] text-slate-800 font-bold">#{idx + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditForm({...editForm, item_pictures: editForm.item_pictures.filter((_, i) => i !== idx)})}
                              className="absolute top-1 right-1 bg-rose-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black opacity-0 group-hover:opacity-100 transition-all"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photo Edit Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 pl-1">House Picture</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="w-full bg-white text-slate-400 text-xs px-4 py-2.5 rounded-xl border border-slate-200/70 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/20 file:text-mint-600 hover:file:bg-indigo-500/30 transition-all cursor-pointer" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditForm({...editForm, house_image: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {editForm.house_image && (
                        <p className="text-[10px] text-mint-600 font-bold pl-1 mt-1">✓ House Image Loaded</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 pl-1">Appliance/Washing Machine Pictures</label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        className="w-full bg-white text-slate-400 text-xs px-4 py-2.5 rounded-xl border border-slate-200/70 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/20 file:text-mint-600 hover:file:bg-indigo-500/30 transition-all cursor-pointer" 
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
                          setEditForm({...editForm, item_pictures: results as string[]});
                        }}
                      />
                      {editForm.item_pictures.length > 0 && (
                        <p className="text-[10px] text-mint-600 font-bold pl-1 mt-1">✓ {editForm.item_pictures.length} Pictures Loaded</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Appliances / Products</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editForm.products.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
                          {p}
                          <button type="button" onClick={() => setEditForm((prev) => ({ ...prev, products: prev.products.filter((x) => x !== p) }))} className="text-indigo-500 hover:text-rose-600"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select value={editProductPicker} onChange={(e) => setEditProductPicker(e.target.value)} className="flex-1 crm-input text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200/70 text-sm">
                        <option value="">Add appliance...</option>
                        {APPLIANCE_OPTIONS.filter((o) => !editForm.products.includes(o)).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        if (!editProductPicker || editForm.products.includes(editProductPicker)) return;
                        setEditForm((prev) => ({ ...prev, products: [...prev.products, editProductPicker] }));
                        setEditProductPicker('');
                      }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Add</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Problem Details</label>
                    <textarea rows={3} value={editForm.problem_details} onChange={e => setEditForm({...editForm, problem_details: e.target.value})} className="w-full crm-input text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200/70 focus:border-mint-400 outline-none resize-none" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditModal({ isOpen: false, lead: null })} className="flex-1 crm-btn-ghost font-medium py-3 px-4 rounded-xl transition-colors border border-slate-200/60">
                    Cancel
                  </button>
                  <button type="submit" disabled={editing} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2 border border-orange-400/20 disabled:opacity-50">
                    {editing ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewLead && <LeadHistoryModal lead={viewLead} onClose={() => setViewLead(null)} />}
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />

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
