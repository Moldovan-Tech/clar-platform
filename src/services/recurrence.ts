import { MonthlyMode, Recurrence, RecurrenceFrequency, TaskItem } from '../types';
import { toLocalDate } from './tasks';
import { LOCALE_TAG, messages } from '../i18n/locale';

// «1st», «2nd», «3rd», «4th», «11th», «22nd»…
const englishOrdinal = (n: number) => {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
};

const m = messages(
  {
    units: {
      DAILY: ['día', 'días'],
      WEEKLY: ['semana', 'semanas'],
      MONTHLY: ['mes', 'meses'],
      YEARLY: ['año', 'años']
    } satisfies Record<RecurrenceFrequency, [string, string]>,
    weekdayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    weekdayShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    ordinals: ['', '1.er', '2.º', '3.er', '4.º'],
    every: (unit: string) => `Cada ${unit}`,
    everyN: (n: number, units: string) => `Cada ${n} ${units}`,
    nthWeekday: (ordinal: string, weekday: string) => `el ${ordinal} ${weekday}`,
    lastWeekday: (weekday: string) => `el último ${weekday}`,
    monthDay: (day: number) => `el día ${day}`,
    yearDay: (date: string) => `el ${date}`,
    afterDone: (n: number, units: string) => `${n} ${units} después de hacerla`,
    until: (text: string, date: string) => `${text} (hasta el ${date})`
  },
  {
    units: {
      DAILY: ['day', 'days'],
      WEEKLY: ['week', 'weeks'],
      MONTHLY: ['month', 'months'],
      YEARLY: ['year', 'years']
    },
    weekdayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ordinals: ['', '1st', '2nd', '3rd', '4th'],
    every: (unit) => `Every ${unit}`,
    everyN: (n, units) => `Every ${n} ${units}`,
    nthWeekday: (ordinal, weekday) => `on the ${ordinal} ${weekday}`,
    lastWeekday: (weekday) => `on the last ${weekday}`,
    monthDay: (day) => `on the ${englishOrdinal(day)}`,
    yearDay: (date) => `on ${date}`,
    afterDone: (n, units) => `${n} ${units} after you do it`,
    until: (text, date) => `${text} (until ${date})`
  }
);

// Fechas locales (YYYY-MM-DD) sin hora: la hora de la tarea se conserva aparte
const pad = (n: number) => String(n).padStart(2, '0');
export const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// N.º día de la semana del mes (1 = primero). Del 29 en adelante siempre es el 5.º, que no existe todos los meses.
export const nthOfMonth = (d: Date) => Math.ceil(d.getDate() / 7);
export const isLastWeekdayOfMonth = (d: Date) => d.getDate() + 7 > daysInMonth(d.getFullYear(), d.getMonth());

const nthWeekdayOf = (year: number, month: number, weekday: number, nth: number) => {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (nth - 1) * 7);
};

const lastWeekdayOf = (year: number, month: number, weekday: number) => {
  const last = new Date(year, month, daysInMonth(year, month));
  return addDays(last, -((last.getDay() - weekday + 7) % 7));
};

// Lunes de la semana de una fecha (las semanas empiezan en lunes)
const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

const intervalOf = (rec: Recurrence) => Math.max(1, Math.floor(rec.interval || 1));

// Solo los días y las semanas pueden contar desde el día en que se hace la tarea
export const canRepeatFromCompletion = (frequency: RecurrenceFrequency | ''): frequency is 'DAILY' | 'WEEKLY' =>
  frequency === 'DAILY' || frequency === 'WEEKLY';

// La siguiente vence N días o semanas después del día en que se hace, no en fechas fijas
export const repeatsFromCompletion = (rec: Recurrence) =>
  rec.from === 'COMPLETION' && canRepeatFromCompletion(rec.frequency);

// Días entre el día en que se hace y la siguiente (repetición desde que se hace)
const completionStep = (rec: Recurrence) => intervalOf(rec) * (rec.frequency === 'WEEKLY' ? 7 : 1);

// «día» o «días» según N
export const repeatUnit = (frequency: RecurrenceFrequency, n: number) => m.units[frequency][n === 1 ? 0 : 1];

