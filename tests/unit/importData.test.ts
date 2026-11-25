import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeAreas, parseAccountExport, planImport } from '../../src/services/importData.ts';
import { DEFAULT_AREAS } from '../../src/services/wheel.ts';
import type { UserCollection } from '../../src/services/repository.ts';

const createdAt = '2026-10-01T09:00:00.000Z';
const task = { id: 'task-1', userId: 'other', title: 'Llamar al taller', listContext: 'WORK', createdAt };
const goal = { id: 'goal-1', userId: 'other', title: 'Correr una media', area: 'Salud', status: 'ACTIVE', createdAt };
const project = { id: 'project-1', title: 'Plan de 12 semanas', goalId: 'goal-1', endDate: '2026-12-20', createdAt };
const log = { id: 'wheel-1', timestamp: createdAt, scores: { Salud: 7, Ocio: 4 } };

const file = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    app: 'CLAR',
    version: '0.9.5',
    type: 'account',
    exportedAt: '2026-10-16T08:00:00.000Z',
    account: { name: 'Ana', email: 'ana@example.com' },
    tasks: [task],
    goals: [goal],
    projects: [project],
    wheelLogs: [log],
    meetings: [],
    emails: [],
    ...extra
  });

const none = (): Record<UserCollection, Set<string>> => ({
  tasks: new Set(),
  goals: new Set(),
  projects: new Set(),
  wheelLogs: new Set(),
  meetings: new Set(),
  emails: new Set(),
  taskDrafts: new Set()
});

test('reads a full download and keeps only known fields, without the source account', () => {
  const parsed = parseAccountExport(file({ tasks: [{ ...task, injected: '<script>', priority: 'HIGH' }] }));
  assert.equal(parsed.exportedAt, '2026-10-16T08:00:00.000Z');
  const [read] = parsed.data.tasks;
  assert.equal(read.title, 'Llamar al taller');
  assert.equal(read.priority, 'HIGH');
  assert.equal(read.status, 'PENDING');
  assert.equal(read.description, '');
  assert.deepEqual(read.observations, []);
  assert.equal('injected' in read, false);
  assert.equal('userId' in read, false);
  assert.equal(parsed.data.goals[0].area, 'Salud');
  assert.equal(parsed.data.projects[0].status, 'ACTIVE');
  assert.deepEqual(parsed.data.wheelLogs[0].scores, { Salud: 7, Ocio: 4 });
});

test('keeps when an alarm was set, but not a date in the future', () => {
  const withAlarm = { ...task, dueDate: '2026-10-20', alarmTime: '09:00' };
  const past = parseAccountExport(file({ tasks: [{ ...withAlarm, alarmSetAt: '2026-10-19T10:00:00.000Z' }] }));
  assert.equal(past.data.tasks[0].alarmSetAt, '2026-10-19T10:00:00.000Z');
  const future = parseAccountExport(file({ tasks: [{ ...withAlarm, alarmSetAt: '2999-01-01T00:00:00.000Z' }] }));
  assert.equal(future.data.tasks[0].alarmSetAt, undefined);
});

test('accepts downloads from before 0.9.5, which have no type, and old tasks with `completed`', () => {
  const old = JSON.parse(file()) as Record<string, unknown>;
  delete old.app;
  delete old.version;
  delete old.type;
  old.tasks = [{ ...task, completed: true }];
  const parsed = parseAccountExport(JSON.stringify(old));
  assert.equal(parsed.data.tasks[0].status, 'DONE');
});

