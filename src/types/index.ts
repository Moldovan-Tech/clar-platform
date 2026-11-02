export type ListContext = 'WORK' | 'PERSONAL';

export type AppTab = 'home' | 'tasks' | 'agenda' | 'wheel' | 'goals' | 'projects' | 'help' | 'access';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Estado manual de la tarea; DONE (hecha) y CANCELLED (cancelada) la archivan: sale de las listas y del Top 10
export type TaskStatus = 'PENDING' | 'BLOCKED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

// Áreas de la Rueda de la Vida. Las 7 de partida usan su nombre original como identificador (así lo guardado no
// cambia nunca); cada cuenta puede renombrarlas, ocultarlas y añadir las suyas (con identificador propio)
export type DefaultWheelCategory =
  'Salud' | 'Carrera Profesional' | 'Finanzas' | 'Familia' | 'Ocio' | 'Relaciones' | 'Espiritualidad';
export type WheelCategory = string;

export interface WheelArea {
  id: WheelCategory;
  label: string; // el nombre que se muestra, hasta 30
  hidden?: boolean; // oculta: fuera de la Rueda y de las listas para elegir, con su historial, metas y tareas
}

export interface TaskObservation {
  id: string;
  type: 'note' | 'link' | 'checklist';
  text: string;
  completed?: boolean;
  url?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  listContext: ListContext;
  title: string;
  description: string;
  priority: TaskPriority;
  createdAt: string; // ISO / UTC timestamp
  updatedAt: string;
  observations: TaskObservation[];
  isSomeday: boolean; // «Algún día»: fuera del Top 10
  wheelCategory?: WheelCategory;
  wheelCategoryConfidence?: number;
  linkedBy?: 'MANUAL' | 'AUTO_TFIDF';
  status: TaskStatus;
  doneAt?: string; // ISO / UTC: cuándo pasó a Hecha o Cancelada (orden del archivo)
  // Fechas opcionales en hora local del dispositivo. Solo fecha límite = plazo; con inicio = intervalo.
  startDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (opcional)
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (opcional; sin hora, el plazo acaba al final del día)
  estimateMinutes?: number; // duración estimada (opcional)
  recurrence?: Recurrence; // tarea recurrente (requiere fecha límite)
  nextOccurrenceId?: string; // id de la repetición creada al completarla (evita duplicarla si se reactiva)
  goalId?: string; // meta a la que contribuye; el área de la Rueda se hereda de la meta
  dependsOn?: string; // tarea a la que espera: hasta que esté hecha o cancelada, esta queda bloqueada
  projectId?: string; // proyecto al que pertenece; la meta (y el área) se heredan del proyecto
  alarmTime?: string; // HH:mm: aviso el día límite (con hora límite, antes de ella; ver src/services/alarms.ts)
  alarmSetAt?: string; // ISO: cuándo se puso o se cambió la alarma o su día (si fue después de su hora, no suena)
}

// Meta: un objetivo concreto dentro de un área de la Rueda, al que se vinculan tareas (áreas → metas → tareas)
export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'ARCHIVED';

export interface Goal {
  id: string;
  userId: string;
  title: string; // 1–100
  area: WheelCategory;
  why?: string; // el «para qué», hasta 280
  targetDate?: string; // YYYY-MM-DD
  status: GoalStatus;
  createdAt: string; // ISO / UTC
  updatedAt: string;
}

// Proyecto: un conjunto de tareas con fecha de fin, dentro de una meta (metas → proyectos → tareas)
export type ProjectStatus = 'ACTIVE' | 'FINISHED' | 'ARCHIVED';

export interface Project {
  id: string;
  userId: string;
  title: string; // 1–100
  goalId: string; // meta a la que pertenece (obligatoria)
  endDate: string; // YYYY-MM-DD
  description?: string; // hasta 280
  status: ProjectStatus;
  createdAt: string; // ISO / UTC
  updatedAt: string;
}

