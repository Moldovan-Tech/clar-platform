import { expect, test, type Page } from '@playwright/test';
import { completeTask, fillAndSaveTask, openSection, signInWithGoogle } from './helpers';

const AREAS = ['Salud', 'Carrera Profesional', 'Finanzas', 'Familia', 'Ocio', 'Relaciones', 'Espiritualidad'];

// Guarda una evaluación de la Rueda: 8 en todas las áreas salvo las indicadas
const evaluateWheel = async (page: Page, scores: Record<string, number>) => {
  await openSection(page, 'Rueda de la Vida');
  for (const area of AREAS)
    await page.getByRole('slider', { name: `Puntuación de ${area}` }).fill(String(scores[area] ?? 8));
  await page.getByRole('button', { name: 'Guardar la evaluación' }).click();
};

const areaHeadings = (page: Page) => page.getByRole('main').getByRole('heading', { level: 3 });

test('Metas orders the areas by score, flags weak ones without goals, and a task is added to a goal', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  const goalTitle = `Ahorrar para la entrada del piso ${Date.now().toString(36)}`;

  // Sin evaluación: se invita a hacerla y las áreas siguen el orden de la Rueda
  await openSection(page, 'Metas');
  await expect(page.getByRole('heading', { name: 'Metas', level: 2 })).toBeVisible();
  await expect(page.getByText('Evalúa tu Rueda de la Vida para ver qué áreas necesitan más atención.')).toBeVisible();
  await expect(areaHeadings(page)).toHaveText(AREAS);

  // Con evaluación: de la puntuación más baja a la más alta, y las de 5 o menos sin metas, aparte
  await evaluateWheel(page, { Finanzas: 3, Ocio: 5, Relaciones: 6 });
  await page.getByRole('button', { name: 'Ir a Metas' }).click();
  await expect(areaHeadings(page)).toHaveText([
    'Necesitan atención',
    'Finanzas 3/10',
    'Ocio 5/10',
    'Relaciones 6/10',
    'Salud 8/10',
    'Carrera Profesional 8/10',
    'Familia 8/10',
    'Espiritualidad 8/10'
  ]);
  const attention = page.getByRole('region', { name: 'Necesitan atención' });
  await expect(attention.getByRole('button')).toHaveText([
    'Ponle una meta a Finanzas (3/10)',
    'Ponle una meta a Ocio (5/10)'
  ]);

  // La meta se crea con el área ya elegida
  await attention.getByRole('button', { name: 'Ponle una meta a Finanzas (3/10)' }).click();
  const editor = page.getByRole('dialog', { name: 'Nueva meta' });
  await expect(editor.getByLabel('Área de la Rueda')).toHaveValue('Finanzas');
  await editor.getByLabel(/^Meta/).fill(goalTitle);
  await editor.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(editor).toBeHidden();
  await expect(attention.getByRole('button')).toHaveText(['Ponle una meta a Ocio (5/10)']);
  const finances = page.getByRole('region', { name: 'Finanzas 3/10' });
  // El botón que abrió la ventana ya no está: el foco vuelve al «Nueva meta» del área, junto a la meta creada
  await expect(finances.getByRole('button', { name: 'Nueva meta en Finanzas' })).toBeFocused();
  await expect(finances.getByRole('heading', { name: goalTitle })).toBeVisible();
  await expect(finances).toContainText('Aún no tiene tareas vinculadas.');

  // «Añadir tarea» abre el formulario con la meta ya elegida; la tarea aparece en la meta
  await finances.getByRole('button', { name: `Añadir tarea a «${goalTitle}»` }).click();
  await expect(page.getByRole('combobox', { name: /^Meta/ })).toHaveValue(/^goal-/);
  await expect(page.getByText('Área de la Rueda: Finanzas (la de la meta).')).toBeVisible();
  const taskTitle = `Abrir una cuenta de ahorro ${Date.now().toString(36)}`;
  await fillAndSaveTask(page, { title: taskTitle, dueDate: '2030-06-15' });
  const pending = finances.getByRole('list', { name: `Tareas por hacer de «${goalTitle}»` });
  await expect(pending.getByRole('listitem')).toHaveCount(1);
  await expect(pending).toContainText(taskTitle);
  await expect(pending).toContainText('Profesional · Vence el 15 jun 2030');
  await expect(finances.getByRole('progressbar', { name: `Progreso de «${goalTitle}»` })).toHaveAttribute(
    'aria-valuetext',
    '0 de 1 tarea hecha'
  );

  // Pulsar la tarea la abre para editarla
  await pending.getByRole('button', { name: new RegExp(`^${taskTitle}`) }).click();
  const taskEditor = page.getByRole('dialog', { name: 'Editar la tarea' });
  await expect(taskEditor.getByPlaceholder('ej. Llamar al proveedor para acordar el plazo de entrega')).toHaveValue(
    taskTitle
  );
  await page.keyboard.press('Escape');
  await expect(taskEditor).toBeHidden();

  // Hecha desde las listas: la meta avanza y la tarea ya no está por hacer
  await openSection(page, 'Listas');
  await completeTask(page, taskTitle);
  await openSection(page, 'Metas');
  await expect(finances.getByRole('progressbar', { name: `Progreso de «${goalTitle}»` })).toHaveAttribute(
    'aria-valuetext',
    '1 de 1 tarea hecha'
  );
  await expect(pending).toHaveCount(0);

  // Inicio lleva a Metas
  await openSection(page, 'Inicio');
  await page.getByRole('region', { name: 'Metas' }).getByRole('button', { name: 'Gestionar las metas' }).click();
  await expect(page.getByRole('heading', { name: 'Metas', level: 2 })).toBeVisible();
});

