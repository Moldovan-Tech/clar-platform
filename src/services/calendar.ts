import { TaskItem, TaskObservation } from '../types';
import { dueMoment, formatDay, toLocalDate } from './tasks';
import { toRRule } from './recurrence';
import { alarmMoment } from './alarms';
import { messages } from '../i18n/locale';

const m = messages(
  {
    notes: 'Notas:',
    dueDate: (date: string) => `Fecha límite: ${date}`,
    clarTask: (url: string) => `Tarea de CLAR: ${url}`,
    fullInClar: '… (completa en CLAR)'
  },
  {
    notes: 'Notes:',
    dueDate: (date) => `Due date: ${date}`,
    clarTask: (url) => `CLAR task: ${url}`,
    fullInClar: '… (full text in CLAR)'
  }
);

// Evento de calendario a partir de las fechas de una tarea. Se exporta con enlaces "añadir evento"
// de cada proveedor o con un archivo .ics: no hace falta conectar ninguna cuenta.
export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  allDay: boolean;
  start: Date; // día completo: medianoche local del primer día
  end: Date; // día completo: medianoche local del día siguiente al último (exclusivo)
  rrule?: string; // tareas recurrentes: la serie completa (Google Calendar y .ics; los enlaces de Outlook no lo admiten)
  // Series con hora: zona horaria del dispositivo. Sus horas van en hora local con esta zona, no en UTC: así la regla
  // (p. ej. los lunes) se aplica al día local y la hora no se mueve con el cambio de horario
  timeZone?: string;
  // Series: fechas (YYYY-MM-DD) que la serie salta, a la misma hora que su inicio (solo en el .ics)
  exdates?: string[];
  // Alarma de la tarea (solo en el .ics): minutos antes del inicio o del final del evento (negativos: después)
  alarm?: { minutesBefore: number; related: 'START' | 'END' };
}

const DEADLINE_EVENT_MS = 30 * 60 * 1000;
// Con hora de inicio y sin hora límite, el evento dura una hora (no hasta el final del día límite)
const DEFAULT_EVENT_MS = 60 * 60 * 1000;
// Solo con fecha (un día, sin horas): el evento de una hora empieza a la hora de la alarma o, sin alarma, a las 09:00.
// Así el recordatorio del calendario suena justo con la alarma de CLAR
const DEFAULT_EVENT_TIME = '09:00';

