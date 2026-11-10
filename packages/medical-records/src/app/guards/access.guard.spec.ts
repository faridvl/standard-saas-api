import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { AppointmentController } from '@medical-records/app/controllers/appointments.controllers';
import { BranchController } from '@medical-records/app/controllers/branch.controller';
import { ClinicalTemplateController } from '@medical-records/app/controllers/clinical-template.controller';
import { DocumentTemplateController } from '@medical-records/app/controllers/document-template.controller';
import { PatientActivityController } from '@medical-records/app/controllers/patient-activity.controller';
import { PatientAudiometryEntryController } from '@medical-records/app/controllers/patient-audiometry-entry.controller';
import { PatientController } from '@medical-records/app/controllers/patient.controllers';
import { PatientDocumentController } from '@medical-records/app/controllers/patient-document.controller';
import { PatientNoteController } from '@medical-records/app/controllers/patient-note.controller';
import { PatientOtoscopyEntryController } from '@medical-records/app/controllers/patient-otoscopy-entry.controller';

type Token = { role?: string; attendsPatients?: boolean; specialties?: string[] };
type Controller = new (...args: never[]) => object;

const guard = new AccessGuard(new Reflector());

function allows(controller: Controller, method: string, user?: Token): boolean {
  const handler = (controller.prototype as Record<string, unknown>)[method];
  if (typeof handler !== 'function') throw new Error(`${controller.name}.${method} no existe`);
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  try {
    return guard.canActivate(context);
  } catch (error) {
    if (error instanceof ForbiddenException || error instanceof UnauthorizedException) return false;
    throw error;
  }
}

type Group = {
  name: string;
  controller: Controller;
  method: string;
  /** Qué exige: nivel mínimo, atender pacientes y especialidad. */
  needs: {
    adminOrOwner?: boolean;
    attends?: boolean;
    audiology?: boolean;
    adminOrOwnerOrAttends?: boolean;
  };
};

const GROUPS: Group[] = [
  {
    name: 'clínico: leer notas',
    controller: PatientNoteController,
    method: 'findAll',
    needs: { attends: true },
  },
  {
    name: 'clínico: crear nota',
    controller: PatientNoteController,
    method: 'create',
    needs: { attends: true },
  },
  {
    name: 'clínico: leer otoscopías',
    controller: PatientOtoscopyEntryController,
    method: 'findAll',
    needs: { attends: true },
  },
  {
    name: 'clínico: leer audiometrías',
    controller: PatientAudiometryEntryController,
    method: 'findAll',
    needs: { attends: true },
  },
  {
    name: 'clínico: antecedentes',
    controller: PatientController,
    method: 'getBackground',
    needs: { attends: true },
  },
  {
    name: 'prueba: crear audiometría',
    controller: PatientAudiometryEntryController,
    method: 'create',
    needs: { attends: true, audiology: true },
  },
  {
    name: 'prueba: anular audiometría',
    controller: PatientAudiometryEntryController,
    method: 'invalidate',
    needs: { attends: true, audiology: true },
  },
  {
    name: 'prueba: crear otoscopía',
    controller: PatientOtoscopyEntryController,
    method: 'create',
    needs: { attends: true, audiology: true },
  },
  {
    name: 'prueba: editar otoscopía',
    controller: PatientOtoscopyEntryController,
    method: 'update',
    needs: { attends: true, audiology: true },
  },
  {
    name: 'archivos: listar',
    controller: PatientDocumentController,
    method: 'findAll',
    needs: { attends: true },
  },
  {
    name: 'archivos: subir',
    controller: PatientDocumentController,
    method: 'upload',
    needs: { attends: true },
  },
  {
    name: 'archivos: borrar',
    controller: PatientDocumentController,
    method: 'delete',
    needs: { attends: true },
  },
  { name: 'paciente general: ver', controller: PatientController, method: 'findOne', needs: {} },
  { name: 'paciente general: crear', controller: PatientController, method: 'create', needs: {} },
  {
    name: 'paciente: modificar',
    controller: PatientController,
    method: 'update',
    needs: { adminOrOwnerOrAttends: true },
  },
  {
    name: 'paciente: cambiar estado',
    controller: PatientController,
    method: 'updateStatus',
    needs: { adminOrOwnerOrAttends: true },
  },
  {
    name: 'paciente: indicadores',
    controller: PatientController,
    method: 'updateFlags',
    needs: { attends: true },
  },
  { name: 'citas: listar', controller: AppointmentController, method: 'findAll', needs: {} },
  { name: 'sedes: listar', controller: BranchController, method: 'findAll', needs: {} },
  {
    name: 'plantillas clínicas: leer',
    controller: ClinicalTemplateController,
    method: 'findAll',
    needs: {},
  },
  {
    name: 'plantillas de documento: leer',
    controller: DocumentTemplateController,
    method: 'findAll',
    needs: {},
  },
  {
    name: 'configuración: crear plantilla clínica',
    controller: ClinicalTemplateController,
    method: 'create',
    needs: { adminOrOwner: true },
  },
  {
    name: 'configuración: editar plantilla clínica',
    controller: ClinicalTemplateController,
    method: 'update',
    needs: { adminOrOwner: true },
  },
  {
    name: 'configuración: borrar plantilla clínica',
    controller: ClinicalTemplateController,
    method: 'remove',
    needs: { adminOrOwner: true },
  },
  {
    name: 'configuración: crear plantilla de documento',
    controller: DocumentTemplateController,
    method: 'create',
    needs: { adminOrOwner: true },
  },
  {
    name: 'configuración: editar plantilla de documento',
    controller: DocumentTemplateController,
    method: 'update',
    needs: { adminOrOwner: true },
  },
  {
    name: 'bitácora: listar',
    controller: PatientActivityController,
    method: 'findAll',
    needs: { adminOrOwner: true },
  },
  {
    name: 'bitácora: usuarios',
    controller: PatientActivityController,
    method: 'findActors',
    needs: {},
  },
];

