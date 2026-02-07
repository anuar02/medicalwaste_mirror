import { api } from './api';
import { ApiSuccess } from '../types/api';
import { WasteBin } from '../types/models';

export interface WasteBinsResponse {
  wasteBins?: WasteBin[];
  bins?: WasteBin[];
  containers?: WasteBin[];
}

export async function fetchWasteBins(): Promise<WasteBin[]> {
  const response = await api.get<ApiSuccess<WasteBinsResponse>>('/api/waste-bins');
  if (response.data.status !== 'success') {
    throw new Error('Failed to load waste bins');
  }
  const payload = response.data.data;
  return payload?.wasteBins ?? payload?.bins ?? payload?.containers ?? [];
}

export async function scheduleCollection(
  binId: string,
  scheduledFor: string,
  priority?: 'low' | 'medium' | 'high' | 'critical',
  notes?: string
) {
  const response = await api.post<ApiSuccess<{ schedule?: unknown }>>(
    `/api/waste-bins/${binId}/schedule-collection`,
    {
      scheduledFor,
      priority,
      notes,
    }
  );
  if (response.data.status !== 'success') {
    throw new Error('Failed to schedule collection');
  }
  return response.data.data;
}
