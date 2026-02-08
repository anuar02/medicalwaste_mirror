import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { api } from './api';
import { ApiSuccess, AuthResponseData } from '../types/api';
import { User } from '../types/models';

const USER_KEY = 'user';
const TOKEN_KEY = 'auth_token';

export async function login(email: string, password: string): Promise<User> {
  const response = await api.post<ApiSuccess<AuthResponseData>>('/api/auth/login', {
    email,
    password,
  });

  if (response.data.status !== 'success' || !response.data.token || !response.data.data) {
    throw new Error('Invalid login response');
  }

  await SecureStore.setItemAsync(TOKEN_KEY, response.data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));

  return response.data.data.user;
}

export async function register(payload: {
  firstName: string;
  lastName: string;
  email?: string;
  password: string;
  passwordConfirm: string;
  role?: 'user' | 'supervisor' | 'driver';
  company?: string;
  phoneNumber: string;
  vehiclePlate?: string;
}): Promise<User> {
  const response = await api.post<ApiSuccess<AuthResponseData>>('/api/auth/register', {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email || undefined,
    password: payload.password,
    passwordConfirm: payload.passwordConfirm,
    role: payload.role,
    company: payload.company,
    phoneNumber: payload.phoneNumber,
    vehicleInfo: payload.vehiclePlate ? { plateNumber: payload.vehiclePlate } : undefined,
  });

  if (response.data.status !== 'success' || !response.data.token || !response.data.data) {
    throw new Error('Invalid registration response');
  }

  await SecureStore.setItemAsync(TOKEN_KEY, response.data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));

  return response.data.data.user;
}

export async function startPhoneLogin(phoneNumber: string): Promise<void> {
  const response = await api.post<ApiSuccess<{ status: string }>>('/api/auth/phone/start', {
    phoneNumber,
  });
  if (response.data.status !== 'success') {
    throw new Error('Failed to start phone login');
  }
}

export async function verifyPhoneLogin(phoneNumber: string, code: string): Promise<User> {
  const response = await api.post<ApiSuccess<AuthResponseData>>('/api/auth/phone/verify', {
    phoneNumber,
    code,
  });
  if (response.data.status !== 'success' || !response.data.token || !response.data.data) {
    throw new Error('Invalid phone login response');
  }
  await SecureStore.setItemAsync(TOKEN_KEY, response.data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
  return response.data.data.user;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function verifySession(): Promise<User | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return null;

  try {
    const response = await api.get<ApiSuccess<AuthResponseData>>('/api/auth/verify');
    if (response.data.status !== 'success' || !response.data.data) {
      return null;
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
    return response.data.data.user;
  } catch {
    await logout();
    return null;
  }
}

export async function updateProfile(fields: {
  username?: string;
  phoneNumber?: string;
  vehicleInfo?: { plateNumber?: string };
}): Promise<User> {
  const response = await api.patch<ApiSuccess<AuthResponseData>>('/api/users/profile', fields);
  if (response.data.status !== 'success' || !response.data.data) {
    throw new Error('Failed to update profile');
  }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
  return response.data.data.user;
}

export async function fetchProfile(): Promise<User> {
  const response = await api.get<ApiSuccess<AuthResponseData>>('/api/users/profile');
  if (response.data.status !== 'success' || !response.data.data) {
    throw new Error('Failed to fetch profile');
  }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
  return response.data.data.user;
}
