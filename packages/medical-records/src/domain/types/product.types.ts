export type ProductUnitStatus = 'AVAILABLE' | 'ASSIGNED' | 'DAMAGED' | 'RETIRED';

export type ProductUnit = {
  uuid: string;
  serialNumber: string;
  status: ProductUnitStatus;
  purchaseDate?: Date;
  warrantyUntil?: Date;
  photoUrl?: string;
  notes?: string;
  assignedToPatientUuid?: string;
  assignedAt?: Date;
  createdAt: Date;
  patient?: { uuid: string; name: string };
};

export type Product = {
  uuid: string;
  tenantUuid: string;
  sku: string;
  name: string;
  brand?: string;
  model?: string;
  description?: string;
  price: number;
  stock: {
    current?: number;
    min: number;
  };
  cabysCode?: string;
  isActive: boolean;
  createdAt: Date;
};
