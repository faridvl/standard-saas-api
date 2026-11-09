/**
 * Cada ruta con parámetro debe estar aquí: o con una sonda que `tenant-isolation.integration.spec.ts`
 * ejecuta con el token de otra clínica (se espera 404), o exenta con el motivo.
 * Una ruta nueva sin entrada hace fallar `tenant-isolation.routes.spec.ts`.
 */
export type SeedKey =
  | 'patient'
  | 'contact'
  | 'device'
  | 'product'
  | 'unit'
  | 'control'
  | 'appointmentType'
  | 'appointment';

export interface RouteProbe {
  /** Qué recurso de la clínica A llena cada parámetro; los no listados llevan un uuid inexistente. */
  params?: Record<string, SeedKey>;
  body?: Record<string, unknown>;
}

export interface RouteExemption {
  exempt: string;
}

export type ManifestEntry = RouteProbe | RouteExemption;

export const isExempt = (entry: ManifestEntry): entry is RouteExemption => 'exempt' in entry;

const PENDING_BODY = 'cuerpo complejo o multipart: sin sonda HTTP; el storage filtra por clínica';
const NOT_AN_ID = 'el parámetro no identifica un recurso (especialidad o token del feed)';

const patient: RouteProbe = {
  params: { patientUuid: 'patient', patientUUID: 'patient', uuid: 'patient' },
};
const withBody = (probe: RouteProbe, body: Record<string, unknown>): RouteProbe => ({
  ...probe,
  body,
});
const CONTACT_BODY = { name: 'Intruso', phone: '8888-0000' };

