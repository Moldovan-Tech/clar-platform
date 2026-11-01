import React from 'react';
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  Flame,
  FolderKanban,
  Gauge,
  Lightbulb,
  ListChecks,
  Target,
  Timer
} from 'lucide-react';
import { AppTab, Goal, ListContext, Project, TaskItem, WheelOfLifeLog } from '../types';
import { sortGoals } from '../services/goals';
import { GoalProgress } from './GoalProgress';
import { computeStats, recommendationsFor } from '../services/stats';
import { formatDay, toLocalDate } from '../services/tasks';
import { useAreas } from '../hooks/useAreas';
import { projectDeadline, sortProjects } from '../services/projects';
import { ProjectProgress } from './ProjectProgress';
import { LOCALE_TAG, messages } from '../i18n/locale';

interface HomeViewProps {
  tasks: TaskItem[];
  goals: Goal[];
  projects: Project[];
  activeContext: ListContext;
  accountName: string;
  top10Count: number;
  wheelLogs: WheelOfLifeLog[];
  wheelAverage: string;
  now: Date;
  onOpenAccount: () => void;
  onNavigate: (tab: AppTab) => void;
}

const dayLetter = new Intl.DateTimeFormat(LOCALE_TAG, { weekday: 'narrow' });
const dayLong = new Intl.DateTimeFormat(LOCALE_TAG, { weekday: 'long', day: 'numeric', month: 'long' });
const decimal = new Intl.NumberFormat(LOCALE_TAG, { maximumFractionDigits: 1 });

