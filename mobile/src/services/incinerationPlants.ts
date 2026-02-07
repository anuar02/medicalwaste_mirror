import { api } from './api';
import { ApiSuccess } from '../types/api';
import { IncinerationPlant } from '../types/models';

export interface IncinerationPlantsResponse {
  plants?: IncinerationPlant[];
}

export async function fetchIncinerationPlants(): Promise<IncinerationPlant[]> {
  const response = await api.get<ApiSuccess<IncinerationPlantsResponse>>('/api/incineration-plants?active=true');
  if (response.data.status !== 'success') {
    throw new Error('Failed to load incineration plants');
  }
  return response.data.data?.plants ?? [];
}
