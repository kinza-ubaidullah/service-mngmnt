import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  startTechnicianLocationTracking,
  stopTechnicianLocationTracking,
} from '../services/technicianLocationTracker';

/** Keeps technician GPS streaming alive on every route — not tied to dashboard mount. */
export const useTechnicianLocationTracking = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'TECHNICIAN' && user?.id) {
      startTechnicianLocationTracking(Number(user.id));
      return;
    }
    stopTechnicianLocationTracking();
  }, [isAuthenticated, user?.id, user?.role]);
};
