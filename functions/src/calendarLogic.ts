import { alarmInstant, isTimeZone, zonedInstant } from './alarmLogic';
import { LANGUAGE_TAG, messages, type Language } from './i18n';

// EVENTOS DE GOOGLE CALENDAR a partir de las tareas, para la función extra «Sincronizar con Google Calendar»: las
// mismas reglas que «Añadir al calendario» de la app (src/services/calendar.ts), pero en la zona horaria de la cuenta
// y con el formato de la API de Google Calendar. tests/unit/calendarSync.test.ts compara los dos. Los textos que pone
// CLAR (las etiquetas de la descripción), en el idioma de la cuenta; la RRULE no depende del idioma.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINUTE_MS = 60_000;
const DEADLINE_EVENT_MS = 30 * MINUTE_MS;
// Con hora de inicio y sin hora límite, el evento dura una hora
const DEFAULT_EVENT_MS = 60 * MINUTE_MS;
// Solo con fecha (un día, sin horas): el evento de una hora empieza a la hora de la alarma o, sin alarma, a las 09:00
const DEFAULT_EVENT_TIME = '09:00';
// Google admite recordatorios de 0 a 4 semanas antes del inicio
const MAX_REMINDER_MINUTES = 40_320;
// Topes de lo que se envía, en caracteres (la descripción de un evento de Google admite unos 8.000)
const SUMMARY_MAX = 1_000;
const DESCRIPTION_MAX = 8_000;

export const CALENDAR_SUMMARY = 'CLAR';
// Marca de los eventos que crea CLAR (una propiedad privada): así se encuentran al volver a conectar
export const EVENT_MARK = 'clarTask';
// Página a la que vuelve Google con el código (public/oauth/google.html)
export const OAUTH_CALLBACK_PATH = '/oauth/google.html';

// La tarea tal como está en Firestore: sin fiarse de su forma
export interface SyncTask {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  completed?: unknown;
  isSomeday?: unknown;
  startDate?: unknown;
  startTime?: unknown;
  dueDate?: unknown;
  dueTime?: unknown;
  recurrence?: unknown;
  observations?: unknown;
  alarmTime?: unknown;
}

type EventTime = { date: string } | { dateTime: string; timeZone: string };

