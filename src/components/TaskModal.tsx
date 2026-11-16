import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useModalFocus } from '../hooks/useModalFocus';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import {
  Goal,
  Project,
  TaskItem,
  ListContext,
  TaskPriority,
  WheelCategory,
  TaskObservation,
  MonthlyMode,
  RecurrenceFrequency,
  TaskDraft,
  TaskFormValues
} from '../types';
import { analyzeImmediateActionSyntax, SyntaxAnalysisResult } from '../services/syntaxAnalyzer';
import { inferWheelCategory, NLPSuggestionResult } from '../services/nlpEngine';
import { PRIORITY_LABEL, formatDay, isCancelled, toLocalDate, validateTaskDates } from '../services/tasks';
import { createsCycle, dependencyCandidates, dependentsOf, tasksById } from '../services/dependencies';
import { ESTIMATE_OPTIONS } from '../services/taskListing';
import {
  afterDoneText,
  buildRecurrence,
  canRepeatFromCompletion,
  describeRecurrence,
  everyPeriod,
  firstOccurrence,
  isLastWeekdayOfMonth,
  monthlyDayText,
  nextOccurrence,
  nthOfMonth,
  repeatUnit,
  toDateString
} from '../services/recurrence';
import { messages } from '../i18n/locale';

const REPEAT_FREQUENCIES: RecurrenceFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const REPEAT_INTERVAL_MAX = 99;

