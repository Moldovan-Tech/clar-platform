import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRIMARY_TABS, sectionLabel, sectionsFor } from '../../src/navigation';

const access = sectionsFor(true).find((s) => s.tab === 'access')!;

test('the access section says how many requests are pending, in singular or plural', () => {
  assert.equal(sectionLabel(access, 0), 'Administración');
  assert.equal(sectionLabel(access, 1), 'Administración, 1 pendiente');
  assert.equal(sectionLabel(access, 3), 'Administración, 3 pendientes');
});

test('only the admin gets the access section, before the help', () => {
  assert.equal(
    sectionsFor(false).some((s) => s.tab === 'access'),
    false
  );
  assert.deepEqual(
    sectionsFor(true)
      .slice(-2)
      .map((s) => s.tab),
    ['access', 'help']
  );
});

test('every short name on the phone bar is contained in the full accessible name', () => {
  for (const section of sectionsFor(true).filter((s) => PRIMARY_TABS.includes(s.tab))) {
    assert.ok(section.label.includes(section.short), section.label);
  }
});

// «Tiempo protegido» se retiró en la 1.3.0: sus recomendaciones están en la Ayuda
test('the sections are the eight that remain, without «Tiempo protegido»', () => {
  assert.deepEqual(
    sectionsFor(true).map((s) => s.label),
    ['Inicio', 'Listas', 'Agenda', 'Rueda de la Vida', 'Metas', 'Proyectos', 'Administración', 'Ayuda']
  );
  assert.ok(sectionsFor(true).every((s) => !/tiempo/i.test(`${s.label} ${s.short}`)));
});
