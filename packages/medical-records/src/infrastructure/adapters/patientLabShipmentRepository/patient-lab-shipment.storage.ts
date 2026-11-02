import { Injectable } from '@nestjs/common';
import { DocumentCategory, PatientLabShipment, PatientNote, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PatientFlagsUpdate } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';

export type PatientLabShipmentRecord = PatientLabShipment;

/** Columnas "desde cuándo" de los indicadores, tal como están en la base. */
export type PatientFlagsSnapshot = Required<PatientFlagsUpdate>;

export interface NewLabShipmentData {
  sentAt: Date;
  deliveredAt?: Date;
  note?: string | null;
  createdByUuid: string;
  deliveredByUuid?: string;
}

/** Operaciones de un paciente dentro de una transacción con su fila bloqueada. */
export interface LabShipmentTransaction {
  currentFlags(): Promise<PatientFlagsSnapshot>;
  findOpenShipment(): Promise<PatientLabShipmentRecord | null>;
  createShipment(data: NewLabShipmentData): Promise<void>;
  updateSentAt(shipmentUuid: string, sentAt: Date): Promise<void>;
  closeShipment(
    shipmentUuid: string,
    data: { deliveredAt: Date; note: string | null; deliveredByUuid: string },
  ): Promise<void>;
  updateFlags(data: PatientFlagsUpdate): Promise<void>;
  createEvolutionNote(authorUuid: string, text: string): Promise<PatientNote>;
}

@Injectable()
export class PatientLabShipmentStorage {
  constructor(private readonly prisma: PrismaService) {}

  async patientExists(
    patientUuid: string,
    tenantUuid: string,
    options: { includeDeleted: boolean },
  ): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        uuid: patientUuid,
        tenantUuid,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      select: { id: true },
    });
    return patient !== null;
  }

  async findAllByPatient(
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientLabShipmentRecord[]> {
    return await this.prisma.patientLabShipment.findMany({
      where: { tenantUuid, patientUuid },
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
  }

  // Bloquea la fila del paciente: dos cambios del interruptor al mismo tiempo se turnan
  // y cada uno decide con el envío abierto que de verdad hay. El índice parcial único
  // de la migración es la segunda barrera.
  async runLocked<T>(
    patientUuid: string,
    tenantUuid: string,
    work: (transaction: LabShipmentTransaction) => Promise<T>,
  ): Promise<T | null> {
    return await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "Patient"
        WHERE "uuid" = ${patientUuid} AND "tenantUuid" = ${tenantUuid} AND "deletedAt" IS NULL
        FOR UPDATE`;
      if (locked.length === 0) return null;
      return await work(this.bindTransaction(tx, patientUuid, tenantUuid));
    });
  }

  private bindTransaction(
    tx: Prisma.TransactionClient,
    patientUuid: string,
    tenantUuid: string,
  ): LabShipmentTransaction {
    return {
      currentFlags: async () =>
        await tx.patient.findFirstOrThrow({
          where: { uuid: patientUuid, tenantUuid },
          select: {
            hearingAidsInLabSince: true,
            warrantyActiveSince: true,
            videoCandidateSince: true,
            warrantyExpiredSince: true,
            renewPrescriptionSince: true,
          },
        }),
      findOpenShipment: async () =>
        await tx.patientLabShipment.findFirst({
          where: { tenantUuid, patientUuid, deliveredAt: null },
        }),
      createShipment: async (data) => {
        await tx.patientLabShipment.create({
          data: { ...data, tenantUuid, patientUuid },
        });
      },
      updateSentAt: async (shipmentUuid, sentAt) => {
        await tx.patientLabShipment.update({ where: { uuid: shipmentUuid }, data: { sentAt } });
      },
      closeShipment: async (shipmentUuid, data) => {
        await tx.patientLabShipment.update({ where: { uuid: shipmentUuid }, data });
      },
      updateFlags: async (data) => {
        await tx.patient.update({ where: { uuid: patientUuid, tenantUuid }, data });
      },
      createEvolutionNote: async (authorUuid, text) =>
        await tx.patientNote.create({
          data: {
            patientUuid,
            tenantUuid,
            authorUuid,
            category: DocumentCategory.EVOLUTION_CONTROL,
            text,
          },
        }),
    };
  }
}