// Repetición de una tarea. Al marcarla Hecha se archiva y se crea la siguiente con la nueva fecha.
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type MonthlyMode = 'DAY_OF_MONTH' | 'NTH_WEEKDAY' | 'LAST_WEEKDAY';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number; // cada N días / semanas / meses / años (>= 1)
  weekdays?: number[]; // WEEKLY: días de la semana (0 = domingo … 6 = sábado)
  monthlyMode?: MonthlyMode; // MONTHLY: día del mes, N.º día de la semana (p. ej. 2.º lunes) o último
  monthDay?: number; // DAY_OF_MONTH: 1–31 (en meses más cortos, el último día)
  nth?: number; // NTH_WEEKDAY: 1–4
  weekday?: number; // NTH_WEEKDAY y LAST_WEEKDAY: 0 = domingo … 6 = sábado
  until?: string; // YYYY-MM-DD: sin repeticiones después de esta fecha (opcional)
  // DAILY y WEEKLY: la siguiente vence N días o semanas después del día en que se hace (sin días de la semana). Sin
  // él, en fechas fijas desde el inicio de la serie (también las de antes de 1.1.0)
  from?: 'COMPLETION';
}

export interface WheelOfLifeLog {
  id: string;
  userId: string;
  timestamp: string; // Inmutable UTC Timestamp
  label?: string;
  scores: Record<WheelCategory, number>; // 0 to 10
}

// Reuniones y correos de «Tiempo protegido», sección retirada en la 1.3.0: la app ya no los muestra ni los crea. Los
// guardados siguen en la cuenta: van en la descarga, la importación los trae y se borran con la cuenta
export interface MeetingGuard {
  id: string;
  userId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  agendaPoints: string[]; // Mínimo 1 punto cerrado obligatorio
  moderatorName: string; // Designación nominal obligatoria
  moderatorEmail: string;
  createdAt: string;
}

// Correo de «Tiempo protegido» (ver MeetingGuard). CLAR no lo enviaba: lo guardaba y lo pasaba al programa de correo.
export type EmailStatus = 'draft' | 'saved';

export interface EmailDraft {
  id: string;
  userId: string;
  subject: string;
  body: string;
  // Solo nombre y tamaño (legible, y en bytes para reconocer el mismo archivo): el archivo no sale del equipo
  attachments: { name: string; size: string; bytes?: number }[];
  noAttachmentsDeclared: boolean;
  recipients: string[];
  sentAt?: string; // cuándo se guardó terminado
  status?: EmailStatus; // sin estado: guardado (los de antes de 0.9.2)
  updatedAt?: string; // último guardado, también de los borradores
}

export interface UserProfile {
  id: string;
  googleId?: string;
  name: string;
  email?: string;
  photoUrl?: string;
  role: string;
  color: string;
  initials: string;
  authProvider: 'google' | 'local';
  createdAt: string;
  lastLoginAt?: string;
}

export interface FormValidationError {
  field: string;
  message: string;
  ruleCode: string;
  suggestion?: string;
}

// Lo que se escribe o elige en el formulario de una tarea (lo demás es estado de la interfaz). Un borrador lo guarda
// tal cual, también a medias
export interface TaskFormValues {
  title: string;
  projectId: string;
  goalId: string;
  dependsOn: string;
  description: string;
  listContext: ListContext;
  priority: TaskPriority;
  isSomeday: boolean;
  wheelCategory?: WheelCategory;
  wheelCategoryConfidence?: number;
  linkedBy: 'MANUAL' | 'AUTO_TFIDF';
  observations: TaskObservation[];
  newObsText: string;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  alarmTime: string;
  estimateMinutes?: number;
  repeatFrequency: RecurrenceFrequency | '';
  repeatInterval: number;
  repeatWeekdays: number[];
  repeatMonthlyMode: MonthlyMode;
  repeatFromCompletion: boolean; // la siguiente, N días o semanas después de hacerla (Recurrence.from)
}

// BORRADOR DE TAREA: una tarea nueva que se cerró sin guardar. Se guarda sola en «Borradores» (en la cuenta) para
// seguirla después; al guardarla como tarea, se borra
export interface TaskDraft {
  id: string;
  userId: string;
  form: TaskFormValues;
  createdAt: string;
  updatedAt: string;
}
