# Traspaso: niveles de acceso y aislamiento entre clínicas

Rama `feature/roles-especialidades` (solo commits locales, sin push).

## Qué quiere el usuario

- D71 (detalle en `audiocolors-backoffice/.claude/DECISIONS.md`): nivel de acceso (RECEPTION, ADMIN, OWNER) más "Atiende pacientes" con especialidades de un catálogo fijo. Lo clínico depende solo de atender pacientes, nunca del nivel.
- Aislamiento total entre clínicas: todo id lleva tenant y otra clínica responde 404.

## Reglas confirmadas

- ADMIN administra usuarios salvo acceso clínico, especialidades y nivel OWNER (solo OWNER). Cada acción relee al actor en la base.
- Token viejo (sin `attendsPatients` o rol viejo): 401. Token vigente de alguien al que se le quitó acceso: vale hasta 1 h (aceptado).
- `bloodType` solo para quien atiende; borrar paciente pide ADMIN+. Calendario con dueño inexistente o inactivo: 404. `initialize` solo con el JWT de servicio de identity.
- `GET /users/:uuid`: ficha completa a ADMIN, OWNER y al propio usuario; RECEPTION ve solo uuid, nombre y estado.
- `specialty` suelta de clientes viejos: código del catálogo se mapea, otro valor se ignora.
- Detalle y motivos en `DECISIONS.md` (entrada del 2026-11-09).

## Dónde estamos

- Terminado y probado, local sin push ni PR (rama `feature/roles-especialidades`). Jest: identity 145, medical-records 505; `test:isolation` 66; `last-owner-race` 3; regresión HTTP por rol (172 comprobaciones) y QA en navegador con los 6 usuarios QA contra la base local 5433, sin fallas.
- Migración `20261109120000_access_level_attends_patients` aplicada en la base local.

## Qué sigue

1. Permiso del usuario para push y PR (incluida `feature/usuarios`).
2. Antes de mergear: en producción, solo lectura, `SELECT UPPER(TRIM(role)), count(*) FROM "User" GROUP BY 1` para confirmar que todo rol existente tiene mapeo. La migración deja respaldo en `"_UserRoleBackup20261109"`.
3. Deploy del API antes que el front (el front nuevo depende de `attendsPatients` en el token).
4. Pendientes menores sin arreglar: el PATCH de paciente aún acepta `bloodType` de quien no atiende; borrar un documento no borra el archivo en R2; Zynka con especialidad DENTAL o GENERAL falla.

## Preguntas abiertas

- Zynka (`next-audiology-files`) sigue con los roles viejos (DOCTOR, STAFF) y lee `specialty`; el API ya no lo devuelve. Hay que adaptarlo o decidir que queda congelado.
- `PATCH` de paciente todavía deja escribir `bloodType` a quien no atiende pacientes: decidir si se bloquea.
