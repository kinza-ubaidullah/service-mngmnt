import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, MapPin, Wrench, ClipboardList, Maximize2, ExternalLink } from 'lucide-react';
import { DEFAULT_MAP_CENTER, getLeadCoords, openLeadInGoogleMaps } from '../utils/leadLocation';
import { techIcon, getLeadMapIcon } from '../utils/mapIcons';

const getPictures = (lead: any): string[] => {
  if (!lead.item_pictures) return [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  try { return JSON.parse(lead.item_pictures); } catch { return []; }
};

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface JobMapProps {
  leads: any[];
  technicians?: any[];
  onAssign?: (lead: any) => void;
  showOnlyUnassigned?: boolean;
}

// ── Force Leaflet to re-measure when container resizes (fullscreen toggle) ──
const MapResizer: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    // Small delay to let CSS transition finish before measuring
    const t = setTimeout(() => { map.invalidateSize(); }, 350);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
};

const MapAutoFit: React.FC<{ leads: any[]; technicians?: any[] }> = ({ leads, technicians = [] }) => {
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
      map.fitBounds(points as L.LatLngBoundsLiteral, { padding: [40, 40], maxZoom: 16 });
    }
  }, [leads, technicians, map]);
  return null;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const JobMap: React.FC<JobMapProps> = ({ leads, technicians = [], onAssign, showOnlyUnassigned = false }) => {
  const navigate = useNavigate();
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const center: [number, number] = DEFAULT_MAP_CENTER;

  const visibleLeads = leads.filter(l => {
    if (l.status === 'Deleted') return false;
    if (showOnlyUnassigned) return l.status === 'New';
    return true;
  });

  return (
    <>
      {/* Main map container */}
      <div
        style={{ height: '100%', width: '100%', position: 'relative' }}
        className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl"
      >

        {/* ── Full Map button ── */}
        <div className="absolute top-3 left-3 z-[2000] flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="bg-slate-900/95 backdrop-blur-sm hover:bg-slate-800 text-white p-2.5 rounded-xl border border-white/10 shadow-xl transition-all hover:scale-105 flex items-center gap-2 text-xs font-bold"
          >
            <Maximize2 size={15} className="text-indigo-400" />
            <span>Full Map View</span>
          </button>
        </div>

        {/* Unassigned count badge */}
        <div className="absolute top-3 right-3 z-[2000] bg-slate-900/95 backdrop-blur-sm border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xl">
          {leads.filter(l => l.status === 'New').length} Unassigned ·{' '}
          <span className="text-emerald-400">{technicians.filter(t => t.lat && t.lng).length} Techs Online</span>
        </div>

        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Force re-measure on fullscreen toggle */}
          <MapResizer trigger={false} />
          <MapAutoFit leads={visibleLeads} technicians={technicians} />
          {/* Google Maps paid-style tiles */}
          <TileLayer
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />

          {/* ── Lead Markers ── */}
          {visibleLeads.map((lead) => {
            const pos = getLeadCoords(lead);
            const isNew = lead.status === 'New' || lead.status === 'Complaint';
            const pics = getPictures(lead);
            const thumbSrc = pics[0] || lead.house_image || null;

            return (
              <Marker
                key={`lead-${lead.id}`}
                position={pos}
                icon={getLeadMapIcon(lead.status)}
                zIndexOffset={isNew ? 1000 : 0}
                eventHandlers={{ mouseover: (e) => e.target.openPopup() }}
              >
                <Popup className="custom-popup">
                  <div className="p-4 w-[290px] bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        isNew ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}>
                        {isNew ? '● Unassigned' : `● ${lead.status}`}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-500">{lead.lead_id}</span>
                    </div>

                    {/* Appliance image */}
                    {thumbSrc && (
                      <div
                        className="relative w-full h-28 overflow-hidden rounded-xl bg-slate-950 border border-white/5 cursor-zoom-in group"
                        onClick={() => setZoomedImage(thumbSrc)}
                      >
                        <img src={thumbSrc} alt="appliance" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        {pics.length > 1 && (
                          <div className="absolute top-2 right-2 bg-slate-950/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10">
                            +{pics.length - 1} more
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded-lg">Click to zoom</span>
                        </div>
                      </div>
                    )}

                    {/* House image (shown below if different from item_pictures) */}
                    {lead.house_image && !thumbSrc?.startsWith('data:') && lead.house_image !== thumbSrc && (
                      <div
                        className="relative w-full h-20 overflow-hidden rounded-xl bg-slate-950 border border-white/5 cursor-zoom-in group"
                        onClick={() => setZoomedImage(lead.house_image)}
                      >
                        <img src={lead.house_image} alt="house" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute top-1 left-1 bg-slate-950/80 text-slate-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10">House</div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        <User size={13} className="text-slate-400" /> {lead.customer.name}
                      </h4>
                      <p className="text-xs text-indigo-400 font-bold flex items-center gap-2">
                        <Wrench size={13} /> {lead.product_type}
                      </p>
                      <p className="text-xs text-slate-300 flex items-start gap-2">
                        <MapPin size={13} className="text-rose-400/80 shrink-0 mt-0.5" />
                        <span>{lead.customer.area}{lead.exact_address ? ` — ${lead.exact_address}` : ''}</span>
                      </p>
                      {lead.problem_details && (
                        <div className="text-[11px] text-slate-400 bg-white/[0.02] border border-white/5 p-2 rounded-lg italic">
                          "{lead.problem_details}"
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {/* Open full Google Maps window */}
                      <button
                        type="button"
                        onClick={() => openLeadInGoogleMaps(lead)}
                        className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink size={12} /> Open in Maps
                      </button>
                      {isNew && onAssign && (
                        <button
                          type="button"
                          onClick={() => onAssign(lead)}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-[10px] font-black py-2 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5"
                        >
                          <ClipboardList size={12} /> Assign
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ── Technician Markers ── */}
          {technicians.filter(t => t.lat && t.lng).map((tech) => (
            <Marker
              key={`tech-${tech.id}`}
              position={[Number(tech.lat), Number(tech.lng)]}
              icon={techIcon}
              eventHandlers={{ mouseover: (e) => e.target.openPopup() }}
            >
              <Popup className="tech-popup">
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
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">Active Jobs</p>
                      {tech.assigned_jobs.map((job: any) => (
                        <div key={job.id} className="bg-slate-950/50 rounded-xl p-2.5 border border-white/5 space-y-0.5">
                          <div className="flex justify-between items-center">
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

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 z-[1000] space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full border border-white shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="text-[9px] font-bold text-white tracking-wider">UNASSIGNED</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-full border border-white shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[9px] font-bold text-white tracking-wider">ASSIGNED</span>
          </div>
          <div className="flex items-center gap-2.5 border-t border-white/5 pt-2">
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-full animate-pulse" />
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
            </div>
            <span className="text-[9px] font-bold text-emerald-400 tracking-wider">TECHNICIANS</span>
          </div>
        </div>

        <style>{`
          @keyframes pin-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
          .unassigned-pin { z-index: 1000 !important; }
          .leaflet-container { background: #e5e7eb !important; }
          .custom-popup .leaflet-popup-content-wrapper,
          .tech-popup .leaflet-popup-content-wrapper {
            background: #0f172a !important; color: white !important;
            border-radius: 16px; padding: 0 !important; border: 1px solid rgba(255,255,255,0.1);
          }
          .custom-popup .leaflet-popup-content,
          .tech-popup .leaflet-popup-content { margin: 0 !important; padding: 0 !important; }
          .leaflet-popup-tip { background: #0f172a !important; }
        `}</style>
      </div>

      {/* ── Image Zoom Overlay ── */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            <img src={zoomedImage} alt="zoomed" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 bg-slate-900/90 text-white p-2 rounded-xl border border-white/10 hover:bg-slate-800 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default JobMap;
