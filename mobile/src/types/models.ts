export type UserRole = 'user' | 'admin' | 'supervisor' | 'driver';

export interface UserProfile {
  fullName?: string;
  phone?: string;
  avatar?: string;
}

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  company?: string;
  profile?: UserProfile;
}

export interface WasteBin {
  _id: string;
  binId?: string;
  department?: string;
  wasteType?: string;
  fullness?: number;
  temperature?: number;
  status?: string;
  lastUpdate?: string;
  location?: {
    coordinates?: [number, number];
  };
  visited?: boolean;
}

export interface CollectionContainer {
  container: WasteBin;
  visited?: boolean;
  collectedWeight?: number;
}

export interface CollectionSession {
  _id: string;
  sessionId: string;
  driver: string;
  route?: string;
  status: 'active' | 'completed';
  startTime?: string;
  endTime?: string;
  selectedContainers?: CollectionContainer[];
}

export interface HandoffParty {
  user?: {
    _id: string;
    username?: string;
    phoneNumber?: string;
  } | null;
  name?: string;
  phone?: string;
  confirmedAt?: string;
}

export interface HandoffContainer {
  container: string;
  binId?: string;
  declaredWeight?: number;
  confirmedWeight?: number;
  bagCount?: number;
}

export interface Handoff {
  _id: string;
  handoffId?: string;
  type: 'facility_to_driver' | 'driver_to_incinerator';
  status: string;
  session?: {
    _id: string;
    sessionId?: string;
    status?: string;
  };
  sender?: HandoffParty;
  receiver?: HandoffParty;
  containers?: HandoffContainer[];
  totalDeclaredWeight?: number;
  createdAt?: string;
}

export interface IncinerationPlant {
  _id: string;
  name: string;
  location?: {
    coordinates?: [number, number];
  };
  active?: boolean;
}
