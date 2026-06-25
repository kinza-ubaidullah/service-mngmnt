/** Production-safe API base URL — works even if VITE_API_URL missing at build time */
export function resolveApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'aljaroshi.tech' || host === 'www.aljaroshi.tech') {
      return 'https://api.aljaroshi.tech';
    }
    if (host === 'crm.aljaroshi.com' || host === 'www.crm.aljaroshi.com') {
      return 'https://api.aljaroshi.com';
    }
  }

  return 'http://localhost:5000';
}
