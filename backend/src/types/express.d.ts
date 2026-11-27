import { Role, StaffRole } from '@hotel/shared';

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: Role | string;
  staffRole?: StaffRole | string | null;
  hotelId?: string | null;
  staffId?: string | null;
  points?: number;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export {};
