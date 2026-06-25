/** Production-safe API base URL */
export function resolveApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    // All production domains point to the new VPS API
    if (
      host === 'aljaroshi.tech' ||
      host === 'www.aljaroshi.tech' ||
      host === 'crm.aljaroshi.com' ||
      host === 'www.crm.aljaroshi.com'
    ) {
      return 'https://api.aljaroshi.tech';
    }
  }

  return 'http://localhost:5000';
}
