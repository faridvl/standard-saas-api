import { Injectable } from '@nestjs/common';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { CreatePatientDto } from '@medical-records/app/dtos/create-patient.dto';

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

@Injectable()
export class BulkImportPatientsUseCase {
  constructor(private readonly storage: PatientStorage) {}

  async execute(
    rows: CreatePatientDto[],
    userContext: { tenantId: number; tenantUuid: string; sub: string },
  ): Promise<BulkImportResult> {
    let imported = 0;
    let skipped = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // +2: 1-based + header row

      try {
        if (row.documentId) {
          const existing = await this.storage.findByDocumentId(
            row.documentId,
            userContext.tenantUuid,
          );
          if (existing) {
            skipped++;
            errors.push({
              row: rowNumber,
              reason: `La cédula ${row.documentId} ya está registrada (paciente: ${existing.firstName} ${existing.lastName})`,
            });
            continue;
          }
        }

        await this.storage.save({
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          address: row.address,
          birthDate: row.birthDate as unknown as Date,
          email: row.email,
          gender: row.gender,
          documentId: row.documentId,
          tenantId: userContext.tenantId,
          tenantUuid: userContext.tenantUuid,
          createdBy: userContext.sub,
        });
        imported++;
      } catch (error) {
        skipped++;
        const message = error instanceof Error ? error.message : 'Error desconocido';
        errors.push({ row: rowNumber, reason: message });
      }
    }

    return { imported, skipped, errors };
  }
}
