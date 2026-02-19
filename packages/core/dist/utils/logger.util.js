"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
class AuditLogger {
    static logAction(tenantId, userId, action, details) {
        const timestamp = new Date().toISOString();
        console.log(`[AUDIT] [${timestamp}] [Tenant: ${tenantId}] [User: ${userId}] Action: ${action}`, details);
    }
}
exports.AuditLogger = AuditLogger;
//# sourceMappingURL=logger.util.js.map