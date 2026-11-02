import { expect, test, type Page } from '@playwright/test';
import { patchDocument, readDocument, signInWithGoogle, uidOf } from './helpers';

// Apunta cada vez que se abre una ventana (no había ninguna y aparece una), también entre recargas
const recordDialogs = async (page: Page) => {
  const opened: string[] = [];
  await page.exposeBinding('dialogOpened', (_source, text: string) => opened.push(text));
  await page.addInitScript(() => {
    const report = (window as unknown as { dialogOpened: (text: string) => void }).dialogOpened;
    let open = false;
    new MutationObserver(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog && !open) report((dialog.textContent ?? '').slice(0, 60));
      open = dialog !== null;
    }).observe(document, { subtree: true, childList: true });
  });
  return opened;
};

test('a new account sees the welcome once: why, the method and how to start', async ({ page }) => {
  const opened = await recordDialogs(page);
  await page.goto('/');
  const email = await signInWithGoogle(page, undefined, undefined, { onboarded: false });

  const dialog = page.getByRole('dialog');
  const title = dialog.getByRole('heading', { name: 'Te damos la bienvenida a CLAR' });
  await expect(title).toBeVisible();
  await expect(dialog).toContainText('Paso 1 de 3: Por qué');
  // Se abre una sola vez: lo que la app guarda en el perfil al abrirse (el idioma, las condiciones) no la cierra
  const uid = await uidOf(email);
  await expect.poll(async () => (await readDocument(`users/${uid}`))?.language).toBe('es');
  await expect.poll(async () => (await readDocument(`users/${uid}`))?.termsAcceptedAt).toBeTruthy();
  await expect(title).toBeVisible();
  expect(opened).toHaveLength(1);

  // Cada pantalla pone el foco en su título
  await dialog.getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialog.getByRole('heading', { name: 'Así funciona' })).toBeFocused();
  await expect(
    dialog.getByRole('list', { name: 'De tus áreas de vida a lo que haces hoy' }).getByRole('listitem')
  ).toHaveText([/Áreas de vida/, /Metas/, /Proyectos \(opcional\)/, /Tareas/, /Top 10 y Agenda/]);
  await dialog.getByRole('button', { name: 'Atrás' }).click();
  await expect(dialog.getByRole('heading', { name: 'Te damos la bienvenida a CLAR' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Siguiente' }).click();
  await dialog.getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialog.getByRole('heading', { name: 'Tu rutina en tres pasos' })).toBeFocused();
  // «Tiempo protegido» ya no es una sección (1.3.0): el último paso remite a las recomendaciones de la Ayuda
  await expect(dialog).toContainText('en la Ayuda tienes más recomendaciones');
  await expect(dialog).not.toContainText('Tiempo protegido');
  await dialog.getByRole('button', { name: 'Empezar el recorrido' }).click();

  // Sigue el recorrido guiado; al salir de él, el primer paso es evaluar la Rueda
  await expect(page.getByRole('dialog', { name: 'Captura una tarea' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Primer paso: evalúa tu Rueda de la Vida')).toBeVisible();

  // Queda en el perfil, para cualquier dispositivo, y no vuelve a salir
  await expect
    .poll(async () => (await readDocument(`users/${await uidOf(email)}`))?.onboardingOutcome)
    .toBe('completed');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Nueva tarea', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Escape skips the welcome and it is not shown again', async ({ page }) => {
  await page.goto('/');
  const email = await signInWithGoogle(page, undefined, undefined, { onboarded: false });
  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida a CLAR' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(async () => (await readDocument(`users/${await uidOf(email)}`))?.onboardingOutcome).toBe('skipped');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Nueva tarea', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the same account in a new browser does not see the welcome or the release notes again, and keeps its language', async ({
  browser
}) => {
  test.slow(); // Dos navegadores, y el segundo se recarga al adoptar el idioma de la cuenta
  // La cuenta ya vio la bienvenida y las novedades de esta versión, y está en inglés (después de que el primer
  // navegador guarde el suyo, para que no lo pise)
  const first = await (await browser.newContext()).newPage();
  await first.goto('/');
  const email = await signInWithGoogle(first);
  const uid = await uidOf(email);
  await expect.poll(async () => (await readDocument(`users/${uid}`))?.language).toBe('es');
  await patchDocument(`users/${uid}`, { language: { stringValue: 'en' } });
  await first.context().close();

  // Otro navegador, sin nada guardado (ni la caché del perfil)
  const page = await (await browser.newContext()).newPage();
  const opened = await recordDialogs(page);
  await page.goto('/');
  await signInWithGoogle(page, email, undefined, { approve: false, onboarded: false });

  // Adopta el idioma de la cuenta sin cambiarlo. Si la app se recarga sola mientras se lee, ese intento no cuenta, y
  // su recarga puede cortar la de la prueba (ERR_ABORTED): la página acaba cargada igual
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('clar_locale')).catch(() => null), { timeout: 30_000 })
    .toBe('en');
  await page.reload().catch((e: Error) => {
    if (!e.message.includes('ERR_ABORTED')) throw e;
  });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Synced with the server/ })).toBeVisible({ timeout: 15_000 });
  expect((await readDocument(`users/${uid}`))?.language).toBe('en');
  // Y no se abre ninguna ventana: ni la bienvenida ni las novedades
  expect(opened).toEqual([]);
});

test('with data from the version without accounts, the import comes first and the welcome after it', async ({
  page
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const created = '2026-10-01T09:00:00.000Z';
    localStorage.setItem(
      'neuro_tasks_v1',
      JSON.stringify([
        {
          id: 'task-local-welcome',
          userId: 'user-ana',
          listContext: 'WORK',
          title: 'Llamar al taller',
          description: '',
          priority: 'HIGH',
          createdAt: created,
          updatedAt: created,
          observations: [],
          isSomeday: false,
          completed: false
        }
      ])
    );
  });
  await signInWithGoogle(page, undefined, undefined, { onboarded: false });

  // Una sola ventana a la vez: primero la importación
  const importDialog = page.getByRole('dialog', { name: 'Importar datos de este navegador' });
  await expect(importDialog).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await importDialog.getByRole('button', { name: 'Más tarde' }).last().click();
  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida a CLAR' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});
