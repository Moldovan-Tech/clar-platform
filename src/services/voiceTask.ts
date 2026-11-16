import type { TaskPriority } from '../types';
import { LOCALE, type Locale } from '../i18n/locale';
import { toDateString } from './recurrence';
import { toLocalDate } from './tasks';

// TAREA DICTADA: separa de lo dictado el plazo y la prioridad, con la forma
//   «<título> antes de(l) <día> [y] [a las <hora>] [con prioridad <prioridad>]»
//   “<title> before|by <day> [and] [at <time>] [with <priority> priority]”
// (las partes del plazo y la prioridad son opcionales y pueden ir en cualquier orden, pero el plazo va al final, tras
// quitar la prioridad). Solo se entiende si lo que sigue a «antes de» es un día o una hora: «antes de la reunión» se
// queda en el título. Lo que no se entiende no se toca. Se usa solo con el dictado, nunca con lo escrito a mano.
//
// El día: hoy, mañana, pasado mañana, un día de la semana (el siguiente, contando hoy; con «próximo» o «que viene»,
// sin contar hoy), «el 20», «el 20 de noviembre [de 2027]» o «20/11[/2027]». Sin mes, el próximo día 20 (este mes o el
// siguiente); sin año, la próxima vez que llega esa fecha. Solo con hora, hoy.
// La hora: «a las 17», «a las 17:30», «a las 5 de la tarde», «a las 9 y media», «a las 6 menos cuarto», «a mediodía»,
// «5 pm». Sin «de la tarde» o «pm», la hora es la dicha (las 5 son las 05:00). Medianoche es el final del día (23:59).
// La prioridad, con «con» o como «prioridad: alta», solo cuenta al final o justo antes del plazo.

export interface DictatedFields {
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority?: TaskPriority;
}

export interface DictatedTask extends DictatedFields {
  title: string;
}

// Minúsculas y sin tildes, letra por letra: los índices coinciden con los del texto original
const fold = (text: string) => {
  let out = '';
  for (const ch of text) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lower = base.toLowerCase();
    // Un carácter que al plegarse cambia de longitud (raro) se sustituye por un espacio, así no se desplaza nada
    out += lower.length === ch.length ? lower : ' '.repeat(ch.length);
  }
  return out;
};

interface Grammar {
  dueKeyword: RegExp;
  // Lo que sigue a una prioridad dicha justo antes del plazo
  beforeDue: RegExp;
  priority: RegExp;
  priorities: Record<string, TaskPriority>;
  parseDay: (text: string, today: string) => { date: string; rest: string } | null;
  parseTime: (text: string) => { time: string; rest: string } | null;
  separator: RegExp;
  trailing: RegExp;
}

const pad = (n: number) => String(n).padStart(2, '0');

const validDate = (year: number, month: number, day: number): string | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? toDateString(date)
    : null;
};

const addDays = (date: string, days: number) => {
  const d = toLocalDate(date);
  return toDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
};

// El próximo día de la semana `weekday` (0 = domingo) desde hoy: hoy mismo si `includeToday`
const nextWeekday = (today: string, weekday: number, includeToday: boolean) => {
  const diff = (weekday - toLocalDate(today).getDay() + 7) % 7;
  return addDays(today, diff === 0 && !includeToday ? 7 : diff);
};

// El próximo día `day` del mes (este mes si aún no ha pasado; si no, el siguiente mes que lo tenga)
const nextDayOfMonth = (today: string, day: number) => {
  const t = toLocalDate(today);
  for (let i = 0; i < 13; i++) {
    const month = new Date(t.getFullYear(), t.getMonth() + i, 1);
    const candidate = validDate(month.getFullYear(), month.getMonth() + 1, day);
    if (candidate && candidate >= today) return candidate;
  }
  return null;
};

// El próximo `day` de `month` (este año si aún no ha pasado; si no, el siguiente)
const nextDate = (today: string, month: number, day: number, year?: number) => {
  if (year !== undefined) return validDate(year, month, day);
  const thisYear = toLocalDate(today).getFullYear();
  const candidate = validDate(thisYear, month, day);
  if (candidate && candidate >= today) return candidate;
  return validDate(thisYear + 1, month, day);
};

const toTime = (hours: number, minutes: number) =>
  hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? `${pad(hours)}:${pad(minutes)}` : null;

// --- Español ---

