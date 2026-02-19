export interface JwtPayload {
    sub: string;
    email: string;
    role?: string | null;
    tenantId: number;
    tenantUuid: string;
}
