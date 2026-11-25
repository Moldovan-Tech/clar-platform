import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRecurrence,
  endSeriesBefore,
  nextOccurrence,
  nextRecurringTask,
  occurrenceTask,
  occurrenceTaskId,
  occurrencesBetween,
  upcomingOccurrences,
  sameRule,
  skipCurrent,
  skipOccurrence,
  withSkip
} from '../../src/services/recurrence.ts';
import { buildAgenda, daysFrom } from '../../src/services/agenda.ts';
import { buildCalendarEvent, buildIcs } from '../../src/services/calendar.ts';
import type { TaskItem } from '../../src/types';

// Fecha de "hoy" fija y anterior a todas las fechas de los tests
const past = new Date(2026, 0, 1);

// Cada lunes desde el lunes 7 dic 2026, a las 9:00, con una lista de comprobación marcada
const series: TaskItem = {
  id: 'task-serie',
  userId: 'uid',
  listContext: 'PERSONAL',
  title: 'Regar las plantas',
  description: '',
  priority: 'MEDIUM',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  observations: [
    { id: 'o1', type: 'checklist', text: 'Terraza', completed: true, createdAt: '2026-11-01T09:00:00.000Z' }
  ],
  isSomeday: false,
  status: 'PENDING',
  dueDate: '2026-12-07',
  dueTime: '09:00',
  dependsOn: 'task-otra',
  recurrence: buildRecurrence('WEEKLY', '2026-12-07')
};

