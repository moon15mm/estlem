import { Language, StaffRole, SystemRole } from '../enums';

export interface Customer {
  id: string;
  mobile: string;
  fullName?: string;
  preferredLang: Language;
  vehicles: CustomerVehicle[];
  createdAt: string;
}

export interface CustomerVehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  isDefault: boolean;
}

export interface Staff {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  mobile: string;
  role: StaffRole;
  isActive: boolean;
}

export interface SuperAdmin {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  isActive: boolean;
  lastLoginAt?: string;
}
