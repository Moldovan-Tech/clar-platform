import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { TaskItem } from '../types';
import { AgendaItem, buildAgenda, daysFrom, overdueTasks, startOfWeek } from '../services/agenda';
import { toDateString } from '../services/recurrence';
import { DEADLINE_TITLE_CLASS, formatTaskDates, toLocalDate } from '../services/tasks';
import { useNow } from '../hooks/useNow';
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
    intro: 'Tareas con fecha de tus dos listas y repeticiones previstas. Pulsa una tarea para editarla.',
    view: 'Vista de la agenda',
    week: 'Semana',
    byDay: 'Por días',
    previousWeek: 'Semana anterior',
    today: 'Hoy',
    nextWeek: 'Semana siguiente',
    legend: 'Leyenda',
    upcomingRepeat: 'Repetición prevista',
    nothingScheduled: 'Sin nada programado',
    overdue: (count: number) => `Vencidas (${count})`
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
    intro: 'Tasks with dates from both your lists and upcoming repeats. Tap a task to edit it.',
    view: 'Agenda view',
    week: 'Week',
    byDay: 'By day',
    previousWeek: 'Previous week',
    today: 'Today',
    nextWeek: 'Next week',
    legend: 'Legend',
    upcomingRepeat: 'Upcoming repeat',
    nothingScheduled: 'Nothing scheduled',
    overdue: (count) => `Overdue (${count})`
  }
);

interface AgendaViewProps {
  tasks: TaskItem[];
  onEditTask: (task: TaskItem) => void;
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

const AgendaEntry: React.FC<{ item: AgendaItem; onEditTask: (task: TaskItem) => void }> = ({ item, onEditTask }) => {
  const time = item.time || m.allDay;
  const meta = [
    m.labels[item.label],
    item.context === 'WORK' ? m.work : item.context === 'PERSONAL' ? m.personal : undefined
  ]
    .filter(Boolean)
    .join(' · ');

  const isOccurrence = item.kind === 'occurrence';
  return (
    <button
      type="button"
      onClick={() => item.task && onEditTask(item.task)}
      className={`w-full space-y-0.5 rounded-lg border border-l-4 p-2 text-left text-xs hover:bg-slate-50 ${
        item.context ? CONTEXT_STYLE[item.context] : ''
      } ${isOccurrence ? 'border-dashed border-slate-300 bg-white/60' : 'border-slate-200 bg-white'}`}
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
    </button>
  );
};

// Agenda con las tareas con fecha de las dos listas y sus repeticiones previstas
export const AgendaView: React.FC<AgendaViewProps> = ({ tasks, onEditTask }) => {
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
                        <AgendaEntry item={item} onEditTask={onEditTask} />
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
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className={`w-full rounded-lg border border-l-4 border-slate-200 bg-white p-2 text-left text-xs hover:bg-slate-50 ${CONTEXT_STYLE[task.listContext]}`}
                    >
                      <span className="block font-semibold wrap-anywhere text-red-600">{task.title}</span>
                      <span className="block text-[10px] text-slate-500">{formatTaskDates(task)}</span>
                    </button>
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
                        <AgendaEntry item={item} onEditTask={onEditTask} />
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
