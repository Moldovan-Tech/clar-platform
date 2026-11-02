import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectNoInnerOverflow, openSection, signInWithGoogle } from './helpers';

// En escritorio las secciones son pestañas; en el móvil (< 768 px) están en el menú de la cabecera
const SECTIONS = ['Inicio', 'Listas', 'Agenda', 'Rueda de la Vida', 'Metas', 'Proyectos', 'Ayuda'];

for (const width of [360, 375, 768, 1280]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Sin animaciones, lo que se mide es la posición final
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expectNoHorizontalOverflow(page, 'login');

    await signInWithGoogle(page);

    // La cabecera ocupa una sola línea y «Nueva tarea» queda debajo de ella
    const header = (await page.locator('header').boundingBox())!;
    expect(header.height, 'altura de la cabecera').toBeLessThanOrEqual(72);
    const newTask = (await page.getByRole('button', { name: 'Nueva tarea', exact: true }).boundingBox())!;
    expect(newTask.y).toBeGreaterThanOrEqual(header.y + header.height);

    for (const name of SECTIONS) {
      await openSection(page, name);
      await expectNoHorizontalOverflow(page, `sección ${name}`);
      // Tampoco se sale nada de su caja (p. ej. las cifras de las tarjetas de indicadores)
      await expectNoInnerOverflow(page, `contenido de la sección ${name}`);
    }
  });
}

// Con el texto ampliado (panel de accesibilidad) la cabecera del móvil también cabe en una línea: la versión va al pie
for (const textSize of ['large', 'xlarge']) {
  test(`on a 360px phone with ${textSize} text the header stays on one line`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.addInitScript(
      (size) => localStorage.setItem('neuro_a11y_v1', JSON.stringify({ textSize: size })),
      textSize
    );
    await page.goto('/');
    await signInWithGoogle(page);
    const header = page.locator('header');
    const brand = (await header.getByText('CLAR', { exact: true }).boundingBox())!;
    const lists = (await page.getByRole('group', { name: 'Lista activa' }).boundingBox())!;
    expect(Math.abs(lists.y + lists.height / 2 - (brand.y + brand.height / 2))).toBeLessThan(12);
    await expect(header.getByText(/^v\d+\.\d+\.\d+$/)).toBeHidden();
    await expectNoHorizontalOverflow(page, `cabecera con texto ${textSize}`);
  });
}

test('on desktop the name and version stay before the first section', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await signInWithGoogle(page);
  const version = await page
    .locator('header')
    .getByText(/^v\d+\.\d+\.\d+$/)
    .boundingBox();
  const firstTab = await page.getByRole('button', { name: SECTIONS[0], exact: true }).boundingBox();
  expect(version!.x + version!.width).toBeLessThanOrEqual(firstTab!.x);
});
