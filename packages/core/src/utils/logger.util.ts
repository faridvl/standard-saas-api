export class AuditLogger {
  static logAction(tenantId: string, userId: string, action: string, details: unknown): void {
    const timestamp = new Date().toISOString();
    // En el futuro, esto se guardará en una tabla de CloudWatch o MongoDB
    console.log(
      `[AUDIT] [${timestamp}] [Tenant: ${tenantId}] [User: ${userId}] Action: ${action}`,
      details,
    );
  }
}
