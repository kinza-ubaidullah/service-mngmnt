import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, Phone, MapPin, Wrench, ClipboardList } from 'lucide-react';

// Create beautiful premium custom SVG icons using L.divIcon
const unassignedIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-6 h-6 bg-amber-500/40 rounded-full animate-ping" style="animation-duration: 2s;"></div>
      <div class="w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full border border-white shadow-lg shadow-orange-500/50 flex items-center justify-center text-[8px] text-white font-black">
        !
      </div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const assignedIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-4 h-4 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-full border border-white shadow-lg shadow-blue-500/50"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const techIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-6 h-6 bg-emerald-500/30 rounded-full animate-pulse"></div>
      <div class="w-4 h-4 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full border-2 border-white shadow-lg shadow-emerald-500/50 flex items-center justify-center">
        <span class="w-1.5 h-1.5 bg-white rounded-full"></span>
      </div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

interface JobMapProps {
  leads: any[];
  technicians?: any[];
  onAssign?: (lead: any) => void;
}

const JobMap: React.FC<JobMapProps> = ({ leads, technicians = [], onAssign }) => {
  // Center of city (Lahore)
  const center: [number, number] = [31.5204, 74.3587];

  // Stable deterministic coordinate generator based on lead ID
  const getStableCoordinates = (lead: any): [number, number] => {
    const baseLat = 31.5204;
    const baseLng = 74.3587;
    
    const idStr = String(lead.id || lead.lead_id || '');
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate deterministic lat/lng offsets
    const latOffset = ((hash & 0xFF) / 255) * 0.08 - 0.04;
    const lngOffset = (((hash >> 8) & 0xFF) / 255) * 0.08 - 0.04;
    
    return [baseLat + latOffset, baseLng + lngOffset];
  };

  return (
    <div className="h-full w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative z-0">
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render Jobs */}
        {leads.map((lead) => {
            const pos = getStableCoordinates(lead);
            const isNew = lead.status === 'New';
            return (
                <Marker 
                  key={`lead-${lead.id}`} 
                  position={pos}
                  icon={isNew ? unassignedIcon : assignedIcon}
                  eventHandlers={{
                    mouseover: (e) => {
                      e.target.openPopup();
                    }
                  }}
                >
                    <Popup className="custom-popup">
                        <div className="p-4 w-[280px] bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border
                                  ${isNew 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}
                                >
                                  {isNew ? 'Unassigned' : lead.status}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-slate-500">{lead.lead_id}</span>
                            </div>

                            {lead.item_pictures && lead.item_pictures.length > 0 && (
                                <div className="relative w-full h-24 overflow-hidden rounded-xl bg-slate-950 border border-white/5">
                                    <img 
                                        src={lead.item_pictures[0]} 
                                        alt="appliance" 
                                        className="w-full h-full object-cover"
                                    />
                                    {lead.item_pictures.length > 1 && (
                                        <div className="absolute top-2 right-2 bg-slate-950/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10">
                                            +{lead.item_pictures.length - 1}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5">
                              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                                <User size={14} className="text-slate-400"/> {lead.customer.name}
                              </h4>
                              <p className="text-xs text-indigo-400 font-bold tracking-wide flex items-center gap-2">
                                <Wrench size={14} className="text-indigo-400"/> {lead.product_type}
                              </p>
                              <p className="text-xs text-slate-300 font-medium flex items-start gap-2">
                                <MapPin size={14} className="text-rose-400/80 shrink-0 mt-0.5"/> 
                                <span>{lead.customer.area} — <span className="text-slate-500 text-[10px]">{lead.exact_address || 'Address not listed'}</span></span>
                              </p>
                              {lead.problem_details && (
                                <div className="text-[11px] text-slate-400 bg-white/[0.02] border border-white/5 p-2 rounded-lg mt-1 italic">
                                  "{lead.problem_details}"
                                </div>
                              )}
                            </div>

                            {/* Direct Action Button */}
                            {isNew && onAssign && (
                              <button 
                                onClick={() => {
                                  onAssign(lead);
                                }}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 border border-orange-400/20 flex items-center justify-center gap-1.5"
                              >
                                <ClipboardList size={14} /> Dispatch Assignment
                              </button>
                            )}
                        </div>
                    </Popup>
                </Marker>
            );
        })}

        {/* Render Technicians */}
        {technicians?.filter(t => t.lat && t.lng).map((tech) => (
            <Marker 
              key={`tech-${tech.id}`} 
              position={[Number(tech.lat), Number(tech.lng)]}
              icon={techIcon}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.openPopup();
                }
              }}
            >
                <Popup className="tech-popup">
                    <div className="p-4 w-[240px] bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-sm text-slate-100">{tech.name}</p>
                                <p className="text-[9px] text-indigo-400 font-black tracking-widest uppercase mt-0.5">{tech.specialization || 'General Tech'}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div> ACTIVE
                            </div>
                        </div>

                        {tech.assigned_jobs?.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">Current Assignments</p>
                                {tech.assigned_jobs.map((job: any) => (
                                    <div key={job.id} className="bg-slate-950/50 rounded-xl p-2.5 border border-white/5 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-mono font-bold text-indigo-400">{job.lead_id}</span>
                                            <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded">{job.status}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-300">{job.customer.name}</p>
                                        <p className="text-[9px] text-slate-500 truncate">{job.product_type} - {job.customer.area}</p>
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
      
      {/* Overlay Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 z-[1000] space-y-2.5">
        <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full border border-white shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span className="text-[10px] font-bold text-white tracking-wider">UNASSIGNED LEADS</span>
        </div>
        <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-full border border-white shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            <span className="text-[10px] font-bold text-white tracking-wider">ASSIGNED LEADS</span>
        </div>
        <div className="flex items-center gap-3 border-t border-white/5 pt-2">
            <div className="relative w-4 h-4 flex items-center justify-center">
              <div className="absolute w-full h-full bg-emerald-500/30 rounded-full animate-pulse"></div>
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider">TECHNICIANS</span>
        </div>
      </div>

      <style>{`
        .leaflet-container { background: #090d16 !important; }
        .leaflet-tile { filter: invert(90%) hue-rotate(190deg) brightness(85%) contrast(110%); }
        .custom-popup .leaflet-popup-content-wrapper,
        .tech-popup .leaflet-popup-content-wrapper {
            background: #0f172a !important;
            color: white !important;
            border-radius: 16px;
            padding: 0 !important;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .custom-popup .leaflet-popup-content,
        .tech-popup .leaflet-popup-content {
            margin: 0 !important;
            padding: 0 !important;
        }
        .leaflet-popup-tip {
            background: #0f172a !important;
            border: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
};

export default JobMap;