const m = messages(
  {
    // Nombre completo del campo «Cada N» (se lee con el lector de pantalla)
    repeatHowMany: {
      DAILY: 'cuántos días',
      WEEKLY: 'cuántas semanas',
      MONTHLY: 'cuántos meses',
      YEARLY: 'cuántos años'
    } satisfies Record<RecurrenceFrequency, string>,
    // Semana empezando en lunes; `day` es el número de JavaScript (0 = domingo)
    weekdayToggles: [
      { day: 1, short: 'L', name: 'Lunes' },
      { day: 2, short: 'M', name: 'Martes' },
      { day: 3, short: 'X', name: 'Miércoles' },
      { day: 4, short: 'J', name: 'Jueves' },
      { day: 5, short: 'V', name: 'Viernes' },
      { day: 6, short: 'S', name: 'Sábado' },
      { day: 0, short: 'D', name: 'Domingo' }
    ],
    nameRequired: 'El nombre es obligatorio.',
    dependencyCycle: 'Esa tarea ya espera a esta (directa o indirectamente): elige otra o ninguna.',
    intervalRange: (max: number) => `Escribe un número del 1 al ${max}.`,
    endBeforeStart: 'La fecha límite (fin de la repetición) no puede ser anterior al inicio.',
    noRepetition: 'No hay ninguna repetición entre el inicio y la fecha límite.',
    startAfterDueTime: 'La hora de inicio no puede ser posterior a la hora límite.',
    editTask: 'Editar la tarea',
    newTask: 'Nueva tarea',
    subtitle: 'Empieza por un verbo: así sabrás exactamente qué hacer.',
    close: 'Cerrar',
    list: 'Lista',
    work: 'Profesional',
    personal: 'Personal',
    task: 'Tarea',
    characters: (count: number) => `${count}/100 caracteres`,
    actionVerb: 'Verbo físico:',
    titleHint: 'empieza por una acción concreta que puedas hacer ya (Llamar, Enviar, Reservar…).',
    titlePlaceholder: 'ej. Llamar al proveedor para acordar el plazo de entrega',
    dictateTask: 'Dictar la tarea',
    voiceDue: (day: string, time?: string) => (time ? `vence el ${day} a las ${time}` : `vence el ${day}`),
    voicePriority: (priority: string) => `prioridad ${priority.toLowerCase()}`,
    writeTask: 'Escribe la tarea.',
    tooLong: 'Supera el límite de 100 caracteres recomendado para legibilidad.',
    missingVerb: 'Falta un verbo transitivo de acción física motora.',
    firstStep: '¿Cuál es el primer paso? Conviértelo en algo que puedas hacer ya.',
    useSuggestion: (suggestion: string) => `Usar sugerencia: "${suggestion}"`,
    keepWording: 'Mantener redacción',
    project: 'Proyecto',
    optional: '(opcional)',
    noProject: '(Sin proyecto)',
    projectUnavailable: '(Proyecto no disponible ahora)',
    projectFinished: ' (terminado)',
    projectArchived: ' (archivado)',
    goal: 'Meta',
    noGoal: '(Sin meta)',
    goalUnavailable: '(Meta no disponible ahora)',
    goalAchieved: ' (lograda)',
    goalArchived: ' (archivada)',
    projectGoal: (project: string) => `La del proyecto «${project}»: para cambiarla, cambia el proyecto o quítalo.`,
    goalArea: (area: string) => `Área de la Rueda: ${area} (la de la meta).`,
    linkTo: (goal: string) => `Vincular a «${goal}»`,
    noGoalsYet: 'Aún no tienes metas. Vincula la tarea a una para ver cómo avanza.',
    goalsLater: 'Puedes vincular la tarea a una meta cuando la crees en «Metas».',
    newGoal: 'Nueva meta',
    goalCreated: (goal: string) => `Meta «${goal}» creada y vinculada a esta tarea.`,
    dueDate: 'Fecha límite',
    repeatEnd: '· fin de la repetición (opcional)',
    dueTime: 'Hora límite',
    repeatDueHelp: 'Al repetir, cada repetición vence su propio día, con las horas indicadas. ',
    deadlineHelp: (violet: React.ReactNode, red: React.ReactNode) => (
      <>
        Sin hora, el plazo termina al final del día. El título se pone {violet} cuando falta menos de una semana y {red}{' '}
        cuando ha vencido. El día que vence lleva además la etiqueta «Hoy».
      </>
    ),
    violet: 'violeta',
    red: 'rojo',
    alarm: 'Alarma',
    removeAlarm: 'Quitar la alarma',
    remove: 'Quitar',
    alarmHelp: 'Suena el día límite a esa hora; con hora límite, tiene que ser antes de ella.',
    alarmPush:
      'Suena mientras CLAR esté abierta y, con «Avisarme también con CLAR cerrada» activado en el menú de tu cuenta, aunque esté cerrada. Si no, el aviso sale al abrirla.',
    alarmNoPush:
      'Suena mientras CLAR esté abierta: en el ordenador, también en segundo plano; en el móvil, mientras esté a la vista. Con CLAR cerrada o el móvil bloqueado, el aviso sale al abrirla: para no perderla, añade la tarea al calendario (.ics), que lleva la alarma.',
    priority: 'Prioridad',
    priorityHelp: 'Con la fecha límite a más de una semana, cuenta un nivel por debajo.',
    moreOptions: 'Más opciones',
    moreOptionsList: 'descripción, estimación, área, dependencia, inicio, repetición, «Algún día» y notas',
    description: 'Descripción',
    descriptionPlaceholder: 'Detalla el resultado esperado, personas involucradas o requerimientos físicos previos...',
    findingArea: 'Buscando el área de tu Rueda…',
    suggestion: 'Sugerencia:',
    linkArea: (area: React.ReactNode) => <>¿Vincular a {area}?</>,
    confidence: (percent: number) => `(${percent}% de confianza)`,
    useArea: 'Usar esta área',
    estimate: 'Estimación (duración)',
    notEstimated: '(Sin estimar)',
    wheelArea: 'Área de la Rueda',
    noArea: '(Sin área)',
    goalAreaFixed: (goal: string) => `La de su meta, «${goal}»: para cambiarla, cambia la meta o quítala.`,
    area: 'Área:',
    suggested: 'sugerida',
    chosenByYou: 'elegida por ti',
    startsAfter: 'Empieza después de',
    noDependency: '(No espera a ninguna tarea)',
    deletedTask: '(Tarea eliminada)',
    waitsForThis: (title: string) => `${title} (espera a esta tarea)`,
    closedTask: (title: string, cancelled: boolean) => `${title} (${cancelled ? 'cancelada' : 'hecha'})`,
    dependencyHelp:
      'Mientras esa tarea no esté hecha o cancelada, esta queda bloqueada: no entra en el Top 10 ni se puede marcar como hecha o en progreso. Varias tareas pueden esperar a la misma.',
    waitingForThis: (titles: string[]) => `Esperan a esta tarea: ${titles.map((t) => `«${t}»`).join(', ')}.`,
    startAndRepeat: 'Inicio y repetición (opcional)',
    repeatStart: 'Inicio de la repetición',
    todayIfEmpty: ' (hoy si lo dejas vacío)',
    rangeStart: 'Inicio (para un intervalo)',
    startDate: 'Fecha de inicio',
    startTime: 'Hora de inicio',
    repeat: 'Repetir',
    every: 'Cada',
    noRepeat: 'No se repite',
    whenNextDue: 'Cuándo vence la siguiente',
    fixedDates: 'En fechas fijas',
    weekdays: 'Días de la semana',
    monthDay: 'Qué día del mes',
    first: (date: string) => ` · Primera: ${date}`,
    ifDoneThatDay: ' · Si la haces ese día, ',
    whenCompleted: ' · Al completarla, ',
    nextDue: (date: string) => `la siguiente vencerá el ${date}`,
    noMoreRepeats: 'no habrá más repeticiones',
    inMoreOptions: (error: string) => `${error} (en «Más opciones»)`,
    saveForSomeday: 'Guardar para algún día',
    somedayHelp: 'No entrará en tu Top 10; la encontrarás en «Algún día».',
    notes: 'Notas',
    notePlaceholder: 'Añade una nota o un enlace…',
    dictateNote: 'Dictar una nota',
    add: 'Añadir',
    beforeSaving: 'Antes de guardar:',
    upTo100: 'Hasta 100 caracteres',
    startsWithVerb: 'Empieza por un verbo de acción',
    cancel: 'Cancelar',
    saveChanges: 'Guardar los cambios',
    saveTask: 'Guardar la tarea',
    discardEdit: 'Has cambiado esta tarea y no has guardado los cambios.',
    discardNew: 'Has empezado una tarea nueva y no la has guardado.'
  },
  {
    repeatHowMany: {
      DAILY: 'how many days',
      WEEKLY: 'how many weeks',
      MONTHLY: 'how many months',
      YEARLY: 'how many years'
    },
    weekdayToggles: [
      { day: 1, short: 'M', name: 'Monday' },
      { day: 2, short: 'T', name: 'Tuesday' },
      { day: 3, short: 'W', name: 'Wednesday' },
      { day: 4, short: 'T', name: 'Thursday' },
      { day: 5, short: 'F', name: 'Friday' },
      { day: 6, short: 'S', name: 'Saturday' },
      { day: 0, short: 'S', name: 'Sunday' }
    ],
    nameRequired: 'The name is required.',
    dependencyCycle: 'That task is already waiting for this one (directly or indirectly): choose another one or none.',
    intervalRange: (max) => `Write a number from 1 to ${max}.`,
    endBeforeStart: "The due date (end of the repeat) can't be before the start.",
    noRepetition: "There's no repeat between the start and the due date.",
    startAfterDueTime: "The start time can't be after the due time.",
    editTask: 'Edit task',
    newTask: 'New task',
    subtitle: "Start with a verb: that way you'll know exactly what to do.",
    close: 'Close',
    list: 'List',
    work: 'Work',
    personal: 'Personal',
    task: 'Task',
    characters: (count) => `${count}/100 characters`,
    actionVerb: 'Action verb:',
    titleHint: 'start with a concrete action you can do right away (Call, Send, Book…).',
    titlePlaceholder: 'e.g. Call the supplier to agree on the delivery date',
    dictateTask: 'Dictate the task',
    voiceDue: (day, time) => (time ? `due ${day} at ${time}` : `due ${day}`),
    voicePriority: (priority) => `${priority.toLowerCase()} priority`,
    writeTask: 'Write the task.',
    tooLong: 'It goes over the 100-character limit recommended for readability.',
    missingVerb: 'It needs an action verb.',
    firstStep: "What's the first step? Turn it into something you can do right away.",
    useSuggestion: (suggestion) => `Use suggestion: “${suggestion}”`,
    keepWording: 'Keep my wording',
    project: 'Project',
    optional: '(optional)',
    noProject: '(No project)',
    projectUnavailable: '(Project not available right now)',
    projectFinished: ' (finished)',
    projectArchived: ' (archived)',
    goal: 'Goal',
    noGoal: '(No goal)',
    goalUnavailable: '(Goal not available right now)',
    goalAchieved: ' (achieved)',
    goalArchived: ' (archived)',
    projectGoal: (project) => `The goal of the project “${project}”: to change it, change or remove the project.`,
    goalArea: (area) => `Wheel area: ${area} (the goal's).`,
    linkTo: (goal) => `Link to “${goal}”`,
    noGoalsYet: "You don't have any goals yet. Link the task to one to see how it's going.",
    goalsLater: 'You can link the task to a goal once you create one in “Goals”.',
    newGoal: 'New goal',
    goalCreated: (goal) => `Goal “${goal}” created and linked to this task.`,
    dueDate: 'Due date',
    repeatEnd: '· end of the repeat (optional)',
    dueTime: 'Due time',
    repeatDueHelp: 'When it repeats, each repeat is due on its own day, at the times you set. ',
    deadlineHelp: (violet, red) => (
      <>
        Without a time, the deadline ends at the end of the day. The title turns {violet} when it's less than a week
        away and {red} when it's overdue. On the day it's due, it also gets the “Today” tag.
      </>
    ),
    violet: 'purple',
    red: 'red',
    alarm: 'Alarm',
    removeAlarm: 'Remove the alarm',
    remove: 'Remove',
    alarmHelp: 'It rings on the due date at that time; with a due time, it has to be before it.',
    alarmPush:
      "It rings while CLAR is open and, with “Also notify me when CLAR is closed” turned on in your account menu, even when it's closed. Otherwise, you'll see it when you open CLAR.",
    alarmNoPush:
      "It rings while CLAR is open: on a computer, also in the background; on a phone, while it's on screen. With CLAR closed or your phone locked, you'll see it when you open CLAR: so you don't miss it, add the task to your calendar (.ics), which includes the alarm.",
    priority: 'Priority',
    priorityHelp: 'With the due date more than a week away, it counts one level lower.',
    moreOptions: 'More options',
    moreOptionsList: 'description, estimate, area, dependency, start, repeat, “Someday” and notes',
    description: 'Description',
    descriptionPlaceholder: 'Describe the expected result, the people involved or anything you need beforehand...',
    findingArea: 'Looking for the area of your Wheel…',
    suggestion: 'Suggestion:',
    linkArea: (area) => <>Link to {area}?</>,
    confidence: (percent) => `(${percent}% confidence)`,
    useArea: 'Use this area',
    estimate: 'Estimate (duration)',
    notEstimated: '(Not estimated)',
    wheelArea: 'Wheel area',
    noArea: '(No area)',
    goalAreaFixed: (goal) => `The area of its goal, “${goal}”: to change it, change or remove the goal.`,
    area: 'Area:',
    suggested: 'suggested',
    chosenByYou: 'chosen by you',
    startsAfter: 'Starts after',
    noDependency: "(Doesn't wait for any task)",
    deletedTask: '(Deleted task)',
    waitsForThis: (title) => `${title} (waits for this task)`,
    closedTask: (title, cancelled) => `${title} (${cancelled ? 'canceled' : 'done'})`,
    dependencyHelp:
      "Until that task is done or canceled, this one stays blocked: it doesn't go into the Top 10 and can't be marked as done or in progress. Several tasks can wait for the same one.",
    waitingForThis: (titles) => `Waiting for this task: ${titles.map((t) => `“${t}”`).join(', ')}.`,
    startAndRepeat: 'Start and repeat (optional)',
    repeatStart: 'Repeat start',
    todayIfEmpty: ' (today if you leave it empty)',
    rangeStart: 'Start (for a date range)',
    startDate: 'Start date',
    startTime: 'Start time',
    repeat: 'Repeat',
    every: 'Every',
    noRepeat: "Doesn't repeat",
    whenNextDue: 'When the next one is due',
    fixedDates: 'On fixed dates',
    weekdays: 'Days of the week',
    monthDay: 'Which day of the month',
    first: (date) => ` · First: ${date}`,
    ifDoneThatDay: ' · If you do it that day, ',
    whenCompleted: ' · When you complete it, ',
    nextDue: (date) => `the next one will be due on ${date}`,
    noMoreRepeats: 'there will be no more repeats',
    inMoreOptions: (error) => `${error} (in “More options”)`,
    saveForSomeday: 'Save for someday',
    somedayHelp: "It won't go into your Top 10; you'll find it in “Someday”.",
    notes: 'Notes',
    notePlaceholder: 'Add a note or a link…',
    dictateNote: 'Dictate a note',
    add: 'Add',
    beforeSaving: 'Before saving:',
    upTo100: 'Up to 100 characters',
    startsWithVerb: 'Starts with an action verb',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    saveTask: 'Save task',
    discardEdit: "You've changed this task and haven't saved the changes.",
    discardNew: "You've started a new task and haven't saved it."
  }
);

