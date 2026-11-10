export const BRANCH_NAME_MAX_LENGTH = 80;
export const BRANCH_PHONE_MAX_LENGTH = 30;
export const BRANCH_ADDRESS_MAX_LENGTH = 200;
export const BRANCH_NAME_TAKEN_CODE = 'BRANCH_NAME_ALREADY_EXISTS';
export const BRANCH_LOCALE = 'es-CR';

/** Nombre comparable: sin tildes, sin mayúsculas y sin espacios de más. */
export function normalizeBranchName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Teléfono o dirección vacíos se guardan como null. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
