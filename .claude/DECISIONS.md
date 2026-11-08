# Decisiones

## 2026-11-03 - La otoscopia deja una nota en Control de evolución

- Cada otoscopia nueva crea, en la misma transacción, una nota de paciente (`PatientNote`) con categoría
  `EXTERNAL_TEST` (se ve como "Pruebas"), mismo autor, negocio y paciente. Texto: `Otoscopia`, y debajo
  `OD: ...` y `OI: ...`; un oído vacío no lleva línea. Si falla la nota, falla la otoscopia.
- Corregir una otoscopia no toca la nota ni crea otra (decisión del usuario): la nota es el registro de
  lo que se guardó al crear.
- Migración `20261103120000_patient_otoscopy_notes_in_evolution`: crea la nota de las otoscopias ya
  guardadas con su `createdAt` y autor originales y el negocio de cada una. Es idempotente: salta si ya
  existe una nota `EXTERNAL_TEST` del mismo paciente y negocio con la misma fecha y el mismo texto.
- `PatientNote.authorUuid` no admite nulo: las otoscopias migradas sin autor generan una nota con autor
  vacío (`''`), que la pantalla muestra como "Sin registrar".
- La nota usa el texto vigente de la otoscopia al correr la migración (si ya se había corregido, el corregido).
