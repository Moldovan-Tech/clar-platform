import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CELEBRATION_MESSAGES, fillMessage, type CelebrationKind } from '../../src/services/celebrations';
import {
  completeTask,
  localDateFromToday,
  openSection,
  openTaskActions,
  patchDocument,
  signInWithGoogle,
  uidOf,
  uniqueEmail
} from './helpers';

// CELEBRACIONES (RF-NAV-15): un mensaje en el aviso y un confeti breve al hacer una tarea antigua, lograr una meta o
// terminar un proyecto en esta pestaña

const text = (value: string) => ({ stringValue: value });
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cualquiera de los mensajes de un tipo (con los días, en las tareas) y cualquiera de todos (los días, un número)
const celebrationOf = (kind: CelebrationKind, days?: number) =>
  new RegExp(CELEBRATION_MESSAGES[kind].map((message) => escape(fillMessage(message, days))).join('|'));
const anyCelebration = new RegExp(
  Object.values(CELEBRATION_MESSAGES)
    .flat()
    .map((message) => escape(message).replaceAll('\\{days\\}', '\\d+'))
    .join('|')
);

// El aviso (región viva de App.tsx) y las piezas del confeti
const notice = (page: Page) => page.locator('[role="status"][aria-live="polite"]');
const pieces = (page: Page) => page.locator('.celebration-piece');
const BURST = '[aria-hidden="true"]:has(> .celebration-piece)';

