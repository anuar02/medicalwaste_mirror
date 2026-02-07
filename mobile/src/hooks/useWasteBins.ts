import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchWasteBins, scheduleCollection } from '../services/wasteBins';

export function useWasteBins() {
  return useQuery({
    queryKey: ['waste-bins'],
    queryFn: fetchWasteBins,
  });
}

export function useScheduleCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      binId,
      scheduledFor,
      priority,
      notes,
    }: {
      binId: string;
      scheduledFor: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      notes?: string;
    }) => scheduleCollection(binId, scheduledFor, priority, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-bins'] });
    },
  });
}
