export type AppointmentTypeEntity = {
  uuid: string;
  name: string;
  duration?: number | null;
  color?: string | null;
  speciality?: string | null;
  isControl: boolean;
  tenantUUID: string;
};
