export interface EquipmentEntity {
  uuid: string;
  brand: string;
  model: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Lo que devuelve una audiometría: el equipo con marca y modelo copiados al crearla. */
export interface AudiometryEquipment {
  uuid: string;
  brand: string;
  model: string;
}