test('areas → goals → tasks: linking from the task form, achieving, changing area and deleting a goal', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  const goalTitle = `Correr una media maratón ${Date.now().toString(36)}`;

  // Crear la meta desde «Nueva meta», sin área elegida
  await openSection(page, 'Metas');
  await page.getByRole('button', { name: 'Nueva meta', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Nueva meta' });
  await editor.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(editor.getByRole('alert')).toHaveText('Ponle un nombre a la meta.');
  await editor.getByLabel(/^Meta/).fill(goalTitle);
  await editor.getByLabel('Área de la Rueda').selectOption('Salud');
  await editor.getByLabel('¿Para qué?').fill('Llegar en forma a los 40');
  await editor.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(editor).toBeHidden();

  const health = page.getByRole('list', { name: 'Metas de Salud' });
  await expect(health.getByRole('heading', { name: goalTitle })).toBeVisible();
  // «Archivar» también es fácil de pulsar
  const archiveBox = (await health.getByRole('button', { name: 'Archivar' }).boundingBox())!;
  expect(archiveBox.height).toBeGreaterThanOrEqual(44);
  // La Rueda cuenta las metas de cada área
  await openSection(page, 'Rueda de la Vida');
  await expect(page.getByText('· 1 meta activa')).toBeVisible();

  // Una tarea cuyo título comparte palabras con la meta la sugiere; al vincularla hereda el área
  const taskTitle = `Salir a correr para la maratón ${Date.now().toString(36)}`;
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  await page.getByPlaceholder('ej. Llamar al proveedor para acordar el plazo de entrega').fill(taskTitle);
  await page.getByRole('button', { name: `Vincular a «${goalTitle}»` }).click();
  await expect(page.getByRole('combobox', { name: /^Meta/ })).toHaveValue(/^goal-/);
  await expect(page.getByText('Área de la Rueda: Salud (la de la meta).')).toBeVisible();
  await fillAndSaveTask(page, { title: taskTitle });

  // La tarjeta muestra la meta
  await openSection(page, 'Listas');
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: taskTitle }) });
  await expect(card).toContainText(goalTitle);

  // Lograda: pasa a «Logradas y archivadas»
  await openSection(page, 'Metas');
  await page.getByRole('button', { name: `Marcar «${goalTitle}» como lograda` }).click();
  await expect(health).toBeHidden();
  await page.getByRole('button', { name: 'Logradas y archivadas (1)' }).click();
  await expect(page.getByRole('list', { name: 'Metas logradas y archivadas' })).toContainText('Lograda');

  // Cambiar el área de la meta mueve sus tareas a la nueva; eliminarla las deja sin meta, con esa área
  await page.getByRole('button', { name: `Editar la meta «${goalTitle}»` }).click();
  await page.getByLabel('Área de la Rueda').selectOption('Ocio');
  await page.getByRole('button', { name: 'Guardar los cambios' }).click();
  await page.getByRole('button', { name: `Editar la meta «${goalTitle}»` }).click();
  await page.getByRole('button', { name: 'Eliminar la meta' }).click();
  const confirm = page.getByRole('button', { name: 'Eliminar definitivamente' });
  await expect(confirm).toBeFocused();
  await expect(confirm).toHaveAccessibleDescription('Sus tareas se quedan, sin meta.');
  await confirm.click();
  await expect(page.getByRole('heading', { name: goalTitle })).toHaveCount(0);

  await openSection(page, 'Listas');
  await expect(card).not.toContainText(goalTitle);
  await expect(card).toContainText('Ocio');
});