const ES_NUMBERS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  primero: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiun: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  'treinta y uno': 31,
  'treinta y un': 31
};
// Las palabras más largas primero («veintiuno» antes que «veintiun», «treinta y uno» antes que «treinta»)
const ES_NUMBER = `\\d{1,2}|${Object.keys(ES_NUMBERS)
  .sort((a, b) => b.length - a.length)
  .map((word) => word.replace(/ /g, '\\s+'))
  .join('|')}`;
const esNumber = (word: string) => (/^\d+$/.test(word) ? Number(word) : ES_NUMBERS[word.replace(/\s+/g, ' ')]);
const ES_WEEKDAYS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6
};
const ES_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

const numericDate = (text: string, today: string) => {
  const match = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}|\d{2}))?\b/.exec(text);
  if (!match) return null;
  const year = match[3] ? (match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])) : undefined;
  const date = nextDate(today, Number(match[2]), Number(match[1]), year);
  return date ? { date, rest: text.slice(match[0].length) } : null;
};

// «20/11», «el 20», «el día 3», «el 20 de noviembre [de 2027]», «el quince de marzo»
const esDayOfMonth = (text: string, today: string) => {
  const numeric = numericDate(text.replace(/^el\s+/, ''), today);
  if (numeric) return numeric;
  const match = new RegExp(
    `^(?:el\\s+)?(?:dia\\s+)?(${ES_NUMBER})(?:\\s+de\\s+(${ES_MONTHS.join('|')})(?:\\s+(?:de|del)\\s+(\\d{4}))?)?\\b`
  ).exec(text);
  if (!match) return null;
  const day = esNumber(match[1]);
  const date = match[2]
    ? nextDate(today, ES_MONTHS.indexOf(match[2]) + 1, day, match[3] ? Number(match[3]) : undefined)
    : nextDayOfMonth(today, day);
  return date ? { date, rest: text.slice(match[0].length) } : null;
};

const es: Grammar = {
  dueKeyword: /(?:^|[\s,])(antes\s+del?)(?=\s|$)/g,
  beforeDue: /^[\s,]*antes\s+del?\s/,
  // «con prioridad alta», «con una alta prioridad» o «prioridad: alta»
  priority:
    /(?:^|[\s,])(con\s+(?:una\s+)?(?:prioridad\s*:?\s+(critica|urgente|alta|media|normal|baja)|(critica|alta|media|baja)\s+prioridad)|prioridad\s*:?\s+(critica|urgente|alta|media|normal|baja))(?=[\s,.;!?]|$)/g,
  priorities: {
    critica: 'CRITICAL',
    urgente: 'CRITICAL',
    alta: 'HIGH',
    media: 'MEDIUM',
    normal: 'MEDIUM',
    baja: 'LOW'
  },
  parseDay: (text, today) => {
    let match = /^(?:el\s+)?pasado\s+manana\b/.exec(text);
    if (match) return { date: addDays(today, 2), rest: text.slice(match[0].length) };
    match = /^(?:el\s+dia\s+de\s+)?hoy\b/.exec(text);
    if (match) return { date: today, rest: text.slice(match[0].length) };
    match = /^manana\b/.exec(text);
    if (match) return { date: addDays(today, 1), rest: text.slice(match[0].length) };
    match = new RegExp(
      `^(?:(?:el|este|esta)\\s+)?(?:(proximo|proxima)\\s+)?(${Object.keys(ES_WEEKDAYS).join('|')})(?:\\s+(que\\s+viene|proximo))?\\b`
    ).exec(text);
    if (match) {
      // «el viernes 20 de noviembre», «el lunes día 3»: manda la fecha
      const rest = text.slice(match[0].length);
      const dated = esDayOfMonth(rest.replace(/^,?\s+/, ''), today);
      if (dated) return dated;
      const next = Boolean(match[1] || match[3]);
      return { date: nextWeekday(today, ES_WEEKDAYS[match[2]], !next), rest };
    }
    return esDayOfMonth(text, today);
  },
  parseTime: (text) => {
    // Medianoche es el final del día (23:59): las 00:00 serían su principio, y la tarea nacería vencida
    let match = /^(?:(?:a|al|sobre|hacia)\s+)?(?:(?:el|la)\s+)?(mediodia|medianoche)\b/.exec(text);
    if (match) return { time: match[1] === 'mediodia' ? '12:00' : '23:59', rest: text.slice(match[0].length) };
    match = new RegExp(
      `^(?:(?:a|sobre|hacia)\\s+)?(?:(?:las?)\\s+)?(\\d{1,2})[:.](\\d{2})(?:\\s*(?:h|horas))?(?:\\s+(?:de\\s+la\\s+(manana|madrugada|tarde|noche)|del\\s+(mediodia)|(a|p)\\.?\\s*m\\.?))?(?=[\\s,.;!?]|$)`
    ).exec(text);
    const article = /^(?:(?:a|sobre|hacia)\s+)?(?:las?)\s+/.exec(text);
    if (!match && article) {
      match = new RegExp(
        `^(${ES_NUMBER})(?:\\s+(y\\s+media|y\\s+cuarto|menos\\s+cuarto|y\\s+(${ES_NUMBER})(?:\\s+minutos)?))?(?:\\s+en\\s+punto)?(?:\\s*(?:h|horas))?(?:\\s+(?:de\\s+la\\s+(manana|madrugada|tarde|noche)|del\\s+(mediodia)|(a|p)\\.?\\s*m\\.?))?(?=[\\s,.;!?]|$)`
      ).exec(text.slice(article[0].length));
      if (!match) return null;
      let hours = esNumber(match[1]);
      let minutes = 0;
      if (match[2]?.startsWith('y media')) minutes = 30;
      else if (match[2]?.startsWith('y cuarto')) minutes = 15;
      else if (match[2]?.startsWith('menos')) {
        hours = hours === 0 ? 23 : hours - 1;
        minutes = 45;
      } else if (match[3]) minutes = esNumber(match[3]);
      const time = withPeriod(hours, minutes, match[4] ?? (match[5] ? 'tarde' : undefined), match[6]);
      return time ? { time, rest: text.slice(article[0].length + match[0].length) } : null;
    }
    if (!match) return null;
    const time = withPeriod(Number(match[1]), Number(match[2]), match[3] ?? (match[4] ? 'tarde' : undefined), match[5]);
    return time ? { time, rest: text.slice(match[0].length) } : null;
  },
  separator: /^(?:\s*,)?\s*(?:y\s+)?/,
  trailing: /(?:[\s,;:]+(?:y|con|de|a))*[\s,;:.]*$/
};

