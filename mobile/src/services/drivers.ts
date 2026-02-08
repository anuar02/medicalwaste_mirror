import { api } from './api';
import { ApiSuccess } from '../types/api';
import { DriverProfile } from '../types/models';

export async function fetchDriverProfile(): Promise<DriverProfile> {
  const response = await api.get<ApiSuccess<{ driver: DriverProfile }>>('/api/drivers/profile');
  if (response.data.status !== 'success' || !response.data.data?.driver) {
    throw new Error('Failed to fetch driver profile');
  }
  return response.data.data.driver;
}
