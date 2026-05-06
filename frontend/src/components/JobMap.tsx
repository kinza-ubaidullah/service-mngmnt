import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface JobMapProps {
  leads: any[];
  technicians?: any[];
}

const JobMap: React.FC<JobMapProps> = ({ leads, technicians = [] }) => {
  // Center of city (Lahore)
  const center: [number, number] = [31.5204, 74.3587];

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
            const pos: [number, number] = [31.5204 + (Math.random() * 0.1 - 0.05), 74.3587 + (Math.random() * 0.1 - 0.05)];
            return (
                <Marker key={`lead-${lead.id}`} position={pos}>
                    <Popup className="custom-popup">
                        <div className="p-1">
                            <p className="font-bold text-slate-900">{lead.customer.name}</p>
                            <p className="text-xs text-slate-600">{lead.product_type}</p>
                            <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white
                                ${lead.status === 'New' ? 'bg-emerald-500' : 'bg-blue-500'}
                            `}>
                                {lead.status}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            );
        })}

        {/* Render Technicians */}
        {technicians.map((tech) => (
            <Marker 
              key={`tech-${tech.id}`} 
              position={[tech.lat, tech.lng]}
            >
                <Popup>
                    <div className="p-1">
                        <p className="font-bold text-indigo-600">Technician: {tech.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black">{tech.specialization || 'General'}</p>
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> ACTIVE NOW
                        </div>
                    </div>
                </Popup>
            </Marker>
        ))}
      </MapContainer>
      
      {/* Overlay Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 z-[1000] space-y-3">
        <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-bold text-white tracking-wider">NEW JOBS</span>
        </div>
        <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            <span className="text-[10px] font-bold text-white tracking-wider">ASSIGNED</span>
        </div>
        <div className="flex items-center gap-3 border-t border-white/5 pt-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse"></div>
            <span className="text-[10px] font-bold text-indigo-300 tracking-wider">TECHNICIANS</span>
        </div>
      </div>

      <style>{`
        .leaflet-container { background: #0f172a !important; }
        .leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
        .custom-popup .leaflet-popup-content-wrapper {
            background: white;
            border-radius: 12px;
            padding: 0;
        }
      `}</style>
    </div>
  );
};

export default JobMap;
