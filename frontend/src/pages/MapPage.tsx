import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, User, MapPin, Wrench, ClipboardList, ExternalLink, Filter } from 'lucide-react';
import api from '../services/api';
import { socket } from '../services/socket';
import { DEFAULT_MAP_CENTER, getLeadCoords, openLeadInGoogleMaps } from '../utils/leadLocation';
import RefreshButton from '../components/RefreshButton';
import { useLiveData } from '../hooks/useLiveData';
import { getLeadMapIcon, techIcon } from '../utils/mapIcons';

const getPics = (lead: any): string[] => {
  if (!lead.item_pictures) return [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  try { return JSON.parse(lead.item_pictures); } catch { return []; }
};

// ─── Map auto-fit component ───────────────────────────────────────────────────
const MapAutoFit: React.FC<{ leads: any[]; technicians: any[] }> = ({ leads, technicians }) => {
  const map = useMap();
  const lastKey = useRef('');
  useEffect(() => {
    const points: [number, number][] = leads.map((l) => getLeadCoords(l));
    technicians.forEach((t) => {
      if (t.lat != null && t.lng != null) points.push([Number(t.lat), Number(t.lng)]);
    });
    const key = points.map((p) => p.join(',')).join('|');
    if (key === lastKey.current || points.length === 0) return;
    lastKey.current = key;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points as L.LatLngBoundsLiteral, { padding: [50, 50], maxZoom: 16 });
    }
  }, [leads, technicians, map]);
  return null;
};

