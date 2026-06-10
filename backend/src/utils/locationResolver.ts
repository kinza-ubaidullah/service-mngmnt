import { resolveAreaCoords } from './areaCoords';

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

export async function expandAndParseGoogleMapsUrl(url?: string | null): Promise<[number, number] | null> {
  if (!url) return null;

  const direct = parseGoogleMapsCoords(url);
  if (direct) return direct;

  if (!url.includes('goo.gl') && !url.includes('maps.app')) return null;

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ServiceBot/1.0)' },
    });
    const fromFinalUrl = parseGoogleMapsCoords(res.url);
    if (fromFinalUrl) return fromFinalUrl;

    const html = await res.text();
    const fromHtml = parseGoogleMapsCoords(html);
    if (fromHtml) return fromHtml;

    const embedMatch = html.match(/https:\/\/www\.google\.com\/maps\/embed[^"']+/);
    if (embedMatch) {
      const fromEmbed = parseGoogleMapsCoords(embedMatch[0]);
      if (fromEmbed) return fromEmbed;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveLeadCoords(params: {
  lat?: number | null;
  lng?: number | null;
  area?: string | null;
  google_map_link?: string | null;
  exact_address?: string | null;
  areaLat?: number | null;
  areaLng?: number | null;
}): { lat: number; lng: number } | null {
  if (
    params.lat != null && params.lng != null &&
    !isNaN(Number(params.lat)) && !isNaN(Number(params.lng))
  ) {
    return { lat: Number(params.lat), lng: Number(params.lng) };
  }

  const fromLink = parseGoogleMapsCoords(params.google_map_link);
  if (fromLink) return { lat: fromLink[0], lng: fromLink[1] };

  if (params.areaLat != null && params.areaLng != null) {
    return { lat: params.areaLat, lng: params.areaLng };
  }

  const fromArea = resolveAreaCoords(params.area);
  if (fromArea) return { lat: fromArea[0], lng: fromArea[1] };

  return null;
}
