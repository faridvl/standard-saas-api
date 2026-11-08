# Decisiones

## 2026-11-08 - Audiometrías guardadas por paciente

- Modelo nuevo `PatientAudiometryEntry` (separado de `Study`), con el patrón de `PatientOtoscopyEntry`:
  `payload Json`, `schemaVersion Int`, `createdByUuid`, `createdAt` e índice `[tenantUuid, patientUuid, createdAt]`.
- El payload se valida con Zod en la versión 1 (`AudiometryPayloadV1Schema`): marcas tonales por herramienta y
  oído, Weber, logoaudiometría, resumen (método de PTA, escala, PTA por oído, umbral, discriminación, palabras
  falladas) y notas (diagnóstico y observaciones, máximo 1000 caracteres). Un cambio de contrato sube `schemaVersion`.
- Registros inmutables: cada guardado crea uno; no hay edición ni borrado.
- El autor sale siempre del JWT, nunca del body. El nombre se resuelve como en otoscopia (`GetOrCreateUserUseCase`).
- El historial no devuelve el payload: lista uuid, fecha, autor y PTA por oído (leída del payload). El detalle
  completo va por uuid. Todo se filtra por `tenantUuid`, incluida la lectura por uuid.
- Solo roles clínicos (`OWNER`, `ADMIN`, `DOCTOR`); `STAFF` recibe 403.
- La audiometría NO se guarda como PDF: el front genera el PDF al imprimir, reconstruyéndolo desde los datos
  guardados. Por eso no hay `documentUuid`, ni PATCH, ni referencia a documentos.

## 2026-11-03 - La otoscopia deja una nota en Control de evolución

- Cada otoscopia nueva crea, en la misma transacción, una nota de paciente (`PatientNote`) con categoría
  `EXTERNAL_TEST` (se ve como "Pruebas"), mismo autor, negocio y paciente. Texto: `Otoscopia`, y debajo
  `OD: ...` y `OI: ...`; un oído vacío no lleva línea. Si falla la nota, falla la otoscopia.
- Corregir una otoscopia no toca la nota ni crea otra (decisión del usuario): la nota es el registro de
  lo que se guardó al crear.
- Migración `20261103120000_patient_otoscopy_notes_in_evolution`: crea la nota de las otoscopias ya
  guardadas con su `createdAt` y autor originales y el negocio de cada una. Es idempotente: salta si ya
  existe una nota `EXTERNAL_TEST` del mismo paciente y negocio con la misma fecha y el mismo texto.
- `PatientNote.authorUuid` no admite nulo: el autor migrado es `COALESCE(createdByUuid, updatedByUuid, '')`;
  si no hay ninguno queda `''`. Un autor vacío da `authorName` nulo y la pantalla muestra un autor genérico.
  `GetOrCreateUserUseCase` devuelve nulo sin consultar si el uuid está vacío, `IdentityRepository.getUser`
  solo acepta una respuesta con el mismo `uuid` pedido, y la lista de notas no se cae si un autor falla.
- La nota comparte `createdAt` con su otoscopia (una sola fecha generada en la app): así la migración reconoce
  que ya existe. Entrada y nota se guardan con `$transaction([...])` (por lotes, sin transacción interactiva).
- PUT `/physical-exam` y PUT `/background` con otoscopia también dejan la nota, con las mismas reglas
  (oído vacío sin línea; ambos vacíos, sin entrada ni nota).
- El recorte de oídos vacíos de la migración quita también tabuladores y saltos de línea (`[[:space:]]`).
- La nota usa el texto vigente de la otoscopia al correr la migración (si ya se había corregido, el corregido).

## 2026-11-07 - Prioridad, día de laboratorio y pacientes sin movimiento

- Filtro por día de envío al laboratorio: usa el envío abierto de `PatientLabShipment` (`deliveredAt` nulo) y el rango del día de Costa Rica (`clinicDayRange`), no `hearingAidsInLabSince`. Un envío del 2026-11-05 23:30 CR cuenta como 2026-11-05. Sin `hearingAidsInLab=true` el parámetro se ignora; fecha inválida da 400.
- Pacientes sin movimiento: el corte de 6 meses (`STALE_PATIENT_MONTHS`) se calcula por día calendario de Costa Rica, con recorte a fin de mes (31-ago menos 6 meses = 28/29-feb). Aparece si el último movimiento es anterior al fin de ese día. Último movimiento = la fecha más reciente entre el paciente (creación y edición) y todo lo que le cuelga del mismo negocio: bitácora, citas (incluida la hora de una cita futura, que lo saca de la lista), controles, consultas, estudios, notas, otoscopías, equipos, mantenimientos, envíos a laboratorio, documentos, contactos, sucursales, cuestionarios, antecedentes y examen físico.
- Sin movimiento excluye `isActive = false`, `deletedAt` y `status` distinto de ACTIVE (inactivos y fallecidos).
- `GET /patients/stale` responde `[{ uuid, fullName, lastMovementAt }]` sin paginar, del más antiguo al más reciente; se declara antes de `/:uuid` para que no lo capture.
- Prioridad: solo marca y filtro (`prioritySince`), no altera el orden de la lista. Migración sin backfill.