export interface CalendarEventBody {
  summary: string;
  description: string;
  start: EventTime;
  end: EventTime;
  recurrence?: string[];
  reminders: { useDefault: false; overrides: { method: 'popup'; minutes: number }[] };
  status: 'confirmed';
  // Una tarea no ocupa la agenda: el tiempo sigue libre en Google
  transparency: 'transparent';
  source: { title: string; url: string };
  extendedProperties: { private: Record<string, string> };
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');
// Un día que existe (2026-02-30 no)
const day = (value: unknown) => {
  if (typeof value !== 'string' || !DAY.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? value : undefined;
};
const time = (value: unknown) => (typeof value === 'string' && TIME.test(value) ? value : undefined);
// Recorta por caracteres completos (sin partir un emoji)
const cap = (value: string, max: number) => {
  const chars = Array.from(value);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : value;
};

// Id del evento: el de la tarea en hexadecimal (Google solo admite a-v y 0-9, de 5 a 1024 caracteres). Siempre el
// mismo para la misma tarea: así reintentar o volver a conectar no duplica nada. null si el id es demasiado largo.
export const eventIdFor = (taskId: string) => {
  const id = `clar${Buffer.from(taskId, 'utf8').toString('hex')}`;
  return id.length <= 1024 ? id : null;
};

// La tarea de un id de evento de CLAR, o null si no es uno
export const taskIdForEvent = (eventId: string) => {
  const hex = eventId.startsWith('clar') ? eventId.slice(4) : '';
  return hex && hex.length % 2 === 0 && /^[0-9a-f]+$/.test(hex) ? Buffer.from(hex, 'hex').toString('utf8') : null;
};

const texts = messages(
  {
    notes: 'Notas:',
    task: 'Tarea de CLAR:',
    deadline: (day: string) => `Fecha límite: ${day}`,
    calendarDescription: 'Tareas con fecha de CLAR (se actualizan solas).'
  },
  {
    notes: 'Notes:',
    task: 'CLAR task:',
    deadline: (day) => `Due date: ${day}`,
    calendarDescription: 'CLAR tasks with a date (they update automatically).'
  }
);

// La descripción del calendario «CLAR» que se crea en Google
export const calendarDescription = (language: Language = 'es') => texts[language].calendarDescription;

const notesOf = (observations: unknown) =>
  Array.isArray(observations)
    ? observations
        .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === 'object')
        .filter((o) => text(o.text).trim() || text(o.url))
    : [];

// Las notas de la tarea, una por línea; las de lista, con su casilla (como en la app)
const notesText = (observations: unknown, language: Language) => {
  const lines = notesOf(observations).map((o) => {
    const box = o.type === 'checklist' ? (o.completed === true ? '[x] ' : '[ ] ') : '';
    const url = text(o.url);
    const link = url && url !== text(o.text) ? ` (${url})` : '';
    return `- ${box}${text(o.text).trim()}${link}`;
  });
  return lines.length ? `${texts[language].notes}\n${lines.join('\n')}` : '';
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const htmlLines = (value: string) => escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>');
const isWebUrl = (url: string) => /^https?:\/\/[^\s]+$/i.test(url);

// Las notas, en HTML (Google Calendar lo muestra): una lista con viñetas, las de casilla con ☐ o ☑, y los enlaces, que
// se pueden pulsar. Todo el texto de la tarea va escapado
const notesHtml = (observations: unknown, language: Language) => {
  const items = notesOf(observations).map((o) => {
    const box = o.type === 'checklist' ? (o.completed === true ? '☑ ' : '☐ ') : '';
    const label = text(o.text).trim();
    const url = text(o.url);
    if (url && isWebUrl(url)) return `<li>${box}<a href="${escapeHtml(url)}">${htmlLines(label || url)}</a></li>`;
    return `<li>${box}${htmlLines(label)}${url && url !== text(o.text) ? ` (${escapeHtml(url)})` : ''}</li>`;
  });
  return items.length ? `${escapeHtml(texts[language].notes)}<ul>${items.join('')}</ul>` : '';
};

// La descripción del evento, en texto (la misma que «Añadir al calendario» de la app, que compara
// tests/unit/calendarSync.test.ts) y la que se envía: con notas, en HTML, para que se vean como lista (si no cabe, en
// texto). Si hay que recortar, se recorta lo de la tarea: el enlace a CLAR del final se queda
export const eventDescription = (task: SyncTask, appUrl: string, deadlineNote: string, language: Language = 'es') => {
  const link = `${texts[language].task} ${appUrl}`;
  const body = [text(task.description), notesText(task.observations, language), deadlineNote]
    .filter(Boolean)
    .join('\n\n');
  const plain = body ? `${cap(body, DESCRIPTION_MAX - Array.from(link).length - 2)}\n\n${link}` : link;
  const notes = notesHtml(task.observations, language);
  if (!notes) return { text: plain, sent: plain };
  const html = [
    text(task.description) && htmlLines(text(task.description)),
    notes,
    deadlineNote && escapeHtml(deadlineNote),
    `${escapeHtml(texts[language].task)} <a href="${escapeHtml(appUrl)}">${escapeHtml(appUrl)}</a>`
  ]
    .filter(Boolean)
    .join('<br><br>');
  return { text: plain, sent: Array.from(html).length <= DESCRIPTION_MAX ? html : plain };
};

const parseDay = (date: string) => date.split('-').map(Number) as [number, number, number];
const nextDay = (date: string) => {
  const [y, m, d] = parseDay(date);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};
// «16 oct 2026» («16 Oct 2026» en inglés), como formatDay de la app
const formatDay = (date: string, language: Language) => {
  const [y, m, d] = parseDay(date);
  return new Intl.DateTimeFormat(LANGUAGE_TAG[language], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(Date.UTC(y, m - 1, d));
};

// RRULE (RFC 5545) de la serie, como toRRule de la app (src/services/recurrence.ts). null si la repetición no vale o
// si cuenta desde que se hace la tarea (días y semanas): entonces no hay serie, solo el evento de la repetición actual
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const weekdayOf = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6 ? (value as number) : undefined;
const lastDayFallback = (monthDay: number) =>
  `BYMONTHDAY=${Array.from({ length: monthDay - 27 }, (_, i) => 28 + i).join(',')};BYSETPOS=-1`;

export const recurrenceRule = (value: unknown, allDay: boolean, anchorDate: string, timeZone: string) => {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.frequency !== 'string' || !FREQUENCIES.includes(rec.frequency)) return null;
  if (rec.from === 'COMPLETION' && (rec.frequency === 'DAILY' || rec.frequency === 'WEEKLY')) return null;
  const interval = Number.isInteger(rec.interval) ? Math.max(1, rec.interval as number) : 1;
  const parts = [`FREQ=${rec.frequency}`, `INTERVAL=${interval}`];
  if (rec.frequency === 'WEEKLY') {
    // La semana empieza en lunes, como en la app
    parts.push('WKST=MO');
    const days = (Array.isArray(rec.weekdays) ? rec.weekdays : [])
      .map(weekdayOf)
      .filter((d): d is number => d !== undefined)
      .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    if (days.length) parts.push(`BYDAY=${days.map((d) => RRULE_DAYS[d]).join(',')}`);
  }
  if (rec.frequency === 'MONTHLY') {
    const nth =
      Number.isInteger(rec.nth) && (rec.nth as number) >= 1 && (rec.nth as number) <= 4 ? (rec.nth as number) : 1;
    const weekday = RRULE_DAYS[weekdayOf(rec.weekday) ?? 1];
    const monthDay =
      Number.isInteger(rec.monthDay) && (rec.monthDay as number) >= 1 && (rec.monthDay as number) <= 31
        ? (rec.monthDay as number)
        : undefined;
    if (rec.monthlyMode === 'NTH_WEEKDAY') parts.push(`BYDAY=${nth}${weekday}`);
    else if (rec.monthlyMode === 'LAST_WEEKDAY') parts.push(`BYDAY=-1${weekday}`);
    else if (monthDay) parts.push(monthDay > 28 ? lastDayFallback(monthDay) : `BYMONTHDAY=${monthDay}`);
  }
  if (rec.frequency === 'YEARLY' && rec.monthDay === 29 && parseDay(anchorDate)[1] === 2) {
    parts.push(`BYMONTH=2;${lastDayFallback(29)}`);
  }
  const until = day(rec.until);
  // Un final que no es un día que existe no vale: mejor un evento suelto que una serie sin fin
  if (rec.until !== undefined && !until) return null;
  if (until) {
    // Con hora: el final del día local de `until`, en UTC
    const stamp = allDay
      ? until.replace(/-/g, '')
      : new Date(zonedInstant(until, '23:59', timeZone, 'later') + 59_000)
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '');
    parts.push(`UNTIL=${stamp}`);
  }
  return `RRULE:${parts.join(';')}`;
};

// Días saltados válidos de la serie (posteriores a la repetición actual), sin repetir y en orden
const skippedDays = (rec: unknown, dueDate: string) => {
  const skip = rec && typeof rec === 'object' ? (rec as { skip?: unknown }).skip : undefined;
  if (!Array.isArray(skip)) return [];
  return [
    ...new Set(
      skip
        .slice(0, 1000)
        .map(day)
        .filter((d): d is string => Boolean(d && d > dueDate))
    )
  ].sort();
};

// Hora local (HHMMSS) de un instante en una zona horaria
const wallClock = (instant: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${part('hour')}${part('minute')}${part('second')}`;
};

const isDone = (task: SyncTask) => task.status === 'DONE' || (task.status === undefined && task.completed === true);

// El evento de una tarea, o null si no va al calendario: sin fecha límite o en «Algún día». Las hechas y las canceladas
// se quedan, con «✓» o «✕» delante. Una serie la lleva la tarea pendiente: al completarla, la app crea la siguiente
// repetición (que continúa la serie) y la hecha queda como un evento suelto. `language`: el de la cuenta
export const buildTaskEvent = (
  task: SyncTask,
  timeZone: string,
  appUrl: string,
  language: Language = 'es'
): CalendarEventBody | null => {
  const dueDate = day(task.dueDate);
  if (!dueDate || task.isSomeday === true || !isTimeZone(timeZone)) return null;
  const closed = isDone(task) ? '✓ ' : task.status === 'CANCELLED' ? '✕ ' : '';
  const dueTime = time(task.dueTime);
  const repeats = Boolean(task.recurrence) && !closed;
  // Una tarea repetida no es un intervalo: cada repetición ocupa su día, de la hora de inicio a la límite
  const startTime = time(task.startTime);
  const startDate = task.recurrence ? (startTime ? dueDate : undefined) : day(task.startDate);
  // De día completo, solo un intervalo de varios días sin horas; un día sin horas va a la hora de su alarma
  const allDay = !startTime && !dueTime && Boolean(startDate && startDate < dueDate);
  const dateOnly = !startTime && !dueTime && !allDay;
  const oneHour = Boolean(startTime && !dueTime);
  const deadlineNote =
    oneHour && (startDate ?? dueDate) !== dueDate ? texts[language].deadline(formatDay(dueDate, language)) : '';
  const description = eventDescription(task, appUrl, deadlineNote, language).sent;
  const rule = repeats ? recurrenceRule(task.recurrence, allDay, dueDate, timeZone) : null;
  // La hora de la alarma, también en una tarea hecha o cancelada: al cerrarla, su evento no se mueve
  const alarmAt = alarmInstant(task, timeZone);

  // Inicio y final, como en la app: las horas locales se pasan a instantes en la zona de la cuenta
  const at = (date: string, clock: string) => zonedInstant(date, clock, timeZone, 'later');
  const dayStart = alarmAt ?? at(dueDate, DEFAULT_EVENT_TIME);
  const span: { start: number; end: number } | { startDate: string; endDate: string } = allDay
    ? { startDate: startDate!, endDate: nextDay(dueDate) }
    : dateOnly
      ? { start: dayStart, end: dayStart + DEFAULT_EVENT_MS }
      : oneHour
        ? { start: at(startDate ?? dueDate, startTime!), end: at(startDate ?? dueDate, startTime!) + DEFAULT_EVENT_MS }
        : !startDate
          ? { start: at(dueDate, dueTime!), end: at(dueDate, dueTime!) + DEADLINE_EVENT_MS }
          : { start: at(startDate, startTime ?? '00:00'), end: at(dueDate, dueTime!) };
  // Un inicio después del plazo (datos incoherentes) haría que Google rechazara el evento: se queda en el plazo
  if ('start' in span && span.end <= span.start) span.start = span.end - DEADLINE_EVENT_MS;

  // La alarma, como recordatorio: Google lo cuenta desde el inicio del evento (si cae después, no se pone). Una tarea
  // hecha o cancelada no avisa, como en la app
  const alarm = closed ? null : alarmAt;
  const startInstant = 'start' in span ? span.start : at(span.startDate, '00:00');
  const minutes = alarm === null ? null : Math.round((startInstant - alarm) / MINUTE_MS);
  const reminders =
    minutes !== null && minutes >= 0 && minutes <= MAX_REMINDER_MINUTES ? [{ method: 'popup' as const, minutes }] : [];

  const iso = (instant: number) => new Date(instant).toISOString();
  // Fechas que la serie salta (borradas en la app o convertidas en tareas sueltas): fuera de la serie, a la misma hora
  // local que su inicio
  const seriesStart = 'start' in span ? span.start : null;
  const exdates = rule && seriesStart !== null ? skippedDays(task.recurrence, dueDate) : [];
  const exdate =
    seriesStart !== null && exdates.length
      ? `EXDATE;TZID=${timeZone}:${exdates.map((d) => `${d.replace(/-/g, '')}T${wallClock(seriesStart, timeZone)}`).join(',')}`
      : null;
  return {
    summary: cap(`${closed}${text(task.title)}`, SUMMARY_MAX),
    description,
    ...('start' in span
      ? { start: { dateTime: iso(span.start), timeZone }, end: { dateTime: iso(span.end), timeZone } }
      : { start: { date: span.startDate }, end: { date: span.endDate } }),
    ...(rule ? { recurrence: exdate ? [rule, exdate] : [rule] } : {}),
    reminders: { useDefault: false, overrides: reminders },
    status: 'confirmed',
    transparency: 'transparent',
    source: { title: CALENDAR_SUMMARY, url: appUrl },
    extendedProperties: { private: { [EVENT_MARK]: '1' } }
  };
};

// Para comparar dos eventos (p. ej. la tarea antes y después de un cambio que no afecta al calendario)
export const sameEvent = (a: CalendarEventBody | null, b: CalendarEventBody | null) =>
  JSON.stringify(a) === JSON.stringify(b);

// Lo que envía la app al conectar: el código de Google, su verificador PKCE, la dirección a la que volvió Google (una de
// las de la app) y la zona horaria del dispositivo. null si algo no vale
export const parseConnectRequest = (data: unknown, allowedOrigins: string[]) => {
  const { code, codeVerifier, redirectUri, timeZone } = (data ?? {}) as Record<string, unknown>;
  if (typeof code !== 'string' || !code || code.length > 2048) return null;
  if (typeof codeVerifier !== 'string' || !/^[\w.~-]{43,128}$/.test(codeVerifier)) return null;
  if (typeof redirectUri !== 'string' || !allowedOrigins.some((o) => redirectUri === `${o}${OAUTH_CALLBACK_PATH}`))
    return null;
  if (!isTimeZone(timeZone)) return null;
  return { code, codeVerifier, redirectUri, timeZone };
};
