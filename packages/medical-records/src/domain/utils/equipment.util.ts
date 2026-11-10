export const EQUIPMENT_BRAND_MAX_LENGTH = 80;
export const EQUIPMENT_MODEL_MAX_LENGTH = 80;
export const EQUIPMENT_ALREADY_EXISTS_CODE = 'EQUIPMENT_ALREADY_EXISTS';
export const EQUIPMENT_REQUIRED_CODE = 'EQUIPMENT_REQUIRED';
export const EQUIPMENT_LOCALE = 'es-CR';

/** Clave comparable de marca + modelo: sin mayúsculas ni espacios de más (igual que el índice único). */
export function equipmentKey(brand: string, model: string): string {
  const clean = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  return `${clean(brand)}\u0000${clean(model)}`;
}
