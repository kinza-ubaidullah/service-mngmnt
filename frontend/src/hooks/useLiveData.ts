import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '../services/socket';

type DataModule =
  | 'leads'
  | 'workshop'
  | 'finance'
  | 'dashboard'
  | 'users'
  | 'system'
  | 'expenses'
  | 'settlements'
  | 'all';

interface UseLiveDataOptions {
  pollIntervalMs?: number;
  enabled?: boolean;
}

export function useLiveData(
  modules: DataModule[],
  onRefresh: () => void | Promise<void>,
  options: UseLiveDataOptions = {}
) {
  const { pollIntervalMs = 30000, enabled = true } = options;
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshRef.current();
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    socket.connect();
    socket.emit('join_room', 'operations');

    const handler = (payload: { module?: string }) => {
      const mod = payload?.module || 'all';
      if (modules.includes('all') || modules.includes(mod as DataModule)) {
        onRefreshRef.current();
      }
    };

    socket.on('data_changed', handler);

    const interval = pollIntervalMs > 0
      ? window.setInterval(() => onRefreshRef.current(), pollIntervalMs)
      : null;

    return () => {
      socket.off('data_changed', handler);
      if (interval) window.clearInterval(interval);
    };
  }, [enabled, modules.join(','), pollIntervalMs]);

  return { refresh, refreshing };
}
