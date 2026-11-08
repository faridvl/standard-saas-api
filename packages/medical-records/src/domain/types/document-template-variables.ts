/** Claves que una plantilla de documento puede usar como `{{clave}}`. */
export const DOCUMENT_TEMPLATE_VARIABLES = [
  'nombre',
  'apellidos',
  'nombre_completo',
  'tipo_documento',
  'documento',
  'fecha_nacimiento',
  'edad',
  'genero',
  'telefono',
  'correo',
  'direccion',
  'sedes',
  'fecha_hoy',
  'profesional',
  'otoscopia_od',
  'otoscopia_oi',
  'diagnostico',
  'observaciones',
  'clinica_nombre',
  'clinica_telefono',
  'clinica_correo',
  'clinica_direccion',
] as const;

const VARIABLE_PATTERN = /\{\{([^{}]*)\}\}/g;

/** Claves de `{{...}}` que no están permitidas, sin repetir y en orden de aparición. */
export function findUnknownDocumentTemplateVariables(content: string): string[] {
  const allowed: readonly string[] = DOCUMENT_TEMPLATE_VARIABLES;
  const unknown: string[] = [];
  for (const match of content.matchAll(VARIABLE_PATTERN)) {
    const key = match[1].trim();
    if (!allowed.includes(key) && !unknown.includes(key)) unknown.push(key);
  }
  return unknown;
}
