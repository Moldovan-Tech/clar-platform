import { expect, test, type Page } from '@playwright/test';
import { patchDocument, readDocument, signInWithGoogle, uidOf, uniqueEmail } from './helpers';

// IDIOMA: español por defecto; «English» en la página de inicio o en el menú de la cuenta vuelve a cargar la app en
// inglés, y la elección se guarda en la cuenta (users/{uid}.language)
const languageGroup = (page: Page) => page.getByRole('group', { name: 'Idioma · Language' });
const pressed = (page: Page, name: string) =>
  expect(languageGroup(page).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');

test('the landing page is in Spanish by default, and «English» switches it, also after reloading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await pressed(page, 'Español');
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();

  await languageGroup(page).getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await pressed(page, 'English');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();

  // Los textos legales en inglés avisan de que vale la versión en español y la muestran ahí mismo, sin cambiar el
  // idioma de la app
  await page.goto('/privacidad');
  await expect(page.getByText(/The Spanish version is the one that applies/)).toBeVisible();
  await page.getByRole('button', { name: 'Read the Spanish version' }).click();
  await expect(page.locator('[lang="es"]').getByText('Qué datos tratamos y para qué')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('English chosen before signing in goes to the account, and the access screens offer the language too', async ({
  page
}) => {
  await page.goto('/');
  await languageGroup(page).getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // Sin acceso todavía: la pantalla de solicitud también tiene el selector
  await page.evaluate(() => localStorage.setItem('clar_locale', 'es'));
  await page.reload();
  const email = await signInWithGoogle(page, undefined, undefined, { approve: false });
  await expect(languageGroup(page)).toBeVisible();
  await languageGroup(page).getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // Con acceso, la elección de antes de entrar pasa a la cuenta
  const uid = await uidOf(email);
  await patchDocument(`access/${uid}`, {
    status: { stringValue: 'approved' },
    email: { stringValue: email },
    name: { stringValue: '' },
    photoUrl: { stringValue: '' },
    message: { stringValue: '' },
    requestedAt: { stringValue: new Date().toISOString() },
    decidedAt: { stringValue: new Date().toISOString() }
  });
  await expect.poll(async () => (await readDocument(`users/${uid}`))?.language, { timeout: 20_000 }).toBe('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the account menu switches the language and saves it in the account; the account language wins on another device', async ({
  page
}) => {
  test.slow(); // Recarga la app varias veces
  const email = uniqueEmail();
  await page.goto('/');
  await signInWithGoogle(page, email);
  const uid = await uidOf(email);
  // Una cuenta sin idioma guarda el de su dispositivo al abrir la app
  await expect.poll(async () => (await readDocument(`users/${uid}`))?.language).toBe('es');

  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  await languageGroup(page).getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Lists', exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await readDocument(`users/${uid}`))?.language).toBe('en');

  // Otro dispositivo (sin nada guardado) con la cuenta en inglés: al abrir, la app adopta el de la cuenta. Si el perfil
  // llega en los primeros segundos, recarga al momento; si llega después (en CI puede pasar), lo deja guardado para la
  // próxima vez: en los dos casos, el dispositivo acaba con el idioma de la cuenta
  const adopts = async (language: 'es' | 'en') => {
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('clar_locale')), { timeout: 20_000 })
      .toBe(language);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', language, { timeout: 15_000 });
  };
  await page.evaluate(() => {
    localStorage.removeItem('clar_locale');
    localStorage.removeItem('clar_locale_pending');
  });
  await page.reload();
  await adopts('en');

  // Y al revés: el dispositivo en inglés, la cuenta en español (cambiada desde otro dispositivo): manda la cuenta
  await patchDocument(`users/${uid}`, { language: { stringValue: 'es' } });
  await page.evaluate(() => localStorage.setItem('clar_locale', 'en'));
  await page.reload();
  await adopts('es');
  await expect(page.getByRole('button', { name: 'Listas', exact: true }).first()).toBeVisible();
});

test('a link with ?lang=en opens CLAR in English, keeps it and cleans the address', async ({ page }) => {
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('lang')).toBe(false);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // Y de vuelta, con ?lang=es
  await page.goto('/?lang=es');
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
});

test('a ?lang link does not change the language of an account that has one; this visit shows the link language', async ({
  page
}) => {
  test.slow();
  const email = uniqueEmail();
  await page.goto('/');
  await signInWithGoogle(page, email);
  const uid = await uidOf(email);
  await expect.poll(async () => (await readDocument(`users/${uid}`))?.language).toBe('es');
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Lists', exact: true }).first()).toBeVisible({ timeout: 15_000 });
  // La cuenta sigue en español y, en la próxima visita, manda
  expect((await readDocument(`users/${uid}`))?.language).toBe('es');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 15_000 });
});

test('choosing the language already shown is not a choice for the account', async ({ page }) => {
  // Un dispositivo nuevo: pulsar «Español», que ya se ve, no deja una elección pendiente de pasar a la cuenta
  await page.goto('/');
  await languageGroup(page).getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect(await page.evaluate(() => localStorage.getItem('clar_locale_pending'))).toBeNull();
  // Elegir el otro, sí
  await languageGroup(page).getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => localStorage.getItem('clar_locale_pending'))).toBe('1');
});
