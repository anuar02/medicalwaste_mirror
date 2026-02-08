import axios from 'axios';

import { api } from './api';
import { ApiSuccess } from '../types/api';
import { Handoff } from '../types/models';

export interface HandoffsResponse {
  handoffs?: Handoff[];
}

export async function fetchHandoffs(): Promise<Handoff[]> {
  try {
    const response = await api.get<ApiSuccess<HandoffsResponse>>('/api/handoffs');
    if (response.data.status !== 'success') {
      throw new Error('Failed to load handoffs');
    }
    return response.data.data?.handoffs ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load handoffs'));
  }
}

export async function confirmHandoff(handoffId: string): Promise<Handoff> {
  try {
    const response = await api.patch<ApiSuccess<{ handoff: Handoff }>>(`/api/handoffs/${handoffId}/confirm`);
    if (response.data.status !== 'success' || !response.data.data?.handoff) {
      throw new Error('Failed to confirm handoff');
    }
    return response.data.data.handoff;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to confirm handoff'));
  }
}

export async function createDriverToIncineratorHandoff(params: {
  sessionId: string;
  containerIds: string[];
  incinerationPlant: string;
}): Promise<{ handoff: Handoff; confirmationToken?: string }> {
  try {
    const response = await api.post<ApiSuccess<{ handoff: Handoff; confirmationToken?: string }>>('/api/handoffs', {
      type: 'driver_to_incinerator',
      sessionId: params.sessionId,
      containerIds: params.containerIds,
      incinerationPlant: params.incinerationPlant,
    });
    if (response.data.status !== 'success' || !response.data.data?.handoff) {
      throw new Error('Failed to create handoff');
    }
    return {
      handoff: response.data.data.handoff,
      confirmationToken: response.data.data.confirmationToken,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to create handoff'));
  }
}

export async function createFacilityToDriverHandoff(params: {
  receiverUserId: string;
  containerIds: string[];
}): Promise<Handoff> {
  try {
    const response = await api.post<ApiSuccess<{ handoff: Handoff }>>('/api/handoffs', {
      type: 'facility_to_driver',
      receiver: { user: params.receiverUserId },
      containerIds: params.containerIds,
    });
    if (response.data.status !== 'success' || !response.data.data?.handoff) {
      throw new Error('Failed to create facility handoff');
    }
    return response.data.data.handoff;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to create facility handoff'));
  }
}

export async function disputeHandoff(params: {
  handoffId: string;
  reason: string;
  description?: string;
}): Promise<Handoff> {
  try {
    const response = await api.post<ApiSuccess<{ handoff: Handoff }>>(
      `/api/handoffs/${params.handoffId}/dispute`,
      {
        reason: params.reason,
        description: params.description,
      },
    );
    if (response.data.status !== 'success' || !response.data.data?.handoff) {
      throw new Error('Failed to dispute handoff');
    }
    return response.data.data.handoff;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to dispute handoff'));
  }
}

export async function resendHandoffNotification(handoffId: string): Promise<Handoff> {
  try {
    const response = await api.post<ApiSuccess<{ handoff: Handoff }>>(
      `/api/handoffs/${handoffId}/resend-notification`,
    );
    if (response.data.status !== 'success' || !response.data.data?.handoff) {
      throw new Error('Failed to resend handoff notification');
    }
    return response.data.data.handoff;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to resend handoff notification'));
  }
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim().length) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
