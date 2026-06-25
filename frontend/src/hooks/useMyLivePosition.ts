import { useEffect, useState } from 'react';
import { getLiveTechnicians, subscribeLiveTechnicians } from '../services/liveTechnicianStore';

/** Subscribe to the logged-in technician's latest live GPS position */
export function useMyLivePosition(userId?: number) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!userId) {
      setPosition(null);
      return;
    }
    const sync = () => {
      const tech = getLiveTechnicians().find((t) => t.id === userId);
      if (tech?.lat != null && tech?.lng != null) {
        setPosition({ lat: Number(tech.lat), lng: Number(tech.lng) });
      }
    };
    sync();
    const unsubscribe = subscribeLiveTechnicians(sync);
    return () => {
      unsubscribe();
    };
  }, [userId]);

  return position;
}
