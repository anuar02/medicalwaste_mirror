import { api } from './api';
import { ApiSuccess } from '../types/api';
import { Handoff } from '../types/models';

export interface HandoffsResponse {
  handoffs?: Handoff[];
}

export async function fetchHandoffs(): Promise<Handoff[]> {
  const response = await api.get<ApiSuccess<HandoffsResponse>>('/api/handoffs');
  if (response.data.status !== 'success') {
    throw new Error('Failed to load handoffs');
  }
  return response.data.data?.handoffs ?? [];
}

export async function confirmHandoff(handoffId: string): Promise<Handoff> {
  const response = await api.patch<ApiSuccess<{ handoff: Handoff }>>(`/api/handoffs/${handoffId}/confirm`);
  if (response.data.status !== 'success' || !response.data.data?.handoff) {
    throw new Error('Failed to confirm handoff');
  }
  return response.data.data.handoff;
}

export async function createDriverToIncineratorHandoff(params: {
  sessionId: string;
  containerIds: string[];
  incinerationPlant: string;
}): Promise<Handoff> {
  const response = await api.post<ApiSuccess<{ handoff: Handoff }>>('/api/handoffs', {
    type: 'driver_to_incinerator',
    sessionId: params.sessionId,
    containerIds: params.containerIds,
    incinerationPlant: params.incinerationPlant,
  });
  if (response.data.status !== 'success' || !response.data.data?.handoff) {
    throw new Error('Failed to create handoff');
  }
  return response.data.data.handoff;
}

export async function createFacilityToDriverHandoff(params: {
  receiverUserId: string;
  containerIds: string[];
}): Promise<Handoff> {
  const response = await api.post<ApiSuccess<{ handoff: Handoff }>>('/api/handoffs', {
    type: 'facility_to_driver',
    receiver: { user: params.receiverUserId },
    containerIds: params.containerIds,
  });
  if (response.data.status !== 'success' || !response.data.data?.handoff) {
    throw new Error('Failed to create facility handoff');
  }
  return response.data.data.handoff;
}
