import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchActiveCollection,
  fetchCollectionHistory,
  markCollectionVisited,
  stopCollection,
} from '../services/collections';

export function useActiveCollection() {
  return useQuery({
    queryKey: ['collections', 'active'],
    queryFn: fetchActiveCollection,
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
