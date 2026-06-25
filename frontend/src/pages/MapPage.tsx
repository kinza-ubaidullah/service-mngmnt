import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { ArrowLeft, Filter, MapPin, Wrench, X, Loader2, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import JobMap from '../components/JobMap';
import RefreshButton from '../components/RefreshButton';
import CopyText from '../components/CopyText';
import { useLiveData } from '../hooks/useLiveData';
import { useMergedTechnicians } from '../hooks/useLiveTechnicians';
import { matchesLeadSearch, isMapVisibleForFilter, type MapViewFilter } from '../utils/leadHelpers';

type StatusFilter = 'all' | 'new' | 'assigned' | 'workshop';

const MapPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const canAssign = user?.role === 'ADMIN' || user?.role === 'CALL_CENTER';

  const [leads, setLeads] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [technicianFilter, setTechnicianFilter] = useState<number | 'all'>('all');
  const [mapSearch, setMapSearch] = useState('');
  const [assignModal, setAssignModal] = useState<{ open: boolean; lead: any | null }>({ open: false, lead: null });
  const [assignForm, setAssignForm] = useState({ technician_id: '', visit_date: '' });
  const [assigning, setAssigning] = useState(false);

  const mergedTechnicians = useMergedTechnicians(technicians);

  const fetchData = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [leadsRes, techRes] = await Promise.all([
        api.get('/leads'),
        api.get('/users/technicians'),
      ]);
      setLeads(leadsRes.data.leads || []);
      setTechnicians(techRes.data.technicians || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['leads', 'all'], () => fetchData({ silent: true }));

  useEffect(() => {
    fetchData();
  }, []);

  const mapMode: MapViewFilter = filter === 'workshop' ? 'workshop' : 'operational';

  const filteredByStatus = useMemo(() => leads.filter((l) => {
    if (!isMapVisibleForFilter(l, mapMode)) return false;
    if (filter === 'new') return l.status === 'New' || l.status === 'Complaint';
    if (filter === 'assigned') return ['Assigned', 'InProgress', 'Reopened'].includes(l.status);
    return true;
  }), [leads, filter, mapMode]);

  const visibleLeads = useMemo(() => {
    let list = filteredByStatus;
    if (technicianFilter !== 'all') {
      list = list.filter((l) => l.technician?.id === technicianFilter);
    }
    if (!mapSearch.trim()) return list;
    return list.filter((l) => matchesLeadSearch(l, mapSearch));
  }, [filteredByStatus, mapSearch, technicianFilter]);

  const counts = {
    new: leads.filter((l) => l.status === 'New' || l.status === 'Complaint').length,
    assigned: leads.filter((l) => ['Assigned', 'InProgress', 'Reopened'].includes(l.status)).length,
    workshop: leads.filter((l) => isMapVisibleForFilter(l, 'workshop')).length,
    techs: mergedTechnicians.filter((t) => t.lat != null && t.lng != null).length,
  };

  const openAssignModal = (lead: any) => {
    if (!canAssign) {
      toast.error('Only Admin or Call Center can assign leads');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setAssignForm({ technician_id: lead.technician?.id ? String(lead.technician.id) : '', visit_date: tomorrow.toISOString().slice(0, 16) });
    setAssignModal({ open: true, lead });
  };

  const handleCancel = async (lead: any) => {
    if (!canAssign) return;
    if (!window.confirm(`Mark lead ${lead.lead_id} as Cancelled? It will be removed from the map.`)) return;
    try {
      await api.patch(`/leads/${lead.id}/cancel`);
      toast.success('Lead cancelled');
      fetchData({ silent: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel lead');
    }
  };

  const handleUnassign = async (lead: any) => {
    if (!canAssign) return;
    if (!window.confirm(`Unassign ${lead.lead_id}?`)) return;
    try {
      await api.patch(`/leads/${lead.id}/unassign`);
      toast.success('Lead unassigned');
      fetchData({ silent: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unassign');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.lead) return;
    setAssigning(true);
    try {
      await api.patch(`/leads/${assignModal.lead.id}/assign`, assignForm);
      toast.success(assignModal.lead.status === 'New' ? 'Lead assigned' : 'Lead reassigned');
      setAssignModal({ open: false, lead: null });
      fetchData({ silent: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#042f2e] flex flex-col w-full h-full overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-teal-950/95 backdrop-blur-md border-b border-teal-700/50 z-10 max-w-full overflow-x-hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-600/50 text-sm font-bold text-teal-100 hover:bg-teal-900 transition-all"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <h1 className="text-teal-50 font-black text-lg tracking-tight">Live Operations Map</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-amber-500/15 border border-amber-400/30 text-amber-200 px-3 py-1 rounded-full text-xs font-black">{counts.new} Unassigned</span>
          <span className="bg-sky-500/15 border border-sky-400/30 text-sky-100 px-3 py-1 rounded-full text-xs font-black">{counts.assigned} Active</span>
          <span className="bg-orange-500/15 border border-orange-400/30 text-orange-200 px-3 py-1 rounded-full text-xs font-black">{counts.workshop} Workshop</span>
        </div>

        <div className="relative flex-1 min-w-[140px] max-w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400" />
          <input
            type="text"
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            placeholder="Search by lead ID or phone..."
            className="w-full bg-teal-900/80 border border-teal-600/50 rounded-xl py-2 pl-9 pr-3 text-xs text-teal-50 placeholder-teal-400/70 outline-none focus:border-amber-400/60"
          />
        </div>

        <div className="flex items-center gap-2 bg-teal-900/80 px-2 py-1 rounded-xl border border-teal-600/40">
          <User size={14} className="text-teal-400" />
          <select
            value={technicianFilter === 'all' ? 'all' : String(technicianFilter)}
            onChange={(e) => setTechnicianFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-transparent text-teal-100 text-xs font-bold outline-none max-w-[140px]"
          >
            <option value="all" className="text-slate-900">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id} className="text-slate-900">{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 bg-teal-900/80 p-1 rounded-xl border border-teal-600/40 flex-wrap">
          <Filter size={14} className="text-teal-400 ml-2" />
          {([
            ['all', 'Active'],
            ['new', 'Unassigned'],
            ['assigned', 'Assigned'],
            ['workshop', 'Workshop'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filter === id ? 'bg-amber-500 text-teal-950 shadow-sm' : 'text-teal-300 hover:text-teal-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <RefreshButton onClick={refresh} loading={refreshing || loading} />
      </div>

      {mapSearch.trim() && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-500/10 border-b border-amber-400/20 text-xs text-amber-200 font-bold">
          {visibleLeads.length} lead{visibleLeads.length !== 1 ? 's' : ''} match &ldquo;{mapSearch.trim()}&rdquo;
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-teal-950 z-10">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <JobMap
            leads={visibleLeads}
            technicians={mergedTechnicians}
            onAssign={canAssign ? openAssignModal : undefined}
            onUnassign={canAssign ? handleUnassign : undefined}
            onCancel={canAssign ? handleCancel : undefined}
            showFullMapLink={false}
            showLegend={false}
            showStatsBadge={false}
          />
        )}

        <div className="absolute bottom-6 left-6 bg-teal-900/95 backdrop-blur-md p-4 rounded-2xl border border-teal-600/50 z-[1000] space-y-2 shadow-2xl pointer-events-none">
          <p className="text-[9px] font-black text-teal-300 uppercase tracking-widest">Legend · Hover pin for info</p>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-[9px] font-bold text-amber-200">UNASSIGNED</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-[9px] font-bold text-sky-200">ASSIGNED</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-[9px] font-bold text-orange-200">WORKSHOP</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[9px] font-bold text-emerald-200">TECH LIVE</span></div>
          {canAssign && <p className="text-[9px] text-teal-300 pt-1 border-t border-teal-700/50">Click pin → Assign / Reassign / Cancel</p>}
        </div>
      </div>

      {assignModal.open && assignModal.lead && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-teal-950 to-teal-900 border border-teal-600/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-teal-700/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-teal-50 flex items-center gap-2">
                <Wrench className="text-amber-300" size={20} />
                {assignModal.lead.status === 'New' ? 'Assign Lead' : 'Reassign Lead'}
              </h3>
              <button onClick={() => setAssignModal({ open: false, lead: null })} className="text-teal-400 hover:text-teal-100 p-1.5 rounded-lg bg-teal-900/80">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div className="bg-teal-950/60 border border-teal-700/50 rounded-xl p-4 text-sm">
                <CopyText value={assignModal.lead.lead_id} label="Lead ID" className="font-mono text-amber-200 font-bold block" />
                <div className="text-teal-100 mt-1">{assignModal.lead.customer?.name}</div>
                {assignModal.lead.customer?.phone && (
                  <CopyText value={assignModal.lead.customer.phone} label="Phone" className="text-xs text-cyan-200 font-mono mt-1 block" />
                )}
                <div className="text-xs text-teal-300 flex items-center gap-1 mt-1"><MapPin size={12} /> {assignModal.lead.customer?.area}</div>
              </div>
              <div>
                <label className="block text-sm text-teal-200 mb-2">Technician</label>
                <select
                  required
                  value={assignForm.technician_id}
                  onChange={(e) => setAssignForm({ ...assignForm, technician_id: e.target.value })}
                  className="w-full bg-teal-950 text-teal-50 px-4 py-3 rounded-xl border border-teal-600/50 outline-none focus:border-amber-400/60"
                >
                  <option value="">Select technician</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-teal-200 mb-2">Visit date</label>
                <input
                  type="datetime-local"
                  required
                  value={assignForm.visit_date}
                  onChange={(e) => setAssignForm({ ...assignForm, visit_date: e.target.value })}
                  className="w-full bg-teal-950 text-teal-50 px-4 py-3 rounded-xl border border-teal-600/50 outline-none focus:border-amber-400/60"
                />
              </div>
              <button
                type="submit"
                disabled={assigning}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-teal-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {assigning ? <Loader2 className="animate-spin" size={18} /> : assignModal.lead.status === 'New' ? 'Assign Lead' : 'Reassign Lead'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
