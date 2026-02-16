export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

export type Tenant = {
  id: number;
  uuid: string;
  businessName: string;
  businessType: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
};
