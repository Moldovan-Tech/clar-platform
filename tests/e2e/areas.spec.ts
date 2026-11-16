import { expect, test } from '@playwright/test';
import { openSection, signInWithGoogle } from './helpers';

test('areas can be renamed, added and hidden, and the whole app follows', async ({ page }) => {
  test.slow(); // Recorre la Rueda, «Metas» y el formulario de tarea, y recarga
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Rueda de la Vida');

  // Renombrar «Salud», añadir «Aprendizaje» y ocultar «Espiritualidad»
  await page.getByRole('button', { name: 'Editar áreas' }).click();
  const editor = page.getByRole('dialog', { name: 'Áreas de tu Rueda' });
  await editor.getByLabel('Nombre del área 1').fill('Cuerpo');
  await editor.getByRole('button', { name: 'Añadir un área' }).click();
  await expect(editor.getByLabel('Nombre del área 8')).toBeFocused();
  await editor.getByLabel('Nombre del área 8').fill('Aprendizaje');
  await editor.getByRole('checkbox', { name: /Espiritualidad/ }).uncheck();
  await editor.getByRole('button', { name: 'Guardar las áreas' }).click();
  await expect(editor).toBeHidden();

  // La Rueda: «Cuerpo» y «Aprendizaje», sin «Espiritualidad»
  await expect(page.getByRole('slider', { name: 'Puntuación de Cuerpo' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Puntuación de Aprendizaje' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Puntuación de Espiritualidad' })).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(7);
  await page.getByRole('slider', { name: 'Puntuación de Aprendizaje' }).fill('3');
  await page.getByRole('button', { name: 'Guardar la evaluación' }).click();

  // «Metas»: el área nueva, con su puntuación, y se le puede poner una meta
  await page.getByRole('button', { name: 'Ir a Metas' }).click();
  await expect(page.getByRole('heading', { name: 'Aprendizaje 3/10', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Espiritualidad/, level: 3 })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nueva meta en Aprendizaje' }).click();
  const goalForm = page.getByRole('dialog', { name: 'Nueva meta' });
  await expect(goalForm.getByLabel('Área de la Rueda')).toHaveValue(/^area-/);
  await expect(goalForm.getByLabel('Área de la Rueda').getByRole('option', { name: 'Espiritualidad' })).toHaveCount(0);
  await goalForm.getByLabel(/^Meta/).fill('Terminar el curso de alemán');
  await goalForm.getByRole('button', { name: 'Crear la meta' }).click();
  await expect(page.getByRole('list', { name: 'Metas de Aprendizaje' })).toContainText('Terminar el curso de alemán');

  // El formulario de tarea ofrece las áreas con su nombre
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  await page.getByRole('button', { name: /^Más opciones/ }).click();
  const area = page.getByLabel('Área de la Rueda');
  await expect(area.getByRole('option', { name: 'Cuerpo' })).toHaveCount(1);
  await expect(area.getByRole('option', { name: 'Espiritualidad' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Se guardan en la cuenta
  await page.reload();
  await openSection(page, 'Rueda de la Vida');
  await expect(page.getByRole('slider', { name: 'Puntuación de Cuerpo' })).toBeVisible();
});

test('the area editor asks for at least three areas in view and distinct names', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Rueda de la Vida');
  await page.getByRole('button', { name: 'Editar áreas' }).click();
  const editor = page.getByRole('dialog', { name: 'Áreas de tu Rueda' });
  for (const name of ['Salud', 'Carrera Profesional', 'Finanzas', 'Familia', 'Ocio'])
    await editor.getByRole('checkbox', { name: new RegExp(name) }).uncheck();
  await editor.getByRole('button', { name: 'Guardar las áreas' }).click();
  await expect(editor.getByRole('alert')).toHaveText('Deja al menos 3 áreas a la vista.');
  await editor.getByRole('checkbox', { name: /Salud/ }).check();
  await editor.getByLabel('Nombre del área 1').fill('Ocio');
  await editor.getByRole('button', { name: 'Guardar las áreas' }).click();
  await expect(editor.getByRole('alert')).toHaveText('Dos áreas no pueden llamarse igual.');
  // Cerrar con cambios pregunta antes de descartarlos
  await page.keyboard.press('Escape');
  await page
    .getByRole('alertdialog', { name: '¿Descartar los cambios?' })
    .getByRole('button', { name: 'Descartar' })
    .click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole('slider')).toHaveCount(7);
});
