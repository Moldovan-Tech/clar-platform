import { expect, test } from '@playwright/test';
import { openSection, signInWithGoogle } from './helpers';

// BORRADORES DE TAREAS: una tarea nueva que se cierra sin guardar se queda en «Borradores» (en la cuenta) para seguir
// con ella; al guardarla como tarea, desaparece de ahí
const unique = () => Date.now().toString(36);
const TITLE_FIELD = 'ej. Llamar al proveedor para acordar el plazo de entrega';

test('a new task closed without saving waits in «Borradores», and continuing it saves it as a task', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Listas');
  const drafts = page.getByRole('button', { name: /^Borradores/ });
  await expect(drafts).toHaveCount(0);

  // Escribir y cerrar: sin preguntar, se guarda como borrador (no como tarea)
  const title = `Pedir cita en el taller ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await page.getByPlaceholder(TITLE_FIELD).fill(title);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Nueva tarea' })).toBeHidden();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('Guardada en «Borradores», en Listas: puedes seguir con ella.')).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0);
  await expect(drafts).toContainText('1');

  // Se guarda en la cuenta: sigue ahí al recargar
  await page.reload();
  await openSection(page, 'Listas');
  await drafts.click();
  const list = page.getByRole('dialog', { name: /^Borradores de tareas/ });
  await expect(list).toContainText(title);

  // «Continuar» abre el formulario como estaba; cerrarlo con cambios actualiza el borrador
  await list.getByRole('button', { name: `Continuar «${title}»` }).click();
  const form = page.getByRole('dialog', { name: 'Nueva tarea' });
  await expect(page.getByPlaceholder(TITLE_FIELD)).toHaveValue(title);
  await page.getByPlaceholder(TITLE_FIELD).fill(`${title} para el lunes`);
  await form.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Borrador guardado.')).toBeVisible();
  await expect(drafts).toContainText('1');

  // Guardarla como tarea la pasa a la lista y la quita de «Borradores»
  await drafts.click();
  await list.getByRole('button', { name: `Continuar «${title} para el lunes»` }).click();
  await form.getByRole('button', { name: 'Guardar la tarea' }).click();
  await expect(page.getByRole('heading', { name: `${title} para el lunes` })).toBeVisible();
  await expect(drafts).toHaveCount(0);
});

test('«Deshacer» removes a new draft, a deleted draft can be recovered, and an emptied form saves nothing', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Listas');
  const drafts = page.getByRole('button', { name: /^Borradores/ });
  const undo = page.getByRole('button', { name: 'Deshacer', exact: true });

  // Cerrar y deshacer: no queda borrador (el aviso de abajo)
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await page.getByPlaceholder(TITLE_FIELD).fill(`Llamar al banco ${unique()}`);
  await page.keyboard.press('Escape');
  await undo.click();
  await expect(drafts).toHaveCount(0);

  // Un formulario que se vacía antes de cerrar no deja borrador
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await page.getByPlaceholder(TITLE_FIELD).fill('Algo');
  await page.getByPlaceholder(TITLE_FIELD).fill('');
  await page.keyboard.press('Escape');
  await expect(drafts).toHaveCount(0);

  // Eliminar un borrador desde la lista, y recuperarlo con «Deshacer»
  const title = `Enviar la factura ${unique()}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await page.getByPlaceholder(TITLE_FIELD).fill(title);
  await page.keyboard.press('Escape');
  await drafts.click();
  const list = page.getByRole('dialog', { name: /^Borradores de tareas/ });
  await list.getByRole('button', { name: `Eliminar el borrador «${title}»` }).click();
  await expect(list).toContainText('No tienes borradores.');
  // «Deshacer» en la propia lista (el aviso queda debajo de ella)
  await list.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(list).toContainText(title);
  await page.keyboard.press('Escape');
  await expect(drafts).toContainText('1');
});
