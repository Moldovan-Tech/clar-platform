import type {
  EmailDraft,
  Goal,
  MeetingGuard,
  Project,
  Recurrence,
  TaskItem,
  TaskObservation,
  WheelArea,
  WheelOfLifeLog
} from '../types';
import type { UserCollection, UserData } from './repository';
import { GOAL_TITLE_MAX, GOAL_WHY_MAX } from './goals';
import { PROJECT_DESCRIPTION_MAX, PROJECT_TITLE_MAX } from './projects';
import { AREA_LABEL_MAX, DEFAULT_AREAS, MAX_VISIBLE_AREAS, isAreaId, validateAreas, visibleAreas } from './wheel';
import { SKIP_MAX, canRepeatFromCompletion } from './recurrence';
import { LOCALE_TAG, messages } from '../i18n/locale';

// IMPORTAR LA DESCARGA DE LA CUENTA («Descargar mis datos (JSON)»). El archivo viene de fuera: cada registro se
// comprueba campo a campo y solo se guardan los campos conocidos, con su tipo y su formato. Lo que ya está en la cuenta
// (mismo id) no se toca: importar dos veces el mismo archivo no cambia nada.

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

// En este orden se escriben: las metas antes que sus proyectos y estos antes que sus tareas
export const IMPORT_ORDER: UserCollection[] = ['goals', 'projects', 'tasks', 'wheelLogs', 'meetings', 'emails'];

const m = messages(
  {
    labels: {
      goals: 'Metas',
      projects: 'Proyectos',
      tasks: 'Tareas',
      wheelLogs: 'Evaluaciones de la Rueda',
      meetings: 'Reuniones',
      emails: 'Correos',
      // Los borradores van en la descarga, pero no se importan (son lo que se estaba escribiendo en otro momento)
      taskDrafts: 'Borradores de tareas'
    } satisfies Record<UserCollection, string>,
    notJson: 'El archivo no es un JSON válido.',
    notClar: 'Este archivo no es una descarga de CLAR.',
    singleItem:
      'Este archivo es la descarga de una sola tarea, meta o proyecto. Aquí se importa la de «Descargar mis datos (JSON)».',
    notAccount: 'Este archivo no es una descarga de «Descargar mis datos (JSON)».'
  },
  {
    labels: {
      goals: 'Goals',
      projects: 'Projects',
      tasks: 'Tasks',
      wheelLogs: 'Wheel assessments',
      meetings: 'Meetings',
      emails: 'Emails',
      taskDrafts: 'Task drafts'
    },
    notJson: "The file isn't valid JSON.",
    notClar: "This file isn't a CLAR download.",
    singleItem:
      'This file is the download of a single task, goal or project. Here you can only import the file from “Download my data (JSON)”.',
    notAccount: "This file isn't a download from “Download my data (JSON)”."
  }
);

export const IMPORT_LABELS: Record<UserCollection, string> = m.labels;

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

// Identificadores como los que crea la app (task-…, wheel-snapshot-…, area-…): sin barras ni puntos
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Firestore reserva los ids con dos guiones bajos al principio y al final (__x__): con uno así fallaría todo el lote
const id = (value: unknown) =>
  typeof value === 'string' && ID.test(value) && !/^__.*__$/.test(value) ? value : undefined;
const str = (value: unknown, max: number) => (typeof value === 'string' && value.length <= max ? value : undefined);
const text = (value: unknown, max: number) => {
  const s = str(value, max);
  return s?.trim() ? s : undefined;
};
// Un instante en ISO 8601, como los que guarda la app (2026-10-16T08:00:00.000Z); no vale cualquier texto que Date
// sepa leer («1», «2024»)
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const instant = (value: unknown) =>
  typeof value === 'string' && ISO_INSTANT.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined;
const notFuture = (value: string | undefined) => (value && Date.parse(value) <= Date.now() ? value : undefined);
const day = (value: unknown) => (typeof value === 'string' && DAY.test(value) ? value : undefined);
const time = (value: unknown) => (typeof value === 'string' && TIME.test(value) ? value : undefined);
const bool = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
const int = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : undefined;
const oneOf = <T extends string>(value: unknown, values: readonly T[]) =>
  values.includes(value as T) ? (value as T) : undefined;
const list = <T>(value: unknown, item: (v: unknown) => T | undefined, max: number): T[] =>
  Array.isArray(value)
    ? value.slice(0, max).flatMap((v) => {
        const parsed = item(v);
        return parsed === undefined ? [] : [parsed];
      })
    : [];