// ─── Page ────────────────────────────────────────────────────────────────────
const MapPage = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'assigned' | 'completed'>('all');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fetchData = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [leadsRes, techRes] = await Promise.all([
        api.get('/leads'),
        api.get('/users/technicians'),
      ]);
      setLeads(leadsRes.data.leads || []);
      setTechnicians(techRes.data.technicians || []);
    } catch (e) { console.error(e); }
    finally { if (!opts?.silent) setLoading(false); }
  };

  const { refresh, refreshing } = useLiveData(['leads', 'all'], () => fetchData({ silent: true }));

  useEffect(() => {
    fetchData();
    socket.connect();
    socket.emit('join_room', 'operations');
    socket.on('tech_location_changed', (data: { techId: number; lat: number; lng: number }) => {
      setTechnicians(prev => prev.map(t => t.id === Number(data.techId) ? { ...t, lat: Number(data.lat), lng: Number(data.lng) } : t));
    });
    return () => { socket.off('tech_location_changed'); };
  }, []);

  const visibleLeads = leads.filter(l => {
    if (l.status === 'Deleted') return false;
    if (filter === 'new') return l.status === 'New';
    if (filter === 'assigned') return l.status === 'Assigned' || l.status === 'InProgress';
    if (filter === 'completed') return l.status === 'Completed' || l.status === 'PendingApproval';
    return true;
  });

  const counts = {
    new: leads.filter(l => l.status === 'New').length,
    assigned: leads.filter(l => l.status === 'Assigned' || l.status === 'InProgress').length,
    completed: leads.filter(l => l.status === 'Completed').length,
    techs: technicians.filter(t => t.lat && t.lng).length,
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, zIndex: 50, background: '#020617', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Top Bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur-md border-b border-white/10 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 text-sm font-bold transition-all hover:scale-105"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2 ml-2">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          <h1 className="text-white font-black text-lg tracking-tight">Live Operations Map</h1>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 ml-4">
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-black">{counts.new} Unassigned</span>
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-black">{counts.assigned} Active</span>
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-black">{counts.completed} Done</span>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black">{counts.techs} Techs Live</span>
        </div>

        {/* Filter */}
        <div className="ml-auto flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-white/5">
          <Filter size={14} className="text-slate-500 ml-2" />
          {([['all', 'All'], ['new', 'Unassigned'], ['assigned', 'Active'], ['completed', 'Completed']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === id ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <RefreshButton onClick={refresh} loading={refreshing || loading} />
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4 text-white">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-sm animate-pulse">Loading map data...</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={DEFAULT_MAP_CENTER}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapAutoFit leads={visibleLeads} technicians={technicians} />
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            />

            {/* Lead Markers */}
            {visibleLeads.map(lead => {
              const pos = getLeadCoords(lead);
              const pics = getPics(lead);
              const thumb = pics[0] || lead.house_image || null;
              const isNew = lead.status === 'New';
              return (
                <Marker key={`lead-${lead.id}`} position={pos} icon={getLeadMapIcon(lead.status)} zIndexOffset={lead.status === 'New' ? 1000 : 0}>
                  <Popup className="map-page-popup">
                    <div className="p-4 w-[300px] bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                          isNew ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : lead.status === 'Completed' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>● {isNew ? 'Unassigned' : lead.status}</span>
                        <span className="font-mono text-[10px] font-bold text-slate-500">{lead.lead_id}</span>
                      </div>

                      {thumb && (
                        <div className="relative w-full h-32 overflow-hidden rounded-xl bg-slate-950 border border-white/5 cursor-zoom-in group" onClick={() => setZoomedImage(thumb)}>
                          <img src={thumb} alt="appliance" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          {pics.length > 1 && <div className="absolute top-2 right-2 bg-slate-950/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10">+{pics.length - 1}</div>}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded-lg">Click to zoom</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2"><User size={13} className="text-slate-400" /> {lead.customer?.name}</h4>
                        <p className="text-xs text-indigo-400 font-bold flex items-center gap-2"><Wrench size={13} /> {lead.product_type}</p>
                        <p className="text-xs text-slate-300 flex items-start gap-2">
                          <MapPin size={13} className="text-rose-400/80 shrink-0 mt-0.5" />
                          {lead.customer?.area}{lead.exact_address ? ` — ${lead.exact_address}` : ''}
                        </p>
                        {lead.technician && <p className="text-xs text-blue-400 font-bold flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />Tech: {lead.technician.name}</p>}
                        {lead.problem_details && <div className="text-[11px] text-slate-400 bg-white/[0.02] border border-white/5 p-2 rounded-lg italic">"{lead.problem_details}"</div>}
                      </div>

                      <button
                        type="button"
                        onClick={() => openLeadInGoogleMaps(lead)}
                        className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={13} /> Open in Google Maps
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Technician Markers */}
            {technicians.filter(t => t.lat && t.lng).map(tech => (
              <Marker key={`tech-${tech.id}`} position={[Number(tech.lat), Number(tech.lng)]} icon={techIcon}>
                <Popup className="map-page-popup">
                  <div className="p-4 w-[240px] bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-slate-100">{tech.name}</p>
                        <p className="text-[9px] text-indigo-400 font-black tracking-widest uppercase mt-0.5">{tech.specialization || 'General Tech'}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> LIVE
                      </div>
                    </div>
                    {tech.assigned_jobs?.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">Active Jobs ({tech.assigned_jobs.length})</p>
                        {tech.assigned_jobs.slice(0, 3).map((job: any) => (
                          <div key={job.id} className="bg-slate-950/50 rounded-xl p-2.5 border border-white/5">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[9px] font-mono font-bold text-indigo-400">{job.lead_id}</span>
                              <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded">{job.status}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-300">{job.customer?.name}</p>
                            <p className="text-[9px] text-slate-500 truncate">{job.product_type} · {job.customer?.area}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-3 text-center bg-slate-950/30 rounded-xl border border-dashed border-white/5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">No active jobs</p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-slate-950/95 backdrop-blur-md p-4 rounded-2xl border border-white/10 z-[1000] space-y-2.5 shadow-2xl">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Map Legend</p>
          {[
            { color: 'from-amber-400 to-orange-600', glow: 'rgba(245,158,11,0.5)', label: 'UNASSIGNED' },
            { color: 'from-indigo-400 to-blue-600', glow: 'rgba(59,130,246,0.5)', label: 'ASSIGNED / ACTIVE' },
            { color: 'from-emerald-400 to-teal-600', glow: 'rgba(16,185,129,0.5)', label: 'COMPLETED' },
          ].map(({ color, glow, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className={`w-3.5 h-3.5 bg-gradient-to-br ${color} rounded-full border border-white`} style={{ boxShadow: `0 0 8px ${glow}` }} />
              <span className="text-[9px] font-bold text-white tracking-wider">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 border-t border-white/5 pt-2">
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-full animate-pulse" />
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
            </div>
            <span className="text-[9px] font-bold text-emerald-400 tracking-wider">TECHNICIANS (LIVE)</span>
          </div>
        </div>
      </div>

      {/* Image zoom overlay */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            <img src={zoomedImage} alt="zoomed" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
            <button onClick={() => setZoomedImage(null)} className="absolute top-3 right-3 bg-slate-900/90 text-white p-2 rounded-xl border border-white/10">✕</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pin-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        .unassigned-pin { z-index: 1000 !important; }
        .map-page-popup .leaflet-popup-content-wrapper {
          background: #0f172a !important; color: white !important;
          border-radius: 16px; padding: 0 !important; border: 1px solid rgba(255,255,255,0.1);
        }
        .map-page-popup .leaflet-popup-content { margin: 0 !important; padding: 0 !important; }
        .leaflet-popup-tip { background: #0f172a !important; }
      `}</style>
    </div>
  );
};

export default MapPage;
