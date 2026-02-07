import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  confirmHandoff,
  createDriverToIncineratorHandoff,
  createFacilityToDriverHandoff,
  fetchHandoffs,
} from '../services/handoffs';

export function useHandoffs() {
  return useQuery({
    queryKey: ['handoffs'],
    queryFn: fetchHandoffs,
  });
}

export function useConfirmHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handoffId: string) => confirmHandoff(handoffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
    },
  });
}

export function useCreateIncineratorHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      sessionId: string;
      containerIds: string[];
      incinerationPlant: string;
    }) => createDriverToIncineratorHandoff(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
    },
  });
}

export function useCreateFacilityHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { receiverUserId: string; containerIds: string[] }) =>
      createFacilityToDriverHandoff(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
    },
  });
}