const LEVELS = ['RECEPTION', 'ADMIN', 'OWNER'] as const;

describe('AccessGuard: matriz nivel x atiende pacientes', () => {
  for (const group of GROUPS) {
    describe(`${group.name}`, () => {
      for (const role of LEVELS) {
        for (const attendsPatients of [true, false]) {
          const specialties = attendsPatients ? ['AUDIOLOGY'] : [];
          const expected =
            (!group.needs.adminOrOwner || role !== 'RECEPTION') &&
            (!group.needs.attends || attendsPatients) &&
            (!group.needs.adminOrOwnerOrAttends || role !== 'RECEPTION' || attendsPatients);

          it(`${role} ${attendsPatients ? 'atiende' : 'no atiende'} -> ${expected ? 'pasa' : '403'}`, () => {
            expect(
              allows(group.controller, group.method, { role, attendsPatients, specialties }),
            ).toBe(expected);
          });
        }
      }

      if (group.needs.audiology) {
        for (const role of LEVELS) {
          it(`${role} atiende pero sin AUDIOLOGY (ENT) -> 403`, () => {
            expect(
              allows(group.controller, group.method, {
                role,
                attendsPatients: true,
                specialties: ['ENT'],
              }),
            ).toBe(false);
          });
        }
      } else if (group.needs.attends) {
        it('atiende con otra especialidad (ENT) -> pasa: ver el expediente no exige audiología', () => {
          expect(
            allows(group.controller, group.method, {
              role: 'RECEPTION',
              attendsPatients: true,
              specialties: ['ENT'],
            }),
          ).toBe(true);
        });
      }

      it('los roles viejos no dan nada', () => {
        for (const role of ['DOCTOR', 'STAFF', 'USER', 'MEDICO', 'ADMINISTRATOR', '']) {
          expect(
            allows(group.controller, group.method, {
              role,
              attendsPatients: true,
              specialties: ['AUDIOLOGY'],
            }),
          ).toBe(false);
        }
      });

      it('sin token o sin rol da 403', () => {
        expect(allows(group.controller, group.method, undefined)).toBe(false);
        expect(allows(group.controller, group.method, { attendsPatients: true })).toBe(false);
      });

      it('attendsPatients solo cuenta si es exactamente true', () => {
        if (!group.needs.attends) return;
        expect(
          allows(group.controller, group.method, {
            role: 'OWNER',
            attendsPatients: 'true' as unknown as boolean,
            specialties: ['AUDIOLOGY'],
          }),
        ).toBe(false);
      });
    });
  }

  it('una ruta sin clasificar se rechaza aunque el usuario sea OWNER', () => {
    class SinClasificar {
      handler(): void {}
    }
    expect(allows(SinClasificar, 'handler', { role: 'OWNER', attendsPatients: true })).toBe(false);
  });

  describe('token de una versión anterior: 401 para que el cliente se autentique de nuevo', () => {
    const statusOf = (user: Token): number => {
      const handler = (PatientNoteController.prototype as Record<string, unknown>).findAll;
      const context = {
        getHandler: () => handler,
        getClass: () => PatientNoteController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      } as unknown as ExecutionContext;
      try {
        guard.canActivate(context);
        return 200;
      } catch (error) {
        if (error instanceof UnauthorizedException) return 401;
        if (error instanceof ForbiddenException) return 403;
        throw error;
      }
    };

    it('sin el claim attendsPatients -> 401', () => {
      expect(statusOf({ role: 'OWNER' })).toBe(401);
    });

    it('con un rol legado -> 401', () => {
      for (const role of ['DOCTOR', 'STAFF', 'USER', 'MEDICO']) {
        expect(statusOf({ role, attendsPatients: true })).toBe(401);
      }
    });

    it('token vigente sin permiso suficiente sigue siendo 403', () => {
      expect(statusOf({ role: 'RECEPTION', attendsPatients: false })).toBe(403);
    });
  });
});
