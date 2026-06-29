export interface MaintenanceEntity {
  uuid: string;
  patientUuid: string;
  tenantUuid: string;
  performedBy: string;
  performedAt: string;
  description: string;
  nextMaintenanceAt: string | null;
  deviceUuid: string | null;
  createdAt: string;
}