const m = messages(
  {
    list: 'Lista:',
    work: 'Profesional',
    personal: 'Personal',
    yourAccount: 'Tu cuenta',
    account: (name: string) => `Cuenta: ${name}`,
    focusWork: 'Tu foco profesional',
    focusPersonal: 'Tu foco personal',
    intro: 'Lo más importante de tu lista, cómo vas y qué te conviene hacer ahora.',
    top10: 'Top 10',
    priorityTasks: 'tareas prioritarias',
    wheel: 'Rueda de la Vida',
    evaluations: (n: number) => `${n} ${n === 1 ? 'evaluación' : 'evaluaciones'}`,
    performance: 'Tu rendimiento',
    tasksDone: 'Tareas hechas',
    today: 'Hoy',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mes',
    cancelledThisMonth: (n: number) =>
      `Este mes también ${n === 1 ? 'cancelaste 1 tarea' : `cancelaste ${n} tareas`}, que no cuentan como hechas.`,
    last14Days: 'Últimos 14 días',
    dailyChart: (total: number) =>
      `Tareas hechas por día en los últimos 14 días: ${total} en total. El detalle por día está en la tabla siguiente.`,
    dailyCaption: 'Tareas hechas por día',
    onTimeOrLate: 'A tiempo o con retraso',
    noDatedDone: 'En el último mes no has terminado tareas con fecha límite.',
    percent: (n: number) => `${n} %`,
    onTimeSr: ' a tiempo',
    onTimeDetail: (onTime: number, late: number) =>
      `${onTime} antes del plazo · ${late} después del plazo (último mes)`,
    velocity: 'Velocidad',
    tasksPerWeek: 'Tareas por semana',
    hoursPerWeek: 'Horas estimadas por semana',
    velocityRange: 'Media de las últimas cuatro semanas.',
    cycle: (days: string, one: boolean) =>
      `De media tardas ${days} ${one ? 'día' : 'días'} desde que creas una tarea hasta que la terminas.`,
    streakAndOpen: 'Constancia y pendientes',
    streak: 'Racha',
    daysInARow: (n: number): string => (n === 1 ? 'día seguido' : 'días seguidos'),
    open: 'Pendientes',
    openDetail: (overdue: number, dueThisWeek: number, blocked: number) =>
      `${overdue} ${overdue === 1 ? 'vencida' : 'vencidas'} · ${dueThisWeek} esta semana · ${blocked} ${blocked === 1 ? 'bloqueada' : 'bloqueadas'}`,
    byArea: 'Por área (último mes)',
    noAreas: 'Vincula tus tareas a una meta (o a un área de la Rueda) para ver en qué inviertes el esfuerzo.',
    goals: 'Metas',
    noGoals:
      'Aún no tienes metas. Ponle una meta concreta al área de tu Rueda que más quieres mejorar; en «Metas» verás primero las más bajas.',
    createGoal: 'Crear una meta',
    allGoals: (n: number) => `Ver las ${n} metas`,
    manageGoals: 'Gestionar las metas',
    projects: 'Proyectos',
    noProjects:
      'No tienes proyectos activos. Un proyecto agrupa las tareas de algo con fecha de fin dentro de una meta.',
    goToProjects: 'Ir a Proyectos',
    activeProjects: (n: number) => (n === 1 ? '1 activo' : `${n} activos`),
    lateProjects: (n: number) => ` · ${n} fuera de plazo`,
    endsOn: (overdue: boolean, day: string) => `${overdue ? 'Terminaba' : 'Termina'} el ${day}`,
    overdue: ' · Fuera de plazo',
    endsSoon: ' · Termina pronto',
    allDone: ' · Todo hecho',
    allProjects: (n: number) => `Ver los ${n} proyectos`,
    viewProjects: 'Ver los proyectos',
    recommendations: 'Recomendaciones',
    upToDate: 'Vas al día. Sigue con tu Top 10.'
  },
  {
    list: 'List:',
    work: 'Work',
    personal: 'Personal',
    yourAccount: 'Your account',
    account: (name) => `Account: ${name}`,
    focusWork: 'Your work focus',
    focusPersonal: 'Your personal focus',
    intro: 'The most important things on your list, how you’re doing and what to do next.',
    top10: 'Top 10',
    priorityTasks: 'priority tasks',
    wheel: 'Wheel of Life',
    evaluations: (n) => `${n} ${n === 1 ? 'assessment' : 'assessments'}`,
    performance: 'Your performance',
    tasksDone: 'Tasks done',
    today: 'Today',
    thisWeek: 'This week',
    thisMonth: 'This month',
    cancelledThisMonth: (n) =>
      n === 1
        ? 'This month you also canceled 1 task, which doesn’t count as done.'
        : `This month you also canceled ${n} tasks, which don’t count as done.`,
    last14Days: 'Last 14 days',
    dailyChart: (total) =>
      `Tasks done per day in the last 14 days: ${total} in total. The table below has the breakdown by day.`,
    dailyCaption: 'Tasks done per day',
    onTimeOrLate: 'On time or late',
    noDatedDone: 'In the last month you haven’t finished any tasks with a due date.',
    percent: (n) => `${n}%`,
    onTimeSr: ' on time',
    onTimeDetail: (onTime, late) => `${onTime} before the deadline · ${late} after the deadline (last month)`,
    velocity: 'Pace',
    tasksPerWeek: 'Tasks per week',
    hoursPerWeek: 'Estimated hours per week',
    velocityRange: 'Average over the last four weeks.',
    cycle: (days, one) => `On average, you take ${days} ${one ? 'day' : 'days'} from creating a task to finishing it.`,
    streakAndOpen: 'Streak and pending',
    streak: 'Streak',
    daysInARow: (n) => (n === 1 ? 'day in a row' : 'days in a row'),
    open: 'Pending',
    openDetail: (overdue, dueThisWeek, blocked) => `${overdue} overdue · ${dueThisWeek} this week · ${blocked} blocked`,
    byArea: 'By area (last month)',
    noAreas: 'Link your tasks to a goal (or to a Wheel area) to see where your effort goes.',
    goals: 'Goals',
    noGoals:
      'You have no goals yet. Set a concrete goal for the Wheel area you most want to improve; “Goals” shows the lowest areas first.',
    createGoal: 'Create a goal',
    allGoals: (n) => `View all ${n} goals`,
    manageGoals: 'Manage goals',
    projects: 'Projects',
    noProjects: 'You have no active projects. A project groups the tasks of something with an end date, within a goal.',
    goToProjects: 'Go to Projects',
    activeProjects: (n) => `${n} active`,
    lateProjects: (n) => ` · ${n} overdue`,
    endsOn: (overdue, day) => `${overdue ? 'Was due to end on' : 'Ends on'} ${day}`,
    overdue: ' · Overdue',
    endsSoon: ' · Ends soon',
    allDone: ' · All done',
    allProjects: (n) => `View all ${n} projects`,
    viewProjects: 'View projects',
    recommendations: 'Recommendations',
    upToDate: 'You’re up to date. Keep going with your Top 10.'
  }
);

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  icon,
  children,
  className = ''
}) => (
  <section
    aria-label={title}
    className={`space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs ${className}`}
  >
    <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

const Metric: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
    <p className="text-[11px] font-semibold break-words text-slate-600">{label}</p>
    <p className="font-mono text-2xl font-extrabold text-slate-900">{value}</p>
    {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
  </div>
);

// Pantalla de Inicio: el foco de la lista activa, estadísticas de las tareas y recomendaciones
export const HomeView: React.FC<HomeViewProps> = ({
  tasks,
  goals,
  projects,
  activeContext,
  accountName,
  top10Count,
  wheelLogs,
  wheelAverage,
  now,
  onOpenAccount,
  onNavigate
}) => {
  const contextTasks = tasks.filter((t) => t.listContext === activeContext);
  // `now` (reloj por minutos) hace que la pantalla se actualice sola; para calcular se usa la hora exacta, o una
  // tarea recién hecha quedaría fuera hasta el minuto siguiente (las estadísticas solo cuentan lo hecho hasta ahora)
  // eslint-disable-next-line react-hooks/purity
  const at = new Date(Math.max(now.getTime(), Date.now()));
  const stats = computeStats(contextTasks, at, tasks);
  const activeGoals = sortGoals(goals).filter((g) => g.status === 'ACTIVE');
  const { areas, label: areaName } = useAreas();
  const recommendations = recommendationsFor(stats, contextTasks, wheelLogs, at, goals, areas, projects, tasks);
  // PROYECTOS activos (de las dos listas), del que termina antes al que termina después, con su plazo
  const activeProjects = sortProjects(projects)
    .filter((p) => p.status === 'ACTIVE')
    .map((project) => ({ project, deadline: projectDeadline(project, tasks, at).state }));
  const lateProjects = activeProjects.filter((p) => p.deadline === 'overdue').length;
  const maxDaily = Math.max(1, ...stats.daily.map((d) => d.count));
  const datedDone = stats.onTime + stats.late;
  const maxArea = Math.max(1, ...stats.byArea.map((a) => a.count));
  const dailyTotal = stats.daily.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-5">
      {/* FOCO DE LA LISTA ACTIVA */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="pointer-events-none absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-indigo-50/60 blur-3xl" />
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-700">
              <Brain className="h-4 w-4" aria-hidden="true" />
              <span className="text-slate-600">
                {m.list}{' '}
                <strong className={activeContext === 'WORK' ? 'text-indigo-600' : 'text-emerald-700'}>
                  {activeContext === 'WORK' ? m.work : m.personal}
                </strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={onOpenAccount}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                title={m.yourAccount}
              >
                <span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
                <span>{m.account(accountName)}</span>
              </button>
            </div>
            <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {activeContext === 'WORK' ? m.focusWork : m.focusPersonal}
            </h1>
            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{m.intro}</p>
          </div>

          <div className="grid min-w-0 shrink-0 grid-cols-2 gap-2 sm:gap-3">
            {[
              { label: m.top10, value: `${top10Count}/10`, hint: m.priorityTasks, hintClass: 'text-indigo-600' },
              {
                label: m.wheel,
                value: `${wheelAverage}/10`,
                hint: m.evaluations(wheelLogs.length),
                hintClass: 'text-emerald-700'
              }
            ].map(({ label, value, hint, hintClass }) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50 p-2 text-center sm:p-3.5"
              >
                <div className="mb-0.5 text-[10px] font-bold break-words text-slate-500 uppercase sm:tracking-wider">
                  {label}
                </div>
                <div className="font-mono text-base font-extrabold text-slate-900 sm:text-2xl">{value}</div>
                <div className={`mt-0.5 text-[10px] font-semibold ${hintClass}`}>{hint}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS DE LA LISTA ACTIVA */}
      <h2 className="px-1 text-lg font-bold text-slate-900">
        {m.performance} · {activeContext === 'WORK' ? m.work : m.personal}
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card title={m.tasksDone} icon={<CalendarCheck className="h-4 w-4 text-indigo-600" aria-hidden="true" />}>
          <div className="grid grid-cols-3 gap-2">
            <Metric label={m.today} value={String(stats.doneToday)} />
            <Metric label={m.thisWeek} value={String(stats.doneThisWeek)} />
            <Metric label={m.thisMonth} value={String(stats.doneThisMonth)} />
          </div>
          {stats.cancelledThisMonth > 0 && (
            <p className="text-[11px] text-slate-600">{m.cancelledThisMonth(stats.cancelledThisMonth)}</p>
          )}
        </Card>

        <Card
          title={m.last14Days}
          icon={<ListChecks className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
          className="lg:col-span-2"
        >
          <div role="img" aria-label={m.dailyChart(dailyTotal)} className="flex h-28 items-end gap-1.5">
            {stats.daily.map(({ date, count }) => (
              <div
                key={date}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                aria-hidden="true"
              >
                <span className="font-mono text-[10px] text-slate-600">{count || ''}</span>
                <div
                  className={`w-full rounded-t-md ${count ? 'bg-indigo-500' : 'bg-slate-200'}`}
                  style={{ height: `${Math.max(4, (count / maxDaily) * 80)}px` }}
                />
                <span className="text-[10px] text-slate-600 uppercase">{dayLetter.format(toLocalDate(date))}</span>
              </div>
            ))}
          </div>
          <table className="sr-only">
            <caption>{m.dailyCaption}</caption>
            <tbody>
              {stats.daily.map(({ date, count }) => (
                <tr key={date}>
                  <th scope="row">{dayLong.format(toLocalDate(date))}</th>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title={m.onTimeOrLate} icon={<Timer className="h-4 w-4 text-indigo-600" aria-hidden="true" />}>
          {datedDone === 0 ? (
            <p className="text-xs text-slate-600">{m.noDatedDone}</p>
          ) : (
            <>
              <p className="font-mono text-3xl font-extrabold text-slate-900">
                {m.percent(Math.round((stats.onTimeRate ?? 0) * 100))}
                <span className="sr-only">{m.onTimeSr}</span>
              </p>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <div className="bg-emerald-600" style={{ width: `${(stats.onTime / datedDone) * 100}%` }} />
                <div className="bg-red-600" style={{ width: `${(stats.late / datedDone) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-600">{m.onTimeDetail(stats.onTime, stats.late)}</p>
            </>
          )}
        </Card>

        <Card title={m.velocity} icon={<Gauge className="h-4 w-4 text-indigo-600" aria-hidden="true" />}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label={m.tasksPerWeek} value={decimal.format(stats.weeklyVelocity)} />
            <Metric label={m.hoursPerWeek} value={decimal.format(stats.weeklyEstimatedHours)} />
          </div>
          <p className="text-xs text-slate-600">
            {stats.avgCycleDays === null
              ? m.velocityRange
              : m.cycle(decimal.format(stats.avgCycleDays), decimal.format(stats.avgCycleDays) === '1')}
          </p>
        </Card>

        <Card title={m.streakAndOpen} icon={<Flame className="h-4 w-4 text-indigo-600" aria-hidden="true" />}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label={m.streak} value={String(stats.streak)} hint={m.daysInARow(stats.streak)} />
            <Metric
              label={m.open}
              value={String(stats.open)}
              hint={m.openDetail(stats.overdue, stats.dueThisWeek, stats.blocked)}
            />
          </div>
        </Card>

        <Card title={m.byArea} icon={<ListChecks className="h-4 w-4 text-indigo-600" aria-hidden="true" />}>
          {stats.byArea.length === 0 ? (
            <p className="text-xs text-slate-600">{m.noAreas}</p>
          ) : (
            <ul className="space-y-2">
              {stats.byArea.map(({ area, count }) => (
                <li key={area} className="text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>{areaName(area)}</span>
                    <span className="font-mono font-semibold">{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(count / maxArea) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* METAS: las activas con su progreso (de las dos listas); se gestionan en «Metas» */}
        <Card
          title={m.goals}
          icon={<Target className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
          className="md:col-span-2 lg:col-span-3"
        >
          {activeGoals.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-600">{m.noGoals}</p>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                {m.createGoal} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.slice(0, 6).map((goal) => (
                  <li key={goal.id} className="space-y-1.5">
                    <p className="text-sm font-semibold wrap-anywhere text-slate-900">{goal.title}</p>
                    <p className="text-[11px] font-semibold text-indigo-700">{areaName(goal.area)}</p>
                    <GoalProgress goal={goal} tasks={tasks} />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                {activeGoals.length > 6 ? m.allGoals(activeGoals.length) : m.manageGoals}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </Card>

        {/* PROYECTOS: los activos con su avance y su plazo; se gestionan en «Proyectos» */}
        <Card
          title={m.projects}
          icon={<FolderKanban className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
          className="md:col-span-2 lg:col-span-3"
        >
          {activeProjects.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-600">{m.noProjects}</p>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                {m.goToProjects} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-600">
                {m.activeProjects(activeProjects.length)}
                {lateProjects > 0 && <span className="font-semibold text-red-700">{m.lateProjects(lateProjects)}</span>}
              </p>
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeProjects.slice(0, 6).map(({ project, deadline }) => (
                  <li key={project.id} className="space-y-1.5">
                    <p className="text-sm font-semibold wrap-anywhere text-slate-900">{project.title}</p>
                    <p className="text-[11px] text-slate-600">
                      {m.endsOn(deadline === 'overdue', formatDay(project.endDate))}
                      {deadline === 'overdue' && <span className="font-semibold text-red-700">{m.overdue}</span>}
                      {deadline === 'soon' && <span className="font-semibold text-violet-700">{m.endsSoon}</span>}
                      {deadline === 'ready' && <span className="font-semibold text-emerald-700">{m.allDone}</span>}
                    </p>
                    <ProjectProgress project={project} tasks={tasks} compact />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                {activeProjects.length > 6 ? m.allProjects(activeProjects.length) : m.viewProjects}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </Card>

        <Card
          title={m.recommendations}
          icon={<Lightbulb className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
          className="md:col-span-2 lg:col-span-3"
        >
          {recommendations.length === 0 ? (
            <p className="text-xs text-slate-600">{m.upToDate}</p>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((rec) => (
                <li
                  key={rec.id}
                  className="flex flex-col justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:flex-row sm:items-center"
                >
                  <p className="text-sm text-slate-800">{rec.text}</p>
                  {rec.action && (
                    <button
                      type="button"
                      onClick={() => onNavigate(rec.action!.tab)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      {rec.action.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
