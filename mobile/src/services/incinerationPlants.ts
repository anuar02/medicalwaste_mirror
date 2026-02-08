import axios from 'axios';

import { api } from './api';
import { ApiSuccess } from '../types/api';
import { IncinerationPlant } from '../types/models';

export interface IncinerationPlantsResponse {
  plants?: IncinerationPlant[];
}

export async function fetchIncinerationPlants(): Promise<IncinerationPlant[]> {
  try {
    const response = await api.get<ApiSuccess<IncinerationPlantsResponse>>('/api/incineration-plants?active=true');
    if (response.data.status !== 'success') {
      throw new Error('Failed to load incineration plants');
    }
    return response.data.data?.plants ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load incineration plants'));
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