test('counts invalid records and repeated ids, and drops invalid optional fields', () => {
  const parsed = parseAccountExport(
    file({
      tasks: [
        task,
        { ...task }, // id repetido
        { ...task, id: 'task-2', title: '   ' },
        { ...task, id: 'a/b' },
        { ...task, id: '__reserved__' },
        { ...task, id: 'task-5', createdAt: '2024' },
        { ...task, id: 'task-3', listContext: 'OTHER' },
        { ...task, id: 'task-4', dueDate: '31/12/2026', dueTime: '24:00', estimateMinutes: -5, goalId: '../x' },
        'not a task'
      ],
      goals: [goal, { ...goal, id: 'goal-2', area: 'Inventada' }],
      wheelLogs: [log, { ...log, id: 'wheel-2', scores: { Salud: 11 } }]
    })
  );
  assert.equal(parsed.data.tasks.length, 2);
  assert.equal(parsed.invalid.tasks, 7);
  const loose = parsed.data.tasks[1];
  assert.equal(loose.id, 'task-4');
  assert.equal(loose.dueDate, undefined);
  assert.equal(loose.dueTime, undefined);
  assert.equal(loose.estimateMinutes, undefined);
  assert.equal(loose.goalId, undefined);
  assert.equal(parsed.invalid.goals, 1);
  assert.equal(parsed.invalid.wheelLogs, 1);
});

test('keeps a repetition from completion on days and weeks, and drops any other mode', () => {
  const repeating = (recurrence: Record<string, unknown>) =>
    parseAccountExport(file({ tasks: [{ ...task, dueDate: '2026-10-20', recurrence }] })).data.tasks[0].recurrence;
  assert.equal(repeating({ frequency: 'DAILY', interval: 3, from: 'COMPLETION' })?.from, 'COMPLETION');
  // Contando desde que se hace no hay días de la semana
  const weekly = repeating({ frequency: 'WEEKLY', interval: 2, from: 'COMPLETION', weekdays: [1, 3] });
  assert.equal(weekly?.from, 'COMPLETION');
  assert.equal(weekly?.weekdays, undefined);
  // Otros valores, o en meses y años: fechas fijas (sin `from`), y la tarea se importa igual
  for (const from of ['SCHEDULE', 'completion', 1, true, null]) {
    assert.equal(repeating({ frequency: 'DAILY', interval: 3, from })?.from, undefined);
  }
  assert.equal(repeating({ frequency: 'MONTHLY', interval: 1, from: 'COMPLETION', monthDay: 20 })?.from, undefined);
  assert.deepEqual(repeating({ frequency: 'WEEKLY', interval: 1, from: 'X', weekdays: [1] })?.weekdays, [1]);
  // Cada N: de 1 a 999 (el formulario deja hasta 99, pero un archivo que antes valía sigue valiendo)
  assert.equal(repeating({ frequency: 'DAILY', interval: 150 })?.interval, 150);
  assert.equal(repeating({ frequency: 'DAILY', interval: 1000 })?.interval, 1);
  assert.equal(repeating({ frequency: 'DAILY', interval: 0 })?.interval, 1);
  // Fechas que la serie salta: solo días válidos, sin repetir y en orden; contando desde que se hace, ninguna
  assert.deepEqual(
    repeating({ frequency: 'DAILY', interval: 1, skip: ['2026-10-25', 'x', '2026-10-22', '2026-10-25'] })?.skip,
    ['2026-10-22', '2026-10-25']
  );
  assert.equal(repeating({ frequency: 'DAILY', interval: 1, skip: [] })?.skip, undefined);
  assert.equal(
    repeating({ frequency: 'DAILY', interval: 1, from: 'COMPLETION', skip: ['2026-10-22'] })?.skip,
    undefined
  );
});

test('rejects files that are not the account download, with a reason', () => {
  assert.throws(() => parseAccountExport('{nope'), /no es un JSON válido/);
  assert.throws(() => parseAccountExport('[]'), /no es una descarga de CLAR/);
  assert.throws(() => parseAccountExport(JSON.stringify({ app: 'Otra', tasks: [] })), /no es una descarga de CLAR/);
  assert.throws(
    () => parseAccountExport(JSON.stringify({ app: 'CLAR', type: 'task', task })),
    /una sola tarea, meta o proyecto/
  );
  assert.throws(() => parseAccountExport(JSON.stringify({ hello: 'world' })), /Descargar mis datos/);
});

