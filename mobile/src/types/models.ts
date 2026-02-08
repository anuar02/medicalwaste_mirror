export type UserRole = 'user' | 'admin' | 'supervisor' | 'driver';

export interface User {
  _id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  company?: string | { _id?: string; name?: string; contactInfo?: { phone?: string } };
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  vehicleInfo?: { plateNumber?: string; vehicleType?: string; model?: string; year?: number };
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  department?: string;
  createdAt?: string;
}

export interface DriverProfile {
  _id: string;
  user?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  medicalCompany?: { _id?: string; name?: string; licenseNumber?: string; contactInfo?: { phone?: string } };
  vehicleInfo?: {
    plateNumber?: string;
    model?: string;
    year?: number;
    capacity?: number;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  certifications?: {
    name?: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    certificateNumber?: string;
  }[];
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
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

export interface DriverLocation {
  _id: string;
  location?: {
    coordinates?: [number, number];
  };
  timestamp?: string;
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
  wasteClass?: string;
  wasteType?: string;
  fillLevel?: number;
  declaredWeight?: number;
  confirmedWeight?: number;
  bagCount?: number;
  notes?: string;
}

export interface HandoffDispute {
  raisedBy?: string;
  role?: string;
  reason?: string;
  description?: string;
  photos?: string[];
  resolvedBy?: string;
  resolution?: string;
  resolvedAt?: string;
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
  totalContainers?: number;
  totalDeclaredWeight?: number;
  totalConfirmedWeight?: number;
  createdAt?: string;
  completedAt?: string;
  tokenExpiresAt?: string;
  expiresAt?: string;
  dispute?: HandoffDispute;
}

export interface IncinerationPlant {
  _id: string;
  name: string;
  location?: {
    coordinates?: [number, number];
  };
  active?: boolean;
}

export interface MedicalCompany {
  _id: string;
  name: string;
  licenseNumber?: string;
  contactInfo?: { phone?: string };
}
