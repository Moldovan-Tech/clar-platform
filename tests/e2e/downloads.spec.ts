import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fillAndSaveTask, localDateFromToday, openSection, openTaskActions, signInWithGoogle } from './helpers';

interface Exported {
  tasks: { title: string }[];
  projects: { title: string }[];
  [key: string]: unknown;
}

// Descarga desde un botón y devuelve el nombre del archivo y su contenido JSON
const downloadFrom = async (page: Page, button: Locator) => {
  const download = page.waitForEvent('download');
  await button.click();
  const file = await download;
  return { name: file.suggestedFilename(), data: JSON.parse(readFileSync(await file.path(), 'utf8')) as Exported };
};

test('a task, a goal and a project download as JSON with all their data', async ({ page }) => {
  test.slow(); // Crea una meta, un proyecto y sus tareas
  await page.goto('/');
  await signInWithGoogle(page);
  const stamp = Date.now().toString(36);
  const goalTitle = `Tener la casa a punto ${stamp}`;
  const projectTitle = `Reformar la cocina ${stamp}`;
  const taskTitle = `Elegir los azulejos ${stamp}`;

  await openSection(page, 'Metas');
  await page.getByRole('button', { name: 'Nueva meta en Familia' }).click();
  await page.getByRole('dialog', { name: 'Nueva meta' }).getByLabel(/^Meta/).fill(goalTitle);
  await page.getByRole('button', { name: 'Crear la meta' }).click();
  await page.getByRole('button', { name: `Nuevo proyecto para «${goalTitle}»` }).click();
  const editor = page.getByRole('dialog', { name: 'Nuevo proyecto' });
  await editor.getByLabel(/^Proyecto/).fill(projectTitle);
  await expect(editor.getByLabel(/^Meta/)).not.toHaveValue('');
  await editor.getByLabel('Fecha de fin', { exact: true }).fill(localDateFromToday(30));
  await editor.getByRole('button', { name: 'Crear el proyecto' }).click();
  await page.getByRole('button', { name: 'Añadir tarea' }).click();
  await fillAndSaveTask(page, { title: taskTitle, dueDate: localDateFromToday(10) });

  // La tarea, desde su menú «⋯»
  await openTaskActions(page, taskTitle);
  const taskFile = await downloadFrom(page, page.getByRole('button', { name: `Descargar «${taskTitle}» (JSON)` }));
  expect(taskFile.name).toMatch(/^clar-tarea-elegir-los-azulejos-[a-z0-9]+-\d{4}-\d{2}-\d{2}\.json$/);
  expect(taskFile.data).toMatchObject({
    app: 'CLAR',
    type: 'task',
    task: { title: taskTitle, dueDate: localDateFromToday(10), status: 'PENDING' },
    related: { goal: { title: goalTitle, area: 'Familia' }, project: { title: projectTitle }, waitsFor: null }
  });

  // El proyecto, desde su vista
  const projectFile = await downloadFrom(
    page,
    page.getByRole('button', { name: `Descargar «${projectTitle}» (JSON)` })
  );
  expect(projectFile.name).toMatch(/^clar-proyecto-reformar-la-cocina-/);
  expect(projectFile.data).toMatchObject({
    type: 'project',
    project: { title: projectTitle, endDate: localDateFromToday(30) },
    goal: { title: goalTitle },
    progress: { done: 0, total: 1, percent: 0 }
  });
  expect(projectFile.data.tasks).toHaveLength(1);

  // La meta, desde «Metas»: con su proyecto y sus tareas
  await openSection(page, 'Metas');
  const goalFile = await downloadFrom(
    page,
    page.getByRole('button', { name: `Descargar la meta «${goalTitle}» (JSON)` })
  );
  expect(goalFile.name).toMatch(/^clar-meta-tener-la-casa-a-punto-/);
  expect(goalFile.data).toMatchObject({ type: 'goal', goal: { title: goalTitle }, progress: { done: 0, total: 1 } });
  expect(goalFile.data.projects.map((p) => p.title)).toEqual([projectTitle]);
  expect(goalFile.data.tasks.map((t) => t.title)).toEqual([taskTitle]);
});
