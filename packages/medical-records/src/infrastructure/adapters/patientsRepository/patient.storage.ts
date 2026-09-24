// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { PatientEntity } from 'src/domain/entities/patient.entity';

// @Injectable()
// export class PatientStorage {
//   constructor(private readonly prisma: PrismaService) {}

//   async save(patient: PatientEntity): Promise<PatientEntity> {
//     const created = await this.prisma.patient.create({
//       data: {
//         firstName: patient.firstName,
//         lastName: patient.lastName,
//         phone: patient.phone,
//         address: patient.address,
//         birthDate: patient.birthDate,
//         tenantId: patient.tenantId,
//         tenantUuid: patient.tenantUuid,
//         createdBy: patient.createdBy,
//       },
//     });

//     return {
//       uuid: created.uuid,
//       firstName: created.firstName,
//       lastName: created.lastName,
//       phone: created.phone ?? undefined,
//       address: created.address ?? undefined,
//       birthDate: created.birthDate,
//       tenantId: created.tenantId,
//       tenantUuid: created.tenantUuid,
//       createdBy: created.createdBy,
//       createdAt: created.createdAt,
//     };
//   }
// }

import { Injectable } from '@nestjs/common';
import { Prisma, Patient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import { UpdatePatientDto } from '@medical-records/app/dtos/update-patient.dto';

/**
 * Paciente tal como lo consumen las pantallas: además de sus datos, de qué y
 * cuándo es su próxima cita. Los campos `tentative*` son la intención previa
 * (solo mes, sin día confirmado) y son excluyentes con `nextAppointmentAt`.
 */
export type PatientWithNextAppointment = Patient & {
  nextAppointmentAt: Date | null;
  nextAppointmentType: string | null;
  tentativeAppointmentTypeName: string | null;
};

@Injectable()
export class PatientStorage {
  constructor(private readonly prisma: PrismaService) {}

  async save(
    data: Prisma.PatientUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Patient> {
    const client: Prisma.TransactionClient | PrismaService = tx || this.prisma;

    return client.patient.create({ data });
  }

  /**
   * El detalle devuelve la próxima cita igual que el listado. Sin esto la
   * pantalla del paciente dependía de que el dato viniera en la caché del
   * listado, y al recargarla (o al refrescarse tras agendar) la fecha
   * desaparecía.
   */
  async findByUuid(
    uuid: string,
    tenantUuid: string,
  ): Promise<
    | (Patient & { nextAppointmentAt: Date | null; tentativeAppointmentTypeName: string | null })
    | null
  > {
    const patient = await this.prisma.patient.findFirst({
      where: {
        uuid: uuid,
        tenantUuid: tenantUuid,
      },
    });

    if (!patient) return null;

    const [nextAppointments, typeNames] = await Promise.all([
      this.findNextAppointmentsByPatient(tenantUuid, [patient.uuid]),
      this.findAppointmentTypeNames(
        tenantUuid,
        patient.tentativeAppointmentTypeUuid ? [patient.tentativeAppointmentTypeUuid] : [],
      ),
    ]);

    return {
      ...patient,
      nextAppointmentAt: nextAppointments.get(patient.uuid)?.startTime ?? null,
      tentativeAppointmentTypeName: patient.tentativeAppointmentTypeUuid
        ? typeNames.get(patient.tentativeAppointmentTypeUuid) ?? null
        : null,
    };
  }

  async update(uuid: string, tenantUuid: string, dto: UpdatePatientDto): Promise<Patient> {
    return await this.prisma.patient.update({
      where: { uuid },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.bloodType !== undefined && { bloodType: dto.bloodType }),
        ...(dto.linkedProductUuid !== undefined && { linkedProductUuid: dto.linkedProductUuid }),
        ...(dto.documentId !== undefined && { documentId: dto.documentId }),
        ...(dto.occupation !== undefined && { occupation: dto.occupation }),
        ...(dto.branchUuid !== undefined && { branchUuid: dto.branchUuid }),
        ...(dto.tentativeAppointmentMonth !== undefined && {
          tentativeAppointmentMonth: dto.tentativeAppointmentMonth,
        }),
        ...(dto.tentativeAppointmentTypeUuid !== undefined && {
          tentativeAppointmentTypeUuid: dto.tentativeAppointmentTypeUuid,
        }),
      },
    });
  }

  async findByDocumentId(
    documentId: string,
    tenantUuid: string,
    excludeUuid?: string,
  ): Promise<Patient | null> {
    return await this.prisma.patient.findFirst({
      where: {
        documentId,
        tenantUuid,
        isActive: true,
        ...(excludeUuid ? { uuid: { not: excludeUuid } } : {}),
      },
    });
  }

  async softDelete(uuid: string, tenantUuid: string): Promise<Patient> {
    return await this.prisma.patient.update({
      where: { uuid },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  /**
   * Nombre de cada tipo de cita, por uuid. El mes tentativo guarda el uuid
   * del tipo, pero las pantallas muestran el nombre; se resuelven todos de
   * una vez para no consultar por paciente.
   */
  private async findAppointmentTypeNames(
    tenantUUID: string,
    typeUuids: string[],
  ): Promise<Map<string, string>> {
    const unicos = Array.from(new Set(typeUuids));
    if (unicos.length === 0) return new Map();

    const rows = await this.prisma.appointmentType.findMany({
      where: { tenantUUID, uuid: { in: unicos } },
      select: { uuid: true, name: true },
    });

    return new Map(rows.map((row) => [row.uuid, row.name]));
  }

  /** Próxima cita CONFIRMED y futura de cada paciente (una fila por patientUUID, la más cercana). */
  private async findNextAppointmentsByPatient(
    tenantUUID: string,
    patientUUIDs: string[],
  ): Promise<Map<string, { startTime: Date; typeName: string | null }>> {
    if (patientUUIDs.length === 0) return new Map();

    const rows = await this.prisma.appointment.findMany({
      where: {
        tenantUUID,
        patientUUID: { in: patientUUIDs },
        status: 'CONFIRMED',
        startTime: { gte: new Date() },
      },
      distinct: ['patientUUID'],
      orderBy: [{ patientUUID: 'asc' }, { startTime: 'asc' }],
      select: {
        patientUUID: true,
        startTime: true,
        appointmentType: { select: { name: true } },
      },
    });

    return new Map(
      rows.map((row) => [
        row.patientUUID,
        { startTime: row.startTime, typeName: row.appointmentType?.name ?? null },
      ]),
    );
  }

  /** Meses (YYYY-MM) con al menos un paciente cuyo mes tentativo está anotado. */
  async findTentativeMonths(tenantUuid: string): Promise<string[]> {
    const rows = await this.prisma.patient.findMany({
      where: { tenantUuid, isActive: true, tentativeAppointmentMonth: { not: null } },
      distinct: ['tentativeAppointmentMonth'],
      select: { tentativeAppointmentMonth: true },
    });

    return rows
      .map((row) => row.tentativeAppointmentMonth)
      .filter((month): month is string => month !== null);
  }

  /** UUIDs de pacientes cuya próxima cita CONFIRMED cae dentro del mes dado (YYYY-MM). */
  private async findPatientUuidsWithNextAppointmentInMonth(
    tenantUUID: string,
    month: string,
  ): Promise<string[]> {
    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const rows = await this.prisma.appointment.findMany({
      where: {
        tenantUUID,
        status: 'CONFIRMED',
        startTime: { gte: new Date() },
      },
      distinct: ['patientUUID'],
      orderBy: [{ patientUUID: 'asc' }, { startTime: 'asc' }],
      select: { patientUUID: true, startTime: true },
    });

    return rows
      .filter((row) => row.startTime >= monthStart && row.startTime < monthEnd)
      .map((row) => row.patientUUID);
  }

  async findAllByTenant(
    tenantUUID: string,
    page: number = 1,
    limit: number = 10,
    includeInactive = false,
    search?: string,
    nextAppointmentMonth?: string,
  ): Promise<PaginatedResponse<PatientWithNextAppointment>> {
    const skip = (page - 1) * limit;
    const where: Prisma.PatientWhereInput = {
      tenantUuid: tenantUUID,
      ...(includeInactive ? {} : { isActive: true }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { documentId: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    if (nextAppointmentMonth) {
      const matchingUuids = await this.findPatientUuidsWithNextAppointmentInMonth(
        tenantUUID,
        nextAppointmentMonth,
      );

      // El mes filtra dos cosas a la vez: quien tiene cita confirmada ese mes
      // y quien solo tiene el mes anotado. Recepción usa este filtro para
      // saber a quién llamar, y los pendientes de confirmar son justo los que
      // no puede perderse.
      // Va dentro de AND y no como OR suelto: `where` ya puede traer su
      // propio OR (la búsqueda por texto), y dos OR en el mismo objeto se
      // pisan — buscar y filtrar por mes a la vez devolvería de más.
      const records = await this.prisma.patient.findMany({
        where: {
          ...where,
          AND: [
            {
              OR: [
                { uuid: { in: matchingUuids } },
                { tentativeAppointmentMonth: nextAppointmentMonth },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const data = (await this.withNextAppointment(tenantUUID, records))
        // Con el filtro de mes activo se ordena por próxima cita (la más
        // cercana primero); sin filtro se mantiene el orden por createdAt.
        // Los que solo tienen mes tentativo no tienen fecha con la que
        // competir, así que van al final: primero lo que ya tiene día, y
        // después la lista de a quién falta llamar.
        .sort(
          (a, b) =>
            (a.nextAppointmentAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (b.nextAppointmentAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
        );

      return {
        data,
        meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 },
      };
    }

    const [records, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    const data = await this.withNextAppointment(tenantUUID, records);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Completa una tanda de pacientes con su próxima cita y con el nombre del
   * tipo que tengan anotado como tentativo. Las dos consultas se hacen por
   * lote, no por paciente.
   */
  private async withNextAppointment(
    tenantUUID: string,
    records: Patient[],
  ): Promise<PatientWithNextAppointment[]> {
    const [nextAppointments, typeNames] = await Promise.all([
      this.findNextAppointmentsByPatient(
        tenantUUID,
        records.map((record) => record.uuid),
      ),
      this.findAppointmentTypeNames(
        tenantUUID,
        records
          .map((record) => record.tentativeAppointmentTypeUuid)
          .filter((uuid): uuid is string => !!uuid),
      ),
    ]);

    return records.map((record) => ({
      ...record,
      nextAppointmentAt: nextAppointments.get(record.uuid)?.startTime ?? null,
      nextAppointmentType: nextAppointments.get(record.uuid)?.typeName ?? null,
      tentativeAppointmentTypeName: record.tentativeAppointmentTypeUuid
        ? typeNames.get(record.tentativeAppointmentTypeUuid) ?? null
        : null,
    }));
  }
}
