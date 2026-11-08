# Decisiones

## 2026-11-08 - Datos de contacto de la clínica y variables nuevas de plantilla

- `Tenant` gana `phone`, `email` y `address` (nulos). Endpoints nuevos `GET` y `PATCH /tenants/current` en identity; la
  clínica sale del JWT. Se extendió `TenantController` y `current` se declara antes de `:uuid` para que no lo capture.
- Lectura: cualquier usuario autenticado. Escritura: `OWNER` y `ADMIN` (los que administran Configuración en el front).
  Identity no tiene política de roles, así que la comprobación vive en el caso de uso (`CLINIC_SETTINGS_ROLES`), no en un guard.
- El PATCH solo guarda esos tres campos: el esquema Zod descarta el resto y el storage nunca recibe `businessName`.
  Cadena vacía = `null`. El teléfono valida caracteres y 8 a 15 dígitos (más permisivo que el formato exacto del front,
  que ya normaliza al guardar).
- `TenantDomain` y `/auth/me` no cambian: el front pide la clínica completa a `/tenants/current`.
- `PATCH /tenants/:uuid` (nombre) no comprueba rol; queda como estaba por estar fuera de alcance.
- Identity ahora tiene jest (`yarn workspace @project/identity-service test`), con la misma configuración que medical-records.
- `DOCUMENT_TEMPLATE_VARIABLES` suma `otoscopia_od`, `otoscopia_oi`, `diagnostico`, `observaciones`, `clinica_nombre`,
  `clinica_telefono`, `clinica_correo` y `clinica_direccion`. El reemplazo por datos reales sigue siendo del front.

## 2026-11-08 - Plantillas de documento

- Modelo `DocumentTemplate` por negocio (markdown con variables `{{clave}}`), CRUD sin DELETE bajo `/document-templates`.
- Permisos: leer cualquier usuario autenticado; crear y editar solo `CLINICAL_ACCESS_ROLES` (`OWNER`, `ADMIN`, `DOCTOR`),
  igual que escribir en la historia clínica (el contrato pedía "mismos permisos que la plantilla de historia clínica").
- Nombre único por negocio sin distinguir mayúsculas: pre-chequeo en el caso de uso (409 con mensaje claro) más índice
  único `(tenantUuid, lower(name))` en la migración para la carrera entre dos guardados; el storage traduce `P2002` a 409.
- Las variables permitidas son una constante única en el dominio; un `{{x}}` desconocido es 400 y se valida solo en el
  servidor (el reemplazo por datos del paciente es del front).
- El storage filtra por `tenantUuid` también al editar (`updateMany` con `uuid` y `tenantUuid`).

## 2026-11-08 - Audiometría marcada como "mal hecha"

- `PatientAudiometryEntry` gana `invalidatedAt`, `invalidatedByUuid` e `invalidationReason` (nulos = vigente). El
  payload clínico nunca cambia: la marca no corrige ni borra, solo avisa que la prueba no es confiable.
- `POST /patients/:patientUuid/audiometry-entries/:entryUuid/invalidate` con `{ reason }`: motivo obligatorio,
  recortado, máximo 500 caracteres. Mismos roles clínicos que crear; quién la marca sale del JWT.
- Definitiva: no hay ruta para quitarla. Marcar una ya marcada da 409 y conserva la primera marca. El 409 se decide
  en el use case y, por si dos peticiones se cruzan, también en el storage: `updateMany` con `invalidatedAt: null`
  en el filtro (si no cambia ninguna fila, 409).
- El storage filtra por `uuid`, `patientUuid`, `tenantUuid` y paciente no borrado: otra clínica u otro paciente es 404.
- El nombre de quien marcó no se guarda en una columna: se resuelve al leer con `GetOrCreateUserUseCase`, igual
  que el autor. Responde 200 (no 201) porque actualiza y devuelve la entrada completa.
- Lista y detalle devuelven siempre los cuatro campos de la marca (`invalidatedAt`, `invalidatedByUuid`,
  `invalidatedByName`, `invalidationReason`), en `null` si no está marcada. Una marcada sigue en la lista.

## 2026-11-08 - Audiometrías guardadas por paciente

- Modelo nuevo `PatientAudiometryEntry` (separado de `Study`), con el patrón de `PatientOtoscopyEntry`:
  `payload Json`, `schemaVersion Int`, `createdByUuid`, `createdAt` e índice `[tenantUuid, patientUuid, createdAt]`.
- El payload se valida con Zod en la versión 1 (`AudiometryPayloadV1Schema`): marcas tonales por herramienta y
  oído, Weber, logoaudiometría, resumen (método de PTA, escala, PTA por oído, umbral, discriminación, palabras
  falladas) y notas (diagnóstico y observaciones, máximo 1000 caracteres). Un cambio de contrato sube `schemaVersion`.
- Registros inmutables: cada guardado crea uno; no hay edición ni borrado (solo la marca de "mal hecha", arriba).
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
