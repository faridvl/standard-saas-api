export const EQUIPMENT_BRAND_MAX_LENGTH = 80;
export const EQUIPMENT_MODEL_MAX_LENGTH = 80;
export const EQUIPMENT_ALREADY_EXISTS_CODE = 'EQUIPMENT_ALREADY_EXISTS';
export const EQUIPMENT_REQUIRED_CODE = 'EQUIPMENT_REQUIRED';
export const EQUIPMENT_LOCALE = 'es-CR';

/** Marca o modelo como se guarda: sin espacios en los bordes y con los internos colapsados a uno. */
export function normalizeEquipmentText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Clave comparable de marca + modelo: sin mayúsculas ni espacios de más (igual que el índice único). */
export function equipmentKey(brand: string, model: string): string {
  const clean = (value: string) => normalizeEquipmentText(value).toLowerCase();
  return `${clean(brand)}\u0000${clean(model)}`;
}