export const ROUTES_MANIFEST: Record<string, ManifestEntry> = {
  'PATCH /appointment-types/:uuid': withBody(
    { params: { uuid: 'appointmentType' } },
    { name: 'Hackeado' },
  ),
  'DELETE /appointment-types/:uuid': { params: { uuid: 'appointmentType' } },
  'GET /appointments/:uuid': { params: { uuid: 'appointment' } },
  'PATCH /appointments/:uuid': withBody({ params: { uuid: 'appointment' } }, { notes: 'Hackeado' }),
  'GET /appointments/patient/:patientUUID': patient,
  'DELETE /appointments/:uuid': { params: { uuid: 'appointment' } },
  'GET /calendar-feed/:file': { exempt: NOT_AN_ID },
  'GET /clinical-templates/speciality/:speciality/all': { exempt: NOT_AN_ID },
  'GET /clinical-templates/speciality/:speciality': { exempt: NOT_AN_ID },
  'PATCH /clinical-templates/:uuid': withBody({}, { name: 'Hackeado' }),
  'DELETE /clinical-templates/:uuid': {},
  'GET /document-templates/:uuid': {},
  'PUT /document-templates/:uuid': { exempt: PENDING_BODY },
  'GET /encounters/patient/:uuid': patient,
  'GET /encounters/:uuid': {},
  'PATCH /encounters/:uuid/close': {},
  'GET /products/:uuid': { params: { uuid: 'product' } },
  'PATCH /products/:uuid': withBody({ params: { uuid: 'product' } }, { name: 'Hackeado' }),
  'DELETE /products/:uuid': { params: { uuid: 'product' } },
  'GET /maintenance/patient/:uuid': patient,
  'GET /medical-controls/patient/:patientUUID': patient,
  'GET /medical-controls/:uuid': { params: { uuid: 'control' } },
  'PATCH /medical-controls/:uuid/correction-note': withBody(
    { params: { uuid: 'control' } },
    { correctionNotes: 'Hackeado' },
  ),
  'POST /patients/:patientUuid/next-appointment': withBody(patient, { date: '2030-01-15' }),
  'PUT /patients/:patientUuid/next-appointment/tentative-month': withBody(patient, {
    month: null,
  }),
  'GET /patients/:patientUuid/audiometry-entries': patient,
  'GET /patients/:patientUuid/audiometry-entries/:entryUuid': patient,
  'POST /patients/:patientUuid/audiometry-entries': { exempt: PENDING_BODY },
  'POST /patients/:patientUuid/audiometry-entries/:entryUuid/invalidate': { exempt: PENDING_BODY },
  'GET /patients/:patientUuid/contacts': patient,
  'POST /patients/:patientUuid/contacts': withBody(patient, CONTACT_BODY),
  'PUT /patients/:patientUuid/contacts': withBody(patient, { contacts: [CONTACT_BODY] }),
  'DELETE /patients/:patientUuid/contacts/:contactUuid': {
    params: { patientUuid: 'patient', contactUuid: 'contact' },
  },
  'GET /patients/:patientUuid/devices': patient,
  'POST /patients/:patientUuid/devices': {
    exempt:
      'necesita una unidad de la clínica B; cubierto por la sonda de unidades y el spec de dispositivos',
  },
  'DELETE /patients/:patientUuid/devices/:deviceUuid': {
    params: { patientUuid: 'patient', deviceUuid: 'device' },
  },
  'GET /patients/:patientUuid/documents': patient,
  'POST /patients/:patientUuid/documents': { exempt: PENDING_BODY },
  'PATCH /patients/:patientUuid/documents/:documentUuid': { exempt: PENDING_BODY },
  'DELETE /patients/:patientUuid/documents/:documentUuid': patient,
  'GET /patients/:patientUuid/lab-shipments': patient,
  'GET /patients/:uuid/maintenances': patient,
  'POST /patients/:uuid/maintenances/:number/notes': { exempt: PENDING_BODY },
  'GET /patients/:patientUuid/notes': patient,
  'POST /patients/:patientUuid/notes': withBody(patient, { text: 'Hackeado' }),
  'GET /patients/:patientUuid/otoscopy-entries': patient,
  'POST /patients/:patientUuid/otoscopy-entries': { exempt: PENDING_BODY },
  'PATCH /patients/:patientUuid/otoscopy-entries/:entryUuid': { exempt: PENDING_BODY },
  'GET /patients/:patientUuid/questionnaire-entries': patient,
  'POST /patients/:patientUuid/questionnaire-entries': { exempt: PENDING_BODY },
  'PATCH /patients/:patientUuid/questionnaire-entries/:entryUuid': { exempt: PENDING_BODY },
  'DELETE /patients/:uuid': patient,
  'GET /patients/:uuid': patient,
  'PATCH /patients/:uuid': withBody(patient, { firstName: 'Hackeado' }),
  'PUT /patients/:uuid/status': withBody(patient, { status: 'INACTIVE' }),
  'PUT /patients/:uuid/flags': { exempt: PENDING_BODY },
  'PUT /patients/:uuid/maintenances/:number': { exempt: PENDING_BODY },
  'GET /patients/:uuid/background': patient,
  'PUT /patients/:uuid/background': { exempt: PENDING_BODY },
  'GET /patients/:uuid/physical-exam': patient,
  'PUT /patients/:uuid/physical-exam': { exempt: PENDING_BODY },
  'POST /products/:productUuid/units': withBody(
    { params: { productUuid: 'product' } },
    { serialNumber: 'SN-INTRUSO-1' },
  ),
  'POST /products/:productUuid/units/bulk': withBody(
    { params: { productUuid: 'product' } },
    { units: [{ serialNumber: 'SN-INTRUSO-2' }] },
  ),
  'GET /products/:productUuid/units': { params: { productUuid: 'product' } },
  'GET /product-units/:uuid': { params: { uuid: 'unit' } },
  'PATCH /product-units/:uuid': withBody({ params: { uuid: 'unit' } }, { notes: 'Hackeado' }),
  'GET /studies/patient/:uuid': patient,
  'GET /studies/:uuid': {},
  'POST /upload/patients/:uuid/audiometrias': patient,
  'POST /upload/patients/:uuid/imagenes': patient,
  'POST /upload/patients/:uuid/informes': patient,
};