test('plans only what the account does not have yet', () => {
  const existing = none();
  existing.tasks.add('task-1');
  existing.wheelLogs.add('wheel-1');
  const plan = planImport(parseAccountExport(file()), existing, DEFAULT_AREAS);
  assert.deepEqual(plan.counts.tasks, { new: 0, existing: 1, invalid: 0 });
  assert.deepEqual(plan.counts.goals, { new: 1, existing: 0, invalid: 0 });
  assert.deepEqual(plan.counts.wheelLogs, { new: 0, existing: 1, invalid: 0 });
  assert.equal(plan.total, 2);
  assert.deepEqual(
    plan.data.goals.map((g) => g.id),
    ['goal-1']
  );
  assert.equal(plan.areas, null);
});

test('adds the missing areas, renaming a repeated name and hiding those past the visible limit', () => {
  const current = [...DEFAULT_AREAS, { id: 'area-a1', label: 'Aprendizaje' }];
  const incoming = [
    { id: 'Salud', label: 'Cuerpo' }, // ya está: conserva su nombre
    { id: 'area-b2', label: 'aprendizaje' }, // otro id con el mismo nombre
    { id: 'area-c3', label: 'Viajes', hidden: true },
    ...['d', 'e', 'f', 'g', 'h'].map((k) => ({ id: `area-${k}`, label: `Área ${k}` }))
  ];
  const { merged, added } = mergeAreas(current, incoming);
  assert.equal(merged.find((a) => a.id === 'Salud')?.label, 'Salud');
  assert.equal(merged.find((a) => a.id === 'area-b2')?.label, 'aprendizaje (2)');
  assert.equal(merged.find((a) => a.id === 'area-c3')?.hidden, true);
  // 8 a la vista + 4 nuevas = 12; la última nueva entra oculta
  assert.equal(merged.filter((a) => !a.hidden).length, 12);
  assert.equal(added.at(-1)?.hidden, true);
  assert.equal(added.length, 7);
});

test('a plan includes the areas from the file that the account lacks', () => {
  const plan = planImport(
    parseAccountExport(file({ wheelAreas: [...DEFAULT_AREAS, { id: 'area-x1', label: 'Viajes' }] })),
    none(),
    DEFAULT_AREAS
  );
  assert.deepEqual(plan.addedAreas, [{ id: 'area-x1', label: 'Viajes' }]);
  assert.equal(plan.areas?.length, 8);
});

test('a text too long makes the whole record not valid, so nothing is lost without a warning', () => {
  const longDescription = 'x'.repeat(100_001);
  const longNote = { id: 'obs-1', type: 'note', text: 'y'.repeat(20_001), createdAt };
  const fine = {
    ...task,
    id: 'task-ok',
    description: 'z'.repeat(7_600),
    observations: [{ ...longNote, text: 'n'.repeat(3_000) }]
  };
  const parsed = parseAccountExport(
    file({
      tasks: [
        fine,
        { ...task, id: 'task-long', description: longDescription },
        { ...task, id: 'task-note', observations: [longNote] }
      ]
    })
  );
  assert.equal(parsed.data.tasks.length, 1);
  assert.equal(parsed.data.tasks[0].description.length, 7_600);
  assert.equal(parsed.data.tasks[0].observations[0].text.length, 3_000);
  assert.equal(parsed.invalid.tasks, 2);
});

test('a project whose goal is neither in the account nor in the file is not valid', () => {
  const orphan = { ...project, id: 'project-2', goalId: 'goal-missing' };
  const plan = planImport(parseAccountExport(file({ projects: [project, orphan] })), none(), DEFAULT_AREAS);
  assert.deepEqual(plan.counts.projects, { new: 1, existing: 0, invalid: 1 });
  // Con su meta ya en la cuenta, sí vale
  const existing = none();
  existing.goals.add('goal-missing');
  assert.equal(
    planImport(parseAccountExport(file({ projects: [orphan] })), existing, DEFAULT_AREAS).counts.projects.new,
    1
  );
});