// «el día 15» → «El día 15» (las opciones del mes empiezan la frase)
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
import {
  X,
  AlertTriangle,
  Sparkles,
  Check,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ListPlus,
  CalendarClock,
  ChevronDown,
  Repeat,
  Target,
  Plus
} from 'lucide-react';
import { DateField } from './DateField';
import { NotificationPermission } from './NotificationPermission';
import { pushAvailable } from '../services/push';
import { DiscardChangesPrompt } from './DiscardChangesPrompt';
import { TimeField } from './TimeField';
import { NewGoalInline } from './NewGoalInline';
import { alarmError, alarmUnavailableReason, describeAlarm } from '../services/alarms';
import { DictateButton, DictationUnderstood } from './DictateButton';
import { parseDictatedTask, type DictatedFields } from '../services/voiceTask';
import { suggestGoal } from '../services/goals';
import { areasInUse } from '../services/wheel';
import { useAreas } from '../hooks/useAreas';

export type TaskFormData = Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'doneAt'>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: TaskFormData) => void;
  initialContext: ListContext;
  // Al abrir desde «Algún día», la tarea nueva va a «Algún día»
  initialSomeday?: boolean;
  // Al abrir desde una meta («Añadir tarea»), la tarea nueva ya está vinculada a ella
  initialGoalId?: string;
  // Al abrir desde un proyecto, la tarea nueva ya pertenece a él (y a su meta)
  initialProjectId?: string;
  // Abierto desde «Nueva tarea por voz»: el micrófono del título empieza a escuchar solo
  autoDictate?: boolean;
  // Un borrador que se continúa: el formulario se abre como estaba (es una tarea nueva)
  draft?: TaskDraft | null;
  // Una tarea nueva que se cierra con algo escrito se guarda sola como borrador (sin él, se pregunta si descartarla).
  // null: se cerró sin nada escrito (un borrador que se vació deja de serlo)
  onSaveDraft?: (form: TaskFormValues | null) => void;
  editingTask?: TaskItem | null;
  // Metas a las que se puede vincular la tarea (el área de la Rueda se hereda de la meta)
  goals: Goal[];
  // Todas las tareas: de cuál puede depender esta y cuáles esperan a ella
  tasks: TaskItem[];
  // Proyectos a los que puede pertenecer (la meta se hereda del proyecto)
  projects: Project[];
  // Guarda una meta creada desde el formulario (sin él, no se ofrece crearla aquí)
  onCreateGoal?: (goal: Goal) => void;
}

// El formulario al abrirse: vacío para una tarea nueva, o con los datos de la que se edita. Las claves van en el mismo
// orden que en el formulario actual, para compararlos.
const formFor = (
  editingTask: TaskItem | null | undefined,
  initialContext: ListContext,
  initialSomeday: boolean,
  initialGoalId: string | undefined,
  initialProjectId: string | undefined
): TaskFormValues =>
  editingTask
    ? {
        title: editingTask.title,
        projectId: editingTask.projectId ?? '',
        goalId: editingTask.goalId ?? '',
        dependsOn: editingTask.dependsOn ?? '',
        description: editingTask.description,
        listContext: editingTask.listContext,
        priority: editingTask.priority,
        isSomeday: editingTask.isSomeday,
        wheelCategory: editingTask.wheelCategory,
        wheelCategoryConfidence: editingTask.wheelCategoryConfidence,
        linkedBy: editingTask.linkedBy || 'MANUAL',
        observations: editingTask.observations || [],
        newObsText: '',
        // Una tarea repetida se edita como serie: desde su repetición actual hasta la fecha límite de la serie
        startDate: (editingTask.recurrence ? editingTask.dueDate : editingTask.startDate) ?? '',
        startTime: editingTask.startTime ?? '',
        dueDate: (editingTask.recurrence ? editingTask.recurrence.until : editingTask.dueDate) ?? '',
        dueTime: editingTask.dueTime ?? '',
        alarmTime: editingTask.alarmTime ?? '',
        estimateMinutes: editingTask.estimateMinutes,
        repeatFrequency: editingTask.recurrence?.frequency ?? '',
        repeatInterval: editingTask.recurrence?.interval ?? 1,
        repeatWeekdays: editingTask.recurrence?.weekdays ?? [],
        repeatMonthlyMode: editingTask.recurrence?.monthlyMode ?? 'DAY_OF_MONTH',
        repeatFromCompletion: editingTask.recurrence?.from === 'COMPLETION'
      }
    : {
        title: '',
        projectId: initialProjectId ?? '',
        goalId: initialGoalId ?? '',
        dependsOn: '',
        description: '',
        listContext: initialContext,
        priority: 'MEDIUM',
        isSomeday: initialSomeday,
        wheelCategory: undefined,
        wheelCategoryConfidence: undefined,
        linkedBy: 'MANUAL',
        observations: [],
        newObsText: '',
        startDate: '',
        startTime: '',
        dueDate: '',
        dueTime: '',
        alarmTime: '',
        estimateMinutes: undefined,
        repeatFrequency: '',
        repeatInterval: 1,
        repeatWeekdays: [],
        repeatMonthlyMode: 'DAY_OF_MONTH',
        repeatFromCompletion: false
      };