// Las notas de la tarea, una por línea; las de lista, con su casilla
const notesText = (observations: TaskObservation[] = []) => {
  const lines = observations
    .filter((o) => o.text.trim() || o.url)
    .map((o) => {
      const box = o.type === 'checklist' ? (o.completed ? '[x] ' : '[ ] ') : '';
      const link = o.url && o.url !== o.text ? ` (${o.url})` : '';
      return `- ${box}${o.text.trim()}${link}`;
    });
  return lines.length ? `${m.notes}\n${lines.join('\n')}` : '';
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const buildCalendarEvent = (
  source: TaskItem,
  appUrl: string,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
): CalendarEvent | null => {
  if (!source.dueDate) return null;
  // Una tarea repetida no es un intervalo: cada repetición ocupa su día, de la hora de inicio a la límite.
  // Así el evento empieza el mismo día en que se ancla la regla (las de antes de 0.8 podían tener inicio).
  const dueDate = source.dueDate;
  const task = source.recurrence ? { ...source, startDate: source.startTime ? dueDate : undefined } : source;
  // De día completo, solo un intervalo de varios días sin horas; un día sin horas va a la hora de su alarma
  const allDay = !task.startTime && !task.dueTime && Boolean(task.startDate && task.startDate < dueDate);
  const dateOnly = !task.startTime && !task.dueTime && !allDay;
  // Con inicio y sin hora límite, el evento (de una hora) no llega al día límite: se dice en la descripción
  const oneHour = Boolean(task.startTime && !task.dueTime);
  const deadlineNote = oneHour && (task.startDate ?? dueDate) !== dueDate ? m.dueDate(formatDay(dueDate)) : '';
  const description = [task.description, notesText(task.observations), deadlineNote, m.clarTask(appUrl)]
    .filter(Boolean)
    .join('\n\n');
  // Una repetición que cuenta desde que se hace no tiene serie: va como un evento suelto, el de la repetición actual
  const rrule = task.recurrence ? toRRule(task.recurrence, allDay, dueDate) : null;
  const base = {
    // Dominio del UID sin cambiar (nombre anterior de la app): así reexportar actualiza el mismo evento
    uid: `${task.id}@neuroproductividad`,
    title: task.title,
    description,
    ...(rrule ? { rrule, ...(allDay || !timeZone ? {} : { timeZone }) } : {}),
    ...(rrule && task.recurrence?.skip?.length ? { exdates: task.recurrence.skip.filter((d) => d > dueDate) } : {})
  };

  // La alarma se cuenta desde un borde del evento (en una serie, la misma para cada repetición): el que marca el plazo
  // o, en un evento de una hora, su inicio (la alarma puede caer después; en uno solo con fecha, es su inicio)
  const alarmAt = alarmMoment(source);
  const alarm = (edge: Date, related: 'START' | 'END') =>
    alarmAt ? { alarm: { related, minutesBefore: Math.round((edge.getTime() - alarmAt.getTime()) / 60_000) } } : {};

  // Intervalo de varios días sin horas: evento de día completo
  if (allDay) {
    const end = addDays(toLocalDate(dueDate), 1);
    return { ...base, allDay: true, start: toLocalDate(task.startDate!), end, ...alarm(end, 'END') };
  }

  if (dateOnly) {
    const start = alarmAt ?? toLocalDate(dueDate, DEFAULT_EVENT_TIME);
    return {
      ...base,
      allDay: false,
      start,
      end: new Date(start.getTime() + DEFAULT_EVENT_MS),
      ...alarm(start, 'START')
    };
  }

  if (oneHour) {
    const start = toLocalDate(task.startDate ?? dueDate, task.startTime);
    return {
      ...base,
      allDay: false,
      start,
      end: new Date(start.getTime() + DEFAULT_EVENT_MS),
      ...alarm(start, 'START')
    };
  }

  const due = dueMoment(task)!;
  // Solo plazo con hora: evento corto que empieza a la hora límite
  if (!task.startDate) {
    return {
      ...base,
      allDay: false,
      start: due,
      end: new Date(due.getTime() + DEADLINE_EVENT_MS),
      ...alarm(due, 'START')
    };
  }
  return { ...base, allDay: false, start: toLocalDate(task.startDate, task.startTime), end: due, ...alarm(due, 'END') };
};

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const localDayIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Las horas se envían en UTC para que cada calendario las muestre en la zona horaria de la persona
const utcStamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const utcIso = (d: Date) => d.toISOString().replace(/\.\d{3}/, '');
// Hora local del dispositivo (para las series, con su zona horaria)
const localStamp = (d: Date) => `${localDay(d)}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

// En los enlaces, la descripción va recortada: una URL de muchos KB la rechazan los proveedores. El archivo .ics la
// lleva entera
export const LINK_DESCRIPTION_MAX = 1500;
const linkDescription = (description: string) =>
  description.length > LINK_DESCRIPTION_MAX
    ? `${description.slice(0, LINK_DESCRIPTION_MAX).trimEnd()}${m.fullInClar}`
    : description;

export const googleCalendarUrl = (event: CalendarEvent) => {
  const dates = event.allDay
    ? `${localDay(event.start)}/${localDay(event.end)}`
    : event.timeZone
      ? `${localStamp(event.start)}/${localStamp(event.end)}`
      : `${utcStamp(event.start)}/${utcStamp(event.end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    details: linkDescription(event.description)
  });
  if (event.rrule) params.set('recur', event.rrule);
  if (event.timeZone && !event.allDay) params.set('ctz', event.timeZone);
  return `https://calendar.google.com/calendar/render?${params}`;
};

// Outlook.com (cuentas personales) y Outlook de Microsoft 365 (trabajo o centro de estudios)
export const outlookCalendarUrl = (event: CalendarEvent, account: 'personal' | 'work') => {
  const host = account === 'personal' ? 'https://outlook.live.com' : 'https://outlook.office.com';
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: linkDescription(event.description),
    allday: String(event.allDay),
    startdt: event.allDay ? localDayIso(event.start) : utcIso(event.start),
    enddt: event.allDay ? localDayIso(event.end) : utcIso(event.end)
  });
  return `${host}/calendar/0/action/compose?${params}`;
};

const escapeIcsText = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');

// RFC 5545: líneas de 75 octetos como máximo; las continuaciones empiezan por un espacio
const foldIcsLine = (line: string) => {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
};

