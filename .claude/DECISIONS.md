# Decisiones

## 2026-11-08 - Administración de usuarios por el OWNER (D70)

- Solo el OWNER administra usuarios, con la lista nombrada `USER_ADMIN_ROLES = [OWNER]` verificada en el servidor (`assertCanAdministerUsers`); sin permiso, 403. Roles asignables: ADMIN, DOCTOR y STAFF; no se crea otro OWNER por la API.
- Alta con contraseña temporal escrita por el OWNER (`POST /users`), que también puede ponérsela nueva a cualquier usuario de su clínica (`PUT /users/:uuid/password`, 204). No hay correo ni enlace de recuperación.
- No se borra: se desactiva y se reactiva (`Status` ACTIVE/INACTIVE). `DELETE /users/:uuid` es alias de desactivar. Un INACTIVE da 401 con el mismo mensaje genérico que una clave mala (no revela que la cuenta existe) y `GET /auth/me` lo rechaza.
- Nadie se desactiva ni se cambia el rol a sí mismo (400). La clínica nunca queda sin un OWNER activo: desactivar o bajar de rol al último da 409; con dos activos sí se puede.
- Todo se filtra por el tenant del JWT; un usuario de otra clínica da 404. El cliente nunca manda tenant.
- Cualquier usuario edita su propio perfil (nombre, teléfono, especialidad, firma, avatar) sin `role`; con `role` recibe 403. Las subidas de firma y avatar aplican la misma regla (antes cualquiera podía subir la de otro).
- `GET /users` sin `status` devuelve todos (ALL), el comportamiento anterior. `PATCH /users/:uuid/status` responde 200 con el usuario actualizado.
- Token ya emitido: el JWT dura 1 hora (`expiresIn: '1h'` en `identity.module.ts`) y `AuthGuard` no consulta la base, así que un usuario desactivado con un token vigente sigue entrando a identity y medical-records hasta que venza. No se cambió: cerrarlo exige consultar el estado en cada petición o una lista de tokens revocados.
- Caché de usuarios de medical-records: la copia local sirve 5 minutos (`USER_CACHE_TTL_MS`) y luego se vuelve a pedir a identity, así un usuario nuevo o renombrado se ve con su nombre en notas e historial. Si identity no responde se usa el nombre local. `GET /users/:uuid` sigue devolviendo INACTIVE para no perder el nombre del autor de notas viejas.

## 2026-11-08 - La nota de audiometría lleva el tipo y el uuid de la audiometría

- Cada audiometría guardada deja una nota `EXTERNAL_TEST` ("Pruebas") en Control de evolución, en la misma transacción:
  `Se realizó audiometría clínica el dd/MM/yyyy` o `... de rastreo ...`, según el tipo (mapa por código de tipo en
  `audiometry-note-text.util.ts`; un tipo nuevo suma ahí su etiqueta). El día se lee en hora de Costa Rica.
- La nota queda enlazada por `PatientNote.audiometryEntryUuid` (nula, FK con `ON DELETE SET NULL`) para que Evolución abra
  la audiometría; `GET /patients/:patientUuid/notes` lo devuelve como `string | null`. El uuid de la audiometría se genera
  en la API antes de insertar para poder armar ambas filas en un solo lote.
- Marcar la audiometría como "mal hecha" no toca la nota.
- La migración `20261108150000_patient_audiometry_notes_in_evolution` (ya en develop) no se edita: crea la nota sin tipo.
  La migración `20261108160000_patient_note_audiometry_link` corre después de la de tipos (`20261108150000_audiometry_types`;
  Prisma ordena por nombre de carpeta). Agrega la columna, enlaza las notas ya creadas con el texto sin tipo, les pone el
  texto con tipo y crea la nota de las audiometrías que no tenían; se puede reaplicar sin duplicar.

## 2026-11-08 - Tipos de audiometría (clínica y de rastreo)

- Catálogo global `AudiometryType` (`code` único, `name`, `sortOrder`, `isActive`) con `CLINICAL` y `SCREENING`;
  `PatientAudiometryEntry.typeCode` es NOT NULL con default `'CLINICAL'` y FK a `AudiometryType.code`. La migración inserta
  el catálogo antes de crear la FK, así las audiometrías existentes quedan como clínicas sin un UPDATE aparte.
- Un tipo nuevo se agrega con una fila en el catálogo y un schema Zod en el DTO; la entidad y el storage discriminan el
  payload por `typeCode`. Desactivar un tipo (`isActive = false`) basta para dejar de aceptarlo.
- `POST` acepta `typeCode` opcional (sin él, `CLINICAL`) para no romper al front actual. Como Zod 4 no aplica `default`
  al discriminador ausente, un `z.preprocess` lo inyecta antes de la unión discriminada.
