import { useEffect, useState, useSyncExternalStore } from 'react';
import { getLiveTechnicians, subscribeLiveTechnicians } from '../services/liveTechnicianStore';

export const useLiveTechnicians = () => {
  const technicians = useSyncExternalStore(subscribeLiveTechnicians, getLiveTechnicians, getLiveTechnicians);
  return technicians;
};

/** Merge socket/API list with live store (store wins on lat/lng when fresher) */
export const useMergedTechnicians = (apiTechnicians: any[]) => {
  const live = useLiveTechnicians();
  const [merged, setMerged] = useState<any[]>(apiTechnicians);

  useEffect(() => {
    if (!apiTechnicians.length && !live.length) {
      setMerged([]);
      return;
    }
    const liveMap = new Map(live.map((t) => [t.id, t]));
    const ids = new Set([...apiTechnicians.map((t) => t.id), ...live.map((t) => t.id)]);
    const result = [...ids].map((id) => {
      const api = apiTechnicians.find((t) => t.id === id);
      const lv = liveMap.get(id);
      if (!api && lv) return lv;
      if (!lv) return api;
      const useLive =
        lv.lastLiveAt != null &&
        (api?.lastLiveAt == null || lv.lastLiveAt >= (api.lastLiveAt ?? 0));
      return {
        ...api,
        ...lv,
        lat: useLive && lv.lat != null ? lv.lat : api?.lat ?? lv.lat,
        lng: useLive && lv.lng != null ? lv.lng : api?.lng ?? lv.lng,
        lastLiveAt: Math.max(lv.lastLiveAt ?? 0, api?.lastLiveAt ?? 0) || null,
        assigned_jobs: api?.assigned_jobs ?? lv.assigned_jobs,
        name: api?.name ?? lv.name,
      };
    });
    setMerged(result.filter(Boolean));
  }, [apiTechnicians, live]);

  return merged;
};
