import { create } from 'zustand';

import { User } from '../types/models';
import {
  getStoredUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
  verifySession,
} from '../services/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    passwordConfirm: string;
    role: 'supervisor' | 'driver';
    company?: string;
    phoneNumber?: string;
    vehiclePlate?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  login: async (email, password) => {
    const user = await loginService(email, password);
    set({ user });
  },
  register: async (payload) => {
    const user = await registerService(payload);
    set({ user });
  },
  logout: async () => {
    await logoutService();
    set({ user: null });
  },
  hydrate: async () => {
    set({ isLoading: true });
    const stored = await getStoredUser();
    if (stored) {
      set({ user: stored, isLoading: false });
      return;
    }
    const verified = await verifySession();
    set({ user: verified, isLoading: false });
  },
}));
