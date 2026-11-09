import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import {
  PatientFlagsUpdate,
  PatientStorage,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import {
  LabShipmentTransaction,
  PatientFlagsSnapshot,
  PatientLabShipmentRecord,
  PatientLabShipmentStorage,
} from '@medical-records/infrastructure/adapters/patientLabShipmentRepository/patient-lab-shipment.storage';
import { CLINICAL_ACCESS_ROLES } from '@medical-records/domain/policies/clinical-access.policy';
import { UpdatePatientFlagsDto } from '@medical-records/app/dtos/update-patient-flags.dto';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import {
  PatientActivityAction,
  PatientActivityDetail,
} from '@medical-records/domain/types/patient-activity.types';
import {
  isFutureClinicDay,
  shipmentDayToSince,
  toClinicDayKey,
} from '@medical-records/domain/utils/lab-shipment-date.util';

type FlagKey =
  | 'hearingAidsInLab'
  | 'hasActiveWarranty'
  | 'isVideoCandidate'
  | 'warrantyExpired'
  | 'renewPrescription'
  | 'isPriority';

/** Largo del extracto de la nota que se guarda en la bitácora (igual que al crear una nota). */
const NOTE_EXCERPT_LENGTH = 120;

/** Cada indicador: su clave en el DTO, la columna "desde cuándo" y la acción de la bitácora. */
const FLAGS: {
  key: FlagKey;
  sinceField: keyof PatientFlagsUpdate;
  action: PatientActivityAction;
}[] = [
  {
    key: 'hearingAidsInLab',
    sinceField: 'hearingAidsInLabSince',
    action: PatientActivityAction.HEARING_AIDS_LAB_CHANGED,
  },
  {
    key: 'hasActiveWarranty',
    sinceField: 'warrantyActiveSince',
    action: PatientActivityAction.WARRANTY_CHANGED,
  },
  {
    key: 'isVideoCandidate',
    sinceField: 'videoCandidateSince',
    action: PatientActivityAction.VIDEO_CANDIDATE_CHANGED,
  },
  {
    key: 'warrantyExpired',
    sinceField: 'warrantyExpiredSince',
    action: PatientActivityAction.WARRANTY_EXPIRED_CHANGED,
  },
  {
    key: 'renewPrescription',
    sinceField: 'renewPrescriptionSince',
    action: PatientActivityAction.RENEW_PRESCRIPTION_CHANGED,
  },
  {
    key: 'isPriority',
    sinceField: 'prioritySince',
    action: PatientActivityAction.PRIORITY_CHANGED,
  },
];

interface Activity {
  action: PatientActivityAction;
  detail: PatientActivityDetail;
}

/** "DD/MM/AAAA" del día de un instante, para el mensaje que lee el usuario. */
function formatDay(instant: Date): string {
  const [year, month, day] = toClinicDayKey(instant).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Indicadores del paciente que se prenden y apagan (audífonos en laboratorio,
 * garantía activa, candidato a video, garantía vencida, renovar receta, prioridad). Son independientes del estado
 * activo/inactivo/fallecido. Cada uno se guarda como "desde cuándo", null si
 * está apagado.
 *
 * Los audífonos en laboratorio además llevan un historial de envíos: prender abre un envío,
 * cambiar la fecha mientras está en laboratorio corrige el día de envío del abierto (con
 * `shipmentUuid` solo corrige, nunca abre), y apagar
 * es la entrega (cierra el envío; la nota, si hay, también queda en Control de evolución).
 */
@Injectable()
export class UpdatePatientFlagsUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly labShipmentStorage: PatientLabShipmentStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: UpdatePatientFlagsDto,
    actorRole: string | null | undefined,
  ): Promise<PatientRecord> {
    // La nota queda en Control de evolución, que STAFF no puede ver ni escribir.
    if (dto.note && !CLINICAL_ACCESS_ROLES.includes(actorRole ?? '')) {
      throw new ForbiddenException('Solo el personal clínico puede agregar notas.');
    }

    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    const now = new Date();
    if (dto.hearingAidsInLabDate && isFutureClinicDay(dto.hearingAidsInLabDate, now)) {
      throw new BadRequestException('La fecha de envío no puede ser posterior a hoy');
    }
    if (dto.deliveredAt && isFutureClinicDay(dto.deliveredAt, now)) {
      throw new BadRequestException('La fecha de entrega no puede ser posterior a hoy');
    }

    if (dto.hearingAidsInLab === undefined) {
      const { changes, activities } = this.plan(existing, dto, now);
      if (activities.length === 0) return existing;
      const updated = await this.storage.updateFlags(uuid, tenantUuid, changes);
      await this.recordAll(uuid, tenantUuid, actorUuid, activities);
      return updated;
    }

    const outcome = await this.labShipmentStorage.runLocked(uuid, tenantUuid, async (tx) => {
      // Se vuelve a leer con la fila bloqueada: otro cambio pudo haber pasado antes.
      const current = await tx.currentFlags();
      const open = await tx.findOpenShipment();
      this.assertShipmentRequest(current, open, dto);

      const { changes, activities } = this.plan(current, dto, now);
      if (activities.length === 0) return { changed: false };

      const noteText = await this.syncShipment(tx, current, open, changes, dto, actorUuid, now);
      await tx.updateFlags(changes);
      for (const activity of activities) {
        await tx.recordActivity(actorUuid, activity.action, activity.detail);
      }
      if (noteText) {
        await tx.recordActivity(actorUuid, PatientActivityAction.NOTE_ADDED, {
          category: DocumentCategory.EVOLUTION_CONTROL,
          excerpt: noteText.slice(0, NOTE_EXCERPT_LENGTH),
        });
      }
      return { changed: true };
    });
    if (outcome === null) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }
    if (!outcome.changed) return existing;

    return (await this.storage.findByUuid(uuid, tenantUuid)) ?? existing;
  }

  /** Qué columnas cambian y qué se anota en la bitácora, según cómo estaban los indicadores. */
  private plan(
    current: PatientFlagsSnapshot,
    dto: UpdatePatientFlagsDto,
    now: Date,
  ): { changes: PatientFlagsUpdate; activities: Activity[] } {
    const shipmentDay = dto.hearingAidsInLabDate;
    const changes: PatientFlagsUpdate = {};
    const activities: Activity[] = [];

    for (const flag of FLAGS) {
      const isOn = dto[flag.key];
      if (isOn === undefined) continue;
      const currentSince = current[flag.sinceField];
      const wasOn = currentSince !== null;

      if (flag.key === 'hearingAidsInLab' && isOn && shipmentDay) {
        const previousDay = currentSince ? toClinicDayKey(currentSince) : null;
        if (wasOn && previousDay === shipmentDay) continue;
        changes[flag.sinceField] = shipmentDayToSince(shipmentDay);
        activities.push({
          action: flag.action,
          detail: {
            isOn: true,
            date: shipmentDay,
            ...(previousDay && { previousDate: previousDay }),
          },
        });
        continue;
      }

      if (isOn === wasOn) continue;
      changes[flag.sinceField] = isOn ? now : null;

      if (flag.key === 'hearingAidsInLab' && !isOn) {
        activities.push({
          action: PatientActivityAction.HEARING_AIDS_DELIVERED,
          detail: { date: dto.deliveredAt ?? toClinicDayKey(now), hasNote: Boolean(dto.note) },
        });
        continue;
      }

      activities.push({
        action: flag.action,
        detail:
          flag.key === 'hearingAidsInLab' && isOn ? { isOn, date: toClinicDayKey(now) } : { isOn },
      });
    }

    return { changes, activities };
  }

  /** Rechaza lo que una pantalla desactualizada manda sobre un envío que ya cambió. */
  private assertShipmentRequest(
    current: PatientFlagsSnapshot,
    open: PatientLabShipmentRecord | null,
    dto: UpdatePatientFlagsDto,
  ): void {
    if (dto.shipmentUuid && open?.uuid !== dto.shipmentUuid) {
      throw new ConflictException('Este envío ya fue entregado. Recarga la página.');
    }
    const isAlreadyDelivered = dto.hearingAidsInLab === false && !current.hearingAidsInLabSince;
    if (isAlreadyDelivered && (dto.deliveredAt || dto.note)) {
      throw new ConflictException('Los audífonos ya se marcaron como entregados.');
    }
  }

  /** El envío nuevo (o con la fecha corregida) no puede quedar antes de la última entrega. */
  private async assertNotBeforeLastDelivery(tx: LabShipmentTransaction, sentAt: Date) {
    const lastClosed = await tx.findLastClosedShipment();
    if (lastClosed?.deliveredAt && toClinicDayKey(sentAt) < toClinicDayKey(lastClosed.deliveredAt)) {
      throw new BadRequestException(
        `La fecha de envío no puede ser anterior a la última entrega (${formatDay(lastClosed.deliveredAt)})`,
      );
    }
  }

  /**
   * Lleva el historial de envíos al cambio del interruptor de laboratorio. Devuelve el texto
   * de la nota de Control de evolución que se creó, o null si no hubo.
   */
  private async syncShipment(
    tx: LabShipmentTransaction,
    current: PatientFlagsSnapshot,
    open: PatientLabShipmentRecord | null,
    changes: PatientFlagsUpdate,
    dto: UpdatePatientFlagsDto,
    actorUuid: string,
    now: Date,
  ): Promise<string | null> {
    if (!('hearingAidsInLabSince' in changes)) return null;

    const newSince = changes.hearingAidsInLabSince;

    if (newSince) {
      const sentAt = shipmentDayToSince(toClinicDayKey(newSince));
      await this.assertNotBeforeLastDelivery(tx, sentAt);
      if (open) {
        await tx.updateSentAt(open.uuid, sentAt);
      } else {
        await tx.createShipment({ sentAt, createdByUuid: actorUuid });
      }
      return null;
    }

    const deliveredAt = shipmentDayToSince(dto.deliveredAt ?? toClinicDayKey(now));
    const note = dto.note ?? null;
    // Sin envío abierto (dato viejo) el día de envío es el que tenía el interruptor.
    const sentAt = open?.sentAt ?? current.hearingAidsInLabSince ?? deliveredAt;
    if (toClinicDayKey(deliveredAt) < toClinicDayKey(sentAt)) {
      throw new BadRequestException(
        `La fecha de entrega no puede ser anterior a la de envío (${formatDay(sentAt)})`,
      );
    }
    if (open) {
      await tx.closeShipment(open.uuid, { deliveredAt, note, deliveredByUuid: actorUuid });
    } else {
      await tx.createShipment({
        sentAt,
        deliveredAt,
        note,
        createdByUuid: actorUuid,
        deliveredByUuid: actorUuid,
      });
    }

    if (!note) return null;
    await tx.createEvolutionNote(actorUuid, note);
    return note;
  }

  private async recordAll(
    patientUuid: string,
    tenantUuid: string,
    actorUuid: string,
    activities: Activity[],
  ): Promise<void> {
    for (const activity of activities) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid,
        actorUuid,
        action: activity.action,
        detail: activity.detail,
      });
    }
  }
}
