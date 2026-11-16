import { expect, test, type Page } from '@playwright/test';
import { completeTask, fillAndSaveTask, localDateFromToday, openSection, signInWithGoogle } from './helpers';

const createGoal = async (page: Page, title: string) => {
  await openSection(page, 'Metas');
  await page.getByRole('button', { name: 'Nueva meta en Familia' }).click();
  const editor = page.getByRole('dialog', { name: 'Nueva meta' });
  await editor.getByLabel(/^Meta/).fill(title);
  await editor.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(editor).toBeHidden();
};

test('a project of a goal holds its tasks, shows its progress as a battery and warns when it runs late', async ({
  page
}) => {
  test.slow(); // Recorre metas, proyectos y tareas
  await page.goto('/');
  await signInWithGoogle(page);
  const stamp = Date.now().toString(36);
  const goalTitle = `Tener la casa a punto ${stamp}`;
  const projectTitle = `Reformar la cocina ${stamp}`;
  const first = `Pedir presupuesto al fontanero ${stamp}`;
  const second = `Elegir los azulejos ${stamp}`;
  await createGoal(page, goalTitle);

  // Nuevo proyecto: nombre, meta y fecha de fin; al crearlo se abre
  await openSection(page, 'Proyectos');
  await page.getByRole('button', { name: 'Nuevo proyecto' }).click();
  const editor = page.getByRole('dialog', { name: 'Nuevo proyecto' });
  await editor.getByLabel(/^Proyecto/).fill(projectTitle);
  await editor.getByLabel(/^Meta/).selectOption({ label: goalTitle });
  await editor.getByLabel('Fecha de fin', { exact: true }).fill(localDateFromToday(30));
  await editor.getByRole('button', { name: 'Crear el proyecto' }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole('heading', { name: projectTitle, level: 2 })).toBeFocused();
  await expect(page.getByText('Aún no tiene tareas. Añade la primera.')).toBeVisible();

  // «Añadir tarea» la crea en el proyecto, con su meta fijada
  await page.getByRole('button', { name: 'Añadir tarea' }).click();
  const taskForm = page.getByRole('dialog', { name: 'Nueva tarea' });
  await expect(taskForm.getByLabel(/^Proyecto/)).toHaveValue(/.+/);
  await expect(taskForm.getByLabel(/^Meta/)).toBeDisabled();
  await expect(taskForm).toContainText(`La del proyecto «${projectTitle}»`);
  await fillAndSaveTask(page, { title: first });
  // Una tarea que vence después del fin del proyecto se señala
  await page.getByRole('button', { name: 'Añadir tarea' }).click();
  await fillAndSaveTask(page, { title: second, dueDate: localDateFromToday(45) });
  await expect(page.getByText(`«${second}» vence después del fin del proyecto.`)).toBeVisible();

  // Las tareas se manejan como en las listas: al hacer una, la batería se carga
  const tasks = page.getByRole('list', { name: `Tareas de «${projectTitle}»` });
  await expect(tasks.getByRole('listitem')).toHaveCount(2);
  const battery = page.getByRole('progressbar', { name: `Avance de «${projectTitle}»` });
  await expect(battery).toHaveAttribute('aria-valuenow', '0');
  await completeTask(page, first);
  await expect(battery).toHaveAttribute('aria-valuenow', '50');
  await expect(battery).toHaveAttribute('aria-valuetext', '50 %: 1 de 2 tareas hechas');
  await expect(page.getByText('Hechas y canceladas (1)')).toBeVisible();

  // En «Metas», la meta cuenta las tareas del proyecto y muestra el proyecto, que se abre desde ahí
  await openSection(page, 'Metas');
  const goalCard = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: goalTitle }) });
  await expect(goalCard).toContainText('1 de 2 tareas hechas');
  await expect(goalCard.getByRole('list', { name: `Proyectos de «${goalTitle}»` })).toContainText('50 %');
  // Con un proyecto, la meta no se puede eliminar
  await goalCard.getByRole('button', { name: `Editar la meta «${goalTitle}»` }).click();
  await expect(page.getByRole('dialog', { name: 'Editar la meta' })).toContainText('Tiene un proyecto');
  await expect(page.getByRole('button', { name: 'Eliminar la meta' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await goalCard.getByRole('button', { name: `Abrir el proyecto «${projectTitle}»` }).click();
  await expect(page.getByRole('heading', { name: projectTitle, level: 2 })).toBeFocused();

  // Con la fecha de fin pasada y tareas abiertas, está fuera de plazo
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  const projectForm = page.getByRole('dialog', { name: 'Editar el proyecto' });
  // Con el editor abierto, el resto de la app queda inerte
  const backToList = page.getByRole('button', { name: 'Todos los proyectos' });
  expect(await backToList.evaluate((el) => Boolean(el.closest('[inert]')))).toBe(true);
  await projectForm.getByLabel('Fecha de fin', { exact: true }).fill(localDateFromToday(-2));
  await projectForm.getByRole('button', { name: 'Guardar los cambios' }).click();
  await expect(page.getByText(/^Fuera de plazo: terminaba el .+ y quedan 1 tarea\.$/)).toBeVisible();
  await page.getByRole('button', { name: 'Todos los proyectos' }).click();
  await expect(page.getByRole('list', { name: 'Proyectos activos' })).toContainText('Fuera de plazo');

  // Inicio lo muestra entre sus proyectos y lo recomienda
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  const homeProjects = page.getByRole('region', { name: 'Proyectos' });
  await expect(homeProjects).toContainText(projectTitle);
  await expect(homeProjects).toContainText('1 fuera de plazo');
  await expect(page.getByRole('region', { name: 'Recomendaciones' })).toContainText(
    `El proyecto «${projectTitle}» va fuera de plazo`
  );
  await openSection(page, 'Proyectos');

  // Al eliminar el proyecto, sus tareas siguen en la meta
  await page.getByRole('button', { name: `Abrir el proyecto «${projectTitle}»` }).click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await projectForm.getByRole('button', { name: 'Eliminar el proyecto' }).click();
  await projectForm.getByRole('button', { name: 'Eliminar definitivamente' }).click();
  await expect(page.getByText('Proyecto eliminado. Sus tareas siguen en la meta.')).toBeVisible();
  await openSection(page, 'Metas');
  await expect(goalCard.getByRole('list', { name: `Tareas por hacer de «${goalTitle}»` })).toContainText(second);
});

test('without goals, Proyectos asks for one first', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Proyectos');
  await expect(page.getByText(/Los proyectos son opcionales y cada uno pertenece a una meta/)).toBeVisible();
  await page.getByRole('button', { name: 'Ir a Metas' }).click();
  await expect(page.getByRole('heading', { name: 'Metas', level: 2 })).toBeVisible();
});
