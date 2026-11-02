// Secciones y recorrido guiado en inglés
(globalThis as { __CLAR_LOCALE__?: string }).__CLAR_LOCALE__ = 'en';

import assert from 'node:assert/strict';
import { test } from 'node:test';

const { PRIMARY_TABS, sectionLabel, sectionsFor } = await import('../../src/navigation');
const { TOUR_STEPS } = await import('../../src/tourSteps');

test('sections have English names, and the phone short name is part of the full one', () => {
  assert.deepEqual(
    sectionsFor(true).map((s) => [s.label, s.short]),
    [
      ['Home', 'Home'],
      ['Lists', 'Lists'],
      ['Agenda', 'Agenda'],
      ['Wheel of Life', 'Wheel'],
      ['Goals', 'Goals'],
      ['Projects', 'Projects'],
      ['Admin', 'Admin'],
      ['Help', 'Help']
    ]
  );
  for (const section of sectionsFor(true).filter((s) => PRIMARY_TABS.includes(s.tab))) {
    assert.ok(section.label.includes(section.short), section.label);
  }
});

// «Tiempo protegido» se retiró en la 1.3.0: sus recomendaciones están en la Ayuda
test('there is no “Protected time” section any more', () => {
  for (const section of sectionsFor(true)) assert.doesNotMatch(`${section.label} ${section.short}`, /protected|time/i);
});

test('the admin section says how many items are pending', () => {
  const access = sectionsFor(true).find((s) => s.tab === 'access')!;
  assert.equal(sectionLabel(access, 0), 'Admin');
  assert.equal(sectionLabel(access, 1), 'Admin, 1 pending');
  assert.equal(sectionLabel(access, 3), 'Admin, 3 pending');
});

test('the guided tour keeps its steps and targets, with English texts', () => {
  assert.deepEqual(
    TOUR_STEPS.map((s) => s.id),
    ['new-task', 'lists', 'top10', 'filters', 'agenda', 'wheel', 'goals', 'projects', 'home', 'help']
  );
  assert.equal(TOUR_STEPS[0].target, '[data-tour="new-task"]');
  assert.equal(TOUR_STEPS[0].title, 'Capture a task');
  assert.equal(TOUR_STEPS[5].title, 'Wheel of Life');
  for (const step of TOUR_STEPS) assert.doesNotMatch(`${step.title} ${step.body}`, /[áéíóúñ«»]/);
});
