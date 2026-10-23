/**
 * Roles que ven información clínica: historia clínica, Control de evolución y
 * la bitácora. STAFF (recepción, secretaría) queda fuera: Ley 8968 clasifica los
 * datos de salud como sensibles.
 */
export const CLINICAL_ACCESS_ROLES = ['OWNER', 'ADMIN', 'DOCTOR'];

/** Metadata que lee `RolesGuard` de `@project/core`. */
export const ROLES_METADATA_KEY = 'roles';