// Siguiente fecha después de `from` según la regla (sin comprobar `until` ni el día de hoy)
const ruleStepAfter = (from: Date, rec: Recurrence): Date => {
  const n = intervalOf(rec);
  switch (rec.frequency) {
    case 'DAILY':
      return addDays(from, n);
    case 'WEEKLY': {
      const days = [...new Set(rec.weekdays?.length ? rec.weekdays : [from.getDay()])];
      const order = (wd: number) => (wd + 6) % 7; // lunes = 0 … domingo = 6
      const laterThisWeek = days.filter((wd) => order(wd) > order(from.getDay())).sort((a, b) => order(a) - order(b));
      if (laterThisWeek.length) return addDays(weekStart(from), order(laterThisWeek[0]));
      const firstDay = Math.min(...days.map(order));
      return addDays(weekStart(from), 7 * n + firstDay);
    }
    case 'MONTHLY': {
      const target = new Date(from.getFullYear(), from.getMonth() + n, 1);
      const [y, m] = [target.getFullYear(), target.getMonth()];
      const mode: MonthlyMode = rec.monthlyMode ?? 'DAY_OF_MONTH';
      if (mode === 'NTH_WEEKDAY') return nthWeekdayOf(y, m, rec.weekday ?? from.getDay(), rec.nth ?? nthOfMonth(from));
      if (mode === 'LAST_WEEKDAY') return lastWeekdayOf(y, m, rec.weekday ?? from.getDay());
      return new Date(y, m, Math.min(rec.monthDay ?? from.getDate(), daysInMonth(y, m)));
    }
    case 'YEARLY': {
      const y = from.getFullYear() + n;
      return new Date(y, from.getMonth(), Math.min(rec.monthDay ?? from.getDate(), daysInMonth(y, from.getMonth())));
    }
  }
};

// Fechas que la serie salta (Recurrence.skip)
export const isSkipped = (rec: Recurrence, date: string) => Boolean(rec.skip?.includes(date));

// Siguiente fecha de la serie después de `from`, sin las fechas saltadas (con un límite de seguridad)
const stepAfter = (from: Date, rec: Recurrence): Date => {
  let next = ruleStepAfter(from, rec);
  for (let guard = 0; rec.skip?.length && isSkipped(rec, toDateString(next)) && guard < 1_000; guard++)
    next = ruleStepAfter(next, rec);
  return next;
};

// Misma regla (las mismas fechas), sin contar el final ni las fechas saltadas
export const sameRule = (a: Recurrence, b: Recurrence) => {
  const rule = ({ until: _until, skip: _skip, ...r }: Recurrence) =>
    JSON.stringify({ ...r, weekdays: r.weekdays ? [...r.weekdays].sort() : undefined }, Object.keys(r).sort());
  return rule(a) === rule(b);
};

// Las fechas saltadas, ordenadas, sin repetir y solo las posteriores a `after` (las demás ya no importan) y hasta el
// fin de la serie. Sin ninguna, no queda el campo
export const SKIP_MAX = 1000;
export const withSkip = (rec: Recurrence, dates: string[], after: string): Recurrence => {
  const { skip: _skip, ...rest } = rec;
  // Contando desde que se hace no hay fechas que saltar. Como mucho SKIP_MAX, las más próximas
  if (repeatsFromCompletion(rec)) return rest;
  const kept = [...new Set(dates)]
    .filter((d) => d > after && (!rec.until || d <= rec.until))
    .sort()
    .slice(0, SKIP_MAX);
  return kept.length ? { ...rest, skip: kept } : rest;
};

// Primera fecha de la serie el día `from` o después, con la regla anclada en `from` (inicio de la repetición).
// Devuelve null si cae después de `until`.
export const firstOccurrence = (from: string, rec: Recurrence): string | null => {
  const start = toLocalDate(from);
  const startMatches =
    rec.frequency !== 'WEEKLY' ||
    repeatsFromCompletion(rec) ||
    !rec.weekdays?.length ||
    rec.weekdays.includes(start.getDay());
  const first = toDateString(startMatches ? start : stepAfter(start, rec));
  return rec.until && first > rec.until ? null : first;
};

// Momento en que vence una fecha de la serie: a la hora límite o, sin hora, al final del día
const deadlineOf = (d: Date, dueTime?: string) => {
  if (!dueTime) return addDays(d, 1);
  const [hh, mm] = dueTime.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
};

// Próxima fecha de la tarea tras `dueDate`, al completarla en `now`. Si se completa con retraso, salta hasta la primera
// fecha que no haya vencido, teniendo en cuenta la hora límite (no se crean repeticiones ya vencidas). Contando desde
// que se hace, es N días o semanas después del día local de `now`, sea cual sea `dueDate` (nunca vencida). Devuelve
// null si supera `until`.
export const nextOccurrence = (dueDate: string, rec: Recurrence, now = new Date(), dueTime?: string): string | null => {
  if (repeatsFromCompletion(rec)) {
    const afterDone = toDateString(addDays(now, completionStep(rec)));
    return rec.until && afterDone > rec.until ? null : afterDone;
  }
  let next = stepAfter(toLocalDate(dueDate), rec);
  for (let guard = 0; deadlineOf(next, dueTime) <= now && guard < 10_000; guard++) next = stepAfter(next, rec);
  if (rec.until && toDateString(next) > rec.until) return null;
  return toDateString(next);
};

