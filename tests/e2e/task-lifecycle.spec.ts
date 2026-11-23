import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  completeTask,
  expectNoHorizontalOverflow,
  fillAndSaveTask,
  localDateFromToday,
  openTaskActions,
  showMoreOptions,
  signInWithGoogle
} from './helpers';

const unique = () => Date.now().toString(36);

test('adds tasks from the button at the end of the list and colors titles by due date', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const overdue = `Llamar al proveedor vencido ${unique()}`;
  const soon = `Llamar al taller esta semana ${unique()}`;
  const later = `Llamar al banco el mes que viene ${unique()}`;

  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title: overdue, dueDate: localDateFromToday(-1) });

  // Con tareas en la lista, el botón para añadir otra está al final
  await page.getByRole('button', { name: 'Añadir tarea', exact: true }).click();
  await fillAndSaveTask(page, { title: soon, dueDate: localDateFromToday(3), dueTime: '18:00' });
  await page.getByRole('button', { name: 'Añadir tarea', exact: true }).click();
  await fillAndSaveTask(page, { title: later, dueDate: localDateFromToday(30) });

  // Se compara el color calculado, no solo la clase: si conviven dos clases de color, gana la que el CSS defina después
  const colorOfClass = (className: string) =>
    page.evaluate((cls) => {
      const probe = document.createElement('span');
      probe.className = cls;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }, className);
  const titleColor = (name: string) => page.getByRole('heading', { name }).evaluate((el) => getComputedStyle(el).color);

  expect(await titleColor(overdue)).toBe(await colorOfClass('text-red-600'));
  expect(await titleColor(soon)).toBe(await colorOfClass('text-violet-600'));
  expect(await titleColor(later)).toBe(await colorOfClass('text-slate-900'));
  await expect(page.getByText('18:00', { exact: false })).toBeVisible();

  // La lista con tareas, fechas y menús tampoco desborda en móvil
  await page.setViewportSize({ width: 375, height: 900 });
  await expectNoHorizontalOverflow(page, 'lista con tareas a 375px');
});

test('archives a task when marked done and reactivates it from the archive', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const title = `Llamar al cliente para cerrar ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title });
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await completeTask(page, title);
  await expect(page.getByRole('heading', { name: title })).toBeHidden();

  // «Deshacer» la devuelve a la lista; volver a marcarla la archiva
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await completeTask(page, title);
  await expect(page.getByRole('heading', { name: title })).toBeHidden();

  const archiveButton = page.getByRole('button', { name: /Archivadas/ });
  await archiveButton.click();
  const archive = page.getByRole('dialog', { name: 'Tareas archivadas' });
  await expect(archive.getByText(title)).toBeVisible();

  // Ventana modal accesible: el foco entra al abrir, Tab no sale de ella y Escape la cierra devolviendo el foco
  await expect(archive).toHaveAttribute('aria-modal', 'true');
  await expect(archive.getByLabel('Buscar en las tareas archivadas')).toBeFocused();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await archive.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(archive).toBeHidden();
  await expect(archiveButton).toBeFocused();

  await archiveButton.click();
  await archive.getByLabel(`Estado de «${title}»`).selectOption('IN_PROGRESS');
  await expect(archive.getByText(title)).toBeHidden();
  await archive.getByRole('button', { name: 'Cerrar' }).click();

  // Reactivada «En progreso»: la tarjeta lo indica (las pendientes no llevan estado)
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(card.getByText('En progreso', { exact: true })).toBeVisible();
});

test('the task form changes the status when saving: done with «Deshacer», and in progress', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const title = `Revisar el contrato ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title });

  // Una tarea nueva no tiene estado en el formulario (siempre empieza pendiente)
  await page.getByRole('button', { name: 'Añadir tarea', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel(/^Estado de/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Al editarla: el estado y otro cambio se guardan juntos; «Hecha» la archiva y «Deshacer» devuelve solo el estado
  await page.getByRole('button', { name: title, exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Editar la tarea' })).toBeVisible();
  const status = dialog.getByLabel(`Estado de «${title}»`);
  await expect(status).toHaveValue('PENDING');
  await showMoreOptions(page);
  await dialog.getByLabel('Descripción').fill('Con la versión firmada');
  await status.selectOption('DONE');
  await dialog.getByRole('button', { name: 'Guardar los cambios' }).click();
  await expect(dialog).toBeHidden();
  // El aviso es el del estado (con «Deshacer»), no «Tarea guardada.»
  await expect(page.getByText('Tarea hecha y archivada. La encontrarás en «Archivadas».')).toBeVisible();
  await expect(page.getByText('Tarea guardada.')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: title })).toBeHidden();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.getByRole('button', { name: title, exact: true }).click();
  await showMoreOptions(page);
  await expect(dialog.getByLabel('Descripción')).toHaveValue('Con la versión firmada');
  // Cambiar solo el estado también es un cambio sin guardar: cerrar pregunta antes de descartarlo. Volver al de antes,
  // no
  const prompt = page.getByRole('alertdialog', { name: '¿Descartar los cambios?' });
  await status.selectOption('IN_PROGRESS');
  await status.selectOption('PENDING');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toBeHidden();
  await expect(prompt).toHaveCount(0);
  await page.getByRole('button', { name: title, exact: true }).click();
  await status.selectOption('IN_PROGRESS');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(prompt).toBeVisible();
  await prompt.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(prompt).toBeHidden();
  await dialog.getByRole('button', { name: 'Guardar los cambios' }).click();
  await expect(page.getByText('Tarea guardada.')).toBeVisible();
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(card.getByText('En progreso', { exact: true })).toBeVisible();
});

test('a cancelled task is archived as cancelled, with «Deshacer», and can be reactivated', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const title = `Reservar la sala del taller ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title });

  // Cancelada desde «⋯»: sale de la lista, con «Deshacer»
  await openTaskActions(page, title);
  await page.getByLabel(`Estado de «${title}»`).selectOption('CANCELLED');
  await expect(page.getByText('Tarea cancelada y archivada. La encontrarás en «Archivadas».')).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toBeHidden();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await openTaskActions(page, title);
  await page.getByLabel(`Estado de «${title}»`).selectOption('CANCELLED');
  await expect(page.getByRole('heading', { name: title })).toBeHidden();

  // En «Archivadas», como cancelada; al reactivarla vuelve a su lista
  await page.getByRole('button', { name: /Archivadas/ }).click();
  const archive = page.getByRole('dialog', { name: 'Tareas archivadas' });
  const row = archive.getByRole('listitem').filter({ hasText: title });
  await expect(row).toContainText('Cancelada el');
  await expect(archive.getByLabel(`Estado de «${title}»`)).toHaveValue('CANCELLED');
  await archive.getByLabel(`Estado de «${title}»`).selectOption('PENDING');
  await expect(row).toBeHidden();
  await archive.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});

test('changing the status from «⋯» with the keyboard leaves the focus on that button', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const title = `Llamar a la academia ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title });
  const actions = page.getByRole('button', { name: `Acciones de «${title}»` });
  await actions.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const status = page.getByLabel(`Estado de «${title}»`);
  await expect(status).toBeFocused();
  await status.selectOption('IN_PROGRESS');
  await expect(status).toBeHidden();
  await expect(actions).toBeFocused();
});

