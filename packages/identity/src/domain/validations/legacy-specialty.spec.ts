import { describe, it, expect } from '@jest/globals';
import { CreateUserSchema } from '../dtos/create-user.dto';
import { RegisterTenantSchema } from '../dtos/register-tenant.dto';
import { UpdateUserSchema } from '../dtos/update-user.dto';

const registerBase = {
  businessName: 'Clínica',
  ownerName: 'Ana',
  email: 'ana@correo.test',
  password: 'Clave1234',
  isSpecialist: true,
};

const createBase = {
  email: 'luis@correo.test',
  fullName: 'Luis',
  password: 'Clave1234',
  attendsPatients: true,
};

describe('specialty legacy (un solo código en vez de specialties)', () => {
  it('registro: un código del catálogo se toma como la especialidad', () => {
    const result = RegisterTenantSchema.safeParse({ ...registerBase, specialty: 'AUDIOLOGY' });
    expect(result.success).toBe(true);
    expect(result.success && (result.data as { specialties: string[] }).specialties).toEqual([
      'AUDIOLOGY',
    ]);
  });

  it('registro: un valor fuera del catálogo se ignora y sigue exigiendo especialidad', () => {
    const result = RegisterTenantSchema.safeParse({ ...registerBase, specialty: 'DENTAL' });
    expect(result.success).toBe(false);
  });

  it('registro de no especialista con specialty fuera del catálogo: pasa y se ignora', () => {
    const result = RegisterTenantSchema.safeParse({
      ...registerBase,
      isSpecialist: false,
      specialty: 'DENTAL',
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty('specialty');
  });

  it('si viene specialties, specialty no la pisa', () => {
    const result = CreateUserSchema.safeParse({
      ...createBase,
      specialties: ['ENT'],
      specialty: 'AUDIOLOGY',
    });
    expect(result.success && (result.data as { specialties: string[] }).specialties).toEqual([
      'ENT',
    ]);
  });

  it('crear y actualizar usuario: código del catálogo se mapea', () => {
    const created = CreateUserSchema.safeParse({ ...createBase, specialty: 'ENT' });
    expect(created.success && (created.data as { specialties: string[] }).specialties).toEqual([
      'ENT',
    ]);
    const updated = UpdateUserSchema.safeParse({ specialty: 'AUDIOLOGY' });
    expect(updated.success && (updated.data as { specialties?: string[] }).specialties).toEqual([
      'AUDIOLOGY',
    ]);
  });

  it('actualizar con specialty fuera del catálogo no cambia las especialidades', () => {
    const updated = UpdateUserSchema.safeParse({ specialty: 'GENERAL', fullName: 'Ana' });
    expect(updated.success).toBe(true);
    expect(updated.success && updated.data).toEqual({ fullName: 'Ana' });
  });
});
