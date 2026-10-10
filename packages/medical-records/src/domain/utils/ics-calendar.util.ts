/**
 * Arma un calendario iCalendar (RFC 5545), el formato que leen el calendario
 * del iPhone, Outlook y Google al suscribirse a un enlace `webcal://`.
 * Funciones puras: no saben de citas ni de base de datos.
 */

export interface IcsEvent {
  /** Único y estable por evento: así la app actualiza en vez de duplicar. */
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  /** Evento de día completo (sin hora): solo cuenta la fecha de `start`. */
  isAllDay: boolean;
  lastModified: Date;
}

export interface IcsCalendar {
  name: string;
  /** Cada cuánto sugiere volver a leer el enlace (la app puede ignorarlo). */
  refreshMinutes: number;
  /**
   * Color del calendario (`#rrggbb`). El iPhone no colorea eventos sueltos,
   * colorea calendarios enteros: por eso cada sede es su propio calendario.
   */
  color?: string;
  events: IcsEvent[];
}

const LINE_BREAK = '\r\n';
/** RFC 5545 §3.1: las líneas de más de 75 octetos se parten con un espacio al inicio. */
const MAX_LINE_OCTETS = 75;
const PRODUCT_ID = '-//Standard SaaS//Agenda//ES';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Texto de un campo: escapa `\`, `;`, `,` y saltos de línea. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** "20261001T140000Z": fecha y hora en UTC. */
function formatDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** "20261001": solo la fecha (UTC), para eventos de día completo. */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Parte una línea larga sin cortar un carácter multibyte (tildes, ñ). */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;

  for (const character of line) {
    const octets = Buffer.byteLength(character, 'utf8');
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = '';
      currentOctets = 0;
    }
    current += character;
    currentOctets += octets;
  }
  parts.push(current);

  return parts.join(`${LINE_BREAK} `);
}

function buildEventLines(event: IcsEvent, stamp: Date): string[] {
  const timing = event.isAllDay
    ? [
        `DTSTART;VALUE=DATE:${formatDate(event.start)}`,
        `DTEND;VALUE=DATE:${formatDate(new Date(event.start.getTime() + MS_PER_DAY))}`,
      ]
    : [`DTSTART:${formatDateTime(event.start)}`, `DTEND:${formatDateTime(event.end)}`];

  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateTime(stamp)}`,
    `LAST-MODIFIED:${formatDateTime(event.lastModified)}`,
    ...timing,
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ];
}

export function buildIcsCalendar(calendar: IcsCalendar, stamp: Date = new Date()): string {
  const refresh = `PT${calendar.refreshMinutes}M`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
    `NAME:${escapeText(calendar.name)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${refresh}`,
    `X-PUBLISHED-TTL:${refresh}`,
    // Apple toma este color al suscribirse. `COLOR` (RFC 7986) no sirve: exige
    // un nombre CSS, no un hex.
    ...(calendar.color ? [`X-APPLE-CALENDAR-COLOR:${calendar.color}`] : []),
    ...calendar.events.flatMap((event) => buildEventLines(event, stamp)),
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join(LINE_BREAK) + LINE_BREAK;
}