// Textos y listas que escribe la persona: la app no limita muchos (descripción, notas, orden del día, asunto o
// destinatarios de un correo). Estos topes solo cortan lo absurdo (un documento de Firestore admite hasta 1 MiB) y, si
// se pasan, o si un elemento de una lista no es válido, el registro entero cuenta como no válido: nunca se recorta ni se
// pierde nada sin avisar. Solo se omiten los campos de formato (fechas, horas, enlaces a otros registros) que no valen.
const DESCRIPTION_MAX = 100_000;
const NOTE_MAX = 20_000;
const EMAIL_BODY_MAX = 200_000;
const SHORT_TEXT_MAX = 5_000;
const LIST_MAX = 1_000;
const tooLong = (value: unknown, max: number) => typeof value === 'string' && value.length > max;
// Una lista en la que todo vale, o null si alguno no vale o son demasiados (el registro no es válido)
const strictList = <T>(value: unknown, item: (v: unknown) => T | undefined, max = LIST_MAX): T[] | null => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) return null;
  const parsed = value.map(item);
  return parsed.every((v) => v !== undefined) ? parsed : null;
};

const TASK_STATUSES = ['PENDING', 'BLOCKED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

const observation = (raw: unknown): TaskObservation | undefined => {
  if (!isObj(raw)) return undefined;
  const obsId = id(raw.id);
  const type = oneOf(raw.type, ['note', 'link', 'checklist'] as const);
  const body = str(raw.text, NOTE_MAX);
  const createdAt = instant(raw.createdAt);
  if (!obsId || !type || body === undefined || !createdAt) return undefined;
  if (tooLong(raw.url, SHORT_TEXT_MAX)) return undefined;
  return { id: obsId, type, text: body, completed: bool(raw.completed), url: str(raw.url, SHORT_TEXT_MAX), createdAt };
};

const nonEmpty = <T>(items: T[]) => (items.length ? items : undefined);

const recurrence = (raw: unknown): Recurrence | undefined => {
  if (!isObj(raw)) return undefined;
  const frequency = oneOf(raw.frequency, ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const);
  if (!frequency) return undefined;
  // Contando desde que se hace: solo días y semanas, sin días de la semana. Otro valor, o en meses y años, se omite
  // (fechas fijas)
  const from = raw.from === 'COMPLETION' && canRepeatFromCompletion(frequency) ? 'COMPLETION' : undefined;
  const weekdays = from ? [] : [...new Set(list(raw.weekdays, (v) => int(v, 0, 6), 7))];
  return {
    frequency,
    // El formulario deja de 1 a 99; aquí se sigue admitiendo hasta 999, así ningún archivo que antes valía deja de valer
    interval: int(raw.interval, 1, 999) ?? 1,
    from,
    weekdays: weekdays.length ? weekdays : undefined,
    monthlyMode: oneOf(raw.monthlyMode, ['DAY_OF_MONTH', 'NTH_WEEKDAY', 'LAST_WEEKDAY'] as const),
    monthDay: int(raw.monthDay, 1, 31),
    nth: int(raw.nth, 1, 4),
    weekday: int(raw.weekday, 0, 6),
    until: day(raw.until),
    // Fechas que la serie salta: solo con fechas fijas
    skip: from ? undefined : nonEmpty([...new Set(list(raw.skip, day, Infinity))].sort().slice(0, SKIP_MAX))
  };
};

const task = (raw: Obj): Omit<TaskItem, 'userId'> | undefined => {
  const taskId = id(raw.id);
  const title = text(raw.title, 300);
  const listContext = oneOf(raw.listContext, ['WORK', 'PERSONAL'] as const);
  const createdAt = instant(raw.createdAt);
  if (!taskId || !title || !listContext || !createdAt) return undefined;
  if (tooLong(raw.description, DESCRIPTION_MAX)) return undefined;
  const observations = strictList(raw.observations, observation);
  if (!observations) return undefined;
  // Las de antes de la 0.6.0 tienen `completed` en lugar de `status`
  const status = oneOf(raw.status, TASK_STATUSES) ?? (raw.completed === true ? 'DONE' : 'PENDING');
  const confidence = raw.wheelCategoryConfidence;
  return {
    id: taskId,
    listContext,
    title,
    description: str(raw.description, DESCRIPTION_MAX) ?? '',
    priority: oneOf(raw.priority, PRIORITIES) ?? 'MEDIUM',
    createdAt,
    updatedAt: instant(raw.updatedAt) ?? createdAt,
    observations,
    isSomeday: bool(raw.isSomeday) ?? false,
    wheelCategory: isAreaId(raw.wheelCategory) ? raw.wheelCategory : undefined,
    wheelCategoryConfidence:
      typeof confidence === 'number' && confidence >= 0 && confidence <= 1 ? confidence : undefined,
    linkedBy: oneOf(raw.linkedBy, ['MANUAL', 'AUTO_TFIDF'] as const),
    status,
    doneAt: instant(raw.doneAt),
    startDate: day(raw.startDate),
    startTime: time(raw.startTime),
    dueDate: day(raw.dueDate),
    dueTime: time(raw.dueTime),
    estimateMinutes: int(raw.estimateMinutes, 1, 100_000),
    recurrence: recurrence(raw.recurrence),
    nextOccurrenceId: id(raw.nextOccurrenceId),
    goalId: id(raw.goalId),
    dependsOn: id(raw.dependsOn),
    projectId: id(raw.projectId),
    alarmTime: time(raw.alarmTime),
    // Cuándo se puso la alarma (si se puso después de su hora, no suena); una fecha futura no vale
    alarmSetAt: notFuture(instant(raw.alarmSetAt))
  };
};

const goal = (raw: Obj): Omit<Goal, 'userId'> | undefined => {
  const goalId = id(raw.id);
  const title = text(raw.title, GOAL_TITLE_MAX);
  const createdAt = instant(raw.createdAt);
  if (!goalId || !title || !isAreaId(raw.area) || !createdAt || tooLong(raw.why, GOAL_WHY_MAX)) return undefined;
  return {
    id: goalId,
    title,
    area: raw.area,
    why: str(raw.why, GOAL_WHY_MAX),
    targetDate: day(raw.targetDate),
    status: oneOf(raw.status, ['ACTIVE', 'ACHIEVED', 'ARCHIVED'] as const) ?? 'ACTIVE',
    createdAt,
    updatedAt: instant(raw.updatedAt) ?? createdAt
  };
};

const project = (raw: Obj): Omit<Project, 'userId'> | undefined => {
  const projectId = id(raw.id);
  const title = text(raw.title, PROJECT_TITLE_MAX);
  const goalId = id(raw.goalId);
  const endDate = day(raw.endDate);
  const createdAt = instant(raw.createdAt);
  if (!projectId || !title || !goalId || !endDate || !createdAt || tooLong(raw.description, PROJECT_DESCRIPTION_MAX))
    return undefined;
  return {
    id: projectId,
    title,
    goalId,
    endDate,
    description: str(raw.description, PROJECT_DESCRIPTION_MAX),
    status: oneOf(raw.status, ['ACTIVE', 'FINISHED', 'ARCHIVED'] as const) ?? 'ACTIVE',
    createdAt,
    updatedAt: instant(raw.updatedAt) ?? createdAt
  };
};

const wheelLog = (raw: Obj): Omit<WheelOfLifeLog, 'userId'> | undefined => {
  const logId = id(raw.id);
  const timestamp = instant(raw.timestamp);
  if (!logId || !timestamp || !isObj(raw.scores) || tooLong(raw.label, SHORT_TEXT_MAX)) return undefined;
  const entries = Object.entries(raw.scores);
  // Una puntuación que no vale (área desconocida o fuera de 0–10) invalida la evaluación: no se pierde sin avisar
  if (entries.length === 0 || entries.some(([area, score]) => !isAreaId(area) || int(score, 0, 10) === undefined))
    return undefined;
  return {
    id: logId,
    timestamp,
    label: str(raw.label, SHORT_TEXT_MAX),
    scores: Object.fromEntries(entries) as Record<string, number>
  };
};

const meeting = (raw: Obj): Omit<MeetingGuard, 'userId'> | undefined => {
  const meetingId = id(raw.id);
  const title = text(raw.title, 300);
  const startTime = instant(raw.startTime);
  const endTime = instant(raw.endTime);
  const createdAt = instant(raw.createdAt);
  const agendaPoints = strictList(raw.agendaPoints, (v) => str(v, SHORT_TEXT_MAX));
  if (!meetingId || !title || !startTime || !endTime || !createdAt || !agendaPoints) return undefined;
  if (tooLong(raw.moderatorName, SHORT_TEXT_MAX) || tooLong(raw.moderatorEmail, SHORT_TEXT_MAX)) return undefined;
  return {
    id: meetingId,
    title,
    startTime,
    endTime,
    agendaPoints,
    moderatorName: str(raw.moderatorName, SHORT_TEXT_MAX) ?? '',
    moderatorEmail: str(raw.moderatorEmail, SHORT_TEXT_MAX) ?? '',
    createdAt
  };
};

const attachment = (raw: unknown): EmailDraft['attachments'][number] | undefined => {
  if (!isObj(raw)) return undefined;
  const name = text(raw.name, 300);
  const size = str(raw.size, 40);
  if (!name || size === undefined) return undefined;
  return { name, size, bytes: int(raw.bytes, 0, Number.MAX_SAFE_INTEGER) };
};

const email = (raw: Obj): Omit<EmailDraft, 'userId'> | undefined => {
  const emailId = id(raw.id);
  const attachments = strictList(raw.attachments, attachment);
  const recipients = strictList(raw.recipients, (v) => text(v, SHORT_TEXT_MAX));
  if (!emailId || !attachments || !recipients) return undefined;
  if (tooLong(raw.body, EMAIL_BODY_MAX) || tooLong(raw.subject, SHORT_TEXT_MAX)) return undefined;
  return {
    id: emailId,
    subject: str(raw.subject, SHORT_TEXT_MAX) ?? '',
    body: str(raw.body, EMAIL_BODY_MAX) ?? '',
    attachments,
    noAttachmentsDeclared: bool(raw.noAttachmentsDeclared) ?? false,
    recipients,
    sentAt: instant(raw.sentAt),
    status: oneOf(raw.status, ['draft', 'saved'] as const),
    updatedAt: instant(raw.updatedAt)
  };
};

const SANITIZERS: Record<UserCollection, (raw: Obj) => { id: string } | undefined> = {
  tasks: task,
  goals: goal,
  projects: project,
  wheelLogs: wheelLog,
  meetings: meeting,
  emails: email,
  // No se importan (ver IMPORT_LABELS)
  taskDrafts: () => undefined
};

const area = (raw: unknown): WheelArea | undefined => {
  if (!isObj(raw) || !isAreaId(raw.id)) return undefined;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (!label || label.length > AREA_LABEL_MAX) return undefined;
  return raw.hidden === true ? { id: raw.id, label, hidden: true } : { id: raw.id, label };
};

export interface ParsedImport {
  exportedAt?: string;
  // Sin el userId: se pone el de la cuenta al guardar
  data: UserData;
  invalid: Record<UserCollection, number>;
  areas: WheelArea[];
}

const emptyCounts = () => Object.fromEntries(IMPORT_ORDER.map((name) => [name, 0])) as Record<UserCollection, number>;

// Lee el archivo; si no es una descarga de la cuenta de CLAR, lanza un error con el motivo, para mostrarlo
export const parseAccountExport = (contents: string): ParsedImport => {
  let file: unknown;
  try {
    file = JSON.parse(contents);
  } catch {
    throw new Error(m.notJson);
  }
  if (!isObj(file) || (file.app !== undefined && file.app !== 'CLAR')) throw new Error(m.notClar);
  if (file.type === 'task' || file.type === 'goal' || file.type === 'project') throw new Error(m.singleItem);
  // Las descargas de antes de la 0.9.5 no llevan tipo: se reconocen por sus listas
  if ((file.type !== undefined && file.type !== 'account') || !IMPORT_ORDER.some((name) => Array.isArray(file[name])))
    throw new Error(m.notAccount);

  const invalid = emptyCounts();
  const data = Object.fromEntries(
    IMPORT_ORDER.map((name) => {
      const raw = Array.isArray(file[name]) ? (file[name] as unknown[]) : [];
      const seen = new Set<string>();
      const valid = raw.flatMap((entry) => {
        const record = isObj(entry) ? SANITIZERS[name](entry) : undefined;
        // Un id repetido en el archivo: vale el primero
        if (!record || seen.has(record.id)) {
          invalid[name]++;
          return [];
        }
        seen.add(record.id);
        return [record];
      });
      return [name, valid];
    })
  ) as unknown as UserData;

  return {
    exportedAt: instant(file.exportedAt),
    data,
    invalid,
    areas: list(file.wheelAreas, area, 100)
  };
};

// Áreas del archivo que faltan en la cuenta, al final. Las que ya están conservan su nombre. Un nombre que ya usa
// otra área se distingue con un número, y pasado el máximo de áreas a la vista las nuevas entran ocultas.
export const mergeAreas = (current: WheelArea[], incoming: WheelArea[]) => {
  const key = (label: string) => label.trim().toLocaleLowerCase(LOCALE_TAG);
  const merged = [...current];
  const added: WheelArea[] = [];
  const labels = new Set(current.map((a) => key(a.label)));
  let visible = visibleAreas(current).length;
  for (const next of incoming) {
    if (merged.some((a) => a.id === next.id)) continue;
    let label = next.label;
    for (let n = 2; labels.has(key(label)); n++) label = `${next.label.slice(0, AREA_LABEL_MAX - 5).trim()} (${n})`;
    const hidden = next.hidden === true || visible >= MAX_VISIBLE_AREAS;
    if (!hidden) visible++;
    const entry: WheelArea = hidden ? { id: next.id, label, hidden: true } : { id: next.id, label };
    merged.push(entry);
    added.push(entry);
    labels.add(key(label));
  }
  return { merged, added };
};

// Una cuenta que aún tiene las áreas de partida tal cual (sin renombrar, ocultar ni añadir)
const untouched = (areas: WheelArea[]) => JSON.stringify(areas) === JSON.stringify(DEFAULT_AREAS);

// En una cuenta que no ha tocado sus áreas, se recupera la configuración del archivo (nombres, orden, ocultas y
// propias), con las de partida que falten al final. Si no deja entre 3 y 12 a la vista, se añaden solo las que faltan.
export const restoreAreas = (incoming: WheelArea[]) => {
  const restored = [...incoming, ...DEFAULT_AREAS.filter((d) => !incoming.some((a) => a.id === d.id))];
  return validateAreas(restored) === null ? restored : null;
};

export interface ImportPlan {
  exportedAt?: string;
  // Lo que se va a escribir: solo lo que aún no está en la cuenta
  data: UserData;
  counts: Record<UserCollection, { new: number; existing: number; invalid: number }>;
  total: number;
  // Las áreas de la cuenta con las del archivo que faltaban (null si no cambia nada)
  areas: WheelArea[] | null;
  addedAreas: WheelArea[];
  // Se recupera la configuración de áreas del archivo (la cuenta aún tenía las de partida)
  restoredAreas: boolean;
}

export const planImport = (
  parsed: ParsedImport,
  existing: Record<UserCollection, Set<string>>,
  currentAreas: WheelArea[]
): ImportPlan => {
  // Un proyecto sin su meta (ni en la cuenta ni en el archivo) no se vería en «Proyectos»: no es válido
  const goalIds = new Set([...existing.goals, ...parsed.data.goals.map((g) => g.id)]);
  const projects = parsed.data.projects.filter((p) => goalIds.has(p.goalId));
  const records = { ...parsed.data, projects };
  const invalid = {
    ...parsed.invalid,
    projects: parsed.invalid.projects + parsed.data.projects.length - projects.length
  };
  const data = Object.fromEntries(
    IMPORT_ORDER.map((name) => [
      name,
      (records[name] as { id: string }[]).filter((record) => !existing[name].has(record.id))
    ])
  ) as unknown as UserData;
  const counts = Object.fromEntries(
    IMPORT_ORDER.map((name) => {
      const fresh = data[name].length;
      return [name, { new: fresh, existing: records[name].length - fresh, invalid: invalid[name] }];
    })
  ) as ImportPlan['counts'];
  const restored = untouched(currentAreas) && parsed.areas.length ? restoreAreas(parsed.areas) : null;
  const { merged, added } = restored
    ? { merged: restored, added: restored.filter((a) => !currentAreas.some((c) => c.id === a.id)) }
    : mergeAreas(currentAreas, parsed.areas);
  const changed = JSON.stringify(merged) !== JSON.stringify(currentAreas);
  return {
    exportedAt: parsed.exportedAt,
    data,
    counts,
    total: IMPORT_ORDER.reduce((sum, name) => sum + data[name].length, 0),
    areas: changed ? merged : null,
    addedAreas: added,
    restoredAreas: Boolean(restored) && changed
  };
};
