export type PatientContactInput = {
  name: string;
  phone: string;
};

export type PatientEntity = {
  uuid?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  birthDate: Date;
  email?: string;
  gender?: string;
  bloodType?: string;
  documentId?: string;
  branchUuid?: string;
  contacts?: PatientContactInput[];
  tenantId: number;
  tenantUuid: string;
  createdBy: string;
  createdAt?: Date;
};
