import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  approveAccess,
  callFunction,
  createVerifiedAccount,
  EMULATOR_PROJECT,
  emulatorOobCode,
  patchDocument,
  readDocument,
  signInWithGoogle,
  uidOf,
  uniqueEmail
} from './helpers';

// Esperas que pasan por una Cloud Function del emulador: con la suite en paralelo su arranque puede tardar
const SERVER_CALL = { timeout: 15_000 };

const PASSWORD = 'clave-segura-1';

const signUp = async (page: Page, email: string) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear una cuenta' }).click();
  await page.getByLabel('Nombre (opcional)').fill('Lucía Prueba');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByLabel(/^Tengo \d+ años o más/).check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
};

const signIn = async (page: Page, email: string, password: string) => {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
};

// Cerrar sesión borra la caché local y recarga la página: hay que esperar a la recarga antes de volver a entrar,
// o lo escrito en el formulario de acceso se pierde
const signOutWith = async (page: Page, button: Locator) => {
  const reloaded = page.waitForEvent('load', SERVER_CALL);
  await button.click();
  await reloaded;
};

const openSecurity = async (page: Page) => {
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  return page.getByRole('dialog', { name: 'Tu cuenta' });
};

test('a new account with email and password confirms its email before asking for access', async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);

  // Sin confirmar el email no puede solicitar acceso
  await expect(page.getByRole('heading', { name: 'Confirma tu email' })).toBeVisible();
  await page.getByRole('button', { name: 'Ya lo he confirmado' }).click();
  await expect(page.getByRole('alert')).toContainText('aún no consta como confirmado');

  // Se abre el enlace del email (el emulador lo guarda) y ya puede solicitar acceso
  const { oobLink } = await emulatorOobCode(email, 'VERIFY_EMAIL');
  expect((await fetch(oobLink)).ok).toBe(true);
  await page.getByRole('button', { name: 'Ya lo he confirmado' }).click();
  await expect(page.getByRole('heading', { name: 'Solicita acceso' })).toBeVisible(SERVER_CALL);
  await page.getByRole('button', { name: 'Solicitar acceso' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitud enviada' })).toBeVisible(SERVER_CALL);

  // Aprobada, entra en la app; al volver a entrar con email y contraseña también
  await approveAccess(email);
  await expect(page.getByRole('button', { name: 'Nueva tarea', exact: true })).toBeVisible();
  const account = await openSecurity(page);
  await expect(account).toContainText('Entras con email y contraseña');
  await signOutWith(page, account.getByRole('button', { name: 'Cerrar sesión', exact: true }));
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('button', { name: 'Nueva tarea', exact: true })).toBeVisible();
});

test('the server refuses an access request from an account whose email is not confirmed', async () => {
  // Cuenta con contraseña creada en el emulador de Auth, sin confirmar el email, que llama a la función sin pasar por la app
  const signUp = await fetch(
    'http://127.0.0.1:9399/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail(), password: PASSWORD, returnSecureToken: true })
    }
  );
  expect(signUp.ok).toBe(true);
  const { idToken, localId } = (await signUp.json()) as { idToken: string; localId: string };

  const res = await callFunction('requestAccess', idToken, { message: 'Hola' });
  expect(res.status).toBe(403);
  expect(((await res.json()) as { error: { status: string } }).error.status).toBe('PERMISSION_DENIED');

  // Y no queda ninguna solicitud guardada
  const access = await fetch(
    `http://127.0.0.1:8281/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents/access/${localId}`,
    { headers: { Authorization: 'Bearer owner' } }
  );
  expect(access.status).toBe(404);
});

test('wrong passwords are rejected and a forgotten password can be reset by email', async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Confirma tu email' })).toBeVisible();
  await signOutWith(page, page.getByRole('button', { name: 'Cerrar sesión' }));

  await signIn(page, email, 'no-es-esta');
  await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos.');

  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Enviar el enlace' }).click();
  await expect(page.getByText(/te hemos enviado un enlace para crear una contraseña nueva/)).toBeVisible();

  // El enlace del email permite poner una contraseña nueva
  const { oobCode } = await emulatorOobCode(email, 'PASSWORD_RESET');
  const reset = await fetch(
    'http://127.0.0.1:9399/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-api-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oobCode, newPassword: 'clave-nueva-22' })
    }
  );
  expect(reset.ok).toBe(true);

  await page.getByRole('button', { name: 'Volver a entrar' }).click();
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos.');
  await signIn(page, email, 'clave-nueva-22');
  // Recuperar la contraseña con el enlace del email ya confirma la dirección
  await expect(page.getByRole('heading', { name: 'Solicita acceso' })).toBeVisible(SERVER_CALL);
});

