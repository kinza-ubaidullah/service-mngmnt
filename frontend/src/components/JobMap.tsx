import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, Wrench, ClipboardList, Maximize2, RefreshCw, XCircle, UserMinus } from 'lucide-react';
import { DEFAULT_MAP_CENTER, getLeadMapPosition, buildMapLeadPositions } from '../utils/leadLocation';
import { isUnassignedLead, isMapVisibleLead, isAssignedTaskStatus, getMapStatusLabel, isGlobalMapVisibleLead, getLeadProductEntries, parseProblemForProduct } from '../utils/leadHelpers';
import { isTechnicianLive } from '../services/liveTechnicianStore';
import { techIcon, getTechIcon, getLeadMapIcon } from '../utils/mapIcons';
import CopyText from './CopyText';

const getMapDescriptionBlocks = (lead: any) => {
  const entries = getLeadProductEntries(lead).map((e) => ({
    type: e.type,
    problem: e.problem.trim() || parseProblemForProduct(lead.problem_details, e.type),
  }));
  const withText = entries.filter((e) => e.problem);
  if (withText.length > 0) return withText;
  if (lead.problem_details?.trim()) {
    return [{ type: 'Issue', problem: lead.problem_details.trim() }];
  }
  return [];
};

const getPictures = (lead: any): string[] => {
  if (!lead.item_pictures) return [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  try { return JSON.parse(lead.item_pictures); } catch { return []; }
};

const CANCELLABLE = ['New', 'Assigned', 'InProgress', 'Reopened', 'Complaint'];
const REASSIGNABLE = ['Assigned', 'InProgress', 'Reopened', 'Complaint'];
const UNASSIGNABLE = ['Assigned', 'InProgress', 'Reopened'];

interface JobMapProps {
  leads: any[];
  technicians?: any[];
  onAssign?: (lead: any) => void;
  onUnassign?: (lead: any) => void;
  onCancel?: (lead: any) => void;
  showOnlyUnassigned?: boolean;
  showFullMapLink?: boolean;
  showLegend?: boolean;
  showStatsBadge?: boolean;
  locationKey?: string;
}

const MapResizer: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => { map.invalidateSize(); }, 350);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
};

const MapAutoFit: React.FC<{ leads: any[]; technicians?: any[]; leadPositions: Map<string | number, [number, number]>; locationKey?: string }> = ({ leads, technicians = [], leadPositions, locationKey }) => {
  const map = useMap();
  const lastKey = useRef('');
  useEffect(() => {
    const points: [number, number][] = leads.map((l) => getLeadMapPosition(l, leadPositions));
    technicians.forEach((t) => {
      if (t.lat != null && t.lng != null) points.push([Number(t.lat), Number(t.lng)]);
    });
    const key = `${locationKey || ''}|${points.map((p) => p.join(',')).join('|')}`;
    if (key === lastKey.current || points.length === 0) return;
    lastKey.current = key;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points as L.LatLngBoundsLiteral, { padding: [40, 40], maxZoom: 16 });
    }
  }, [leads, technicians, leadPositions, locationKey, map]);
  return null;
};

const UpdatingMarker: React.FC<{
  position: [number, number];
  icon: L.DivIcon | L.Icon;
  zIndexOffset?: number;
  eventHandlers?: L.LeafletEventHandlerFnMap;
  children?: React.ReactNode;
}> = ({ position, icon, zIndexOffset = 0, eventHandlers, children }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    markerRef.current?.setLatLng(position);
  }, [position[0], position[1]]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      zIndexOffset={zIndexOffset}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
};

/** Prevent Leaflet from swallowing button clicks inside popups */
const PopupActions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);
  return <div ref={ref}>{children}</div>;
};

