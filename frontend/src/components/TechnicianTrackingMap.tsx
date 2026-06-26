import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, MapPin, Navigation } from 'lucide-react';
import api from '../services/api';
import JobMap from './JobMap';
import RefreshButton from './RefreshButton';
import { useLiveData } from '../hooks/useLiveData';
import { useMergedTechnicians } from '../hooks/useLiveTechnicians';
import { isTechnicianLive } from '../services/liveTechnicianStore';

interface TechnicianTrackingMapProps {
  height?: string;
  showOnlyUnassigned?: boolean;
  title?: string;
  leads?: any[];
  technicians?: any[];
  onAssign?: (lead: any) => void;
  onUnassign?: (lead: any) => void;
  onCancel?: (lead: any) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  locationKey?: string;
  selectedTechnicianId?: number | 'all';
  onSelectTechnician?: (id: number | 'all') => void;
  compact?: boolean;
}

const TechnicianTrackingMap: React.FC<TechnicianTrackingMapProps> = ({
  height = '420px',
  showOnlyUnassigned = false,
  title = 'Live Technician Tracking',
  leads: externalLeads,
  technicians: externalTechnicians,
  onAssign,
  onUnassign,
  onCancel,
  onRefresh,
  refreshing: externalRefreshing,
  locationKey,
  selectedTechnicianId = 'all',
  onSelectTechnician,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(!externalLeads);

  const controlled = externalLeads != null && externalTechnicians != null;
  const displayLeads = controlled ? externalLeads : leads;
  const apiTechs = controlled ? externalTechnicians : technicians;
  const displayTechs = useMergedTechnicians(apiTechs);

  const fetchData = async (opts?: { silent?: boolean }) => {
    if (controlled) return;
    if (!opts?.silent) setLoading(true);
    try {
      const [leadsRes, techRes] = await Promise.all([
        api.get('/leads'),
        api.get('/users/technicians'),
      ]);
      setLeads(leadsRes.data.leads || []);
      setTechnicians(techRes.data.technicians || []);
    } catch {
      /* keep last */
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(
    controlled ? [] : ['leads', 'users', 'all'],
    () => fetchData({ silent: true })
  );

  useEffect(() => {
    if (controlled) return;
    fetchData();
  }, [controlled]);

  const liveCount = displayTechs.filter((t) => isTechnicianLive(t)).length;
  const locatedCount = displayTechs.filter((t) => t.lat != null && t.lng != null).length;
  const unassigned = displayLeads.filter((l) => l.status === 'New' || l.status === 'Complaint');
  const handleRefresh = onRefresh ?? refresh;
  const isRefreshing = externalRefreshing ?? refreshing;

  const handleTechClick = useCallback(
    (techId: number) => {
      if (!onSelectTechnician) return;
      onSelectTechnician(selectedTechnicianId === techId ? 'all' : techId);
    },
    [onSelectTechnician, selectedTechnicianId]
  );

  return (
    <div className={`crm-card border overflow-hidden shadow-2xl shrink-0 ${compact ? 'rounded-2xl' : 'rounded-[2rem]'}`}>
      <div className={`border-b border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 ${compact ? 'p-3' : 'p-5 lg:p-6 gap-4'}`}>
        <div className="min-w-0">
          <h3 className={`font-black text-slate-900 flex items-center gap-2 ${compact ? 'text-sm' : 'text-lg'}`}>
            <Radio size={compact ? 16 : 20} className="text-emerald-600 animate-pulse shrink-0" />
            {title}
          </h3>
          {!compact && (
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Live GPS tracking — {liveCount} online now · {locatedCount} on map
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300/60 px-2 py-1 rounded-lg flex items-center gap-1">
            <Navigation size={11} className="animate-pulse" /> {liveCount} Live
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300/60 px-2 py-1 rounded-lg flex items-center gap-1">
            <MapPin size={11} /> {unassigned.length}
          </span>
          <RefreshButton onClick={handleRefresh} loading={isRefreshing} />
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-1 rounded-lg transition-all"
          >
            Full Map
          </button>
        </div>
      </div>
      <div style={{ height }} className="relative">
        {loading && !controlled ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}
        <JobMap
          leads={displayLeads}
          technicians={displayTechs}
          onAssign={onAssign}
          onUnassign={onUnassign}
          onCancel={onCancel}
          showOnlyUnassigned={showOnlyUnassigned}
          locationKey={locationKey}
          showStatsBadge={false}
          showFullMapLink={false}
        />
      </div>

      {displayTechs.length > 0 && (
        <div className={`border-t border-slate-200/60 bg-slate-50/80 overflow-x-auto overflow-y-hidden custom-scrollbar ${compact ? 'px-3 py-2' : 'p-4 max-h-44 overflow-y-auto'}`}>
          {!compact && (
            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Users size={12} /> Technician movement — click name to filter assigned tasks
            </p>
          )}
          <div className={`flex gap-2 ${compact ? 'flex-nowrap' : 'flex-wrap'}`}>
            {displayTechs.map((t) => {
              const activeCount = t.assigned_jobs?.length ?? 0;
              const job = t.assigned_jobs?.[0];
              const live = isTechnicianLive(t);
              const hasLocation = t.lat != null && t.lng != null;
              const selected = selectedTechnicianId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTechClick(t.id)}
                  className={`text-left text-[10px] font-bold px-3 py-2 rounded-xl border transition-all ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-300/50'
                      : live
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300/60 hover:border-emerald-400'
                      : hasLocation
                      ? 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${live ? 'bg-emerald-500 animate-pulse' : hasLocation ? 'bg-amber-400' : 'bg-slate-300'}`} />
                    <span className="font-black">{t.name}</span>
                  </span>
                  <span className="block mt-0.5 opacity-90">
                    {activeCount} task{activeCount !== 1 ? 's' : ''}
                    {live ? ' · LIVE' : hasLocation ? ' · last known' : ' · no GPS'}
                    {job ? ` → ${job.lead_id}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianTrackingMap;
