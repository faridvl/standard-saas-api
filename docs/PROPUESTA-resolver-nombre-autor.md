# Propuesta: resolver nombre del autor en medical-records

## Problema

`medical-records` guarda quién creó un registro solo como uuid suelto,
sin relation hacia una tabla de usuarios:

- `PatientDocument.uploadedByUuid` (`packages/medical-records/prisma/schema.prisma:165`)
- `PatientNote.authorUuid` (`packages/medical-records/prisma/schema.prisma:123`)

`identity` es quien de verdad tiene el usuario (`GET /users/:uuid` en
`packages/identity/src/app/controllers/user.controller.ts:40-43`, devuelve
`{ uuid, fullName, email, role, ... }`), pero vive en otro servicio, con
otro schema Prisma, sin JOIN posible entre bases.

Consecuencia hoy en el frontend (`audiocolors-backoffice`): solo se puede
mostrar el nombre de quien subió un archivo o escribió una nota si es el
propio usuario logueado (`useResolveAuthorLabel`); para cualquier otro
autor se muestra un texto genérico ("Registrado por el equipo médico").
Esto no sirve para el caso real: un usuario (ej. Matthew) debe poder ver
que un archivo lo subió otra persona del equipo (ej. María).

## Cómo se resolvió este mismo problema antes

El proyecto del que nace `standard-saas-api`,
`D:\Documentos\LDXLAB\service-core-comx`, ya tenía la misma separación
(`billing` e `identity` como servicios distintos, con schemas Prisma
distintos) y resolvió esto con un patrón de **réplica local perezosa
("get or create")**, nunca delegando la resolución al frontend:

- `packages/billing/prisma/schema.prisma` define su propio `model User`
  mínimo (uuid, fullName, email), con relations locales `createdBy` /
  `soldBy` hacia `Invoice`. Eso permite JOIN nativo dentro del propio
  schema de billing.
- `packages/billing/src/business/users/getUser.ts` (`GetUser.getOrCreateUser`):
  1. Busca el usuario en el storage local de billing.
  2. Si no está, le pega por HTTP a `identity`
     (`packages/billing/src/adapters/identityRepository/identityRepository.ts`,
     `GET identity/users/:username`) y lo guarda localmente.
  3. Las siguientes consultas ya resuelven en local, sin roundtrip.
- El propio código documenta el trade-off (staleness si el usuario
  cambia de nombre en identity y no se vuelve a sincronizar) y propone
  a futuro un mensaje de bus para invalidar la copia local — pero no
  bloquea la solución simple con eso.

## Propuesta para medical-records

Replicar el mismo patrón:

1. **Nueva tabla local mínima** en `packages/medical-records/prisma/schema.prisma`:
   ```prisma
   model User {
     id        Int      @id @default(autoincrement())
     uuid      String   @unique
     fullName  String
     tenantUuid String
     updatedAt DateTime @updatedAt

     @@index([tenantUuid])
   }
   ```
   (Solo los campos que la UI necesita mostrar — no duplicar todo lo
   que tiene `identity`.)

2. **`IdentityRepository`** en `medical-records` (adapter HTTP hacia
   `identity`, análogo a
   `packages/billing/src/adapters/identityRepository/identityRepository.ts`
   de `service-core-comx`), que llama a
   `GET /users/:uuid` de `identity` (ya existe, confirmado en
   `packages/identity/src/app/controllers/user.controller.ts:40-43`).

3. **`GetOrCreateUser` use case**: busca local por uuid; si no existe,
   llama a `IdentityRepository`, guarda y devuelve. Se invoca:
   - Al crear un `PatientDocument` o `PatientNote` (para asegurar que
     el uploader/autor quede resuelto localmente desde el primer momento).
   - Al listar (`FindPatientDocumentsUseCase`, notas), para popular
     `uploadedByName` / `authorName` en la respuesta sin depender de
     que ya se haya creado antes.

4. **Response**: agregar `uploadedByName` / `authorName` (o un objeto
   `uploadedBy: { uuid, fullName }`) a la respuesta de los endpoints
   existentes de documentos y notas. Esto es un campo nuevo agregado,
   no rompe contratos existentes — ni el shape actual ni Zynka se ven
   afectados si simplemente ignoran el campo nuevo.

5. **Frontend** (`audiocolors-backoffice`): una vez el campo esté
   disponible, `useResolveAuthorLabel` deja de necesitar comparar
   contra el usuario logueado — usa directamente el nombre que ya
   viene en la respuesta. El copy pasa de "Registrado por el equipo
   médico" a `Registrado por: <nombre real>` siempre que se conozca.

## Qué NO se propone

- Ni JOIN cruzado entre bases de `identity` y `medical-records` (nunca
  existió, ni en el proyecto origen).
- Ni que el frontend llame a `GET /users` de `identity` por su cuenta:
  es el patrón que el proyecto origen evitó explícitamente, y además
  duplicaría la lógica de resolución en cada frontend que consuma la
  API (incluyendo Zynka a futuro).

## Impacto / riesgos

- Cambio de schema en `medical-records` (nueva tabla + migración) —
  aditivo, no afecta tablas existentes.
- Nuevo acoplamiento HTTP de `medical-records` → `identity` en tiempo
  de escritura/lectura de documentos y notas. Mismo trade-off de
  staleness que `service-core-comx` ya documentó y aceptó.
- Cambio de contrato de API: **aditivo** (campo nuevo), pero al ser un
  API compartida con Zynka, corresponde avisar/discutir antes de
  mergear, según la regla del proyecto.

## Siguiente paso

Discutir este approach con quien mantiene `standard-saas-api` (impacto
en Zynka) antes de implementar. Si se aprueba, se implementa primero
en el backend y luego se actualiza `audiocolors-backoffice` para
consumir el nombre real.
