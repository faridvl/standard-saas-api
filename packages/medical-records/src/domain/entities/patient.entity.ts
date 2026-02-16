export type PatientEntity = {
  uuid?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  birthDate: Date;
  tenantId: number;
  tenantUuid: string;
  createdBy: string;
  createdAt?: Date;
};
