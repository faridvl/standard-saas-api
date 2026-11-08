# Decisiones

- Filtro por día de envío al laboratorio: usa el envío abierto de `PatientLabShipment` (`deliveredAt` nulo) y el rango del día de Costa Rica (`clinicDayRange`), no `hearingAidsInLabSince`. Un envío del 2026-11-05 23:30 CR cuenta como 2026-11-05. Sin `hearingAidsInLab=true` el parámetro se ignora; fecha inválida da 400.
- Pacientes sin movimiento: el corte de 6 meses (`STALE_PATIENT_MONTHS`) se calcula por día calendario de Costa Rica, con recorte a fin de mes (31-ago menos 6 meses = 28/29-feb). Aparece si el último movimiento es anterior al fin de ese día.
- Sin movimiento excluye `isActive = false`, `deletedAt` y `status` distinto de ACTIVE (inactivos y fallecidos).
- `GET /patients/stale` responde `[{ uuid, fullName, lastMovementAt }]` sin paginar, del más antiguo al más reciente; se declara antes de `/:uuid` para que no lo capture.
- Prioridad: solo marca y filtro (`prioritySince`), no altera el orden de la lista. Migración sin backfill.