test('an impossible target date does not let the goal be saved', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Metas');
  await page.getByRole('button', { name: 'Nueva meta en Ocio' }).click();
  const editor = page.getByRole('dialog', { name: 'Nueva meta' });
  await editor.getByLabel(/^Meta/).fill('Viajar a Japón');
  await expect(editor.getByLabel('Área de la Rueda')).toHaveValue('Ocio');
  const date = editor.getByLabel('Fecha objetivo', { exact: true });
  await date.fill('31/02/2027');
  await expect(date).toHaveAttribute('aria-invalid', 'true');
  await editor.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(editor).toBeVisible();
  await date.fill('28/02/2027');
  await editor.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole('list', { name: 'Metas de Ocio' })).toContainText('Para el 28 feb 2027');
});

test('a goal can be created from the task form, and the task is linked to it', async ({ page }) => {
  test.slow(); // Dos formularios de tarea y «Metas»
  await page.goto('/');
  await signInWithGoogle(page);
  const stamp = Date.now().toString(36);
  const firstGoal = `Correr una media maratón ${stamp}`;
  const secondGoal = `Aprender a nadar ${stamp}`;
  const taskTitle = `Salir a correr cinco kilómetros ${stamp}`;

  // Sin metas: el formulario ofrece crear una ahí mismo
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  const form = page.getByRole('dialog');
  await expect(form).toContainText('Aún no tienes metas.');
  await form.getByRole('button', { name: 'Nueva meta', exact: true }).click();
  const newGoal = form.getByRole('group', { name: 'Nueva meta' });
  const goalName = newGoal.getByLabel('Nombre de la nueva meta');
  await expect(goalName).toBeFocused();
  await newGoal.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(newGoal.getByRole('alert')).toHaveText('Ponle un nombre a la meta.');
  await goalName.fill(firstGoal);
  await newGoal.getByLabel('Área de la nueva meta').selectOption({ label: 'Salud' });
  // Enter crea la meta, sin guardar la tarea; la meta queda elegida
  await goalName.press('Enter');
  await expect(newGoal).toBeHidden();
  const goalSelect = form.getByRole('combobox', { name: /^Meta/ });
  await expect(goalSelect).toBeFocused();
  await expect(goalSelect.locator('option:checked')).toHaveText(firstGoal);
  await expect(form.getByRole('status').filter({ hasText: 'creada y vinculada' })).toHaveText(
    `Meta «${firstGoal}» creada y vinculada a esta tarea.`
  );
  await expect(form).toContainText('Área de la Rueda: Salud (la de la meta).');
  await fillAndSaveTask(page, { title: taskTitle });

  // Con metas también se puede crear otra. Escape cierra solo esa parte, no el formulario
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  await form.getByRole('button', { name: 'Nueva meta', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(newGoal).toBeHidden();
  await expect(form.getByRole('button', { name: 'Nueva meta', exact: true })).toBeFocused();
  await form.getByRole('button', { name: 'Nueva meta', exact: true }).click();
  await goalName.fill(secondGoal);
  const goalArea = newGoal.getByLabel('Área de la nueva meta');
  await goalArea.selectOption({ label: 'Ocio' });
  // Enter en el área también crea la meta, sin guardar la tarea
  await goalArea.press('Enter');
  await expect(goalSelect.locator('option:checked')).toHaveText(secondGoal);
  await expect(form).toBeVisible();
  // Cerrar la tarea no deshace la meta. Una tarea nueva sin nada escrito (solo la meta) se cierra sin preguntar y
  // sin dejar borrador
  await page.keyboard.press('Escape');
  await expect(form).toBeHidden();
  await expect(page.getByRole('button', { name: /^Borradores/ })).toHaveCount(0);

  await openSection(page, 'Metas');
  const health = page.getByRole('region', { name: 'Salud', exact: true });
  await expect(health.getByRole('list', { name: `Tareas por hacer de «${firstGoal}»` })).toContainText(taskTitle);
  await expect(page.getByRole('list', { name: 'Metas de Ocio' })).toContainText(secondGoal);
});