// La hora con «de la tarde», «pm»…: las 5 de la tarde son las 17; las 12 de la noche, las 00
const withPeriod = (hours: number, minutes: number, period?: string, ampm?: string) => {
  if (hours > 23) return null;
  let h = hours;
  if (ampm === 'p' || period === 'tarde') {
    if (h > 12) return h <= 23 && period === 'tarde' && !ampm ? toTime(h, minutes) : null;
    if (h < 12) h += 12;
  } else if (period === 'noche') {
    if (h === 12) h = 0;
    else if (h >= 6 && h < 12) h += 12;
  } else if (period === 'manana') {
    // «las 12 de la mañana» son las 12:00
    if (h > 12) return null;
  } else if (ampm === 'a' || period === 'madrugada') {
    if (h > 12) return null;
    if (h === 12) h = 0;
  }
  return toTime(h, minutes);
};

// --- English ---

const EN_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12
};
const EN_NUMBER = `\\d{1,2}|${Object.keys(EN_NUMBERS).join('|')}`;
const enNumber = (word: string) => (/^\d+$/.test(word) ? Number(word) : EN_NUMBERS[word]);
const EN_WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};
const EN_MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];
const ORDINAL = '(?:st|nd|rd|th)?';

// «20/11», «November 20th[, 2027]», «the 20th[ of November[ 2027]]», «20th». Un número suelto («by 5») no es un día
const enDayOfMonth = (text: string, today: string) => {
  const numeric = numericDate(text, today);
  if (numeric) return numeric;
  let match = new RegExp(`^(?:on\\s+)?(${EN_MONTHS.join('|')})\\s+(\\d{1,2})${ORDINAL}(?:,?\\s+(\\d{4}))?\\b`).exec(
    text
  );
  if (match) {
    const date = nextDate(
      today,
      EN_MONTHS.indexOf(match[1]) + 1,
      Number(match[2]),
      match[3] ? Number(match[3]) : undefined
    );
    return date ? { date, rest: text.slice(match[0].length) } : null;
  }
  match = new RegExp(
    `^(?:on\\s+)?(the\\s+)?(\\d{1,2})(st|nd|rd|th)?(?:\\s+(?:of\\s+)?(${EN_MONTHS.join('|')})(?:,?\\s+(\\d{4}))?)?\\b`
  ).exec(text);
  if (!match || !(match[1] || match[3] || match[4])) return null;
  const day = Number(match[2]);
  const date = match[4]
    ? nextDate(today, EN_MONTHS.indexOf(match[4]) + 1, day, match[5] ? Number(match[5]) : undefined)
    : nextDayOfMonth(today, day);
  return date ? { date, rest: text.slice(match[0].length) } : null;
};

