export enum TenantPlan {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export type TenantDomain = {
  uuid: string;
  businessName: string;
  plan?: TenantPlan;
  createdAt: Date;
};
