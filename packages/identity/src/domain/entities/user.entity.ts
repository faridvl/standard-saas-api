export type UserRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'USER';

export interface User {
  id: string;
  email: string;
  password?: string;
  tenantId: string; // ID de la Clínica (Audiocolors, Yireh, etc.)
  role: UserRole;
  permissions: string[];
  businessName?: string;
  createdAt: Date;
}
