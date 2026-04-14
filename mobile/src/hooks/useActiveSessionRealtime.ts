import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { API_BASE_URL } from '../utils/constants';
import { CollectionSession } from '../types/models';
import { useAuthStore } from '../stores/authStore';

function getWsUrl() {
  if (API_BASE_URL.startsWith('https://')) {
    return `${API_BASE_URL.replace('https://', 'wss://')}/ws/gps`;
  }
  if (API_BASE_URL.startsWith('http://')) {
    return `${API_BASE_URL.replace('http://', 'ws://')}/ws/gps`;
  }
  return `${API_BASE_URL}/ws/gps`;
}

interface SessionEventPayload {
  session?: CollectionSession;
  driverId?: string | null;
  status?: string | null;
}

/**
 * Subscribes to realtime session events. When the current driver's session
 * starts or completes, patch the ['collections', 'active'] cache so the UI
 * flips without a polling cycle.
 */
export function useActiveSessionRealtime(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enabled = options?.enabled ?? true;

  const currentUserId = String(
    (user as any)?._id || (user as any)?.id || '',
  );

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(getWsUrl());

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            data?: SessionEventPayload;
          };
          if (payload.type !== 'session_updated') return;
          const data = payload.data;
          if (!data?.session) return;
          if (String(data.driverId ?? '') !== currentUserId) return;

          if (data.status === 'active') {
            queryClient.setQueryData(
              ['collections', 'active'],
              data.session,
            );
          } else {
            // Any non-active status means the session ended for this driver.
            queryClient.setQueryData(['collections', 'active'], null);
            queryClient.invalidateQueries({
              queryKey: ['collections', 'history'],
            });
          }
        } catch {
          // Ignore malformed socket messages
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, queryClient, currentUserId]);
}
