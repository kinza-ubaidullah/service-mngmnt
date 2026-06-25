import api from '../services/api';

export const DEFAULT_MAP_CENTER: [number, number] = [21.4225, 39.8262];

const AREA_FALLBACK: Record<string, [number, number]> = {
  makkah: [21.4225, 39.8262],
  mecca: [21.4225, 39.8262],
  'makkah al mukarramah': [21.4225, 39.8262],
  'مكة': [21.4225, 39.8262],
  'مكه': [21.4225, 39.8262],
  jeddah: [21.4858, 39.1925],
  riyadh: [24.7136, 46.6753],
  madinah: [24.4672, 39.6111],
  medina: [24.4672, 39.6111],
  dammam: [26.3927, 49.9777],
  taif: [21.2703, 40.4158],
  tabuk: [28.3838, 36.5550],
  abha: [18.2164, 42.5053],
  khobar: [26.2172, 50.1971],
  yanbu: [24.0232, 38.0022],
};

export function parseGoogleMapsCoords(url?: string | null): [number, number] | null {
  if (!url) return null;

  const candidates = [url, decodeURIComponent(url)];
  const patterns = [
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/(-?\d+\.?\d*),(-?\d+\.?\d*)(?:\/|\?|$)/,
  ];

  for (const text of candidates) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return [lat, lng];
        }
      }
    }
  }
  return null;
}

/** Haversine distance in kilometres */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

function resolveAreaCoords(areaName?: string | null): [number, number] | null {
  if (!areaName) return null;
  const key = areaName.toLowerCase().trim();
  if (AREA_FALLBACK[key]) return AREA_FALLBACK[key];
  for (const [name, coords] of Object.entries(AREA_FALLBACK)) {
    if (key.includes(name) || name.includes(key)) return coords;
  }
  return null;
}

export function getLeadCoords(lead: {
  id?: number;
  lead_id?: string;
  lat?: number | null;
  lng?: number | null;
  exact_address?: string | null;
  customer?: {
    area?: string | null;
    google_map_link?: string | null;
    exact_address?: string | null;
  } | null;
}): [number, number] {
  if (lead.lat != null && lead.lng != null) {
    return [Number(lead.lat), Number(lead.lng)];
  }

  const fromLink = parseGoogleMapsCoords(lead.customer?.google_map_link);
  if (fromLink) return fromLink;

  const fromArea = resolveAreaCoords(lead.customer?.area);
  if (fromArea) return fromArea;

  return DEFAULT_MAP_CENTER;
}

function coordBucketKey([lat, lng]: [number, number]): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/** Spread overlapping pins so all unassigned leads in same area remain visible */
export function buildMapLeadPositions(
  leads: Array<{ id?: number; lead_id?: string } & Parameters<typeof getLeadCoords>[0]>
): Map<string | number, [number, number]> {
  const groups = new Map<string, typeof leads>();

  for (const lead of leads) {
    const key = coordBucketKey(getLeadCoords(lead));
    const group = groups.get(key) || [];
    group.push(lead);
    groups.set(key, group);
  }

  const positions = new Map<string | number, [number, number]>();

  for (const group of groups.values()) {
    const base = getLeadCoords(group[0]);
    if (group.length === 1) {
      const id = group[0].id ?? group[0].lead_id ?? 0;
      positions.set(id, base);
      continue;
    }

    const isExact = group.some(hasExactLeadLocation);

    group.forEach((lead, index) => {
      const id = lead.id ?? lead.lead_id ?? index;
      const angle = (index * (360 / group.length)) * (Math.PI / 180);
      const radius = isExact ? 0.00005 + index * 0.00002 : 0.0025 + index * 0.00035;
      positions.set(id, [
        base[0] + radius * Math.cos(angle),
        base[1] + radius * Math.sin(angle),
      ]);
    });
  }

  return positions;
}

export function getLeadMapPosition(
  lead: { id?: number; lead_id?: string } & Parameters<typeof getLeadCoords>[0],
  positions: Map<string | number, [number, number]>
): [number, number] {
  const id = lead.id ?? lead.lead_id;
  if (id != null && positions.has(id)) return positions.get(id)!;
  return getLeadCoords(lead);
}

export function hasExactLeadLocation(lead: {
  lat?: number | null;
  lng?: number | null;
  customer?: { google_map_link?: string | null } | null;
}): boolean {
  if (lead.lat != null && lead.lng != null) return true;
  return parseGoogleMapsCoords(lead.customer?.google_map_link) !== null;
}

export async function resolveLocationFromLink(url: string): Promise<{ lat: number; lng: number } | null> {
  const direct = parseGoogleMapsCoords(url);
  if (direct) return { lat: direct[0], lng: direct[1] };

  if (!url.includes('goo.gl') && !url.includes('maps.app')) return null;

  try {
    const res = await api.post('/leads/resolve-location', { url });
    if (res.data?.lat != null && res.data?.lng != null) {
      return { lat: Number(res.data.lat), lng: Number(res.data.lng) };
    }
  } catch {
    // ignore — caller can show a hint to paste full Google Maps URL
  }
  return null;
}

export function openLeadInGoogleMaps(lead: Parameters<typeof getLeadCoords>[0]) {
  if (lead.customer?.google_map_link) {
    window.open(lead.customer.google_map_link, '_blank');
    return;
  }
  const [lat, lng] = getLeadCoords(lead);
  const query = encodeURIComponent(
    `${lead.customer?.area || ''} ${lead.exact_address || lead.customer?.exact_address || ''}`.trim()
  );
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}&center=${lat},${lng}`, '_blank');
}