const en: Grammar = {
  dueKeyword: /(?:^|[\s,])(before|by)(?=\s|$)/g,
  beforeDue: /^[\s,]*(?:before|by)\s/,
  // «with high priority», «with a high priority» o «priority: high»
  priority:
    /(?:^|[\s,])(with\s+(?:an?\s+)?(critical|urgent|high|medium|normal|low)\s+priority|priority\s*:?\s+(critical|urgent|high|medium|normal|low))(?=[\s,.;!?]|$)/g,
  priorities: {
    critical: 'CRITICAL',
    urgent: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    normal: 'MEDIUM',
    low: 'LOW'
  },
  parseDay: (text, today) => {
    let match = /^the\s+day\s+after\s+tomorrow\b/.exec(text);
    if (match) return { date: addDays(today, 2), rest: text.slice(match[0].length) };
    match = /^(?:the\s+end\s+of\s+)?today\b/.exec(text);
    if (match) return { date: today, rest: text.slice(match[0].length) };
    match = /^tomorrow\b/.exec(text);
    if (match) return { date: addDays(today, 1), rest: text.slice(match[0].length) };
    match = new RegExp(`^(?:(?:on|this)\\s+)?(?:(next)\\s+)?(${Object.keys(EN_WEEKDAYS).join('|')})\\b`).exec(text);
    if (match) {
      // «Friday, November 20th», «Friday the 20th»: manda la fecha
      const rest = text.slice(match[0].length);
      const dated = enDayOfMonth(rest.replace(/^,?\s+/, ''), today);
      if (dated) return dated;
      return { date: nextWeekday(today, EN_WEEKDAYS[match[2]], !match[1]), rest };
    }
    return enDayOfMonth(text, today);
  },
  parseTime: (text) => {
    // Medianoche, el final del día (23:59), como en español
    let match = /^(?:at\s+)?(noon|midday|midnight)\b/.exec(text);
    if (match) return { time: match[1] === 'midnight' ? '23:59' : '12:00', rest: text.slice(match[0].length) };
    // «half five»: las 5:30 (en el inglés británico)
    match = new RegExp(`^(?:at\\s+)?half\\s+(${EN_NUMBER})(?:\\s+(a|p)\\.?\\s*m\\.?)?(?=[\\s,.;!?]|$)`).exec(text);
    if (match) {
      const time = withPeriod(enNumber(match[1]), 30, undefined, match[2]);
      return time ? { time, rest: text.slice(match[0].length) } : null;
    }
    match = new RegExp(
      `^(?:at\\s+)?(half\\s+past|quarter\\s+past|quarter\\s+to)\\s+(${EN_NUMBER})(?:\\s+(a|p)\\.?\\s*m\\.?)?(?=[\\s,.;!?]|$)`
    ).exec(text);
    if (match) {
      let hours = enNumber(match[2]);
      let minutes = 30;
      if (match[1].startsWith('quarter past')) minutes = 15;
      else if (match[1].startsWith('quarter to')) {
        hours = hours === 0 ? 23 : hours - 1;
        minutes = 45;
      }
      const time = withPeriod(hours, minutes, undefined, match[3]);
      return time ? { time, rest: text.slice(match[0].length) } : null;
    }
    // «at 5», «at 5:30 pm», «5 pm», «5 o'clock», «17:30»: sin «at», con los minutos, «o'clock» o am/pm
    match = new RegExp(
      `^(at\\s+)?(${EN_NUMBER})(?:[:.](\\d{2}))?(\\s+o'?clock)?(?:\\s*(a|p)\\.?\\s*m\\.?)?(?:\\s+in\\s+the\\s+(morning|afternoon|evening))?(?=[\\s,.;!?]|$)`
    ).exec(text);
    if (!match || !(match[1] || match[3] || match[4] || match[5] || match[6])) return null;
    const hours = enNumber(match[2]);
    const minutes = Number(match[3] ?? 0);
    const ampm = match[5] ?? (match[6] === 'morning' ? 'a' : match[6] ? 'p' : undefined);
    const time = withPeriod(hours, minutes, undefined, ampm);
    return time ? { time, rest: text.slice(match[0].length) } : null;
  },
  separator: /^(?:\s*,)?\s*(?:and\s+)?/,
  trailing: /(?:[\s,;:]+(?:and|with|at))*[\s,;:.]*$/
};

