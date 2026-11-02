// Validación de metas y proyectos, estados y perfiles locales en inglés
(globalThis as { __CLAR_LOCALE__?: string }).__CLAR_LOCALE__ = 'en';

import assert from 'node:assert/strict';
import { test } from 'node:test';

const { validateGoal, sortGoals } = await import('../../src/services/goals.ts');
const { PROJECT_STATUS_LABEL, validateProject } = await import('../../src/services/projects.ts');
const { ORPHAN_PROFILE_ID, getLocalProfiles } = await import('../../src/services/localData.ts');

test('goal validation speaks English', () => {
  assert.equal(validateGoal({ title: ' ', area: 'Salud' }), 'Give the goal a name.');
  assert.equal(validateGoal({ title: 'x'.repeat(101), area: 'Salud' }), 'The name can be up to 100 characters.');
  assert.equal(validateGoal({ title: 'Run' }), 'Choose the Wheel area it belongs to.');
  assert.equal(
    validateGoal({ title: 'Run', area: 'Salud', why: 'x'.repeat(281) }),
    'The “why” can be up to 280 characters.'
  );
  assert.equal(validateGoal({ title: 'Run', area: 'Salud', targetDate: '2026-13' }), 'The target date isn’t valid.');
  assert.equal(validateGoal({ title: 'Run', area: 'Salud' }), null);
});

test('goals with the same date sort alphabetically in English', () => {
  const goal = (id: string, title: string) => ({
    id,
    userId: 'u',
    title,
    area: 'Salud',
    status: 'ACTIVE' as const,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z'
  });
  assert.deepEqual(
    sortGoals([goal('b', 'banana'), goal('a', 'Apple')]).map((g) => g.id),
    ['a', 'b']
  );
});

test('project statuses and validation speak English', () => {
  assert.deepEqual(PROJECT_STATUS_LABEL, { ACTIVE: 'Active', FINISHED: 'Finished', ARCHIVED: 'Archived' });
  assert.equal(validateProject({ title: '' }), 'Enter the project name.');
  assert.equal(validateProject({ title: 'x'.repeat(101) }), 'The name can’t be longer than 100 characters.');
  assert.equal(validateProject({ title: 'Kitchen' }), 'Choose the goal it belongs to.');
  assert.equal(validateProject({ title: 'Kitchen', goalId: 'g1' }), 'Choose the end date.');
  assert.equal(
    validateProject({ title: 'Kitchen', goalId: 'g1', endDate: '2026-12-01', description: 'x'.repeat(281) }),
    'The description can’t be longer than 280 characters.'
  );
});

test('local profiles without a name get English names', () => {
  const items = new Map<string, string>([
    [
      'neuro_tasks_v1',
      JSON.stringify([
        { id: 't1', userId: 'user-1' },
        { id: 't2', userId: 'gone' }
      ])
    ]
  ]);
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: () => {},
    removeItem: () => {}
  } as unknown as Storage;
  assert.deepEqual(
    getLocalProfiles(storage).map((p) => [p.id, p.name]),
    [
      [ORPHAN_PROFILE_ID, 'Data created in the demo profiles'],
      ['gone', 'Unnamed profile']
    ]
  );
});
