import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchActiveCollection,
  fetchCollectionHistory,
  fetchSessionRoute,
  markCollectionVisited,
  startCollection,
  stopCollection,
} from '../services/collections';

export function useActiveCollection() {
  return useQuery({
    queryKey: ['collections', 'active'],
    queryFn: fetchActiveCollection,
  });
}

export function useStartCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof startCollection>[0]) => startCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['waste-bins'] });
    },
  });
}

export function useStopCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => stopCollection(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'active'] });
    },
  });
}

export function useMarkVisited() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, containerId, collectedWeight }: {
      sessionId: string;
      containerId: string;
      collectedWeight?: number;
    }) => markCollectionVisited(sessionId, containerId, collectedWeight),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'active'] });
    },
  });
}

export function useCollectionHistory() {
  return useQuery({
    queryKey: ['collections', 'history'],
    queryFn: fetchCollectionHistory,
  });
}

export function useSessionRoute(sessionId?: string, options?: { enabled?: boolean; refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['collections', 'route', sessionId],
    queryFn: () => fetchSessionRoute(sessionId ?? ''),
    enabled: Boolean(sessionId) && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}
