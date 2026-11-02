import { expect, test } from '@playwright/test';
import { signInWithGoogle } from './helpers';

// Sin sesión, la pantalla de entrada presenta CLAR; con sesión, «Compartir CLAR» en el menú de la cuenta
test('signed out, the start screen presents CLAR and leads to creating an account or signing in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /CLAR/ })).toBeVisible();
  const features = page.getByRole('list', { name: 'Qué hace CLAR' });
  for (const title of [
    'Rueda de la Vida',
    'Metas y proyectos',
    'Tu Top 10',
    'Dicta tus tareas',
    'También sin conexión'
  ])
    await expect(features.getByRole('heading', { name: title })).toBeVisible();
  // Las funciones extra no se anuncian
  await expect(page.getByText(/funci[oó]n(es)? extra|Google Calendar/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /el código en GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/Moldovan-Tech/clar-platform'
  );

  await page.getByRole('button', { name: 'Crear cuenta gratis' }).click();
  await expect(page.getByRole('heading', { name: 'Crear una cuenta' })).toBeVisible();
  await page.getByRole('button', { name: 'Ya tengo cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entrar con tu email' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
});

test('the link preview card has its image, title and description', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('<meta property="og:image" content="https://clar.life/og-image.png" />');
  expect(html).toContain('<meta property="og:title" content="CLAR" />');
  const image = await request.get('/og-image.png');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
});

test('«Compartir CLAR» opens the share menu with the app address', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        (window as unknown as { __shared?: ShareData }).__shared = data;
        return Promise.resolve();
      }
    });
  });
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  await page.getByRole('dialog', { name: 'Tu cuenta' }).getByRole('button', { name: 'Compartir CLAR' }).click();
  const shared = await page.evaluate(() => (window as unknown as { __shared?: ShareData }).__shared);
  expect(shared?.title).toBe('CLAR');
  expect(shared?.url).toBe(new URL(page.url()).origin);
});

test('without a share menu, «Compartir CLAR» copies the link and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  const menu = page.getByRole('dialog', { name: 'Tu cuenta' });
  await menu.getByRole('button', { name: 'Compartir CLAR' }).click();
  await expect(menu.getByRole('status').filter({ hasText: 'Enlace copiado' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(page.url()).origin);
});

test('an address that does not exist says so and leads to CLAR; robots.txt keeps the internal paths out', async ({
  page,
  request
}) => {
  await page.goto('/esto-no-existe');
  await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await page.getByRole('link', { name: 'Ir a CLAR' }).click();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /oauth/');
  expect(robots).toContain('Disallow: /__/');
});

test('creating an account with email asks to confirm the age and accept the terms', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear cuenta gratis' }).click();
  await page.getByLabel('Email', { exact: true }).fill('alguien@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('acepta las condiciones de uso');
  await expect(page.getByRole('link', { name: /Leer las condiciones/ })).toHaveAttribute('href', /condiciones/);
  await expect(page.getByRole('checkbox', { name: /acepto las condiciones de uso/ })).toHaveAttribute(
    'aria-invalid',
    'true'
  );
});