- El rastreo (`schemaVersion` 1) guarda solo vía aérea, `result` `PASS|REFER` obligatorio y observaciones; reutiliza la marca
  tonal clínica fijando `isMasked` en `false`. Sin hueso, Weber, logoaudiometría ni resumen: por eso la lista devuelve
  `ptaType`, `gradingScale` y PTA en `null` para ese tipo.
- Que el tipo exista y esté activo se valida en el caso de uso contra la tabla (400); el schema Zod solo conoce los tipos que
  tienen contrato en el código.
- `GET /audiometry-types` devuelve solo los activos por `sortOrder`, con los mismos guards y roles que leer audiometrías.
- Marcar como "mal hecha" es igual para ambos tipos y no depende de `typeCode`.

## 2026-11-08 - Nombre y logo de la clínica

- `PATCH /tenants/current` acepta también `name` (se guarda en `Tenant.businessName`): opcional, sin espacios en los extremos, de 1 a 100 caracteres. El nombre no es identificador: `businessName` no es único, no va en el JWT, no se usa en Dynamo ni en ningún slug o clave. Se puede cambiar sin migrar nada.
- Logo: el tenant guarda la key del storage en `Tenant.logoKey`, nunca la imagen ni la URL completa. La URL se arma al leer con `StorageService.getPublicUrl(key)` y es pública y sin expiración, usable en `<img>` e impresión. `/auth/me` (`tenant.logoUrl`) y `/tenants/current` la devuelven resuelta, o `null`.
- `logoUrl` heredado: si el tenant solo tiene la columna vieja `logoUrl`, se devuelve esa hasta que se suba un logo nuevo. Subir o quitar deja `logoUrl` en `null` y manda `logoKey`.
- Endpoints: `POST` y `DELETE /tenants/current/logo`, mismos permisos que Configuración (`OWNER` y `ADMIN`, comprobados en el caso de uso). Al reemplazar o quitar se borra el objeto anterior; si el borrado falla, no falla la operación (queda un archivo huérfano, no un logo roto).
- Formatos PNG, JPG, WEBP y SVG, máximo 2 MB. El formato se detecta por el contenido (firma del archivo), no por la extensión ni el `Content-Type` del cliente, así que no hay `fileFilter` en multer. Multer corta en 10 MB solo para no cargar archivos enormes en memoria; el límite real de 2 MB lo valida el caso de uso con un mensaje en español.
- Riesgo XSS del SVG: un SVG abierto directo desde el bucket puede ejecutar JavaScript en ese origen. Mitigaciones: (1) el SVG se guarda en el storage con `ContentDisposition: attachment` (parámetro opcional de `putObject` y `upload`; los demás llamadores no cambian), así abrir la URL directa lo descarga en vez de ejecutarlo; (2) un filtro rechaza etiquetas activas con o sin prefijo de namespace (`script`, `foreignObject`, `iframe`, `embed`, `object`, `audio`, `video`, `handler`, `listener`), atributos `on*` con o sin prefijo, `&#` o entidades de separador (`&colon;`, `&tab;`, `&newline;`) dentro de `href`/`xlink:href`, `javascript:`, `vbscript:` y `data:` (también tras decodificar entidades numéricas y quitar espacios y caracteres de control), `<!ENTITY` y `<!DOCTYPE`. Consecuencia: un SVG con imágenes incrustadas en `data:` se rechaza. El filtro sigue siendo por patrones y es una defensa adicional, no un sanitizador completo; el front muestra el logo siempre dentro de `<img>`. Si algún día se muestra incrustado (`<object>`, `<iframe>` o inline), hay que sanitizar con una librería.
- La key es `identity/{tenantUuid}/logos/logo-{timestamp}.{ext}`: cambia en cada subida, así el caché de un año (`immutable`) no sirve un logo viejo.
- `StorageService` gana `putObject`, `deleteObject` y `getPublicUrl`; `upload()` conserva su comportamiento.
- Los endpoints heredados `/upload/tenants/:uuid/logo` y `PATCH /tenants/:uuid` mantienen su forma de respuesta, pero ahora también exigen `OWNER` o `ADMIN` (`assertCanManageClinic` en el controlador; un `DOCTOR` recibe 403). El upload heredado valida el formato por el contenido con la misma detección del logo (PNG, JPG, WEBP o SVG; un PDF ya no pasa), guarda el `ContentType` detectado y no el que manda el cliente, y sirve el SVG como attachment.
- Al reemplazar el logo, el objeto anterior se borra solo si su key es distinta de la nueva (dos subidas en el mismo milisegundo no borran el logo recién guardado).
- Migración `20261108150000_tenant_logo_key`: `Tenant.logoKey` (TEXT nulo, sin backfill).

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
