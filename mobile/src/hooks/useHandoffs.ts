import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  confirmHandoff,
  createDriverToIncineratorHandoff,
  createFacilityToDriverHandoff,
  disputeHandoff,
  fetchHandoffs,
  resendHandoffNotification,
} from '../services/handoffs';

export function useHandoffs(options?: { enabled?: boolean; refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['handoffs'],
    queryFn: fetchHandoffs,
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
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

export function useDisputeHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { handoffId: string; reason: string; description?: string }) =>
      disputeHandoff(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
    },
  });
}

export function useResendHandoffNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handoffId: string) => resendHandoffNotification(handoffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
    },
  });
}
