const INVALID_UTF8 = '�';

/**
 * Nombre original de un archivo subido. Multer lee el nombre como latin1, así
 * que un nombre UTF-8 llega desarmado ("CALDERÓN" → "CALDERÃ\u0093N"; desde
 * iPhone/Mac, que separan la tilde de la letra, "CALDEROÌ\u0081N"). Se
 * reinterpretan los bytes como UTF-8 y se unen letra y tilde (NFC). Si no es
 * UTF-8 válido, el nombre ya venía bien y se deja como está.
 */
export function decodeUploadedFileName(originalName: string): string {
  const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
  return (decoded.includes(INVALID_UTF8) ? originalName : decoded).normalize('NFC');
}
