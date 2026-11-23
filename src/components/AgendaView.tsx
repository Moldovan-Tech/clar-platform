import React, { useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Lock, Repeat } from 'lucide-react';
import { TaskItem, TaskStatus } from '../types';
import { AgendaItem, buildAgenda, daysFrom, overdueTasks, startOfWeek } from '../services/agenda';
import { toDateString } from '../services/recurrence';
import { DEADLINE_TITLE_CLASS, formatTaskDates, toLocalDate } from '../services/tasks';
import { blockerOf, tasksById } from '../services/dependencies';
import { useNow } from '../hooks/useNow';
import { TaskStatusSelect } from './TaskStatusSelect';
import { LOCALE_TAG, messages } from '../i18n/locale';

const m = messages(
  {
    // Las etiquetas de cada elemento (AgendaItem.label es un identificador: en español coincide con el texto)
    labels: {
      Vence: 'Vence',
      Empieza: 'Empieza',
      'En curso': 'En curso',
      'Repetición prevista': 'Repetición prevista'
    } satisfies Record<AgendaItem['label'], string>,
    allDay: 'Todo el día',
    work: 'Profesional',
    personal: 'Personal',
    dueToday: '(vence hoy)',
    title: 'Agenda',
    intro:
      'Tareas con fecha de tus dos listas y repeticiones previstas. Pulsa una tarea para editarla, o cambia su estado desde aquí.',
    view: 'Vista de la agenda',
    week: 'Semana',
    byDay: 'Por días',
    previousWeek: 'Semana anterior',
    today: 'Hoy',
    nextWeek: 'Semana siguiente',
    legend: 'Leyenda',
    upcomingRepeat: 'Repetición prevista',
    nothingScheduled: 'Sin nada programado',
    overdue: (count: number) => `Vencidas (${count})`,
    markDone: (title: string) => `Marcar «${title}» como hecha`,
    markDoneTitle: 'Marcar como hecha',
    blocked: 'Bloqueada',
    blockedNote: '(bloqueada: espera a otra tarea)'
  },
  {
    labels: {
      Vence: 'Due',
      Empieza: 'Starts',
      'En curso': 'Ongoing',
      'Repetición prevista': 'Upcoming repeat'
    },
    allDay: 'All day',
    work: 'Work',
    personal: 'Personal',
    dueToday: '(due today)',
    title: 'Agenda',
    intro:
      'Tasks with dates from both your lists and upcoming repeats. Tap a task to edit it, or change its status here.',
    view: 'Agenda view',
    week: 'Week',
    byDay: 'By day',
    previousWeek: 'Previous week',
    today: 'Today',
    nextWeek: 'Next week',
    legend: 'Legend',
    upcomingRepeat: 'Upcoming repeat',
    nothingScheduled: 'Nothing scheduled',
    overdue: (count) => `Overdue (${count})`,
    markDone: (title) => `Mark “${title}” as done`,
    markDoneTitle: 'Mark as done',
    blocked: 'Blocked',
    blockedNote: '(blocked: waiting for another task)'
  }
);

interface AgendaViewProps {
  tasks: TaskItem[];
  onEditTask: (task: TaskItem) => void;
  // Cambia el estado con las mismas reglas que las listas (dependencias, repeticiones, «Deshacer»)
  onChangeStatus: (task: TaskItem, status: TaskStatus) => void;
}

type AgendaMode = 'week' | 'days';

const DAYS_VIEW_LENGTH = 14;
const weekdayFormat = new Intl.DateTimeFormat(LOCALE_TAG, { weekday: 'short' });
const longDayFormat = new Intl.DateTimeFormat(LOCALE_TAG, { weekday: 'long', day: 'numeric', month: 'long' });
const rangeFormat = new Intl.DateTimeFormat(LOCALE_TAG, { day: 'numeric', month: 'short', year: 'numeric' });

const CONTEXT_STYLE = {
  WORK: 'border-l-indigo-500',
  PERSONAL: 'border-l-emerald-500'
} as const;

// El título según el plazo (el color, el de las listas): las que vencen hoy, además, en negrita
const titleClass = (item: AgendaItem) =>
  `${item.deadline === 'today' ? 'font-bold' : 'font-semibold'} ${DEADLINE_TITLE_CLASS[item.deadline] || 'text-slate-900'}`;

interface EntryActions {
  onEditTask: (task: TaskItem) => void;
  onChangeStatus: (task: TaskItem, status: TaskStatus) => void;
}

// Controles de estado de una tarea real: completar de un toque (o el candado si espera a otra) y el selector de estado.
// Marcarla como hecha o cancelada la quita de la agenda (el aviso ofrece «Deshacer»)
const DoneButton: React.FC<{ task: TaskItem; blocked: boolean; onChangeStatus: EntryActions['onChangeStatus'] }> = ({
  task,
  blocked,
  onChangeStatus
}) =>
  blocked ? (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center" title={m.blocked} aria-hidden="true">
      <Lock className="h-3.5 w-3.5 text-amber-700" />
    </span>
  ) : (
    <button
      type="button"
      onClick={() => onChangeStatus(task, 'DONE')}
      aria-label={m.markDone(task.title)}
      title={m.markDoneTitle}
      className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white transition-colors group-hover:border-emerald-500 group-hover:bg-emerald-50 group-focus-visible:border-emerald-500 group-active:bg-emerald-100">
        <Check
          className="h-3 w-3 text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        />
      </span>
    </button>
  );