// ZONA HORARIA DEL .ics (RFC 5545 exige un VTIMEZONE para cada TZID): sus cambios de hora desde el año del evento y
// durante los diez siguientes, leídos del propio navegador, cada uno con la hora local en que ocurre
const TIMEZONE_YEARS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();
const offsetMinutes = (instant: number, timeZone: string) => {
  let format = offsetFormatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    offsetFormatters.set(timeZone, format);
  }
  const parts = format.formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((local - Math.floor(instant / 60_000) * 60_000) / 60_000);
};
const formatOffset = (minutes: number) => {
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
};
// Fecha y hora «de pared» (sin zona) de un instante con un desfase dado
const wallStamp = (instant: number, offset: number) =>
  new Date(instant + offset * 60_000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '');

export const buildVtimezone = (timeZone: string, from: Date) => {
  const start = Date.UTC(from.getUTCFullYear(), 0, 1);
  const end = Date.UTC(from.getUTCFullYear() + TIMEZONE_YEARS, 0, 1);
  const initial = offsetMinutes(start, timeZone);
  const observance = (at: number, offsetFrom: number, offsetTo: number, daylight = offsetTo > offsetFrom) => [
    `BEGIN:${daylight ? 'DAYLIGHT' : 'STANDARD'}`,
    `DTSTART:${wallStamp(at, offsetFrom)}`,
    `TZOFFSETFROM:${formatOffset(offsetFrom)}`,
    `TZOFFSETTO:${formatOffset(offsetTo)}`,
    `END:${daylight ? 'DAYLIGHT' : 'STANDARD'}`
  ];
  // El 1 de enero es horario de verano en el hemisferio sur: lo es si su desfase es el mayor del año
  const midYear = offsetMinutes(Date.UTC(from.getUTCFullYear(), 6, 1), timeZone);
  const lines = ['BEGIN:VTIMEZONE', `TZID:${timeZone}`, ...observance(start, initial, initial, initial > midYear)];
  let previous = initial;
  for (let day = start; day < end; day += DAY_MS) {
    const next = offsetMinutes(day + DAY_MS, timeZone);
    if (next === previous) continue;
    // El minuto exacto del cambio, dentro de ese día
    let low = day;
    let high = day + DAY_MS;
    while (high - low > 60_000) {
      const middle = Math.floor((low + high) / 120_000) * 60_000;
      if (offsetMinutes(middle, timeZone) === previous) low = middle;
      else high = middle;
    }
    lines.push(...observance(high, previous, next));
    previous = next;
  }
  return [...lines, 'END:VTIMEZONE'];
};

// EXDATE: cada fecha saltada, a la hora del inicio de la serie (en su zona o en UTC). Una serie nunca es de día
// completo: cada repetición ocupa su día (sin intervalo)
const exdateLine = (event: CalendarEvent) => {
  const dates = event.exdates ?? [];
  const at = (date: string) => {
    const [y, mo, d] = date.split('-').map(Number);
    return new Date(y, mo - 1, d, event.start.getHours(), event.start.getMinutes(), event.start.getSeconds());
  };
  return event.timeZone
    ? `EXDATE;TZID=${event.timeZone}:${dates.map((d) => localStamp(at(d))).join(',')}`
    : `EXDATE:${dates.map((d) => utcStamp(at(d))).join(',')}`;
};

export const buildIcs = (event: CalendarEvent, now = new Date()) => {
  const timing = event.allDay
    ? [`DTSTART;VALUE=DATE:${localDay(event.start)}`, `DTEND;VALUE=DATE:${localDay(event.end)}`]
    : event.timeZone
      ? [
          `DTSTART;TZID=${event.timeZone}:${localStamp(event.start)}`,
          `DTEND;TZID=${event.timeZone}:${localStamp(event.end)}`
        ]
      : [`DTSTART:${utcStamp(event.start)}`, `DTEND:${utcStamp(event.end)}`];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CLAR//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(event.timeZone && !event.allDay ? buildVtimezone(event.timeZone, event.start) : []),
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    ...timing,
    ...(event.rrule ? [event.rrule] : []),
    ...(event.rrule && event.exdates?.length ? [exdateLine(event)] : []),
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.alarm
      ? [
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeIcsText(event.title)}`,
          `TRIGGER${event.alarm.related === 'END' ? ';RELATED=END' : ''}:${event.alarm.minutesBefore >= 0 ? '-' : ''}PT${Math.abs(event.alarm.minutesBefore)}M`,
          'END:VALARM'
        ]
      : []),
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .map(foldIcsLine)
    .join('\r\n')
    .concat('\r\n');
};
