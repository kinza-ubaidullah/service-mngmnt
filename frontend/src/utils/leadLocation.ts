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