const stopMapEvent = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const JobMap: React.FC<JobMapProps> = ({
  leads,
  technicians = [],
  onAssign,
  onUnassign,
  onCancel,
  showOnlyUnassigned = false,
  showFullMapLink = true,
  showLegend = true,
  showStatsBadge = false,
  locationKey,
}) => {
  const navigate = useNavigate();
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [techTrails, setTechTrails] = useState<Record<number, [number, number][]>>({});
  const center: [number, number] = DEFAULT_MAP_CENTER;

  useEffect(() => {
    setTechTrails((prev) => {
      const next = { ...prev };
      technicians.forEach((t) => {
        if (t.lat == null || t.lng == null) return;
        const pos: [number, number] = [Number(t.lat), Number(t.lng)];
        const trail = [...(next[t.id] || []), pos];
        const last = trail[trail.length - 2];
        if (last && last[0] === pos[0] && last[1] === pos[1]) {
          next[t.id] = trail;
        } else {
          next[t.id] = trail.slice(-10);
        }
      });
      return next;
    });
  }, [technicians]);

  const getTechDestination = (tech: any): [number, number] | null => {
    const job = tech.assigned_jobs?.[0];
    if (!job) return null;
    return getLeadMapPosition(job, buildMapLeadPositions([job]));
  };

  const hoverHandlers = {
    mouseover: (e: L.LeafletEvent) => e.target.openTooltip(),
    mouseout: (e: L.LeafletEvent) => e.target.closeTooltip(),
  };

  const visibleLeads = leads.filter(l => {
    if (!isGlobalMapVisibleLead(l)) return false;
    if (showOnlyUnassigned) return isUnassignedLead(l);
    return true;
  });

  const leadPositions = useMemo(() => buildMapLeadPositions(visibleLeads), [visibleLeads, locationKey]);

  const statusBadgeClass = (status: string, isNew: boolean) => {
    if (isNew) return 'bg-amber-400/20 text-amber-200 border-amber-400/40';
    if (status === 'PendingApproval') return 'bg-violet-400/20 text-violet-100 border-violet-400/40';
    if (status === 'Assigned' || status === 'InProgress') return 'bg-sky-400/20 text-sky-100 border-sky-400/40';
    if (status === 'Completed') return 'bg-emerald-400/20 text-emerald-100 border-emerald-400/40';
    if (status === 'Cancelled') return 'bg-rose-400/20 text-rose-100 border-rose-400/40';
    return 'bg-violet-400/20 text-violet-100 border-violet-400/40';
  };

  return (
    <>
      <div
        style={{ height: '100%', width: '100%', position: 'relative' }}
        className={showFullMapLink ? 'rounded-[2.5rem] overflow-hidden border border-teal-700/40 shadow-2xl' : 'overflow-hidden'}
      >
        {showFullMapLink && (
          <div className="absolute top-3 left-3 z-[2000] flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="bg-teal-900/95 backdrop-blur-sm hover:bg-teal-800 text-teal-50 px-3 py-2.5 rounded-xl border border-teal-600/50 shadow-xl transition-all hover:scale-105 flex items-center gap-2 text-xs font-bold"
            >
              <Maximize2 size={15} className="text-amber-300" />
              <span>Full Map View</span>
            </button>
          </div>
        )}

        {showStatsBadge && (
          <div className="absolute top-3 right-3 z-[2000] bg-teal-900/95 backdrop-blur-sm border border-teal-600/50 text-teal-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xl">
            {leads.filter(l => l.status === 'New').length} Unassigned ·{' '}
            <span className="text-emerald-300">{technicians.filter(t => t.lat && t.lng).length} Techs Online</span>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapResizer trigger={false} />
          <MapAutoFit leads={visibleLeads} technicians={technicians} leadPositions={leadPositions} locationKey={locationKey} />
          <TileLayer
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />

          {technicians.filter((t) => t.lat && t.lng).flatMap((tech) => {
            const dest = getTechDestination(tech);
            const trail = techTrails[tech.id] || [];
            const out: React.ReactNode[] = [];
            if (trail.length > 1) {
              out.push(
                <Polyline
                  key={`trail-${tech.id}`}
                  positions={trail}
                  pathOptions={{ color: '#10b981', weight: 3, opacity: 0.7 }}
                />
              );
            }
            if (dest) {
              out.push(
                <Polyline
                  key={`route-${tech.id}`}
                  positions={[[Number(tech.lat), Number(tech.lng)], dest]}
                  pathOptions={{ color: '#6366f1', weight: 2, opacity: 0.8, dashArray: '8 6' }}
                />
              );
            }
            return out;
          })}

          {visibleLeads.map((lead) => {
            const pos = getLeadMapPosition(lead, leadPositions);
            const isNew = isUnassignedLead(lead);
            const canAssign = isNew && !!onAssign;
            const canReassign = REASSIGNABLE.includes(lead.status) && !!onAssign;
            const canUnassign = UNASSIGNABLE.includes(lead.status) && !!onUnassign;
            const canCancel = CANCELLABLE.includes(lead.status) && !!onCancel;
            const pics = getPictures(lead);
            const thumbSrc = pics[0] || lead.house_image || null;
            const isAssignedLead = !!lead.technician && isAssignedTaskStatus(lead.status);
            const actionCount = [canAssign, canReassign, canUnassign, canCancel].filter(Boolean).length;
            const descBlocks = getMapDescriptionBlocks(lead);

            return (
              <UpdatingMarker
                key={`lead-${lead.id}-${pos[0].toFixed(6)}-${pos[1].toFixed(6)}`}
                position={pos}
                icon={getLeadMapIcon(lead)}
                zIndexOffset={isNew ? 1000 : 0}
                eventHandlers={hoverHandlers}
              >
                <Tooltip direction="top" offset={[0, -44]} opacity={0.95} className="map-hover-tip">
                  <div className="text-xs font-bold text-slate-900 space-y-0.5 min-w-[120px]">
                    <CopyText value={lead.lead_id} label="Lead ID" className="font-mono text-teal-700 block" />
                    <div>{lead.customer?.name}</div>
                    {lead.customer?.phone && (
                      <div className="text-[10px] font-mono font-bold text-sky-700">{lead.customer.phone}</div>
                    )}
                    <div className="text-[10px] text-slate-600">{lead.product_type} · {lead.customer?.area}</div>
                    <div className={`text-[9px] font-black uppercase ${
                      isNew ? 'text-amber-600'
                      : lead.status === 'PendingApproval' ? 'text-violet-600'
                      : 'text-blue-600'
                    }`}>
                      {isNew ? 'Unassigned' : getMapStatusLabel(lead)}
                    </div>
                  </div>
                </Tooltip>
                <Popup className="custom-popup" closeButton maxWidth={300}>
                  <div
                    className="w-[288px] flex flex-col overflow-hidden map-lead-card rounded-2xl"
                    style={{ height: actionCount >= 3 ? 304 : 288 }}
                  >
                    <div className="shrink-0 px-3 pt-2.5 pb-2 border-b border-teal-700/25">
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusBadgeClass(lead.status, isNew)}`}>
                          {isNew ? '● Unassigned' : `● ${getMapStatusLabel(lead)}`}
                        </span>
                        <CopyText
                          value={lead.lead_id}
                          label="Lead ID"
                          className="font-mono text-[10px] font-bold text-amber-200"
                        />
                      </div>
                      {isAssignedLead && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-sky-100 bg-sky-500/20 border border-sky-400/35 rounded-md px-2 py-0.5 max-w-full">
                          <User size={9} className="shrink-0" />
                          <span className="truncate">Tech: {lead.technician.name}</span>
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 px-3 pt-2 pb-2 flex gap-2.5">
                      <div
                        className={`relative shrink-0 w-16 h-16 overflow-hidden rounded-lg bg-teal-950 border border-teal-600/40 ${thumbSrc ? 'cursor-zoom-in group' : 'flex items-center justify-center'}`}
                        onClick={() => thumbSrc && setZoomedImage(thumbSrc)}
                      >
                        {thumbSrc ? (
                          <>
                            <img src={thumbSrc} alt="appliance" className="w-full h-full object-cover" />
                            {pics.length > 1 && (
                              <div className="absolute top-0 right-0 bg-teal-900/90 text-amber-200 text-[7px] font-bold px-1 rounded-bl">
                                +{pics.length - 1}
                              </div>
                            )}
                          </>
                        ) : (
                          <Wrench size={18} className="text-teal-600/60" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10px] leading-tight">
                        <span className="text-teal-300/70 font-bold">Name</span>
                        <span className="map-lead-name font-bold truncate">{lead.customer.name}</span>
                        {lead.customer?.phone && (
                          <>
                            <span className="text-teal-300/70 font-bold">Phone</span>
                            <CopyText value={lead.customer.phone} label="Phone" className="map-lead-phone font-mono truncate" />
                          </>
                        )}
                        <span className="text-teal-300/70 font-bold">Items</span>
                        <span className="map-lead-meta font-semibold line-clamp-2">{lead.product_type}</span>
                        <span className="text-teal-300/70 font-bold">Area</span>
                        <span className="map-lead-area opacity-90 line-clamp-2">
                          {lead.customer.area}{lead.exact_address ? ` · ${lead.exact_address}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 mx-3 mb-2 h-[84px] map-lead-desc-scroll overflow-y-auto rounded-lg bg-teal-950/55 border border-teal-700/45 px-2.5 py-2">
                      <p className="text-[8px] font-black uppercase tracking-wider text-teal-300/60 mb-1">Issue Description</p>
                      {descBlocks.length > 0 ? (
                        descBlocks.map((block, idx) => (
                          <div
                            key={`${block.type}-${idx}`}
                            className={idx < descBlocks.length - 1 ? 'mb-2 pb-2 border-b border-teal-800/50' : ''}
                          >
                            {descBlocks.length > 1 && (
                              <p className="text-[9px] font-black uppercase text-amber-200/90 mb-0.5">{block.type}</p>
                            )}
                            <p className="map-lead-quote text-[10px] leading-relaxed break-words">{block.problem}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-teal-400/70 italic">No issue description</p>
                      )}
                    </div>

                    {(canAssign || canReassign || canUnassign || canCancel) && (
                      <PopupActions>
                        <div className="shrink-0 flex w-full gap-1.5 px-3 pb-3 mt-auto">
                          {canAssign && (
                            <button
                              type="button"
                              onMouseDown={stopMapEvent}
                              onClick={(e) => { stopMapEvent(e); onAssign!(lead); }}
                              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-teal-950 text-[9px] font-black py-2 rounded-lg transition-all shadow-md flex flex-col items-center justify-center gap-0.5 min-h-[40px]"
                            >
                              <ClipboardList size={13} /> Assign
                            </button>
                          )}
                          {canReassign && (
                            <button
                              type="button"
                              onMouseDown={stopMapEvent}
                              onClick={(e) => { stopMapEvent(e); onAssign!(lead); }}
                              className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-[9px] font-black py-2 rounded-lg transition-all shadow-md flex flex-col items-center justify-center gap-0.5 min-h-[40px]"
                            >
                              <RefreshCw size={13} /> Reassign
                            </button>
                          )}
                          {canUnassign && (
                            <button
                              type="button"
                              onMouseDown={stopMapEvent}
                              onClick={(e) => { stopMapEvent(e); onUnassign!(lead); }}
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black py-2 rounded-lg transition-all border border-slate-500/50 flex flex-col items-center justify-center gap-0.5 min-h-[40px]"
                            >
                              <UserMinus size={13} /> Unassign
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onMouseDown={stopMapEvent}
                              onClick={(e) => { stopMapEvent(e); onCancel!(lead); }}
                              className="flex-1 bg-rose-600/90 hover:bg-rose-500 text-white text-[9px] font-black py-2 rounded-lg transition-all border border-rose-400/30 flex flex-col items-center justify-center gap-0.5 min-h-[40px]"
                            >
                              <XCircle size={13} /> Cancel
                            </button>
                          )}
                        </div>
                      </PopupActions>
                    )}
                  </div>
                </Popup>
              </UpdatingMarker>
            );
          })}

          {technicians.filter(t => t.lat != null && t.lng != null).map((tech) => {
            const activeJob = tech.assigned_jobs?.[0];
            const destArea = activeJob?.customer?.area || activeJob?.exact_address;
            const live = isTechnicianLive(tech);
            return (
            <Marker
              key={`tech-${tech.id}`}
              position={[Number(tech.lat), Number(tech.lng)]}
              icon={getTechIcon(tech.name)}
              zIndexOffset={live ? 2500 : 1500}
              eventHandlers={hoverHandlers}
            >
              <Tooltip direction="top" offset={[0, -36]} opacity={0.95} className="map-hover-tip">
                <div className="text-xs font-bold text-slate-900 space-y-0.5">
                  <div className={`flex items-center gap-1 ${live ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${live ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                    {tech.name} — {live ? 'LIVE' : 'Last known'}
                  </div>
                  {activeJob ? (
                    <>
                      <div className="text-[10px]">→ {activeJob.lead_id} ({activeJob.customer?.name})</div>
                      <div className="text-[10px] text-indigo-600">Going to: {destArea || 'Job site'}</div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-500">Available — no active job</div>
                  )}
                </div>
              </Tooltip>
              <Popup className="tech-popup" closeButton>
                <div className="p-4 w-[240px] map-lead-card rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-teal-50">{tech.name}</p>
                      <p className="text-[9px] text-emerald-300 font-black tracking-widest uppercase mt-0.5">{tech.specialization || 'General Tech'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-200 bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> LIVE
                    </div>
                  </div>
                  {tech.assigned_jobs?.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-teal-300 uppercase tracking-widest border-b border-teal-700/50 pb-1">Active Jobs</p>
                      {tech.assigned_jobs.map((job: any) => (
                        <div key={job.id} className="bg-teal-950/60 rounded-xl p-2.5 border border-teal-700/40 space-y-0.5">
                          <div className="flex justify-between items-center">
                            <CopyText value={job.lead_id} label="Lead ID" className="text-[9px] font-mono font-bold text-amber-200" />
                            <span className="text-[8px] font-black uppercase text-sky-200 bg-sky-500/20 border border-sky-400/30 px-1 rounded">{job.status}</span>
                          </div>
                          <p className="text-[10px] font-bold text-teal-100">{job.customer?.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-center bg-teal-950/40 rounded-xl border border-dashed border-teal-700/50">
                      <p className="text-[9px] font-bold text-teal-400 uppercase">No active jobs</p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
          })}
        </MapContainer>

        {showLegend && (
        <div className="absolute bottom-4 right-4 bg-teal-900/95 backdrop-blur-md p-3 rounded-2xl border border-teal-600/50 z-[1000] space-y-2 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full border border-white shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="text-[9px] font-bold text-amber-200 tracking-wider">UNASSIGNED</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-full border border-white shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[9px] font-bold text-sky-200 tracking-wider">ASSIGNED</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full border border-white shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
            <span className="text-[9px] font-bold text-violet-200 tracking-wider">PENDING APPROVAL</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-full animate-pulse" />
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
            </div>
            <span className="text-[9px] font-bold text-emerald-200 tracking-wider">TECHNICIANS</span>
          </div>
        </div>
        )}

        <style>{`
          @keyframes pin-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
          .unassigned-pin { z-index: 1000 !important; }
          .leaflet-container { background: #cbd5e1 !important; }
          .map-lead-card {
            background: linear-gradient(145deg, #0f4c5c 0%, #134e4a 50%, #115e59 100%) !important;
            color: #ecfdf5 !important;
            border: 1px solid rgba(45, 212, 191, 0.35) !important;
            box-shadow: 0 20px 40px rgba(0,0,0,0.35) !important;
          }
          /* Override crm-shell light-mode text rules inside map popups */
          .crm-shell .map-lead-card h4,
          .map-lead-card .map-lead-name {
            color: #f0fdfa !important;
          }
          .crm-shell .map-lead-card p,
          .map-lead-card .map-lead-meta,
          .map-lead-card .map-lead-area {
            color: #ccfbf1 !important;
          }
          .map-lead-card .map-lead-phone {
            color: #a5f3fc !important;
          }
          .map-lead-card .map-lead-meta {
            color: #99f6e4 !important;
            font-weight: 700 !important;
          }
          .map-lead-card .map-lead-quote {
            color: #ecfdf5 !important;
            word-break: break-word;
          }
          .map-lead-desc-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(45, 212, 191, 0.45) transparent;
          }
          .map-lead-desc-scroll::-webkit-scrollbar { width: 4px; }
          .map-lead-desc-scroll::-webkit-scrollbar-thumb {
            background: rgba(45, 212, 191, 0.45);
            border-radius: 4px;
          }
          .custom-popup .leaflet-popup-content-wrapper,
          .tech-popup .leaflet-popup-content-wrapper {
            background: transparent !important;
            color: #ecfdf5 !important;
            border-radius: 16px; padding: 0 !important; border: none;
            box-shadow: none !important;
          }
          .custom-popup .leaflet-popup-content,
          .tech-popup .leaflet-popup-content { margin: 0 !important; padding: 0 !important; }
          .leaflet-popup-tip { background: #134e4a !important; }
          .map-hover-tip {
            background: #f0fdfa !important;
            border: 1px solid rgba(20, 184, 166, 0.35) !important;
            border-radius: 10px !important;
            padding: 6px 8px !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
          }
          .leaflet-tooltip-left.map-hover-tip::before,
          .leaflet-tooltip-right.map-hover-tip::before,
          .leaflet-tooltip-top.map-hover-tip::before,
          .leaflet-tooltip-bottom.map-hover-tip::before { border-top-color: #f0fdfa !important; }
        `}</style>
      </div>

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            <img src={zoomedImage} alt="zoomed" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 bg-teal-900/90 text-teal-50 p-2 rounded-xl border border-teal-600/50 hover:bg-teal-800 transition-all"
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
