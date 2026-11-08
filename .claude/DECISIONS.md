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
