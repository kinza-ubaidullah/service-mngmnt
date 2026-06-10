import L from 'leaflet';

export const unassignedIcon = L.divIcon({
  className: 'custom-div-icon unassigned-pin',
  html: `
    <div style="position:relative;width:44px;height:52px;display:flex;align-items:flex-end;justify-content:center;">
      <div style="position:absolute;bottom:4px;width:40px;height:40px;background:rgba(245,158,11,0.45);border-radius:50%;animation:pin-ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;bottom:8px;width:28px;height:28px;background:rgba(245,158,11,0.25);border-radius:50%;"></div>
      <svg width="40" height="52" viewBox="0 0 40 52" style="position:relative;z-index:2;filter:drop-shadow(0 4px 8px rgba(245,158,11,0.7));">
        <path d="M20 0C10.06 0 2 8.06 2 18c0 13.5 18 34 18 34s18-20.5 18-34C38 8.06 29.94 0 20 0z" fill="#f59e0b" stroke="#fff" stroke-width="2.5"/>
        <circle cx="20" cy="18" r="10" fill="#fff"/>
        <text x="20" y="23" text-anchor="middle" fill="#ea580c" font-size="16" font-weight="900" font-family="Arial,sans-serif">!</text>
      </svg>
    </div>`,
  iconSize: [44, 52],
  iconAnchor: [22, 52],
  popupAnchor: [0, -48],
});

export const assignedIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <svg width="32" height="40" viewBox="0 0 32 40" style="filter:drop-shadow(0 3px 6px rgba(59,130,246,0.6));">
      <path d="M16 0C8.82 0 3 5.82 3 13c0 10.5 13 27 13 27s13-16.5 13-27C29 5.82 23.18 0 16 0z" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="13" r="6" fill="#fff"/>
    </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

export const completedIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <svg width="30" height="38" viewBox="0 0 30 38" style="filter:drop-shadow(0 3px 6px rgba(16,185,129,0.6));">
      <path d="M15 0C8.37 0 3 5.37 3 12c0 9.75 12 26 12 26s12-16.25 12-26C27 5.37 21.63 0 15 0z" fill="#10b981" stroke="#fff" stroke-width="2"/>
      <text x="15" y="17" text-anchor="middle" fill="#fff" font-size="12" font-weight="900">✓</text>
    </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
  popupAnchor: [0, -34],
});

export const complaintIcon = L.divIcon({
  className: 'custom-div-icon complaint-pin',
  html: `
    <div style="position:relative;width:48px;height:56px;display:flex;align-items:flex-end;justify-content:center;">
      <div style="position:absolute;bottom:4px;width:44px;height:44px;background:rgba(239,68,68,0.5);border-radius:50%;animation:pin-ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <svg width="44" height="56" viewBox="0 0 44 56" style="position:relative;z-index:2;filter:drop-shadow(0 4px 10px rgba(239,68,68,0.8));">
        <path d="M22 0C11.06 0 2 9.06 2 20c0 14.5 20 36 20 36s20-21.5 20-36C42 9.06 32.94 0 22 0z" fill="#ef4444" stroke="#fff" stroke-width="2.5"/>
        <circle cx="22" cy="20" r="11" fill="#fff"/>
        <text x="22" y="25" text-anchor="middle" fill="#dc2626" font-size="14" font-weight="900" font-family="Arial,sans-serif">!</text>
      </svg>
    </div>`,
  iconSize: [48, 56],
  iconAnchor: [24, 56],
  popupAnchor: [0, -52],
});

export const techIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-emerald-500/30 rounded-full animate-pulse"></div>
      <div class="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full border-2 border-white shadow-lg shadow-emerald-500/50 flex items-center justify-center">
        <span class="w-2 h-2 bg-white rounded-full"></span>
      </div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const getLeadMapIcon = (status: string) => {
  if (status === 'New') return unassignedIcon;
  if (status === 'Complaint' || status === 'Reopened') return complaintIcon;
  if (status === 'Completed' || status === 'PendingApproval') return completedIcon;
  return assignedIcon;
};
