export type AppointmentTypeEntity = {
  uuid: string;
  name: string;
  duration?: number | null;
  color?: string | null;
  tenantUUID: string;
};