test('the title and the pencil open the task editor', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  const title = `Revisar el presupuesto ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title });
  const editor = page.getByRole('dialog', { name: 'Editar la tarea' });

  await page.getByRole('heading', { name: title }).getByRole('button', { name: title }).click();
  await expect(editor).toBeVisible();
  await expect(editor.getByPlaceholder('ej. Llamar al proveedor para acordar el plazo de entrega')).toHaveValue(title);
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();

  await page.getByRole('button', { name: `Editar «${title}»` }).click();
  await expect(editor).toBeVisible();
});

test('a deleted task can be brought back with «Deshacer»', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const title = `Llamar a la gestoría ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title });
  await openTaskActions(page, title);
  await page.getByRole('button', { name: `Eliminar «${title}»` }).click();
  await expect(page.getByRole('heading', { name: title })).toBeHidden();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  // Sigue ahí tras recargar: se ha vuelto a guardar
  await page.reload();
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});

test('adds a task with a due date to Google, Outlook or an .ics calendar file', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const title = `Llamar al notario ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title, dueDate: localDateFromToday(10), dueTime: '10:30' });

  await openTaskActions(page, title);
  const menu = page.getByRole('list', { name: 'Añadir al calendario' });

  const google = new URL((await menu.getByRole('link', { name: 'Google Calendar' }).getAttribute('href'))!);
  expect(google.hostname).toBe('calendar.google.com');
  expect(google.searchParams.get('text')).toBe(title);
  expect(google.searchParams.get('dates')).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);

  const personal = new URL((await menu.getByRole('link', { name: /Outlook\.com/ }).getAttribute('href'))!);
  expect(personal.hostname).toBe('outlook.live.com');
  const work = new URL((await menu.getByRole('link', { name: /Microsoft 365/ }).getAttribute('href'))!);
  expect(work.hostname).toBe('outlook.office.com');

  const downloadPromise = page.waitForEvent('download');
  await menu.getByRole('button', { name: /Descargar \.ics/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const ics = readFileSync(await download.path(), 'utf8');
  expect(ics).toContain('BEGIN:VEVENT');
  expect(ics).toContain(`SUMMARY:${title}`);
});

test('explains that a task needs a due date to go to the calendar', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const title = `Llamar al electricista ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title });

  await openTaskActions(page, title);
  await expect(page.getByText('Pon una fecha límite para añadirla al calendario.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Google Calendar' })).toHaveCount(0);
});

test('updates deadline colors while the page stays open', async ({ page }) => {
  // Reloj de Playwright: el tiempo avanza con normalidad y fastForward lo adelanta, disparando los temporizadores
  await page.clock.install();
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  // Vence dentro de una semana y 3 minutos: al principio no tiene color; al adelantar 5 minutos pasa a violeta
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const title = `Llamar al gestor ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, {
    title,
    dueDate: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
    dueTime: `${pad(due.getHours())}:${pad(due.getMinutes())}`
  });

  const heading = page.getByRole('heading', { name: title });
  await expect(heading).not.toHaveClass(/text-violet-600/);
  await page.clock.fastForward('05:00');
  await expect(heading).toHaveClass(/text-violet-600/);
});
