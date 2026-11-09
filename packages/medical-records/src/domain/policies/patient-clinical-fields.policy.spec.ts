import { describe, expect, it } from '@jest/globals';
import { filterPatientClinicalFields } from './patient-clinical-fields.policy';

const patient = { uuid: 'p-1', firstName: 'Ana', bloodType: 'O+' };

describe('filterPatientClinicalFields', () => {
  it('quita el tipo de sangre si quien consulta no atiende pacientes', () => {
    const result = filterPatientClinicalFields(patient, false);
    expect(result).not.toHaveProperty('bloodType');
    expect(result).toMatchObject({ uuid: 'p-1', firstName: 'Ana' });
  });

  it('lo conserva si atiende pacientes', () => {
    expect(filterPatientClinicalFields(patient, true)).toEqual(patient);
  });

  it('no modifica el registro original', () => {
    filterPatientClinicalFields(patient, false);
    expect(patient.bloodType).toBe('O+');
  });
});