describe('series that skip dates', () => {
  it('leave the skipped dates out of the projections and of the next repeat', () => {
    const skipped = skipOccurrence(series, '2026-12-14', past);
    assert.deepEqual(skipped.recurrence?.skip, ['2026-12-14']);
    assert.deepEqual(occurrencesBetween('2026-12-07', skipped.recurrence, '2026-12-08', '2026-12-28'), [
      '2026-12-21',
      '2026-12-28'
    ]);
    assert.equal(nextOccurrence('2026-12-07', skipped.recurrence, past), '2026-12-21');
    // Al hacer la actual, la siguiente salta el 14 y ya no arrastra esa fecha
    const next = nextRecurringTask(skipped, past)!;
    assert.equal(next.dueDate, '2026-12-21');
    assert.equal(next.recurrence?.skip, undefined);
  });

  it('keep the skipped dates sorted, unique and only after the current repeat and up to the end', () => {
    const rec = { ...series.recurrence!, until: '2026-12-28' };
    assert.deepEqual(
      withSkip(rec, ['2026-12-21', '2026-11-30', '2026-12-14', '2026-12-21', '2027-01-04'], '2026-12-07').skip,
      ['2026-12-14', '2026-12-21']
    );
    assert.equal('skip' in withSkip(rec, ['2026-11-30'], '2026-12-07'), false);
  });

  it('end the series the day before a repeat (that one and the following are deleted)', () => {
    const ended = endSeriesBefore(skipOccurrence(series, '2027-01-04', past), '2026-12-21', past);
    assert.equal(ended.recurrence?.until, '2026-12-20');
    assert.equal(ended.recurrence?.skip, undefined); // el 4 de enero ya queda fuera
    assert.deepEqual(occurrencesBetween('2026-12-07', ended.recurrence, '2026-12-08', '2027-01-31'), ['2026-12-14']);
  });

  it('turn a repeat into a separate task for that day: no repeat, no dependency, checklist reset', () => {
    const single = occurrenceTask(series, '2026-12-14', past);
    assert.equal(single.id, occurrenceTaskId(series.id, '2026-12-14'));
    assert.notEqual(single.id, occurrenceTaskId(series.id, '2026-12-21'));
    assert.equal(single.dueDate, '2026-12-14');
    assert.equal(single.dueTime, '09:00');
    assert.equal(single.recurrence, undefined);
    assert.equal(single.dependsOn, undefined);
    assert.equal(single.status, 'PENDING');
    assert.equal(single.observations[0].completed, false);
  });

  it('move the current repeat to the next date when only this one is deleted (null if it was the last)', () => {
    const moved = skipCurrent(skipOccurrence(series, '2026-12-14', past), past)!;
    assert.equal(moved.id, series.id);
    assert.equal(moved.dueDate, '2026-12-21');
    assert.equal(moved.status, 'PENDING');
    assert.equal(moved.recurrence?.skip, undefined);
    assert.equal(moved.observations[0].completed, false);
    const last = { ...series, recurrence: { ...series.recurrence!, until: '2026-12-10' } };
    assert.equal(skipCurrent(last, past), null);
  });

  it('keep the rule when only the end or the skipped dates change', () => {
    const rec = series.recurrence!;
    assert.equal(sameRule(rec, { ...rec, until: '2027-01-01', skip: ['2026-12-14'] }), true);
    assert.equal(sameRule(rec, { ...rec, interval: 2 }), false);
    assert.equal(sameRule(rec, buildRecurrence('WEEKLY', '2026-12-07', { weekdays: [1, 3] })), false);
  });

  it('show each repeat in the agenda except the skipped ones', () => {
    const skipped = skipOccurrence(series, '2026-12-14', past);
    const agenda = buildAgenda([skipped], daysFrom(new Date(2026, 11, 7), 21), past);
    const dates = [...agenda.entries()].filter(([, items]) => items.length).map(([date]) => date);
    assert.deepEqual(dates, ['2026-12-07', '2026-12-21']);
  });

  it('exclude the skipped dates from the .ics series, at the time of its start', () => {
    const skipped = skipOccurrence(series, '2026-12-14', past);
    const event = buildCalendarEvent(skipped, 'https://clar.life', 'Europe/Madrid')!;
    assert.deepEqual(event.exdates, ['2026-12-14']);
    const ics = buildIcs(event);
    const start = ics.match(/DTSTART;TZID=Europe\/Madrid:\d{8}T(\d{6})/)![1];
    assert.match(ics, new RegExp(`EXDATE;TZID=Europe/Madrid:20261214T${start}`));
    assert.doesNotMatch(buildIcs(buildCalendarEvent(series, 'https://clar.life', 'Europe/Madrid')!), /EXDATE/);
  });

  it('skip within monthly (day 31), weekly with several days and yearly series without drifting', () => {
    const monthly = withSkip(buildRecurrence('MONTHLY', '2027-01-31'), ['2027-02-28'], '2027-01-31');
    assert.deepEqual(occurrencesBetween('2027-01-31', monthly, '2027-02-01', '2027-05-31'), [
      '2027-03-31',
      '2027-04-30',
      '2027-05-31'
    ]);
    const monWed = withSkip(
      buildRecurrence('WEEKLY', '2026-12-07', { weekdays: [1, 3] }),
      ['2026-12-09'],
      '2026-12-07'
    );
    assert.equal(nextOccurrence('2026-12-07', monWed, past), '2026-12-14');
    assert.deepEqual(upcomingOccurrences('2026-12-07', monWed, 3), ['2026-12-07', '2026-12-14', '2026-12-16']);
    const yearly = withSkip(buildRecurrence('YEARLY', '2026-12-07'), ['2027-12-07'], '2026-12-07');
    assert.equal(nextOccurrence('2026-12-07', yearly, past), '2028-12-07');
  });

  it('end the series when the only date left is skipped, and keep a skip on the last day', () => {
    const rec = withSkip({ ...series.recurrence!, until: '2026-12-14' }, ['2026-12-14'], '2026-12-07');
    assert.deepEqual(rec.skip, ['2026-12-14']);
    assert.equal(nextOccurrence('2026-12-07', rec, past), null);
    assert.equal(skipCurrent({ ...series, recurrence: rec }, past), null);
    // El día siguiente a la actual: la serie se queda en ella
    assert.equal(endSeriesBefore(series, '2026-12-08', past).recurrence?.until, '2026-12-07');
  });

  it('have no skipped dates when counting from completion, and keep the rule regardless of the order of the days', () => {
    const fromDone = buildRecurrence('DAILY', '2026-12-07', { from: 'COMPLETION' });
    assert.equal('skip' in withSkip(fromDone, ['2026-12-09'], '2026-12-07'), false);
    const a = buildRecurrence('WEEKLY', '2026-12-07', { weekdays: [3, 1] });
    assert.equal(sameRule(a, { ...a, weekdays: [3, 1] }), true);
  });

  it('leave the current repeat pending when only this one is deleted, and the separate task keeps goal and alarm', () => {
    const inProgress: TaskItem = {
      ...series,
      status: 'IN_PROGRESS',
      goalId: 'g1',
      projectId: 'p1',
      alarmTime: '08:00'
    };
    const moved = skipCurrent(inProgress, past)!;
    assert.equal(moved.status, 'PENDING');
    const single = occurrenceTask(inProgress, '2026-12-14', past);
    assert.equal(single.goalId, 'g1');
    assert.equal(single.projectId, 'p1');
    assert.equal(single.alarmTime, '08:00');
    assert.equal(single.alarmSetAt, past.toISOString());
    // Saltar dos veces la misma fecha no la repite
    const twice = skipOccurrence(skipOccurrence(series, '2026-12-14', past), '2026-12-14', past);
    assert.deepEqual(twice.recurrence?.skip, ['2026-12-14']);
  });
});
