import { expect, test, type Page } from '@playwright/test';
import { signInWithGoogle } from './helpers';

// VERSIÓN NUEVA con la ventana abierta (src/services/appUpdate.ts): la app compara su trozo de entrada con el que dice
// /version.json. En desarrollo esa dirección devuelve la app; aquí se simula lo publicado
const BANNER = 'Versión nueva de CLAR';
// El trozo de entrada de la app en desarrollo: publicarlo es publicar la versión que ya se usa
const DEV_ENTRY = '/src/main.tsx';

const publish = async (page: Page, build: string | null) => {
  await page.unroute('**/version.json');
  await page.route('**/version.json', (route) =>
    build
      ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '9.9.9', build }) })
      : route.fulfill({ status: 503, body: 'no' })
  );
};

test('from «Tu cuenta»: check for updates, see a new version, put it off, and update now', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  const openAccount = async () => {
    await page.getByRole('button', { name: 'Tu cuenta' }).click();
    const account = page.getByRole('dialog', { name: 'Tu cuenta' });
    await expect(account).toContainText(/Usas la versión \d+\.\d+\.\d+\./);
    return account;
  };

  const account = await openAccount();
  const check = account.getByRole('button', { name: 'Buscar actualizaciones' });
  const status = account.getByRole('status').filter({ hasText: /versión|comprobar/ });

  // Sin poder saber lo publicado (sin conexión, error del servidor): lo dice y no ofrece nada
  await publish(page, null);
  await check.click();
  await expect(status).toHaveText('No se pudo comprobar. Revisa la conexión y vuelve a intentarlo.');

  // Publicada la que ya se usa: es la última
  await publish(page, DEV_ENTRY);
  await check.click();
  await expect(status).toHaveText('Tienes la última versión.');

  // Con una versión nueva publicada: lo dice, y el mismo botón (con el foco) pasa a «Actualizar ahora»; el aviso
  // espera a que se cierre la ventana y «Más tarde» lo oculta
  await publish(page, 'e2e-new');
  await check.click();
  await expect(status).toHaveText('Hay una versión nueva.');
  const updateNow = account.getByRole('button', { name: 'Actualizar ahora' });
  await expect(updateNow).toBeFocused();
  const banner = page.getByRole('region', { name: BANNER });
  await expect(banner).toHaveCount(0);
  await account.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(banner).toContainText('Hay una versión nueva de CLAR.');
  await banner.getByRole('button', { name: 'Más tarde' }).click();
  await expect(banner).toHaveCount(0);

  // «Actualizar ahora» vuelve a cargar la app
  await (await openAccount()).getByRole('button', { name: 'Buscar actualizaciones' }).click();
  const reloaded = page.waitForEvent('load');
  await page.getByRole('dialog', { name: 'Tu cuenta' }).getByRole('button', { name: 'Actualizar ahora' }).click();
  await reloaded;
  await expect(page.getByRole('button', { name: 'Tu cuenta' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('region', { name: BANNER })).toHaveCount(0);
});

test('with the window open, the app notices a new version by itself, and «Later» lasts until another one', async ({
  page
}) => {
  await page.clock.install();
  await page.goto('/');
  await signInWithGoogle(page);
  await publish(page, 'e2e-new');

  // Al entrar no se mira enseguida; sí cada media hora con la ventana a la vista
  const banner = page.getByRole('region', { name: BANNER });
  await page.clock.fastForward('10:00');
  await expect(banner).toHaveCount(0);
  await page.clock.fastForward('21:00');
  await expect(banner).toBeVisible();

  // Con una ventana abierta el aviso espera (no invita a recargar con un formulario a medias)
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).first().click();
  await expect(banner).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(banner).toBeVisible();

  // «Más tarde» vale para esa versión: no vuelve con ella, sí con otra
  await banner.getByRole('button', { name: 'Más tarde' }).click();
  await page.clock.fastForward('31:00');
  await expect(banner).toHaveCount(0);
  await publish(page, 'e2e-newer');
  await page.clock.fastForward('31:00');
  await expect(banner).toBeVisible();

  const reloaded = page.waitForEvent('load');
  await banner.getByRole('button', { name: 'Actualizar' }).click();
  await reloaded;
});
