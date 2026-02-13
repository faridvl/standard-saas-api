export interface IRegistrationResult {
  tenantUuid: string; // El identificador público de la empresa
  userUuid: string; // El identificador público del usuario
  email: string; // El correo registrado (para confirmación)
  status: string; // El estado inicial (ej: 'ACTIVE')
}