test('an account with the starting areas untouched gets the configuration of the file back', () => {
  const fromFile = DEFAULT_AREAS.map((a) =>
    a.id === 'Salud'
      ? { id: 'Salud', label: 'Salud y deporte' }
      : a.id === 'Espiritualidad'
        ? { ...a, hidden: true }
        : a
  );
  const plan = planImport(
    parseAccountExport(file({ wheelAreas: [...fromFile, { id: 'area-x1', label: 'Viajes' }] })),
    none(),
    DEFAULT_AREAS
  );
  assert.equal(plan.restoredAreas, true);
  assert.equal(plan.areas?.find((a) => a.id === 'Salud')?.label, 'Salud y deporte');
  assert.equal(plan.areas?.find((a) => a.id === 'Espiritualidad')?.hidden, true);
  assert.deepEqual(plan.addedAreas, [{ id: 'area-x1', label: 'Viajes' }]);
  // Una cuenta que ya cambió sus áreas las conserva y solo recibe las que faltan
  const customized = DEFAULT_AREAS.map((a) => (a.id === 'Ocio' ? { ...a, label: 'Tiempo libre' } : a));
  const merged = planImport(parseAccountExport(file({ wheelAreas: fromFile })), none(), customized);
  assert.equal(merged.restoredAreas, false);
  assert.equal(merged.areas, null);
});

test('long or invalid user text in goals, meetings, emails and evaluations makes the record not valid', () => {
  const meeting = {
    id: 'meet-1',
    title: 'Revisión',
    startTime: createdAt,
    endTime: createdAt,
    createdAt,
    agendaPoints: ['Uno']
  };
  const email = { id: 'email-1', subject: 'Hola', body: 'Cuerpo del correo', recipients: ['a@example.com'] };
  const parsed = parseAccountExport(
    file({
      goals: [goal, { ...goal, id: 'goal-why', why: 'w'.repeat(281) }],
      meetings: [
        meeting,
        { ...meeting, id: 'meet-2', agendaPoints: ['p'.repeat(5_001)] },
        { ...meeting, id: 'meet-3', agendaPoints: 'no es una lista' }
      ],
      emails: [
        email,
        { ...email, id: 'email-2', recipients: Array.from({ length: 1_001 }, (_, i) => `r${i}@example.com`) },
        { ...email, id: 'email-3', subject: 's'.repeat(5_001) }
      ],
      wheelLogs: [log, { ...log, id: 'wheel-2', scores: { Salud: 7, '../x': 3 } }],
      tasks: [task, { ...task, id: 'task-bad-note', observations: [{ id: 'obs-1', type: 'note', text: 'Sin fecha' }] }]
    })
  );
  assert.equal(parsed.data.goals.length, 1);
  assert.equal(parsed.invalid.goals, 1);
  assert.deepEqual(
    parsed.data.meetings.map((m) => m.id),
    ['meet-1']
  );
  assert.equal(parsed.invalid.meetings, 2);
  assert.deepEqual(
    parsed.data.emails.map((e) => e.id),
    ['email-1']
  );
  assert.equal(parsed.invalid.emails, 2);
  assert.equal(parsed.invalid.wheelLogs, 1);
  assert.equal(parsed.invalid.tasks, 1);
});

test('a download with task drafts imports everything else and leaves the drafts out', () => {
  const draft = { id: 'draft-1', userId: 'other', form: { title: 'Pedir cita' }, createdAt, updatedAt: createdAt };
  const parsed = parseAccountExport(file({ taskDrafts: [draft] }));
  assert.equal(parsed.data.tasks.length, 1);
  assert.equal('taskDrafts' in parsed.data && parsed.data.taskDrafts.length > 0, false);
  const plan = planImport(parsed, none(), DEFAULT_AREAS);
  assert.equal(plan.counts.tasks.new, 1);
  assert.equal('taskDrafts' in plan.counts, false);
});