// Escribe en el emulador una tarea creada hace `days` días (y una hora más, para no caer justo en el límite). Llega a
// la app por su suscripción, como desde otro dispositivo
const seedTask = async (page: Page, uid: string, title: string, days: number, fields: Record<string, unknown> = {}) => {
  const id = `task-qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = await page.evaluate((d) => new Date(Date.now() - (d * 24 + 1) * 3_600_000).toISOString(), days);
  await patchDocument(`users/${uid}/tasks/${id}`, {
    id: text(id),
    userId: text(uid),
    listContext: text('WORK'),
    title: text(title),
    description: text(''),
    priority: text('MEDIUM'),
    status: text('PENDING'),
    isSomeday: { booleanValue: false },
    observations: { arrayValue: {} },
    createdAt: text(createdAt),
    updatedAt: text(createdAt),
    ...fields
  });
};

const signInToLists = async (page: Page) => {
  const email = uniqueEmail();
  await page.goto('/');
  await signInWithGoogle(page, email);
  await openSection(page, 'Listas');
  return uidOf(email);
};

test('doing a task that waited 14 days or more celebrates it once; «Deshacer» clears it', async ({ page }) => {
  const uid = await signInToLists(page);
  const title = `Renovar el pasaporte ${Date.now().toString(36)}`;
  await seedTask(page, uid, title, 23);
  // Llega por la suscripción, como desde otro dispositivo: eso no se celebra
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });
  await expect(pieces(page)).toHaveCount(0);

  // El aviso de siempre, con «Deshacer», y debajo el mensaje, que puede decir cuántos días llevaba
  await completeTask(page, title);
  const toast = notice(page);
  await expect(toast).toContainText('Tarea hecha y archivada. La encontrarás en «Archivadas».');
  await expect(toast).toContainText(celebrationOf('oldTask', 23));
  await expect(toast.getByRole('button', { name: 'Deshacer', exact: true })).toBeVisible();
  // El confeti solo decora: oculto a los lectores de pantalla y sin recibir el puntero
  await expect(pieces(page)).toHaveCount(16);
  await expect(page.locator(BURST)).toHaveCSS('pointer-events', 'none');

  // «Deshacer» quita la celebración
  await toast.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(toast).toContainText('Tarea recuperada.');
  await expect(toast).not.toContainText(anyCelebration);
  await expect(pieces(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // Hecha otra vez en la misma sesión: no se repite
  await completeTask(page, title);
  await expect(toast).toContainText('Tarea hecha y archivada. La encontrarás en «Archivadas».');
  await expect(toast).not.toContainText(anyCelebration);
  await expect(pieces(page)).toHaveCount(0);
});

test('cancelling, a recent task, a recurring one or «Hecha» from «Archivadas» celebrate nothing', async ({ page }) => {
  const uid = await signInToLists(page);
  const stamp = Date.now().toString(36);
  const cancelled = `Darse de baja del gimnasio ${stamp}`;
  const recent = `Llamar al banco ${stamp}`;
  const repeating = `Regar las plantas ${stamp}`;
  const archived = `Devolver el libro a la biblioteca ${stamp}`;
  await seedTask(page, uid, cancelled, 30);
  // 13 días y una hora: aún no es antigua
  await seedTask(page, uid, recent, 13);
  await seedTask(page, uid, repeating, 40, {
    dueDate: text(localDateFromToday(0)),
    recurrence: { mapValue: { fields: { frequency: text('DAILY'), interval: { integerValue: '1' } } } }
  });
  const doneAt = await page.evaluate(() => new Date(Date.now() - 3_600_000).toISOString());
  await seedTask(page, uid, archived, 30, { status: text('CANCELLED'), doneAt: text(doneAt) });
  for (const title of [cancelled, recent, repeating])
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });
  const toast = notice(page);

  await openTaskActions(page, cancelled);
  await page.getByLabel(`Estado de «${cancelled}»`).selectOption('CANCELLED');
  await expect(toast).toContainText('Tarea cancelada y archivada.');
  await expect(toast).not.toContainText(anyCelebration);
  await expect(pieces(page)).toHaveCount(0);

  await completeTask(page, recent);
  await expect(toast).toContainText('Tarea hecha y archivada. La encontrarás en «Archivadas».');
  await expect(toast).not.toContainText(anyCelebration);

  // Cada repetición se renueva: su antigüedad no cuenta
  await completeTask(page, repeating);
  await expect(toast).toContainText('Tarea hecha y archivada. Siguiente repetición:');
  await expect(toast).not.toContainText(anyCelebration);

  // De Cancelada a Hecha en «Archivadas» no se celebra: no venía de un estado abierto
  await page.getByRole('button', { name: /Archivadas/ }).click();
  const archive = page.getByRole('dialog', { name: 'Tareas archivadas' });
  await archive.getByLabel(`Estado de «${archived}»`).selectOption('DONE');
  await expect(archive.getByLabel(`Estado de «${archived}»`)).toHaveValue('DONE');
  await expect(toast).toContainText('La encontrarás en «Archivadas».');
  await expect(toast).not.toContainText(anyCelebration);
  await expect(pieces(page)).toHaveCount(0);
});

test('finishing a project and achieving a goal celebrate them, once per session', async ({ page }) => {
  test.slow(); // Pasa por metas y proyectos
  await page.goto('/');
  await signInWithGoogle(page);
  const stamp = Date.now().toString(36);
  const goalTitle = `Tener la casa a punto ${stamp}`;
  const projectTitle = `Pintar el salón ${stamp}`;
  const toast = notice(page);

  await openSection(page, 'Metas');
  await page.getByRole('button', { name: 'Nueva meta en Familia' }).click();
  const goalEditor = page.getByRole('dialog', { name: 'Nueva meta' });
  await goalEditor.getByLabel(/^Meta/).fill(goalTitle);
  await goalEditor.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(goalEditor).toBeHidden();

  // Proyecto terminado: «Proyecto terminado.» y su mensaje
  await openSection(page, 'Proyectos');
  await page.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const projectEditor = page.getByRole('dialog', { name: 'Nuevo proyecto' });
  await projectEditor.getByLabel(/^Proyecto/).fill(projectTitle);
  await projectEditor.getByLabel(/^Meta/).selectOption({ label: goalTitle });
  await projectEditor.getByLabel('Fecha de fin', { exact: true }).fill(localDateFromToday(30));
  await projectEditor.getByRole('button', { name: 'Crear el proyecto' }).click();
  await expect(projectEditor).toBeHidden();
  await page.getByRole('button', { name: 'Marcar como terminado', exact: true }).click();
  await expect(toast).toContainText('Proyecto terminado.');
  await expect(toast).toContainText(celebrationOf('project'));
  await expect(pieces(page)).toHaveCount(16);

  // Reactivarlo no se celebra, y terminarlo otra vez en la misma sesión tampoco
  await page.getByRole('button', { name: 'Reactivar', exact: true }).click();
  await expect(toast).toContainText('Proyecto reactivado.');
  await expect(toast).not.toContainText(anyCelebration);
  await page.getByRole('button', { name: 'Marcar como terminado', exact: true }).click();
  await expect(toast).toContainText('Proyecto terminado.');
  await expect(toast).not.toContainText(anyCelebration);
  await expect(pieces(page)).toHaveCount(0);

  // Meta lograda: «¡Meta lograda!» y su mensaje
  await openSection(page, 'Metas');
  await page.getByRole('button', { name: `Marcar «${goalTitle}» como lograda` }).click();
  await expect(toast).toContainText('¡Meta lograda!');
  await expect(toast).toContainText(celebrationOf('goal'));
  await expect(pieces(page)).toHaveCount(16);

  // Reactivarla no se celebra
  await page.getByRole('button', { name: 'Logradas y archivadas (1)' }).click();
  await page.getByRole('button', { name: `Reactivar «${goalTitle}»` }).click();
  await expect(toast).toContainText('Meta reactivada.');
  await expect(toast).not.toContainText(anyCelebration);
});

test('with «Celebraciones» off in Accesibilidad, this device celebrates nothing', async ({ page }) => {
  const uid = await signInToLists(page);
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  await page.getByRole('button', { name: /^Accesibilidad/ }).click();
  const panel = page.getByRole('dialog', { name: 'Accesibilidad' });
  const celebrations = panel.getByRole('switch', { name: 'Celebraciones' });
  // Activadas por defecto
  await expect(celebrations).toHaveAttribute('aria-checked', 'true');
  await celebrations.click();
  await expect(celebrations).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  const title = `Revisar el contrato del alquiler ${Date.now().toString(36)}`;
  await seedTask(page, uid, title, 30);
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });
  await completeTask(page, title);
  const toast = notice(page);
  await expect(toast).toContainText('Tarea hecha y archivada. La encontrarás en «Archivadas».');
  await expect(toast).not.toContainText(anyCelebration);
  await expect(pieces(page)).toHaveCount(0);

  // Se guarda en el dispositivo: sigue apagada al recargar, y «Restablecer» la vuelve a encender
  await page.reload();
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  await page.getByRole('button', { name: /^Accesibilidad/ }).click();
  await expect(celebrations).toHaveAttribute('aria-checked', 'false');
  await panel.getByRole('button', { name: 'Restablecer' }).click();
  await expect(celebrations).toHaveAttribute('aria-checked', 'true');
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the message still shows, the confetti stays invisible, and the notice passes axe', async ({ page }) => {
    const uid = await signInToLists(page);
    const title = `Pedir cita con el dentista ${Date.now().toString(36)}`;
    await seedTask(page, uid, title, 30);
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });
    await completeTask(page, title);
    const toast = notice(page);
    await expect(toast).toContainText(celebrationOf('oldTask', 30));

    // Sin movimiento, la animación acaba al momento y las piezas no llegan a verse
    await expect(pieces(page)).toHaveCount(16);
    await expect
      .poll(() => pieces(page).evaluateAll((all) => all.map((piece) => getComputedStyle(piece).opacity)))
      .toEqual(Array<string>(16).fill('0'));

    // Auditoría WCAG 2.1 A y AA del aviso con la celebración y del confeti (como en a11y.spec.ts)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('[role="status"][aria-live="polite"]')
      .include(BURST)
      .analyze();
    expect(violations.map((v) => `${v.id} (${v.impact}): ${v.help}`)).toEqual([]);
  });
});