// Una entrada: el contenido abre la tarea (un botón) y, debajo, sus controles de estado (no pueden ir dentro del botón;
// debajo, el título conserva todo el ancho en las columnas estrechas de la semana)
const EntryCard: React.FC<
  EntryActions & {
    task: TaskItem;
    // Sin controles: una repetición prevista (aún no es una tarea) o los demás días de un intervalo (los lleva el
    // primero que se ve, para no repetirlos con el mismo nombre)
    withControls: boolean;
    // En la semana, entre md y lg las columnas no dan para el selector: solo el círculo (el estado está en la tarea)
    inWeek?: boolean;
    blocked: boolean;
    className: string;
    children: React.ReactNode;
  }
> = ({ task, withControls, inWeek = false, blocked, className, children, onEditTask, onChangeStatus }) => (
  <div className={`space-y-1 rounded-lg border border-l-4 p-1 text-xs ${className}`}>
    <button
      type="button"
      onClick={() => onEditTask(task)}
      className="block w-full space-y-0.5 rounded-md p-1 text-left hover:bg-slate-50"
    >
      {children}
      {blocked && <span className="sr-only">{m.blockedNote}</span>}
    </button>
    {/* Si no cabe junto al círculo, el selector pasa debajo en lugar de cortarse */}
    {withControls && (
      <div className="flex flex-wrap items-center gap-0.5">
        <DoneButton task={task} blocked={blocked} onChangeStatus={onChangeStatus} />
        <TaskStatusSelect
          status={task.status}
          taskTitle={task.title}
          size="xs"
          blocked={blocked}
          className={`min-h-6 max-w-full ${inWeek ? 'md:max-lg:hidden' : ''}`}
          onChange={(status) => onChangeStatus(task, status)}
        />
      </div>
    )}
  </div>
);

const AgendaEntry: React.FC<
  EntryActions & { item: AgendaItem; blocked: boolean; withControls: boolean; inWeek?: boolean }
> = ({ item, blocked, withControls, inWeek, ...actions }) => {
  const time = item.time || m.allDay;
  const meta = [
    m.labels[item.label],
    item.context === 'WORK' ? m.work : item.context === 'PERSONAL' ? m.personal : undefined
  ]
    .filter(Boolean)
    .join(' · ');

  const isOccurrence = item.kind === 'occurrence';
  if (!item.task) return null;
  return (
    <EntryCard
      {...actions}
      task={item.task}
      withControls={withControls && !isOccurrence}
      inWeek={inWeek}
      blocked={blocked}
      className={`${item.context ? CONTEXT_STYLE[item.context] : ''} ${
        isOccurrence ? 'border-dashed border-slate-300 bg-white/60' : 'border-slate-200 bg-white'
      }`}
    >
      <span className="block font-mono text-[10px] text-slate-600">{time}</span>
      <span
        className={`flex min-w-0 items-center gap-1 [overflow-wrap:anywhere] ${isOccurrence ? 'font-semibold text-slate-600' : titleClass(item)}`}
      >
        {isOccurrence && <Repeat className="h-3 w-3 shrink-0" aria-hidden="true" />}
        {item.title}
        {!isOccurrence && item.deadline === 'today' && <span className="sr-only">{m.dueToday}</span>}
      </span>
      <span className="block text-[10px] text-slate-500">{meta}</span>
    </EntryCard>
  );
};