test('the account changes its password, closes every session and deletes itself with its password', async ({
  page
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  const { oobLink } = await emulatorOobCode(email, 'VERIFY_EMAIL');
  await fetch(oobLink);
  await page.getByRole('button', { name: 'Ya lo he confirmado' }).click();
  await approveAccess(email);
  await expect(page.getByRole('button', { name: 'Nueva tarea', exact: true })).toBeVisible();

  // Cambiar la contraseña. Lo escrito no se conserva al cerrar el diálogo
  let account = await openSecurity(page);
  await account.getByRole('button', { name: 'Cambiar la contraseña' }).click();
  await account.getByLabel('Contraseña actual').fill(PASSWORD);
  await account.getByRole('button', { name: 'Cerrar', exact: true }).click();
  account = await openSecurity(page);
  await expect(account.getByLabel('Contraseña actual')).toHaveCount(0);
  await account.getByRole('button', { name: 'Cambiar la contraseña' }).click();
  await expect(account.getByLabel('Contraseña actual')).toHaveValue('');
  await account.getByLabel('Contraseña actual').fill(PASSWORD);
  await account.getByLabel('Contraseña nueva').fill('otra-clave-333');
  await account.getByRole('button', { name: 'Guardar la contraseña nueva' }).click();
  await expect(account.getByText('Contraseña cambiada.')).toBeVisible();

  // Cerrar sesión en todos los dispositivos (también en este) y volver a entrar con la nueva
  await account.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }).click();
  await signOutWith(page, account.getByRole('button', { name: 'Cerrar todas las sesiones' }));
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await signIn(page, email, 'otra-clave-333');
  await expect(page.getByRole('button', { name: 'Nueva tarea', exact: true })).toBeVisible();

  // Una reunión y un correo guardados antes de la 1.3.0, sin pantalla en la app: se borran con la cuenta
  const uid = await uidOf(email);
  await patchDocument(`users/${uid}/meetings/meet-legacy`, { id: { stringValue: 'meet-legacy' } });
  await patchDocument(`users/${uid}/emails/email-legacy`, { id: { stringValue: 'email-legacy' } });

  // Eliminar la cuenta pide la contraseña
  account = await openSecurity(page);
  await account.getByRole('button', { name: 'Eliminar mi cuenta y todos mis datos' }).click();
  await account.getByLabel('Contraseña', { exact: true }).fill('otra-clave-333');
  await signOutWith(page, account.getByRole('button', { name: 'Eliminar definitivamente' }));
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await signIn(page, email, 'otra-clave-333');
  await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos.');
  expect(await readDocument(`users/${uid}/meetings/meet-legacy`)).toBeNull();
  expect(await readDocument(`users/${uid}/emails/email-legacy`)).toBeNull();
});

test('an account that also has a password is not asked for it to delete itself after signing in with Google', async ({
  page
}) => {
  // Creada con email y contraseña; después se entra con Google con el mismo email (Firebase une las dos)
  const { email, idToken } = await createVerifiedAccount(PASSWORD);
  await page.goto('/');
  await signInWithGoogle(page, email, 'Lucía Prueba', { approve: false });
  await expect(page.getByRole('heading', { name: 'Solicita acceso' })).toBeVisible(SERVER_CALL);
  // La cuenta tiene las dos formas de entrar
  const lookup = await fetch(
    'http://127.0.0.1:9399/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo-api-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  const { users } = (await lookup.json()) as { users: { providerUserInfo: { providerId: string }[] }[] };
  expect(users[0].providerUserInfo.map((p) => p.providerId).sort()).toEqual(['google.com', 'password']);

  await page.getByRole('button', { name: 'Eliminar mi cuenta y mis datos' }).click();
  const panel = page.getByRole('form', { name: 'Eliminar tu cuenta' });
  await expect(panel).toContainText('Para confirmarlo, Google te pedirá que vuelvas a entrar.');
  await expect(panel.getByLabel('Contraseña', { exact: true })).toHaveCount(0);
  // Puede confirmar con su contraseña si lo prefiere
  // Al abrir, el foco va a confirmar; al cambiar a la contraseña, a su campo
  await expect(panel.getByRole('button', { name: 'Eliminar definitivamente' })).toBeFocused();
  await panel.getByRole('button', { name: 'Confirmar con mi contraseña en su lugar' }).click();
  await expect(panel.getByLabel('Contraseña', { exact: true })).toBeFocused();
  await panel.getByRole('button', { name: 'Confirmar con Google en su lugar' }).click();
  await expect(panel.getByLabel('Contraseña', { exact: true })).toHaveCount(0);
  // Cancelar devuelve el foco al botón que abrió el panel
  await panel.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('button', { name: 'Eliminar mi cuenta y mis datos' })).toBeFocused();
});