// Próximas N fechas a partir de `dueDate` incluida (para la agenda), dentro de `until`. Contando desde que se hace,
// solo `dueDate`: las siguientes dependen de cuándo se haga
export const upcomingOccurrences = (dueDate: string, rec: Recurrence, count: number): string[] => {
  const dates = [dueDate];
  if (repeatsFromCompletion(rec)) return dates;
  let current = toLocalDate(dueDate);
  while (dates.length < count) {
    current = stepAfter(current, rec);
    const value = toDateString(current);
    if (rec.until && value > rec.until) break;
    dates.push(value);
  }
  return dates;
};

// Repeticiones posteriores a `dueDate` entre `from` y `to` (incluidos) y dentro de `until`, para la agenda.
// Se calculan hasta `to` sea cual sea la distancia a la fecha original (con un límite de seguridad de pasos).
// Contando desde que se hace, ninguna: no se sabe cuándo se hará
export const occurrencesBetween = (dueDate: string, rec: Recurrence, from: string, to: string): string[] => {
  const dates: string[] = [];
  if (repeatsFromCompletion(rec)) return dates;
  let current = toLocalDate(dueDate);
  for (let guard = 0; guard < 50_000; guard++) {
    current = stepAfter(current, rec);
    const value = toDateString(current);
    if (value > to || (rec.until && value > rec.until)) break;
    if (value >= from) dates.push(value);
  }
  return dates;
};

// Regla con los anclajes tomados de la fecha límite (día del mes, N.º y día de la semana). Contando desde que se hace
// (solo días y semanas), sin días de la semana
export const buildRecurrence = (
  frequency: RecurrenceFrequency,
  dueDate: string,
  options: {
    interval?: number;
    weekdays?: number[];
    monthlyMode?: MonthlyMode;
    until?: string;
    from?: Recurrence['from'];
  } = {}
): Recurrence => {
  const due = toLocalDate(dueDate);
  const base: Recurrence = { frequency, interval: Math.max(1, Math.floor(options.interval ?? 1)) };
  if (options.until) base.until = options.until;
  if (options.from === 'COMPLETION' && canRepeatFromCompletion(frequency)) return { ...base, from: 'COMPLETION' };
  if (frequency === 'WEEKLY')
    return { ...base, weekdays: options.weekdays?.length ? [...options.weekdays].sort() : [due.getDay()] };
  if (frequency === 'MONTHLY') {
    const mode = options.monthlyMode ?? 'DAY_OF_MONTH';
    if (mode === 'NTH_WEEKDAY')
      return { ...base, monthlyMode: mode, nth: Math.min(4, nthOfMonth(due)), weekday: due.getDay() };
    if (mode === 'LAST_WEEKDAY') return { ...base, monthlyMode: mode, weekday: due.getDay() };
    return { ...base, monthlyMode: mode, monthDay: due.getDate() };
  }
  if (frequency === 'YEARLY') return { ...base, monthDay: due.getDate() };
  return base;
};

// Hash cyrb53 (53 bits): identificador estable sin depender del reloj ni de un generador aleatorio
const cyrb53 = (text: string) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// Id de la siguiente repetición: depende solo de la tarea, no de la fecha calculada. Si dos pestañas o
// dispositivos la marcan a la vez (aunque calculen fechas distintas, p. ej. a ambos lados de la hora límite),
// escriben el mismo documento en lugar de crear dos repeticiones.
export const successorId = (taskId: string) => `task-r${cyrb53(taskId).toString(36)}`;

