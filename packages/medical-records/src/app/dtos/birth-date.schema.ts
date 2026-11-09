import { z } from 'zod';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

const DATE_ONLY_LENGTH = 10;

// Fecha real y no futura; texto vacío o inválido es 400, nunca un Invalid Date.
export const BirthDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, { message: 'Fecha de nacimiento inválida (YYYY-MM-DD)' })
  .transform((value, context) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: 'custom', message: 'Fecha de nacimiento inválida' });
      return z.NEVER;
    }
    // Un día que no existe (31 de febrero) lo corre JavaScript al mes siguiente; se compara solo la parte de fecha.
    const [year, month, day] = value.slice(0, DATE_ONLY_LENGTH).split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    const isRolledOver =
      calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() + 1 !== month ||
      calendarDate.getUTCDate() !== day;
    if (isRolledOver) {
      context.addIssue({ code: 'custom', message: 'Fecha de nacimiento inválida' });
      return z.NEVER;
    }
    if (date.getTime() > Date.now()) {
      context.addIssue({ code: 'custom', message: 'La fecha de nacimiento no puede ser futura' });
      return z.NEVER;
    }
    return date;
  });
