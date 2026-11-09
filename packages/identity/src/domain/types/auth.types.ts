export enum TenantPlan {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export type TenantDomain = {
  uuid: string;
  businessName: string;
  businessType?: string;
  logoUrl?: string | null;
  /** Solo de uso interno: se resuelve a `logoUrl` antes de salir por la API. */
  logoKey?: string | null;
  plan?: TenantPlan;
  createdAt: Date;
};