// Si el formulario tiene algo escrito o elegido que valga la pena guardar como borrador (la lista, la prioridad o la
// meta de partida no cuentan)
const hasContent = (form: TaskFormValues) =>
  Boolean(
    form.title.trim() ||
    form.description.trim() ||
    form.observations.length ||
    form.newObsText.trim() ||
    form.startDate ||
    form.startTime ||
    form.dueDate ||
    form.dueTime ||
    form.alarmTime ||
    form.estimateMinutes ||
    form.repeatFrequency ||
    form.dependsOn
  );

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  initialContext,
  initialSomeday = false,
  initialGoalId,
  initialProjectId,
  autoDictate = false,
  draft = null,
  onSaveDraft,
  editingTask,
  goals,
  tasks,
  projects,
  onCreateGoal
}) => {
  const [title, setTitle] = useState('');
  // Cuántas veces se ha escrito a mano en el título y en la nota: el micrófono deja de dictar al escribir (DictateButton)
  const [typedTitle, setTypedTitle] = useState(0);
  const [typedNote, setTypedNote] = useState(0);
  // Lo que se entendió del último dictado del título (plazo y prioridad) y cómo estaba el formulario antes, para «Deshacer»
  const [voiceParsed, setVoiceParsed] = useState<{
    fields: DictatedFields;
    previous: { title: string; dueDate: string; dueTime: string; priority: TaskPriority };
  } | null>(null);
  // Áreas de la Rueda de la cuenta (con su nombre y las que se pueden elegir)
  const { areas: wheelAreas, label: areaName, selectable: selectableAreas } = useAreas();
  const [projectId, setProjectId] = useState('');
  const [goalId, setGoalId] = useState('');
  // Meta nueva desde el formulario: si está abierta y las creadas aquí (se pueden elegir antes de que lleguen en `goals`)
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [createdGoals, setCreatedGoals] = useState<Goal[]>([]);
  const goalSelectRef = useRef<HTMLSelectElement>(null);
  const newGoalButtonRef = useRef<HTMLButtonElement>(null);
  // La última meta creada aquí: se confirma junto al campo (con la ventana abierta, los avisos de la app esperan)
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [dependsOn, setDependsOn] = useState('');
  const [description, setDescription] = useState('');
  // Identificador de la última inferencia NLP: invalida resultados que llegan tras cerrar o reiniciar el formulario
  const nlpRequest = useRef(0);
  const [listContext, setListContext] = useState<ListContext>(initialContext);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [isSomeday, setIsSomeday] = useState(false);
  const [wheelCategory, setWheelCategory] = useState<WheelCategory | undefined>();
  const [wheelCategoryConfidence, setWheelCategoryConfidence] = useState<number | undefined>();
  const [linkedBy, setLinkedBy] = useState<'MANUAL' | 'AUTO_TFIDF'>('MANUAL');
  const [observations, setObservations] = useState<TaskObservation[]>([]);
  const [newObsText, setNewObsText] = useState('');
  // Fechas opcionales (vacías por defecto): solo fecha límite = plazo; con fecha de inicio = intervalo
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [alarmTime, setAlarmTime] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState<number | undefined>();
  const [repeatFrequency, setRepeatFrequency] = useState<RecurrenceFrequency | ''>('');
  const [repeatInterval, setRepeatInterval] = useState(1);
  // Lo que se escribe en «Cada N» mientras se edita (null: no se está editando y se ve el número que cuenta)
  const [intervalText, setIntervalText] = useState<string | null>(null);
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatMonthlyMode, setRepeatMonthlyMode] = useState<MonthlyMode>('DAY_OF_MONTH');
  const [repeatFromCompletion, setRepeatFromCompletion] = useState(false);

  // Estados de validación en tiempo real
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  // Analizador de la acción siguiente, en tiempo real
  const syntaxResult = useMemo<SyntaxAnalysisResult>(
    () =>
      title.trim()
        ? analyzeImmediateActionSyntax(title)
        : { isValid: false, detectedVerb: null, warning: m.nameRequired },
    [title]
  );
  const [nlpResult, setNlpResult] = useState<NLPSuggestionResult | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [overrideSyntaxWarning, setOverrideSyntaxWarning] = useState(false);
  // «Más opciones» empieza abierto si la tarea ya usa alguno de sus campos (o si es una tarea nueva de «Algún día»)
  const [showMore, setShowMore] = useState(false);

  // Formulario tal como se abre (vacío o con la tarea): con él se sabe si hay cambios sin guardar
  const initialForm = useMemo(
    () =>
      draft && !editingTask
        ? { ...formFor(null, initialContext, false, undefined, undefined), ...draft.form }
        : formFor(editingTask, initialContext, initialSomeday, initialGoalId, initialProjectId),
    // isOpen: cada vez que se abre, el formulario vuelve a empezar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, editingTask, draft, initialContext, initialSomeday, initialGoalId, initialProjectId]
  );

  // Inicializar o limpiar al abrir modal
  useEffect(() => {
    nlpRequest.current++; // descarta cualquier sugerencia NLP pendiente del formulario anterior
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el formulario se rellena o limpia al abrirse
    setNlpLoading(false);
    const form = initialForm;
    setTitle(form.title);
    setVoiceParsed(null);
    setProjectId(form.projectId);
    setGoalId(form.goalId);
    setDependsOn(form.dependsOn);
    setDescription(form.description);
    setListContext(form.listContext);
    setPriority(form.priority);
    setIsSomeday(form.isSomeday);
    setWheelCategory(form.wheelCategory);
    setWheelCategoryConfidence(form.wheelCategoryConfidence);
    setLinkedBy(form.linkedBy);
    setObservations(form.observations);
    setNewObsText(form.newObsText);
    setStartDate(form.startDate);
    setStartTime(form.startTime);
    setDueDate(form.dueDate);
    setDueTime(form.dueTime);
    setAlarmTime(form.alarmTime);
    setEstimateMinutes(form.estimateMinutes);
    setRepeatFrequency(form.repeatFrequency);
    setRepeatInterval(form.repeatInterval);
    setIntervalText(null);
    setRepeatWeekdays(form.repeatWeekdays);
    setRepeatMonthlyMode(form.repeatMonthlyMode);
    setRepeatFromCompletion(form.repeatFromCompletion);
    setNewGoalOpen(false);
    setCreatedGoals([]);
    setCreatedGoalId(null);
    if (editingTask) {
      setShowMore(
        Boolean(
          editingTask.description ||
          editingTask.estimateMinutes ||
          (editingTask.wheelCategory && !editingTask.goalId) ||
          editingTask.startDate ||
          editingTask.recurrence ||
          editingTask.isSomeday ||
          editingTask.dependsOn ||
          editingTask.observations?.length
        )
      );
      setOverrideSyntaxWarning(true);
    } else {
      // Un borrador abre «Más opciones» si usa alguno de sus campos
      setShowMore(
        draft
          ? Boolean(
              form.description ||
              form.estimateMinutes ||
              (form.wheelCategory && !form.goalId) ||
              form.startDate ||
              form.repeatFrequency ||
              form.isSomeday ||
              form.dependsOn ||
              form.observations.length ||
              form.newObsText
            )
          : initialSomeday
      );
      setNlpResult(null);
      setTouched({});
      setOverrideSyntaxWarning(false);
    }
  }, [initialForm, editingTask, initialSomeday, draft]);

  // CAMBIOS SIN GUARDAR: lo que hay en el formulario frente a como se abrió
  const currentForm: TaskFormValues = {
    title,
    projectId,
    goalId,
    dependsOn,
    description,
    listContext,
    priority,
    isSomeday,
    wheelCategory,
    wheelCategoryConfidence,
    linkedBy,
    observations,
    newObsText,
    startDate,
    startTime,
    dueDate,
    dueTime,
    alarmTime,
    estimateMinutes,
    repeatFrequency,
    repeatInterval,
    repeatWeekdays,
    repeatMonthlyMode,
    repeatFromCompletion
  };
  // Una fecha a medio escribir (o imposible) aún no está en el formulario, pero también es un cambio
  const [dateDrafts, setDateDrafts] = useState<Record<string, boolean>>({});
  const draftOf = (field: string) => (pending: boolean) =>
    setDateDrafts((drafts) => (Boolean(drafts[field]) === pending ? drafts : { ...drafts, [field]: pending }));
  const isDirty =
    isOpen && (JSON.stringify(currentForm) !== JSON.stringify(initialForm) || Object.values(dateDrafts).some(Boolean));
  // BORRADOR: una tarea nueva con algo escrito no pregunta al cerrarse; se guarda sola en «Borradores» (también la que
  // se continuaba, con lo nuevo). Una tarea que se edita sí pregunta si descartar los cambios
  const savesAsDraft = !editingTask && Boolean(onSaveDraft);
  const closeForm = () => {
    if (savesAsDraft && isDirty) onSaveDraft?.(hasContent(currentForm) ? currentForm : null);
    onClose();
  };
  const guard = useDiscardGuard(isDirty, closeForm);
  // (al cerrar la pestaña sí avisa el navegador: un borrador se guarda al cerrar el formulario)
  const requestClose = savesAsDraft ? closeForm : guard.requestClose;

  // Sugerencia de área (TF-IDF, en el navegador) al salir de la descripción, si hay texto
  const triggerNLPInference = () => {
    if (!description.trim() && !title.trim()) return;
    setNlpLoading(true);
    const request = ++nlpRequest.current;
    // Un instante después, para no recalcular mientras se sigue escribiendo
    setTimeout(() => {
      // Si entretanto se guardó o se reinició el formulario, el resultado ya no corresponde a esta tarea
      if (request !== nlpRequest.current) return;
      const res = inferWheelCategory(title, description, wheelAreas);
      setNlpResult(res);
      setNlpLoading(false);
      // Si la confianza es alta y aún no hay categoría manual seleccionada, sugerir
      if (res.category && res.isAboveThreshold && !wheelCategory) {
        // Mantiene en el badge para aceptación de 1-clic
      }
    }, 150);
  };

  const applyNlpSuggestion = (cat: WheelCategory, conf: number) => {
    setWheelCategory(cat);
    setWheelCategoryConfidence(conf);
    setLinkedBy('AUTO_TFIDF');
    setNlpResult(null);
  };

  const applySyntaxSuggestion = (sug: string) => {
    setTitle(sug);
    setOverrideSyntaxWarning(true);
  };

  const handleAddObservation = () => {
    if (!newObsText.trim()) return;
    // Si se estaba dictando la nota, se deja: lo que llegue después no vuelve a rellenar el campo
    setTypedNote((count) => count + 1);
    const newObs: TaskObservation = {
      id: `obs-${Date.now()}`,
      type: 'note',
      text: newObsText.trim(),
      createdAt: new Date().toISOString()
    };
    setObservations([...observations, newObs]);
    setNewObsText('');
  };

  const handleRemoveObservation = (id: string) => {
    setObservations(observations.filter((o) => o.id !== id));
  };

  // METAS: la elegida, las que se pueden elegir (activas, y la ya vinculada aunque esté lograda o archivada) y la
  // sugerida por las palabras del título mientras no haya ninguna elegida
  const knownGoals = useMemo(
    () => [...goals, ...createdGoals.filter((c) => !goals.some((g) => g.id === c.id))],
    [goals, createdGoals]
  );
  const goal = knownGoals.find((g) => g.id === goalId);
  // DEPENDENCIA: tareas a las que puede esperar (sin ciclos), la elegida y las que esperan a esta
  const dependencyOptions = useMemo(() => dependencyCandidates(editingTask?.id, tasks), [editingTask, tasks]);
  const waitingFor = tasks.find((t) => t.id === dependsOn);
  // Se revisa con las tareas de ahora: si entretanto la elegida pasó a esperar a esta (en otra pestaña o dispositivo),
  // guardarla dejaría las dos bloqueadas para siempre
  const dependencyError =
    dependsOn && createsCycle(editingTask?.id, dependsOn, tasksById(tasks)) ? m.dependencyCycle : null;
  const waitingForThis = editingTask ? dependentsOf(editingTask, tasks) : [];
  const goalOptions = knownGoals.filter((g) => g.status === 'ACTIVE' || g.id === goalId);
  const suggestedGoal = useMemo(() => (goalId ? null : suggestGoal(title, knownGoals)), [goalId, title, knownGoals]);
  const linkGoal = (chosen: Goal) => {
    setGoalId(chosen.id);
    setWheelCategory(chosen.area);
    setLinkedBy('MANUAL');
    setNlpResult(null);
  };
  const chooseGoal = (id: string) => {
    const chosen = knownGoals.find((g) => g.id === id);
    if (chosen) linkGoal(chosen);
    else setGoalId(id);
  };
  // La meta se guarda al momento (aunque luego no se guarde la tarea) y queda elegida
  const createGoal = (draft: { title: string; area: string }) => {
    if (!onCreateGoal) return;
    const now = new Date().toISOString();
    const created: Goal = {
      id: `goal-${Date.now()}`,
      userId: '',
      title: draft.title,
      area: draft.area,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };
    onCreateGoal(created);
    setCreatedGoals((list) => [...list, created]);
    setCreatedGoalId(created.id);
    linkGoal(created);
    setNewGoalOpen(false);
    requestAnimationFrame(() => goalSelectRef.current?.focus());
  };

  // PROYECTO: el elegido y los que se pueden elegir (activos, y el ya elegido aunque esté terminado o archivado). En
  // un proyecto, la meta es la suya
  const project = projects.find((p) => p.id === projectId);
  const projectOptions = projects.filter((p) => p.status === 'ACTIVE' || p.id === projectId);
  const chooseProject = (id: string) => {
    setProjectId(id);
    // En un proyecto la meta es la suya: lo que se escribía para una meta nueva ya no aplica
    setNewGoalOpen(false);
    const chosen = projects.find((p) => p.id === id);
    if (chosen) chooseGoal(chosen.goalId);
  };

  // Validación del formulario
  const isTitleEmpty = !title.trim();
  const isTitleTooLong = title.length > 100;
  const isSyntaxInvalid = !syntaxResult.isValid && !overrideSyntaxWarning;
  // REPETICIÓN: las fechas delimitan la serie. «Inicio» es desde cuándo se repite (hoy si se deja vacío) y la
  // fecha límite es la última fecha posible (la «fecha hasta» de la serie: un solo valor). Cada repetición vence
  // su propio día, con la hora límite; ninguna se pinta como un intervalo.
  const isRepeating = Boolean(repeatFrequency);
  // TAREA DICTADA: «<título> antes del <día> a las <hora> con prioridad <prioridad>» rellena el plazo y la prioridad
  // (voiceTask.ts). En una tarea que se repite, la fecha límite es el fin de la serie: ahí solo se toma la prioridad
  const applyDictatedTitle = (dictated: string, before: string) => {
    const parsed = parseDictatedTask(dictated, toDateString(new Date()), { due: !isRepeating });
    const fields: DictatedFields = { priority: parsed.priority, dueDate: parsed.dueDate, dueTime: parsed.dueTime };
    if (!fields.priority && !fields.dueDate) return;
    setVoiceParsed({
      fields,
      previous: { title: before ? `${before} ${dictated}` : dictated, dueDate, dueTime, priority }
    });
    setTitle(before ? `${before} ${parsed.title}` : parsed.title);
    if (fields.dueDate) {
      setDueDate(fields.dueDate);
      setDueTime(fields.dueTime ?? '');
    }
    if (fields.priority) setPriority(fields.priority);
  };
  const undoDictatedTitle = () => {
    if (!voiceParsed) return;
    const { previous } = voiceParsed;
    setTitle(previous.title);
    setDueDate(previous.dueDate);
    setDueTime(previous.dueTime);
    setPriority(previous.priority);
    setVoiceParsed(null);
  };
  const voiceSummary = voiceParsed
    ? [
        voiceParsed.fields.dueDate && m.voiceDue(formatDay(voiceParsed.fields.dueDate), voiceParsed.fields.dueTime),
        voiceParsed.fields.priority && m.voicePriority(PRIORITY_LABEL[voiceParsed.fields.priority])
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const seriesStart = startDate || toDateString(new Date());
  const anchor = toLocalDate(seriesStart);
  // Los anclajes de la regla (día del mes, N.º día de la semana) salen del inicio de la serie. Al editar una
  // repetición que cayó en el último día de un mes más corto (p. ej. el 28 de febrero de una serie del día 31),
  // se conserva el día de la serie mientras no se cambie el inicio ni la frecuencia.
  const storedRecurrence = editingTask?.recurrence;
  const keepsStoredDay = Boolean(
    storedRecurrence?.monthDay &&
    editingTask?.dueDate &&
    startDate === editingTask.dueDate &&
    repeatFrequency === storedRecurrence.frequency
  );
  const anchorDay = keepsStoredDay ? storedRecurrence!.monthDay! : anchor.getDate();
  const monthlyLabel = (mode: MonthlyMode) =>
    capitalize(monthlyDayText(mode, anchorDay, anchor.getDay(), nthOfMonth(anchor)));
  const monthlyOptions: { mode: MonthlyMode; label: string }[] = [
    { mode: 'DAY_OF_MONTH', label: monthlyLabel('DAY_OF_MONTH') },
    ...(nthOfMonth(anchor) <= 4 ? [{ mode: 'NTH_WEEKDAY' as const, label: monthlyLabel('NTH_WEEKDAY') }] : []),
    ...(isLastWeekdayOfMonth(anchor) ? [{ mode: 'LAST_WEEKDAY' as const, label: monthlyLabel('LAST_WEEKDAY') }] : [])
  ];
  // Si al cambiar la fecha el modo elegido deja de existir (p. ej. ya no es el último lunes), se usa el día del mes
  const effectiveMonthlyMode = monthlyOptions.some((o) => o.mode === repeatMonthlyMode)
    ? repeatMonthlyMode
    : 'DAY_OF_MONTH';
  // Semanal: mientras no se elijan días, se repite el mismo día de la semana que el inicio (y sigue al inicio si cambia)
  const weekdays = repeatWeekdays.length ? repeatWeekdays : [anchor.getDay()];
  // «N días o semanas después de hacerla»: solo en días y semanas (en meses y años, la elección se guarda pero no cuenta)
  const fromCompletion = repeatFromCompletion && canRepeatFromCompletion(repeatFrequency);
  const built = repeatFrequency
    ? buildRecurrence(repeatFrequency, seriesStart, {
        interval: repeatInterval,
        weekdays,
        monthlyMode: effectiveMonthlyMode,
        until: dueDate || undefined,
        from: fromCompletion ? 'COMPLETION' : undefined
      })
    : undefined;
  const recurrence = built?.monthDay !== undefined ? { ...built, monthDay: anchorDay } : built;
  const firstRepetition = recurrence ? firstOccurrence(seriesStart, recurrence) : null;
  // La siguiente si se completa el día de la primera (contando desde que se hace, depende de ese día)
  const nextRepetition =
    recurrence && firstRepetition ? nextOccurrence(firstRepetition, recurrence, toLocalDate(firstRepetition)) : null;
  // «Cada N»: lo escrito se ve tal cual (se puede vaciar para escribir otro número) y, si es un número, cuenta ya,
  // ajustado de 1 a 99. Al salir del campo se ve el número que cuenta (si se dejó vacío, el de antes)
  const intervalInput = intervalText ?? String(repeatInterval);
  const validInterval = (value: string) =>
    /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= REPEAT_INTERVAL_MAX;
  const typeInterval = (value: string) => {
    setIntervalText(value);
    if (validInterval(value)) setRepeatInterval(Number(value));
  };
  // Vacío mientras se escribe otro número no es un error; «0» o letras, sí (y no deja guardar)
  const intervalError =
    intervalText !== null && intervalText !== '' && !validInterval(intervalText)
      ? m.intervalRange(REPEAT_INTERVAL_MAX)
      : null;
  const recurrenceError = !isRepeating
    ? null
    : dueDate && dueDate < seriesStart
      ? m.endBeforeStart
      : !firstRepetition
        ? m.noRepetition
        : startTime && dueTime && startTime > dueTime
          ? m.startAfterDueTime
          : null;

  // Fechas que se guardan. Una hora sin fecha no tiene sentido y se descarta; en una tarea repetida, la fecha
  // límite guardada es la de la repetición actual (el fin de la serie va en la regla).
  const dates = isRepeating
    ? { startTime: startTime || undefined, dueDate: firstRepetition ?? undefined, dueTime: dueTime || undefined }
    : {
        startDate: startDate || undefined,
        startTime: (startDate && startTime) || undefined,
        dueDate: dueDate || undefined,
        dueTime: (dueDate && dueTime) || undefined
      };
  const datesError = isRepeating ? null : validateTaskDates(dates);
  // ALARMA: necesita fecha límite (si deja de poder tenerla, no se guarda) y, con hora límite, ser antes de ella
  const alarmBlocked = alarmUnavailableReason({ ...dates, recurrence });
  const alarmProblem = alarmTime && !alarmBlocked ? alarmError({ dueTime: dates.dueTime, alarmTime }) : null;
  const alarmDescription =
    alarmTime && !alarmBlocked && !alarmProblem ? describeAlarm({ ...dates, recurrence, alarmTime }) : null;

  const isFormValid =
    !isTitleEmpty &&
    !isTitleTooLong &&
    !isSyntaxInvalid &&
    !datesError &&
    !recurrenceError &&
    !(isRepeating && intervalError) &&
    !dependencyError &&
    !alarmProblem &&
    Boolean(listContext) &&
    Boolean(priority);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true });

    if (!isFormValid) {
      return;
    }

    onSaveTask({
      userId: 'user-default',
      listContext,
      title: title.trim(),
      description: description.trim(),
      priority,
      isSomeday,
      // El vínculo se conserva aunque la meta aún no haya llegado (las metas y las tareas cargan por separado). En un
      // proyecto, la meta es la del proyecto
      projectId: projectId || undefined,
      goalId: (project ? project.goalId : goalId) || undefined,
      // Si la tarea a la que esperaba ya no existe, deja de esperar
      dependsOn: (dependsOn && tasks.some((t) => t.id === dependsOn) && dependsOn) || undefined,
      alarmTime: (!alarmBlocked && alarmTime) || undefined,
      wheelCategory: goal ? goal.area : wheelCategory,
      wheelCategoryConfidence,
      linkedBy,
      observations,
      estimateMinutes,
      recurrence,
      ...dates
    });

    onClose();
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(isOpen, dialogRef, requestClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs sm:p-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="animate-in fade-in zoom-in-95 my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-200"
      >
        {/* Cabecera del Modal */}
        <div
          inert={guard.confirming}
          className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4"
        >
          <div>
            <h2 id="task-modal-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ListPlus className="h-5 w-5 text-indigo-600" />
              {editingTask ? m.editTask : m.newTask}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{m.subtitle}</p>
          </div>
          <button
            onClick={requestClose}
            aria-label={m.close}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} inert={guard.confirming} className="space-y-5 p-6">
          {/* CAMPO 1: lista (Profesional o Personal) */}
          <div>
            <p
              id="task-context-label"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
            >
              {m.list} <span className="text-red-500">*</span>
            </p>
            <div role="group" aria-labelledby="task-context-label" className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setListContext('WORK')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  listContext === 'WORK'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                {m.work}
              </button>
              <button
                type="button"
                onClick={() => setListContext('PERSONAL')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  listContext === 'PERSONAL'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                {m.personal}
              </button>
            </div>
          </div>

          {/* CAMPO 2: nombre de la tarea, con el analizador de la acción siguiente */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="task-title" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                {m.task} <span className="text-red-500">*</span>
              </label>
              <span
                className={`font-mono text-[11px] ${title.length > 100 ? 'font-bold text-red-600' : 'text-slate-500'}`}
              >
                {m.characters(title.length)}
              </span>
            </div>

            {/* Texto indicativo encima del campo: la acción empieza por un verbo físico */}
            <p id="task-title-hint" className="mb-1.5 text-[11px] text-slate-500">
              <strong className="text-slate-700">{m.actionVerb}</strong> {m.titleHint}
            </p>

            <div className="relative flex flex-wrap items-center gap-1">
              <input
                id="task-title"
                maxLength={2_000}
                aria-describedby="task-title-hint"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setOverrideSyntaxWarning(false);
                  setTypedTitle((n) => n + 1);
                  setVoiceParsed(null);
                }}
                onBlur={() => setTouched({ ...touched, title: true })}
                placeholder={m.titlePlaceholder}
                className={`min-w-0 flex-1 rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none ${
                  touched.title && (isTitleEmpty || isTitleTooLong || isSyntaxInvalid)
                    ? 'border-red-400 bg-red-50/20 focus:ring-red-400'
                    : syntaxResult.isValid
                      ? 'border-emerald-300 bg-emerald-50/10 focus:ring-emerald-400'
                      : 'border-slate-300 focus:ring-indigo-400'
                }`}
              />
              <DictateButton
                label={m.dictateTask}
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  setOverrideSyntaxWarning(false);
                }}
                autoStart={autoDictate && !editingTask}
                pause={guard.confirming}
                typed={typedTitle}
                onFinal={applyDictatedTitle}
              />
            </div>
            {/* Lo que se entendió del dictado (plazo y prioridad), con «Deshacer» */}
            <DictationUnderstood summary={voiceSummary} onUndo={undoDictatedTitle} />
            {/* Debajo del campo y no encima: con títulos largos o texto ampliado taparía lo escrito */}
            {syntaxResult.isValid && syntaxResult.detectedVerb && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {m.actionVerb} {syntaxResult.detectedVerb}
              </p>
            )}

            {/* Error por longitud o vacío */}
            {touched.title && isTitleEmpty && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {m.writeTask}
              </p>
            )}
            {isTitleTooLong && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {m.tooLong}
              </p>
            )}

            {/* ASISTENTE DEL ANALIZADOR: convierte un tema abstracto en una acción concreta */}
            {!syntaxResult.isValid && title.trim().length > 0 && !overrideSyntaxWarning && (
              <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="flex-1 space-y-1.5">
                    <p className="font-bold">{syntaxResult.warning || m.missingVerb}</p>
                    <p className="text-amber-800">{syntaxResult.assistantQuestion || m.firstStep}</p>
                    {syntaxResult.suggestion && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => applySyntaxSuggestion(syntaxResult.suggestion!)}
                          className="flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-amber-800"
                        >
                          <span>{m.useSuggestion(syntaxResult.suggestion)}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverrideSyntaxWarning(true)}
                          className="text-[11px] text-amber-700 hover:underline"
                        >
                          {m.keepWording}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PROYECTO: al que pertenece la tarea (solo si hay proyectos); fija la meta */}
          {projectOptions.length > 0 && (
            <div>
              <label
                htmlFor="task-project"
                className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
              >
                {m.project} <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
              </label>
              <select
                id="task-project"
                value={projectId}
                onChange={(e) => chooseProject(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              >
                <option value="">{m.noProject}</option>
                {projectId && !project && <option value={projectId}>{m.projectUnavailable}</option>}
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.status === 'FINISHED' ? m.projectFinished : p.status === 'ARCHIVED' ? m.projectArchived : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* META: a qué meta contribuye la tarea; si aún no está, se puede crear aquí */}
          <div>
            {goalOptions.length > 0 ? (
              <>
                <label
                  htmlFor="task-goal"
                  className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
                >
                  {m.goal} <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
                </label>
                <select
                  ref={goalSelectRef}
                  id="task-goal"
                  value={goalId}
                  disabled={Boolean(project)}
                  onChange={(e) => chooseGoal(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                >
                  <option value="">{m.noGoal}</option>
                  {goalId && !goal && <option value={goalId}>{m.goalUnavailable}</option>}
                  {areasInUse(
                    wheelAreas,
                    goalOptions.map((g) => g.area)
                  ).map((area) => (
                    <optgroup key={area} label={areaName(area)}>
                      {goalOptions
                        .filter((g) => g.area === area)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title}
                            {g.status === 'ACHIEVED' ? m.goalAchieved : g.status === 'ARCHIVED' ? m.goalArchived : ''}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {project ? (
                  <p className="mt-1 text-[11px] text-slate-500">{m.projectGoal(project.title)}</p>
                ) : (
                  goal && <p className="mt-1 text-[11px] text-slate-500">{m.goalArea(areaName(goal.area))}</p>
                )}
                {suggestedGoal && !project && (
                  <button
                    type="button"
                    onClick={() => chooseGoal(suggestedGoal.id)}
                    className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-left text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                  >
                    <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {m.linkTo(suggestedGoal.title)}
                  </button>
                )}
              </>
            ) : (
              <p className="text-[11px] text-slate-500">
                <Target className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-indigo-500" aria-hidden="true" />
                {onCreateGoal ? m.noGoalsYet : m.goalsLater}
              </p>
            )}
            {onCreateGoal &&
              !project &&
              (newGoalOpen ? (
                <NewGoalInline
                  defaultArea={wheelCategory}
                  onCreate={createGoal}
                  onCancel={() => {
                    setNewGoalOpen(false);
                    requestAnimationFrame(() => newGoalButtonRef.current?.focus());
                  }}
                />
              ) : (
                <button
                  ref={newGoalButtonRef}
                  type="button"
                  onClick={() => setNewGoalOpen(true)}
                  className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {m.newGoal}
                </button>
              ))}
            {/* Siempre presente, para que el lector de pantalla anuncie la confirmación */}
            <p role="status" className="text-[11px] font-medium text-emerald-700">
              {createdGoalId && goal?.id === createdGoalId ? m.goalCreated(goal.title) : ''}
            </p>
          </div>

          {/* FECHA LÍMITE: a la vista; el inicio y la repetición están en «Más opciones» */}
          <div className="space-y-1.5">
            <span className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase">
              {m.dueDate}
              {isRepeating && (
                <span className="font-normal tracking-normal text-slate-600 normal-case"> {m.repeatEnd}</span>
              )}
            </span>
            <div className="flex gap-2">
              <DateField
                label={m.dueDate}
                value={dueDate}
                onChange={(value) => {
                  setDueDate(value);
                  // Cambiado a mano: «Deshacer» ya no lo pisaría
                  setVoiceParsed(null);
                }}
                onDraftChange={draftOf('dueDate')}
                className="min-w-0 flex-1"
                inputClassName="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <TimeField
                label={m.dueTime}
                value={dueTime}
                onChange={(value) => {
                  setDueTime(value);
                  setVoiceParsed(null);
                }}
                onDraftChange={draftOf('dueTime')}
                disabled={!dueDate && !isRepeating}
                className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {isRepeating && m.repeatDueHelp}
              {m.deadlineHelp(
                <span className="font-semibold text-violet-600">{m.violet}</span>,
                <span className="font-semibold text-red-600">{m.red}</span>
              )}
            </p>
          </div>

          {/* ALARMA: aviso antes del plazo, mientras CLAR está abierta */}
          <div>
            <label
              htmlFor="task-alarm"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
            >
              {m.alarm} <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
            </label>
            <div className="flex items-center gap-2">
              <TimeField
                id="task-alarm"
                label={m.alarm}
                hasVisibleLabel
                value={alarmBlocked ? '' : alarmTime}
                onChange={setAlarmTime}
                onDraftChange={draftOf('alarmTime')}
                disabled={Boolean(alarmBlocked)}
                aria-describedby={alarmProblem ? 'task-alarm-error task-alarm-help' : 'task-alarm-help'}
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              />
              {alarmTime && !alarmBlocked && (
                <button
                  type="button"
                  onClick={() => setAlarmTime('')}
                  aria-label={m.removeAlarm}
                  className="min-h-9 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {m.remove}
                </button>
              )}
            </div>
            {alarmProblem && (
              <p
                id="task-alarm-error"
                role="alert"
                className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {alarmProblem}
              </p>
            )}
            <p id="task-alarm-help" className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {alarmBlocked ?? alarmDescription ?? m.alarmHelp} {pushAvailable() ? m.alarmPush : m.alarmNoPush}
            </p>
            {alarmDescription && <NotificationPermission />}
          </div>

          {/* Prioridad: a la vista, cuenta para el orden del Top 10 */}
          <div>
            <label
              htmlFor="task-priority"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
            >
              {m.priority} <span className="text-red-500">*</span>
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as TaskPriority);
                setVoiceParsed(null);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              <option value="CRITICAL">🔥 {PRIORITY_LABEL.CRITICAL}</option>
              <option value="HIGH">⚡ {PRIORITY_LABEL.HIGH}</option>
              <option value="MEDIUM">⚖️ {PRIORITY_LABEL.MEDIUM}</option>
              <option value="LOW">🌱 {PRIORITY_LABEL.LOW}</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">{m.priorityHelp}</p>
          </div>

          {/* MÁS OPCIONES: lo que no hace falta para capturar la acción */}
          <div className="rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setShowMore((open) => !open)}
              aria-expanded={showMore}
              aria-controls="task-more-options"
              className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 text-left text-xs font-bold tracking-wider text-slate-700 uppercase"
            >
              <span>
                {m.moreOptions}
                <span className="sr-only">: </span>
                <span className="ml-2 font-normal tracking-normal text-slate-500 normal-case">{m.moreOptionsList}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${showMore ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            <div id="task-more-options" hidden={!showMore} className="space-y-5 border-t border-slate-100 p-3.5">
              {/* CAMPO 3: descripción, con la sugerencia de área */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="task-description"
                    className="text-xs font-bold tracking-wider text-slate-600 uppercase"
                  >
                    {m.description}{' '}
                    <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
                  </label>
                </div>
                <textarea
                  id="task-description"
                  maxLength={100_000}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={(e) => {
                    setTouched({ ...touched, description: true });
                    // Si el foco pasa a un botón (Guardar, Cancelar…) no se lanza la sugerencia: el aviso de carga
                    // desplazaría el botón entre que se pulsa y se suelta, y el clic se perdería
                    if ((e.relatedTarget as HTMLElement | null)?.tagName === 'BUTTON') return;
                    triggerNLPInference();
                  }}
                  placeholder={m.descriptionPlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition-all focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />

                {/* SUGERENCIA DE ÁREA */}
                {nlpLoading && (
                  <p className="mt-1 flex animate-pulse items-center gap-1 text-[11px] text-indigo-600">
                    <Sparkles className="h-3.5 w-3.5" /> {m.findingArea}
                  </p>
                )}

                {!goal && nlpResult && nlpResult.category && nlpResult.isAboveThreshold && (
                  <div className="animate-in fade-in mt-2 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 text-xs">
                    <div className="flex items-center gap-2 text-indigo-950">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <div>
                        <span className="font-semibold">{m.suggestion}</span>{' '}
                        <span>{m.linkArea(<strong>{areaName(nlpResult.category)}</strong>)}</span>
                        <span className="ml-1.5 font-mono text-[11px] text-indigo-600">
                          {m.confidence(Math.round(nlpResult.confidenceScore * 100))}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyNlpSuggestion(nlpResult.category!, nlpResult.confidenceScore)}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
                    >
                      <Check className="h-3 w-3" />
                      <span>{m.useArea}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* FILA: Estimación y Categoría de la Rueda (Enlace Cognitivo) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Estimación: duración prevista */}
                <div>
                  <label
                    htmlFor="task-estimate"
                    className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
                  >
                    {m.estimate}
                  </label>
                  <select
                    id="task-estimate"
                    value={estimateMinutes ?? ''}
                    onChange={(e) => setEstimateMinutes(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                    <option value="">{m.notEstimated}</option>
                    {ESTIMATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Categoría Rueda de la Vida */}
                <div>
                  <label
                    htmlFor="task-category"
                    className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
                  >
                    {m.wheelArea}
                  </label>
                  <select
                    id="task-category"
                    value={(goal ? goal.area : wheelCategory) || ''}
                    disabled={Boolean(goal)}
                    onChange={(e) => {
                      setWheelCategory(e.target.value || undefined);
                      setLinkedBy('MANUAL');
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                    <option value="">{m.noArea}</option>
                    {selectableAreas(goal ? goal.area : wheelCategory).map(({ id, label: name }) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {goal ? (
                    <p className="mt-1 text-[11px] text-slate-500">{m.goalAreaFixed(goal.title)}</p>
                  ) : (
                    wheelCategory && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        {m.area} <strong>{areaName(wheelCategory)}</strong> (
                        {linkedBy === 'AUTO_TFIDF' ? m.suggested : m.chosenByYou})
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* DEPENDENCIA: la tarea a la que espera esta (una sola); mientras siga abierta, esta queda bloqueada */}
              <div>
                <label
                  htmlFor="task-depends-on"
                  className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
                >
                  {m.startsAfter}{' '}
                  <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
                </label>
                <select
                  id="task-depends-on"
                  value={dependsOn}
                  onChange={(e) => setDependsOn(e.target.value)}
                  aria-describedby="task-depends-on-help"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                >
                  <option value="">{m.noDependency}</option>
                  {dependsOn && !dependencyOptions.some((t) => t.id === dependsOn) && (
                    <option value={dependsOn}>
                      {!waitingFor
                        ? m.deletedTask
                        : dependencyError
                          ? m.waitsForThis(waitingFor.title)
                          : m.closedTask(waitingFor.title, isCancelled(waitingFor))}
                    </option>
                  )}
                  {(['WORK', 'PERSONAL'] as const)
                    .filter((list) => dependencyOptions.some((t) => t.listContext === list))
                    .map((list) => (
                      <optgroup key={list} label={list === 'WORK' ? m.work : m.personal}>
                        {dependencyOptions
                          .filter((t) => t.listContext === list)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                </select>
                <p id="task-depends-on-help" className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {m.dependencyHelp}
                </p>
                {dependencyError && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {dependencyError}
                  </p>
                )}
                {waitingForThis.length > 0 && (
                  <p className="mt-1 text-[11px] text-slate-600">
                    {m.waitingForThis(waitingForThis.map((t) => t.title))}
                  </p>
                )}
              </div>

              {/* FECHAS OPCIONALES: plazo (solo fecha límite) o intervalo (inicio + fecha límite), con hora opcional */}
              <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-3.5">
                <legend className="flex items-center gap-1.5 px-1 text-xs font-bold tracking-wider text-slate-600 uppercase">
                  <CalendarClock className="h-3.5 w-3.5 text-indigo-600" />
                  {m.startAndRepeat}
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-700">
                      {isRepeating ? (
                        <>
                          {m.repeatStart}
                          <span className="font-normal text-slate-600">{m.todayIfEmpty}</span>
                        </>
                      ) : (
                        m.rangeStart
                      )}
                    </span>
                    <div className="flex gap-2">
                      <DateField
                        label={m.startDate}
                        value={startDate}
                        onChange={setStartDate}
                        onDraftChange={draftOf('startDate')}
                        className="min-w-0 flex-1"
                        inputClassName="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <TimeField
                        label={m.startTime}
                        value={startTime}
                        onChange={setStartTime}
                        onDraftChange={draftOf('startTime')}
                        disabled={!startDate && !isRepeating}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
                {datesError && (
                  <p role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {datesError}
                  </p>
                )}

                {/* REPETICIÓN: al marcarla Hecha se archiva y se crea la siguiente con la nueva fecha. Se lee en una línea:
                    «Repetir: No se repite» o «Repetir: Cada [N] [días]» */}
                <div className="space-y-3 border-t border-slate-100 pt-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <label
                        htmlFor="task-repeat"
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-700"
                      >
                        <Repeat className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
                        {m.repeat}
                      </label>
                      {/* «Cada [N] [unidad]» va junto: si no cabe en la línea, pasa entero a la siguiente (y, con el
                          texto muy grande, la unidad baja también) */}
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {repeatFrequency && (
                          <>
                            <label htmlFor="task-repeat-interval" className="text-xs text-slate-700">
                              {m.every}
                              <span className="sr-only"> {m.repeatHowMany[repeatFrequency]}</span>
                            </label>
                            <input
                              id="task-repeat-interval"
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              maxLength={2}
                              value={intervalInput}
                              onChange={(e) => typeInterval(e.target.value)}
                              onBlur={() => setIntervalText(null)}
                              aria-invalid={Boolean(intervalError)}
                              aria-describedby={intervalError ? 'task-repeat-interval-error' : undefined}
                              className="w-12 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none aria-invalid:border-red-500"
                            />
                          </>
                        )}
                        <select
                          id="task-repeat"
                          value={repeatFrequency}
                          onChange={(e) => {
                            const value = e.target.value as RecurrenceFrequency | '';
                            // Al dejar de repetir, las fechas vuelven a ser las de una tarea normal: la fecha límite pasa
                            // a ser la primera repetición y desaparece el inicio de la serie (si no, quedaría un intervalo)
                            if (!value && isRepeating) {
                              setDueDate(firstRepetition ?? startDate);
                              setStartDate('');
                            }
                            setIntervalText(null);
                            setRepeatFrequency(value);
                          }}
                          className="max-w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        >
                          <option value="">{m.noRepeat}</option>
                          {/* Al repetir, tras «Cada N» solo va la unidad, en singular o plural según N. Sin repetir, la
                              regla entera, con el N que se usará (si se cambió antes) */}
                          {REPEAT_FREQUENCIES.map((frequency) => (
                            <option key={frequency} value={frequency}>
                              {repeatFrequency
                                ? repeatUnit(frequency, repeatInterval)
                                : everyPeriod(repeatInterval, frequency)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {intervalError && (
                      <p
                        id="task-repeat-interval-error"
                        role="alert"
                        className="flex items-center gap-1 text-xs font-medium text-red-600"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {intervalError}
                      </p>
                    )}
                  </div>

                  {/* Días y semanas: en fechas fijas o contando desde el día en que se hace */}
                  {canRepeatFromCompletion(repeatFrequency) && (
                    <fieldset className="space-y-1">
                      <legend className="text-[11px] font-semibold text-slate-700">{m.whenNextDue}</legend>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="radio"
                            name="task-repeat-from"
                            checked={!fromCompletion}
                            onChange={() => setRepeatFromCompletion(false)}
                          />
                          {m.fixedDates}
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="radio"
                            name="task-repeat-from"
                            checked={fromCompletion}
                            onChange={() => setRepeatFromCompletion(true)}
                          />
                          {afterDoneText(repeatInterval, repeatFrequency)}
                        </label>
                      </div>
                    </fieldset>
                  )}

                  {repeatFrequency === 'WEEKLY' && !fromCompletion && (
                    <fieldset className="space-y-1">
                      <legend className="text-[11px] font-semibold text-slate-700">{m.weekdays}</legend>
                      <div className="flex flex-wrap gap-1.5">
                        {m.weekdayToggles.map(({ day, short, name }) => (
                          <label
                            key={day}
                            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-400 ${
                              weekdays.includes(day)
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={weekdays.includes(day)}
                              onChange={(e) =>
                                setRepeatWeekdays(
                                  e.target.checked ? [...weekdays, day] : weekdays.filter((d) => d !== day)
                                )
                              }
                              aria-label={name}
                            />
                            {short}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {repeatFrequency === 'MONTHLY' && (
                    <fieldset className="space-y-1">
                      <legend className="text-[11px] font-semibold text-slate-700">{m.monthDay}</legend>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                        {monthlyOptions.map((option) => (
                          <label key={option.mode} className="flex cursor-pointer items-center gap-1.5">
                            <input
                              type="radio"
                              name="task-repeat-monthly"
                              checked={effectiveMonthlyMode === option.mode}
                              onChange={() => setRepeatMonthlyMode(option.mode)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {recurrence && firstRepetition && (
                    <p className="text-[11px] font-medium text-indigo-700" role="status">
                      {describeRecurrence(recurrence, firstRepetition)}
                      {m.first(formatDay(firstRepetition))}
                      {fromCompletion ? m.ifDoneThatDay : m.whenCompleted}
                      {nextRepetition ? m.nextDue(formatDay(nextRepetition)) : m.noMoreRepeats}
                    </p>
                  )}
                  {recurrenceError && (
                    <p role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {recurrenceError}
                    </p>
                  )}
                </div>
              </fieldset>

              {/* CAMPO 4: «Algún día» */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSomeday}
                    onChange={(e) => setIsSomeday(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">{m.saveForSomeday}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{m.somedayHelp}</span>
                  </div>
                </label>
              </div>

              {/* CAMPO 5: notas, enlaces y listas de comprobación (observations) */}
              <div>
                <label
                  htmlFor="task-note"
                  className="mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase"
                >
                  {m.notes}
                </label>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input
                    id="task-note"
                    type="text"
                    value={newObsText}
                    onChange={(e) => {
                      setNewObsText(e.target.value);
                      setTypedNote((n) => n + 1);
                    }}
                    placeholder={m.notePlaceholder}
                    className="min-w-32 flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddObservation();
                      }
                    }}
                  />
                  <DictateButton
                    label={m.dictateNote}
                    value={newObsText}
                    onChange={setNewObsText}
                    pause={guard.confirming}
                    typed={typedNote}
                  />
                  <button
                    type="button"
                    onClick={handleAddObservation}
                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    {m.add}
                  </button>
                </div>

                {observations.length > 0 && (
                  <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
                    {observations.map((obs) => (
                      <div
                        key={obs.id}
                        className="flex items-center justify-between rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                      >
                        <span className="truncate">{obs.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveObservation(obs.id)}
                          className="ml-2 text-slate-500 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Con «Más opciones» plegado, sus errores se ven igualmente */}
          {!showMore && (datesError || recurrenceError || dependencyError) && (
            <p role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {m.inMoreOptions((datesError ?? recurrenceError ?? dependencyError)!)}
            </p>
          )}

          {/* CHECKLIST DE VALIDACIÓN EN TIEMPO REAL ANTES DE ENVIAR */}
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="mb-1 block font-bold text-slate-700">{m.beforeSaving}</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                {!isTitleEmpty && !isTitleTooLong ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <span className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300" />
                )}
                <span className={!isTitleEmpty ? 'text-slate-700' : 'text-slate-500'}>{m.upTo100}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {syntaxResult.isValid || overrideSyntaxWarning ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <span className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300" />
                )}
                <span className={syntaxResult.isValid ? 'text-slate-700' : 'text-slate-500'}>{m.startsWithVerb}</span>
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {m.cancel}
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm transition-all ${
                isFormValid
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>{editingTask ? m.saveChanges : m.saveTask}</span>
            </button>
          </div>
        </form>

        {guard.confirming && (
          <DiscardChangesPrompt
            text={editingTask ? m.discardEdit : m.discardNew}
            onKeepEditing={guard.keepEditing}
            onDiscard={guard.discard}
          />
        )}
      </div>
    </div>
  );
};
