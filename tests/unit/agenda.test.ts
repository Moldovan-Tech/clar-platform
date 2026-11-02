import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAgenda, daysFrom, overdueTasks, startOfWeek } from '../../src/services/agenda.ts';
import type { TaskItem } from '../../src/types';

const now = new Date(2026, 9, 14, 12, 0); // miércoles 14 oct 2026
const week = daysFrom(startOfWeek(now), 7); // lunes 12 → domingo 18

const task = (id: string, overrides: Partial<TaskItem> = {}): TaskItem => ({
  id,
  userId: 'uid',
  listContext: 'WORK',
  title: `Tarea ${id}`,
  description: '',
  priority: 'MEDIUM',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  observations: [],
  isSomeday: false,
  status: 'PENDING',
  ...overrides
});

const items = (agenda: Map<string, { key: string }[]>, date: string) => agenda.get(date)!.map((i) => i.key);

describe('startOfWeek and daysFrom', () => {
  it('starts weeks on Monday', () => {
    assert.deepEqual(week, [
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18'
    ]);
    assert.equal(daysFrom(startOfWeek(new Date(2026, 9, 18)), 1)[0], '2026-10-12'); // domingo → lunes anterior
  });
});

describe('buildAgenda', () => {
  it('places deadlines on their day, untimed first and then by time', () => {
    const agenda = buildAgenda(
      [
        task('late', { dueDate: '2026-10-15', dueTime: '18:00' }),
        task('allday', { dueDate: '2026-10-15' }),
        task('early', { dueDate: '2026-10-15', dueTime: '09:30' }),
        task('done', { dueDate: '2026-10-15', status: 'DONE' }),
        task('undated'),
        task('next-week', { dueDate: '2026-10-20' })
      ],
      week,
      now
    );
    assert.deepEqual(items(agenda, '2026-10-15'), ['allday', 'early', 'late']);
    assert.equal([...agenda.values()].flat().length, 3);
  });

  it('spreads intervals over their days with start, ongoing and due labels', () => {
    const agenda = buildAgenda(
      [task('trip', { startDate: '2026-10-11', dueDate: '2026-10-13', startTime: '08:00' })],
      week,
      now
    );
    const labels = week.map((d) =>
      agenda
        .get(d)!
        .map((i) => (i as { label: string }).label)
        .join()
    );
    // Empezó el domingo 11 (fuera de la semana): lunes en curso, martes vence
    assert.deepEqual(labels.slice(0, 3), ['En curso', 'Vence', '']);
  });

  it('projects upcoming occurrences of recurring tasks', () => {
    const daily = task('standup', {
      dueDate: '2026-10-14',
      dueTime: '09:00',
      recurrence: { frequency: 'WEEKLY', interval: 1, weekdays: [1, 3, 5] }
    });
    const agenda = buildAgenda([daily], week, now);
    assert.deepEqual(items(agenda, '2026-10-14'), ['standup']);
    assert.deepEqual(items(agenda, '2026-10-16'), ['standup:next:2026-10-16']);
    assert.deepEqual(items(agenda, '2026-10-12'), []); // antes de la fecha actual no se proyecta
    assert.equal((agenda.get('2026-10-16')![0] as { label: string }).label, 'Repetición prevista');
  });

  it('shows a repeated task only on its days, even with an old start date (no «in progress» days)', () => {
    const repeated = task('mail', {
      startDate: '2026-10-12',
      dueDate: '2026-10-14',
      recurrence: { frequency: 'WEEKLY', interval: 1, weekdays: [1, 3, 5] }
    });
    const agenda = buildAgenda([repeated], week, now);
    assert.deepEqual(
      week.map((d) => items(agenda, d).length),
      [0, 0, 1, 0, 1, 0, 0]
    );
  });

  it('projects only from the last task of a series, not from a reactivated earlier one', () => {
    const rule = { frequency: 'WEEKLY' as const, interval: 1, weekdays: [1] };
    const reactivated = task('week-1', { dueDate: '2026-10-05', recurrence: rule, nextOccurrenceId: 'week-2' });
    const tail = task('week-2', { dueDate: '2026-10-12', recurrence: rule });
    const nextWeek = daysFrom(new Date(2026, 9, 19), 7);
    const agenda = buildAgenda([reactivated, tail], nextWeek, now);
    assert.deepEqual(items(agenda, '2026-10-19'), ['week-2:next:2026-10-19']);
  });

  it('shows only the current one of a task repeated from completion: the next ones depend on when it is done', () => {
    const plants = task('plants', {
      dueDate: '2026-10-13',
      recurrence: { frequency: 'DAILY', interval: 2, from: 'COMPLETION' }
    });
    const agenda = buildAgenda([plants], week, now);
    assert.deepEqual(
      week.map((d) => items(agenda, d)),
      [[], ['plants'], [], [], [], [], []]
    );
  });

  it('shows the visible part of intervals of any length', () => {
    // Más de 400 días: el día de vencimiento sigue apareciendo
    const long = task('mortgage', { startDate: '2025-01-01', dueDate: '2026-10-16' });
    const agenda = buildAgenda([long], week, now);
    assert.deepEqual(items(agenda, '2026-10-12'), ['mortgage:2026-10-12']);
    assert.equal((agenda.get('2026-10-16')![0] as { label: string }).label, 'Vence');
    assert.deepEqual(items(agenda, '2026-10-17'), []);
  });

  it('projects repetitions however far the visible range is from the original date', () => {
    // Tarea diaria vencida hace casi un año: sus repeticiones siguen apareciendo en la semana actual
    const daily = task('water', { dueDate: '2025-11-01', recurrence: { frequency: 'DAILY', interval: 1 } });
    const agenda = buildAgenda([daily], week, now);
    assert.deepEqual(
      week.map((d) => items(agenda, d).length),
      [1, 1, 1, 1, 1, 1, 1]
    );
    // Y también varios años hacia delante
    const future = daysFrom(new Date(2029, 0, 1), 3);
    assert.deepEqual(items(buildAgenda([daily], future, now), '2029-01-02'), ['water:next:2029-01-02']);
  });
});

describe('overdueTasks', () => {
  it('lists active overdue tasks, oldest first', () => {
    const list = overdueTasks(
      [
        task('b', { dueDate: '2026-10-10' }),
        task('a', { dueDate: '2026-10-01' }),
        task('c', { dueDate: '2026-10-20' }),
        task('d', { dueDate: '2026-10-02', status: 'DONE' }),
        task('e', { dueDate: '2026-10-03', status: 'CANCELLED' })
      ],
      now
    );
    assert.deepEqual(
      list.map((t) => t.id),
      ['a', 'b']
    );
  });
});
