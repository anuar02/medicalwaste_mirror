import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { API_BASE_URL } from '../utils/constants';
import { CollectionSession, DriverLocation } from '../types/models';

interface SessionRoutePayload {
  sessionId?: string;
  sessionMongoId?: string;
  location?: DriverLocation & { _id?: string };
}

function getWsUrl() {
  if (API_BASE_URL.startsWith('https://')) {
    return `${API_BASE_URL.replace('https://', 'wss://')}/ws/gps`;
  }
  if (API_BASE_URL.startsWith('http://')) {
    return `${API_BASE_URL.replace('http://', 'ws://')}/ws/gps`;
  }
  return `${API_BASE_URL}/ws/gps`;
}

export function useSessionRouteRealtime(session?: CollectionSession | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const ws = new WebSocket(getWsUrl());

    ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            data?: SessionRoutePayload;
          };

          if (payload.type !== 'collection_location_update' || !payload.data?.location) {
            return;
          }

          const matchesSession =
            payload.data.sessionId === session.sessionId ||
            payload.data.sessionMongoId === session._id;

          if (!matchesSession) return;

          const patchRoute = (queryKeyId: string) => {
            queryClient.setQueryData(
              ['collections', 'route', queryKeyId],
              (
                current:
                  | { session: CollectionSession; route?: DriverLocation[] }
                  | undefined,
              ) => {
                if (!current) return current;
                const nextPoint = payload.data?.location;
                if (!nextPoint) return current;

                const existingRoute = current.route ?? [];
                const alreadyExists = existingRoute.some((point: any) => {
                  if (nextPoint._id && point?._id) {
                    return String(point._id) === String(nextPoint._id);
                  }
                  return point?.timestamp === nextPoint.timestamp;
                });

                if (alreadyExists) return current;

                return {
                  ...current,
                  route: [...existingRoute, nextPoint],
                };
              },
            );
          };

          patchRoute(session._id);
          patchRoute(session.sessionId);
        } catch {
          // Ignore malformed socket messages
        }
    };

    return () => {
      ws.close();
    };
  }, [queryClient, session?._id, session?.sessionId, session?.status]);
}
