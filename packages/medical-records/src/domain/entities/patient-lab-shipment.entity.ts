export interface PatientLabShipmentEntity {
  uuid: string;
  /** Día de envío, "YYYY-MM-DD" en hora de Costa Rica. */
  sentAt: string;
  /** Día de entrega; null mientras los audífonos siguen en el laboratorio. */
  deliveredAt: string | null;
  note: string | null;
  /** Null en los envíos abiertos por la migración desde datos viejos. */
  createdByUuid: string | null;
  createdByName: string | null;
  deliveredByUuid: string | null;
  deliveredByName: string | null;
}
