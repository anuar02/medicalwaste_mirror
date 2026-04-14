import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { API_BASE_URL } from '../utils/constants';
import { Handoff } from '../types/models';
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

interface HandoffEventPayload {
  handoff?: Handoff;
  senderUserId?: string | null;
  receiverUserId?: string | null;
}

/**
 * Subscribes to realtime handoff events and patches the ['handoffs'] cache.
 * For drivers we only apply updates where the current user is a participant
 * (the backend scopes list queries the same way).
 */
export function useHandoffsRealtime(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enabled = options?.enabled ?? true;

  const currentUserId = String(
    (user as any)?._id || (user as any)?.id || '',
  );
  const role = user?.role;

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
            data?: HandoffEventPayload;
          };
          if (
            payload.type !== 'handoff_created' &&
            payload.type !== 'handoff_updated'
          ) {
            return;
          }
          const incoming = payload.data?.handoff;
          if (!incoming?._id) return;

          // Drivers only care about handoffs they participate in.
          if (role === 'driver') {
            const senderId = String(payload.data?.senderUserId ?? '');
            const receiverId = String(payload.data?.receiverUserId ?? '');
            if (
              senderId !== currentUserId &&
              receiverId !== currentUserId
            ) {
              return;
            }
          }

          queryClient.setQueryData<Handoff[] | undefined>(
            ['handoffs'],
            (current) => {
              if (!current) return current;
              const idx = current.findIndex((h) => h._id === incoming._id);
              if (idx === -1) {
                if (payload.type === 'handoff_created') {
                  return [incoming, ...current];
                }
                return current;
              }
              const next = current.slice();
              next[idx] = { ...next[idx], ...incoming };
              return next;
            },
          );

          // If the cache is empty (list never fetched yet), force a fetch
          // so the newly created handoff becomes visible.
          const state = queryClient.getQueryState(['handoffs']);
          if (!state || !state.data) {
            queryClient.invalidateQueries({ queryKey: ['handoffs'] });
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
  }, [enabled, queryClient, currentUserId, role]);
}
