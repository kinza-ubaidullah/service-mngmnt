import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useTechnicianLocationTracking } from '../hooks/useTechnicianLocationTracking';
import { subscribeToTechLocations } from '../services/operationsLocationSocket';
import { mergeTechnicianLocation, setLiveTechnicians } from '../services/liveTechnicianStore';
import api from '../services/api';

const OPS_ROLES = ['ADMIN', 'CALL_CENTER'];
const POLL_MS = 12_000;

/** App-wide live GPS — technician sends, operations panel receives + polls fallback */
const LocationServices = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  useTechnicianLocationTracking();

  const role = user?.role;
  const canListen = isAuthenticated && role && OPS_ROLES.includes(role);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!canListen) return;

    const fetchTechs = async () => {
      try {
        const res = await api.get('/users/technicians');
        const list = res.data.technicians || [];
        setLiveTechnicians(
          list.map((t: any) => ({
            ...t,
            lastLiveAt: t.lat != null && t.lng != null ? Date.now() : null,
          }))
        );
      } catch {
        /* keep last known */
      }
    };

    fetchTechs();
    pollRef.current = setInterval(fetchTechs, POLL_MS);

    const unsub = subscribeToTechLocations(({ techId, lat, lng }) => {
      mergeTechnicianLocation(techId, lat, lng);
    });

    return () => {
      unsub();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [canListen]);

  return null;
};

export default LocationServices;
