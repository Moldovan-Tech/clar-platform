import { expect, test, type Page } from '@playwright/test';
import { agendaEntry, fillAndSaveTask, localDateFromToday, openSection, signInWithGoogle } from './helpers';

// Las tareas que vencen hoy destacan: la etiqueta «Hoy» (con texto, no solo color), el título en negrita y, en las
// listas, un borde violeta a la izquierda. Las de mañana no, aunque falten menos de 24 horas
const card = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('button', { name: title, exact: true }) });

test('tasks due today stand out in the lists and the agenda; those due tomorrow do not', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  const id = Date.now().toString(36);
  const today = `Pagar el recibo ${id}`;
  const tomorrow = `Revisar el contrato ${id}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title: today, dueDate: localDateFromToday(0) });
  await page.getByRole('button', { name: 'Nueva Tarea' }).click();
  await fillAndSaveTask(page, { title: tomorrow, dueDate: localDateFromToday(1), dueTime: '09:00' });

  await expect(card(page, today).getByText('Hoy', { exact: true })).toBeVisible();
  await expect(card(page, today)).toHaveCSS('border-left-width', '4px');
  await expect(card(page, tomorrow).getByText('Hoy', { exact: true })).toHaveCount(0);
  await expect(card(page, tomorrow)).toHaveCSS('border-left-width', '1px');

  // En la Agenda, el título en negrita, y quien usa un lector de pantalla oye que vence hoy. «Por días» empieza hoy
  // (en la semana, un domingo, mañana ya sería la semana siguiente)
  await openSection(page, 'Agenda');
  await page.getByRole('button', { name: 'Por días' }).click();
  const entry = agendaEntry(page, today);
  await expect(entry).toHaveAccessibleName(/\(vence hoy\)/);
  // (el título lleva dentro, oculto, «(vence hoy)»: no se busca exacto)
  await expect(entry.getByText(today)).toHaveCSS('font-weight', '700');
  const later = agendaEntry(page, tomorrow);
  await expect(later).not.toHaveAccessibleName(/vence hoy/);
  await expect(later.getByText(tomorrow, { exact: true })).toHaveCSS('font-weight', '600');
});
