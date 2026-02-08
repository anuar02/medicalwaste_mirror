import { api } from './api';
import { ApiSuccess } from '../types/api';
import { DriverProfile, MedicalCompany } from '../types/models';

export async function fetchDriverProfile(): Promise<DriverProfile> {
  const response = await api.get<ApiSuccess<{ driver: DriverProfile }>>('/api/drivers/profile');
  if (response.data.status !== 'success' || !response.data.data?.driver) {
    throw new Error('Failed to fetch driver profile');
  }
  return response.data.data.driver;
}

export async function registerDriver(payload: {
  licenseNumber: string;
  licenseExpiry: string;
  medicalCompanyId: string;
  vehiclePlate: string;
}): Promise<DriverProfile> {
  const response = await api.post<ApiSuccess<{ driver: DriverProfile }>>('/api/drivers/register', {
    licenseNumber: payload.licenseNumber,
    licenseExpiry: payload.licenseExpiry,
    medicalCompanyId: payload.medicalCompanyId,
    vehicleInfo: { plateNumber: payload.vehiclePlate },
  });
  if (response.data.status !== 'success' || !response.data.data?.driver) {
    throw new Error('Failed to register driver');
  }
  return response.data.data.driver;
}

export async function fetchMedicalCompanies(): Promise<MedicalCompany[]> {
  const response = await api.get<ApiSuccess<{ companies: MedicalCompany[] }>>('/api/medical-companies');
  if (response.data.status !== 'success' || !response.data.data?.companies) {
    throw new Error('Failed to fetch medical companies');
  }
  return response.data.data.companies;
}