// Agenda con las tareas con fecha de las dos listas y sus repeticiones previstas
export const AgendaView: React.FC<AgendaViewProps> = ({ tasks, onEditTask, onChangeStatus }) => {
  const now = useNow();
  const [mode, setMode] = useState<AgendaMode>('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const today = toDateString(now);
  // La vista por días mira hacia delante: en la semana actual empieza hoy en lugar del lunes
  const isCurrentWeek = toDateString(weekStart) === toDateString(startOfWeek(now));
  const daysStart = mode === 'days' && isCurrentWeek ? now : weekStart;
  const days = daysFrom(daysStart, mode === 'week' ? 7 : DAYS_VIEW_LENGTH);
  const agenda = buildAgenda(tasks, days, now);
  const overdue = overdueTasks(tasks, now);
  const byId = tasksById(tasks);
  const isBlocked = (task?: TaskItem) => Boolean(task && blockerOf(task, byId));
  const actions = { onEditTask, onChangeStatus };
  // Los controles de estado van en la primera entrada que se ve de cada tarea (un intervalo sale varios días)
  const withControls = new Set<string>();
  const seen = new Set<string>();
  for (const date of days) {
    for (const item of agenda.get(date)!) {
      if (item.kind !== 'task' || !item.task || seen.has(item.task.id)) continue;
      seen.add(item.task.id);
      withControls.add(item.key);
    }
  }
  const rangeLabel = `${rangeFormat.format(toLocalDate(days[0]))} – ${rangeFormat.format(toLocalDate(days[days.length - 1]))}`;

  const moveWeeks = (weeks: number) =>
    setWeekStart((start) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * weeks));

  return (
    // Un texto sin espacios (p. ej. un enlace en el título de una tarea) se parte donde haga falta: si no, ensancha la
    // página en el móvil y la barra de abajo se va con ella
    <div className="min-w-0 space-y-5 [overflow-wrap:anywhere]">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:flex-row lg:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <CalendarDays className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            {m.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{m.intro}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={m.view}
            className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5"
          >
            {(
              [
                ['week', m.week],
                ['days', m.byDay]
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => moveWeeks(-1)}
              aria-label={m.previousWeek}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {m.today}
            </button>
            <button
              type="button"
              onClick={() => moveWeeks(1)}
              aria-label={m.nextWeek}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <span className="text-xs font-semibold text-slate-700" aria-live="polite">
            {rangeLabel}
          </span>
        </div>
      </div>

      {/* Leyenda */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-slate-600" aria-label={m.legend}>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-indigo-500" aria-hidden="true" />
          {m.work}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" aria-hidden="true" />
          {m.personal}
        </li>
        <li className="flex items-center gap-1.5">
          <Repeat className="h-3 w-3" aria-hidden="true" />
          {m.upcomingRepeat}
        </li>
      </ul>

      {mode === 'week' ? (
        <ol className="grid grid-cols-1 gap-2 md:grid-cols-7" aria-label={m.week}>
          {days.map((date) => {
            const isToday = date === today;
            const dayItems = agenda.get(date)!;
            return (
              <li
                key={date}
                aria-current={isToday ? 'date' : undefined}
                aria-label={longDayFormat.format(toLocalDate(date))}
                className={`min-h-28 min-w-0 space-y-2 rounded-2xl border p-2 ${isToday ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/60'}`}
              >
                <div className="flex items-baseline justify-between px-0.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    {weekdayFormat.format(toLocalDate(date))}
                  </span>
                  <span className={`text-sm font-extrabold ${isToday ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {toLocalDate(date).getDate()}
                  </span>
                </div>
                {dayItems.length === 0 ? (
                  <p className="px-0.5 text-[10px] text-slate-600">{m.nothingScheduled}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {dayItems.map((item) => (
                      <li key={item.key}>
                        <AgendaEntry
                          {...actions}
                          item={item}
                          blocked={isBlocked(item.task)}
                          withControls={withControls.has(item.key)}
                          inWeek
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <section
              aria-labelledby="agenda-overdue"
              className="space-y-2 rounded-2xl border border-red-200 bg-red-50/60 p-4"
            >
              <h3 id="agenda-overdue" className="text-xs font-bold tracking-wider text-red-700 uppercase">
                {m.overdue(overdue.length)}
              </h3>
              <ul className="space-y-1.5">
                {overdue.map((task) => (
                  <li key={task.id}>
                    <EntryCard
                      {...actions}
                      task={task}
                      withControls
                      blocked={isBlocked(task)}
                      className={`border-slate-200 bg-white ${CONTEXT_STYLE[task.listContext]}`}
                    >
                      <span className="block font-semibold wrap-anywhere text-red-600">{task.title}</span>
                      <span className="block text-[10px] text-slate-500">{formatTaskDates(task)}</span>
                    </EntryCard>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Todos los días del periodo, también los vacíos, para que la estructura (y hoy) siempre esté */}
          {days.map((date) => {
            // Las vencidas ya están en su propia sección: no se repiten en su día
            const items = agenda.get(date)!.filter((item) => !(item.kind === 'task' && item.deadline === 'overdue'));
            const isToday = date === today;
            return (
              <section
                key={date}
                aria-labelledby={`agenda-day-${date}`}
                aria-current={isToday ? 'date' : undefined}
                className={`space-y-2 rounded-2xl border ${items.length ? 'p-4' : 'px-4 py-2.5'} ${
                  isToday ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 id={`agenda-day-${date}`} className="text-sm font-bold text-slate-900 first-letter:uppercase">
                    {longDayFormat.format(toLocalDate(date))}
                    {isToday && <span className="ml-2 text-[10px] font-bold text-indigo-700 uppercase">{m.today}</span>}
                  </h3>
                  {items.length === 0 && <p className="text-xs text-slate-600">{m.nothingScheduled}</p>}
                </div>
                {items.length > 0 && (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <li key={item.key} className="min-w-0">
                        <AgendaEntry
                          {...actions}
                          item={item}
                          blocked={isBlocked(item.task)}
                          withControls={withControls.has(item.key)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
