export interface JwtPayload {
  sub: string;
  email: string;
  role?: string | null;
  tenantId: number;
  tenantUuid: string;
  /** Se fija al emitir el token: un cambio de acceso aplica al renovarlo (POST /auth/refresh o nuevo login). */
  attendsPatients?: boolean;
  specialties?: string[];
}