const GRAMMARS: Record<Locale, Grammar> = { es, en };

// Día y hora (en cualquier orden) hasta el final de `text`; null si sobra algo o no hay ninguno
const parseDue = (grammar: Grammar, text: string, today: string): DictatedFields | null => {
  const clean = (s: string) => s.replace(/^\s+/, '');
  const end = (s: string) => /^[\s,.;!?]*$/.test(s);
  const start = clean(text);
  const day = grammar.parseDay(start, today);
  if (day) {
    if (end(day.rest)) return { dueDate: day.date };
    const time = grammar.parseTime(clean(day.rest.replace(grammar.separator, ' ')));
    if (time && end(time.rest)) return { dueDate: day.date, dueTime: time.time };
  }
  const time = grammar.parseTime(start);
  if (!time) return null;
  if (end(time.rest)) return { dueDate: today, dueTime: time.time };
  // «antes de las 5 del viernes», “by 5 pm on Friday”
  const after = clean(time.rest.replace(grammar.separator, ' ')).replace(/^(?:del?|on)\s+/, '');
  const later = grammar.parseDay(after, today);
  return later && end(later.rest) ? { dueDate: later.date, dueTime: time.time } : null;
};

// Separa de `text` (lo dictado) el plazo y la prioridad. `today` es el día local (YYYY-MM-DD). Si no hay nada que
// entender, el título es el texto tal cual y no hay más campos.
// `due: false` no busca el plazo, solo la prioridad (en una tarea que se repite, la fecha límite es el fin de la serie)
export interface DictationOptions {
  locale?: Locale;
  due?: boolean;
}

export const parseDictatedTask = (
  text: string,
  today: string,
  { locale = LOCALE, due: withDue = true }: DictationOptions = {}
): DictatedTask => {
  const grammar = GRAMMARS[locale];
  // Con las tildes compuestas (hay reconocedores que dan la «ñ» como «n» más la tilde)
  const original = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  const none: DictatedTask = { title: original };
  if (!original) return none;
  let working = original;
  let folded = fold(working);
  const fields: DictatedFields = {};

  // La prioridad, la última que se diga al final o justo antes del plazo. En medio del título es parte de él:
  // «Responder los correos con prioridad alta del cliente» no se toca
  const priorities = [...folded.matchAll(grammar.priority)].filter((match) => {
    const rest = folded.slice((match.index ?? 0) + match[0].length);
    return /^[\s,.;!?]*$/.test(rest) || grammar.beforeDue.test(rest);
  });
  const lastPriority = priorities[priorities.length - 1];
  if (lastPriority) {
    const word = lastPriority[2] ?? lastPriority[3] ?? lastPriority[4];
    fields.priority = grammar.priorities[word];
    const startAt = (lastPriority.index ?? 0) + lastPriority[0].indexOf(lastPriority[1]);
    working = `${working.slice(0, startAt)} ${working.slice(startAt + lastPriority[1].length)}`;
    folded = fold(working);
  }

  // El plazo: la primera vez que «antes de» va seguido de un día o una hora hasta el final
  for (const keyword of withDue ? folded.matchAll(grammar.dueKeyword) : []) {
    const startAt = (keyword.index ?? 0) + keyword[0].indexOf(keyword[1]);
    // «antes de las 5»: el artículo se queda con la hora
    const after = folded.slice(startAt + keyword[1].length);
    const due = parseDue(grammar, after, today);
    if (due) {
      Object.assign(fields, due);
      working = working.slice(0, startAt);
      break;
    }
  }

  if (!fields.priority && !fields.dueDate) return none;
  const title = working.replace(/\s+/g, ' ').replace(grammar.trailing, '').trim();
  return title ? { title, ...fields } : none;
};

// Para las metas y los proyectos: solo el día («antes del 1 de marzo»), sin hora ni prioridad
export const parseDictatedDate = (
  text: string,
  today: string,
  { locale = LOCALE }: Pick<DictationOptions, 'locale'> = {}
): { title: string; date?: string } => {
  const parsed = parseDictatedTask(text, today, { locale });
  if (!parsed.dueDate || parsed.dueTime || parsed.priority)
    return { title: text.normalize('NFC').replace(/\s+/g, ' ').trim() };
  return { title: parsed.title, date: parsed.dueDate };
};
