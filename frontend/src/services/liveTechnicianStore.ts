export type LiveTechnician = {
  id: number;
  name: string;
  phone?: string;
  lat?: number | null;
  lng?: number | null;
  specialization?: string;
  team_id?: number | null;
  team?: { name: string };
  assigned_jobs?: any[];
  lastLiveAt?: number | null;
};

type Listener = () => void;

let technicians: LiveTechnician[] = [];
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((l) => l());

export const getLiveTechnicians = (): LiveTechnician[] => technicians;

export const subscribeLiveTechnicians = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const setLiveTechnicians = (list: LiveTechnician[]) => {
  const existingMap = new Map(technicians.map(t => [t.id, t]));
  technicians = list.map((t) => {
    const existing = existingMap.get(t.id);
    const isDifferent = existing && (existing.lat !== t.lat || existing.lng !== t.lng);
    const lastLiveAt = isDifferent 
      ? Date.now() 
      : (existing?.lastLiveAt ?? (t.lat != null && t.lng != null ? Date.now() : null));

    return {
      ...t,
      lastLiveAt,
    };
  });
  notify();
};

export const mergeTechnicianLocation = (techId: number, lat: number, lng: number) => {
  const id = Number(techId);
  const now = Date.now();
  const idx = technicians.findIndex((t) => t.id === id);
  if (idx >= 0) {
    technicians = technicians.map((t) =>
      t.id === id ? { ...t, lat: Number(lat), lng: Number(lng), lastLiveAt: now } : t
    );
  } else {
    technicians = [...technicians, { id, name: `Tech #${id}`, lat: Number(lat), lng: Number(lng), lastLiveAt: now }];
  }
  notify();
};

export const isTechnicianLive = (tech: LiveTechnician, maxAgeMs = 120_000) =>
  tech.lastLiveAt != null && Date.now() - tech.lastLiveAt < maxAgeMs;
