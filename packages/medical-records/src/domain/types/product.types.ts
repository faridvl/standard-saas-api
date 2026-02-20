export type Product = {
  uuid: string;
  tenantUuid: string;
  sku: string;
  name: string;
  model?: string;
  description?: string;
  price: number;
  stock: {
    current: number;
    min: number;
  };
  cabysCode?: string;
  isActive: boolean;
  createdAt: Date;
}
