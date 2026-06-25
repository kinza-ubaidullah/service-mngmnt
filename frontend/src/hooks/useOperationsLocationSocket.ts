import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { subscribeToTechLocations } from '../services/operationsLocationSocket';

/** Keeps operations room joined for live tech GPS even when map panel is closed. */
export const useOperationsLocationSocket = (
  onLocation: (data: { techId: number; lat: number; lng: number }) => void
) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const onLocationRef = useRef(onLocation);
  onLocationRef.current = onLocation;

  const canListen =
    isAuthenticated && (user?.role === 'CALL_CENTER' || user?.role === 'ADMIN');

  useEffect(() => {
    if (!canListen) return;
    return subscribeToTechLocations((data) => onLocationRef.current(data));
  }, [canListen]);
};