// Siguiente tarea de la serie: misma tarea con la nueva fecha, pendiente y con la lista de comprobación sin marcar.
// Cada repetición vence su propio día, así que no lleva fecha de inicio (no hay intervalo), y no sigue esperando a la
// tarea a la que esperaba la anterior.
export const nextRecurringTask = (task: TaskItem, now = new Date()): TaskItem | null => {
  if (!task.recurrence || !task.dueDate) return null;
  const nextDue = nextOccurrence(task.dueDate, task.recurrence, now, task.dueTime);
  if (!nextDue) return null;
  // Cada repetición vence su propio día: sin fecha de inicio (las tareas de antes de 0.8 podían tenerla)
  const {
    doneAt: _doneAt,
    nextOccurrenceId: _nextOccurrenceId,
    startDate: _startDate,
    dependsOn: _dependsOn,
    ...rest
  } = task;
  return {
    ...rest,
    id: successorId(task.id),
    status: 'PENDING',
    dueDate: nextDue,
    // Las fechas saltadas que ya quedaron atrás no se arrastran
    ...(task.recurrence.skip ? { recurrence: withSkip(task.recurrence, task.recurrence.skip, nextDue) } : {}),
    observations: task.observations.map((o) => (o.type === 'checklist' ? { ...o, completed: false } : o)),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
};

// Una repetición prevista convertida en tarea suelta (al cambiar su estado desde la Agenda): la misma tarea con esa
// fecha, sin repetición ni fecha de inicio, con la lista de comprobación sin marcar. Su id depende de la serie y la
// fecha: dos pestañas que la conviertan a la vez escriben el mismo documento
export const occurrenceTaskId = (seriesId: string, date: string) =>
  `task-o${cyrb53(`${seriesId}:${date}`).toString(36)}`;
export const occurrenceTask = (series: TaskItem, date: string, now = new Date()): TaskItem => {
  const {
    doneAt: _doneAt,
    nextOccurrenceId: _nextOccurrenceId,
    startDate: _startDate,
    dependsOn: _dependsOn,
    recurrence: _recurrence,
    ...rest
  } = series;
  return {
    ...rest,
    id: occurrenceTaskId(series.id, date),
    status: 'PENDING',
    dueDate: date,
    observations: series.observations.map((o) => (o.type === 'checklist' ? { ...o, completed: false } : o)),
    ...(series.alarmTime ? { alarmSetAt: now.toISOString() } : {}),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
};

// La serie sin la repetición del día `date` (borrada o convertida en tarea suelta)
export const skipOccurrence = (series: TaskItem, date: string, now = new Date()): TaskItem => {
  const rec = series.recurrence!;
  return {
    ...series,
    recurrence: withSkip(rec, [...(rec.skip ?? []), date], series.dueDate ?? ''),
    updatedAt: now.toISOString()
  };
};

// La serie termina el día antes de `date`: sin esa repetición ni las siguientes
export const endSeriesBefore = (series: TaskItem, date: string, now = new Date()): TaskItem => {
  const until = toDateString(addDays(toLocalDate(date), -1));
  const rec = { ...series.recurrence!, until };
  return { ...series, recurrence: withSkip(rec, rec.skip ?? [], series.dueDate ?? ''), updatedAt: now.toISOString() };
};

// La repetición actual (una tarea real) pasa a la siguiente fecha de la serie, pendiente, sin quedar como hecha. null si
// era la última
export const skipCurrent = (task: TaskItem, now = new Date()): TaskItem | null => {
  if (!task.recurrence || !task.dueDate) return null;
  const nextDue = nextOccurrence(task.dueDate, task.recurrence, now, task.dueTime);
  if (!nextDue) return null;
  const { doneAt: _doneAt, ...rest } = task;
  return {
    ...rest,
    status: 'PENDING',
    dueDate: nextDue,
    recurrence: withSkip(task.recurrence, task.recurrence.skip ?? [], nextDue),
    observations: task.observations.map((o) => (o.type === 'checklist' ? { ...o, completed: false } : o)),
    ...(task.alarmTime ? { alarmSetAt: now.toISOString() } : {}),
    updatedAt: now.toISOString()
  };
};

const untilFormat = new Intl.DateTimeFormat(LOCALE_TAG, { day: 'numeric', month: 'short', year: 'numeric' });
const dayMonthFormat = new Intl.DateTimeFormat(LOCALE_TAG, { day: 'numeric', month: 'long' });

// «Cada día», «Cada 3 días»…
export const everyPeriod = (n: number, frequency: RecurrenceFrequency) =>
  n === 1 ? m.every(repeatUnit(frequency, 1)) : m.everyN(n, repeatUnit(frequency, n));

// «3 días después de hacerla» (contando desde el día en que se hace)
export const afterDoneText = (n: number, frequency: RecurrenceFrequency) => m.afterDone(n, repeatUnit(frequency, n));

// El día de cada mes: «el día 15», «el 2.º lunes» o «el último lunes» (`weekday` sigue a Date.getDay())
export const monthlyDayText = (mode: MonthlyMode, monthDay: number, weekday: number, nth: number) => {
  if (mode === 'NTH_WEEKDAY') return m.nthWeekday(m.ordinals[nth], m.weekdayNames[weekday]);
  if (mode === 'LAST_WEEKDAY') return m.lastWeekday(m.weekdayNames[weekday]);
  return m.monthDay(monthDay);
};

// Regla en fechas fijas, p. ej. "Cada mes, el 2.º lunes"
const describeSchedule = (rec: Recurrence, due?: Date): string => {
  const n = intervalOf(rec);
  switch (rec.frequency) {
    case 'DAILY':
      return everyPeriod(n, 'DAILY');
    case 'WEEKLY': {
      const days = (rec.weekdays?.length ? rec.weekdays : due ? [due.getDay()] : [])
        .slice()
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((d) => m.weekdayShort[d]);
      return `${everyPeriod(n, 'WEEKLY')}${days.length ? `: ${days.join(', ')}` : ''}`;
    }
    case 'MONTHLY': {
      const day = monthlyDayText(
        rec.monthlyMode ?? 'DAY_OF_MONTH',
        rec.monthDay ?? due?.getDate() ?? 1,
        rec.weekday ?? due?.getDay() ?? 1,
        rec.nth ?? 1
      );
      return `${everyPeriod(n, 'MONTHLY')}, ${day}`;
    }
    case 'YEARLY':
      return `${everyPeriod(n, 'YEARLY')}${due ? `, ${m.yearDay(dayMonthFormat.format(due))}` : ''}`;
  }
};

// Descripción legible, p. ej. "Cada mes, el 2.º lunes" o "3 días después de hacerla"
export const describeRecurrence = (rec: Recurrence, dueDate?: string): string => {
  const n = intervalOf(rec);
  const text = repeatsFromCompletion(rec)
    ? afterDoneText(n, rec.frequency)
    : describeSchedule(rec, dueDate ? toLocalDate(dueDate) : undefined);
  return rec.until ? m.until(text, untilFormat.format(toLocalDate(rec.until))) : text;
};

// RRULE (RFC 5545) para exportar la serie al calendario
const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Días 29–31: la app usa el último día de los meses más cortos; en RRULE eso es «el último de los días 28…N»
const lastDayFallback = (monthDay: number) =>
  `BYMONTHDAY=${Array.from({ length: monthDay - 27 }, (_, i) => 28 + i).join(',')};BYSETPOS=-1`;

// UNTIL con hora: fin del día local de `until`, en UTC (23:59:59 UTC dejaría fuera horas tardías al oeste de UTC)
const untilStamp = (until: string, allDay: boolean) => {
  if (allDay) return until.replace(/-/g, '');
  const [y, m, d] = until.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
};

// `anchorDate` (la fecha límite) da el mes de las repeticiones anuales: el 29 de febrero pasa al 28 en años no bisiestos.
// Contando desde que se hace no hay serie (null): las fechas dependen de cuándo se haga cada una
export const toRRule = (rec: Recurrence, allDay: boolean, anchorDate?: string): string | null => {
  if (repeatsFromCompletion(rec)) return null;
  const parts = [`FREQ=${rec.frequency}`, `INTERVAL=${intervalOf(rec)}`];
  if (rec.frequency === 'WEEKLY') {
    // La semana empieza en lunes, como en la app: decide qué días caen en cada semana cuando el intervalo es > 1
    parts.push('WKST=MO');
    const days = [...(rec.weekdays ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    if (days.length) parts.push(`BYDAY=${days.map((d) => RRULE_DAYS[d]).join(',')}`);
  }
  if (rec.frequency === 'MONTHLY') {
    if (rec.monthlyMode === 'NTH_WEEKDAY') parts.push(`BYDAY=${rec.nth ?? 1}${RRULE_DAYS[rec.weekday ?? 1]}`);
    else if (rec.monthlyMode === 'LAST_WEEKDAY') parts.push(`BYDAY=-1${RRULE_DAYS[rec.weekday ?? 1]}`);
    else if (rec.monthDay) parts.push(rec.monthDay > 28 ? lastDayFallback(rec.monthDay) : `BYMONTHDAY=${rec.monthDay}`);
  }
  if (rec.frequency === 'YEARLY' && rec.monthDay === 29 && anchorDate && toLocalDate(anchorDate).getMonth() === 1) {
    parts.push(`BYMONTH=2;${lastDayFallback(29)}`);
  }
  if (rec.until) parts.push(`UNTIL=${untilStamp(rec.until, allDay)}`);
  return `RRULE:${parts.join(';')}`;
};
