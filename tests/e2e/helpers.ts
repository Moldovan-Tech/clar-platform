import { expect, type Page } from '@playwright/test';
import { ONBOARDING_VERSION } from '../../src/services/onboarding';
import { RELEASE_NOTES } from '../../src/services/releaseNotes';

// Cada test usa una cuenta nueva en el emulador de Auth para no compartir datos
export const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export const EMULATOR_PROJECT = 'demo-neuroproductivity';
// Cuenta que hace de administración en los emuladores (DEMO_ADMIN_EMAIL en functions/src/accessLogic.ts)
export const ADMIN_EMAIL = 'admin@example.com';

// "Bearer owner" es la credencial de administración de los emuladores y salta las reglas
const OWNER_HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const text = (value: string) => ({ stringValue: value });

// uid de una cuenta del emulador de Auth. Aparece al terminar el inicio de sesión: se reintenta hasta encontrarla
export const uidOf = async (email: string) => {
  let uid: string | undefined;
  await expect
    .poll(
      async () => {
        const lookup = await fetch(
          `http://127.0.0.1:9399/identitytoolkit.googleapis.com/v1/projects/${EMULATOR_PROJECT}/accounts:lookup`,
          { method: 'POST', headers: OWNER_HEADERS, body: JSON.stringify({ email: [email] }) }
        );
        uid = ((await lookup.json()) as { users?: { localId: string }[] }).users?.[0]?.localId;
        return uid;
      },
      { message: `cuenta ${email} en el emulador de Auth` }
    )
    .toBeTruthy();
  return uid!;
};

// Escribe campos de un documento en el emulador de Firestore (solo esos: el resto del documento se conserva), con los
// valores en el formato de la API REST (p. ej. { stringValue: 'x' })
export const patchDocument = async (path: string, fields: Record<string, unknown>) => {
  const mask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${field}`)
    .join('&');
  const res = await fetch(
    `http://127.0.0.1:8281/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents/${path}?${mask}`,
    { method: 'PATCH', headers: OWNER_HEADERS, body: JSON.stringify({ fields }) }
  );
  expect(res.ok, await res.text()).toBe(true);
};

// Escribe o borra un documento del emulador de Firestore saltando las reglas (campos de texto). Para preparar estados
// que solo escriben las Cloud Functions
export const writeTextDocument = (path: string, fields: Record<string, string>) =>
  patchDocument(path, Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, text(value)])));
export const deleteDocument = async (path: string) => {
  const res = await fetch(
    `http://127.0.0.1:8281/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents/${path}`,
    { method: 'DELETE', headers: OWNER_HEADERS }
  );
  expect(res.ok, await res.text()).toBe(true);
};

// Campos de un documento del emulador de Firestore, como texto, número o booleano (null si no existe)
export const readDocument = async (path: string) => {
  const res = await fetch(
    `http://127.0.0.1:8281/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents/${path}`,
    {
      headers: OWNER_HEADERS
    }
  );
  if (res.status === 404) return null;
  const { fields } = (await res.json()) as { fields: Record<string, Record<string, unknown>> };
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Object.values(value)[0]]));
};

// Da por vista la bienvenida, como si la cuenta ya la hubiera pasado, y las novedades de la versión actual: casi
// todas las pruebas no las necesitan. Con `releaseNotes: false`, la cuenta aún no ha visto las novedades
export const markOnboarded = async (email: string, { releaseNotes = true }: { releaseNotes?: boolean } = {}) => {
  await patchDocument(`users/${await uidOf(email)}`, {
    hasSeenOnboarding: { booleanValue: true },
    onboardingVersion: { integerValue: String(ONBOARDING_VERSION) },
    ...(releaseNotes ? { releaseNotesSeen: { stringValue: RELEASE_NOTES[0].version } } : {})
  });
};

// Aprueba el acceso de una cuenta escribiendo access/{uid} en el emulador como lo haría la Cloud Function.
// Por defecto también da por vista la bienvenida (antes de aprobar, para que la app ya lo sepa al abrirse).
export const approveAccess = async (email: string, { onboarded = true }: { onboarded?: boolean } = {}) => {
  if (onboarded) await markOnboarded(email);
  const now = new Date().toISOString();
  await patchDocument(`access/${await uidOf(email)}`, {
    status: text('approved'),
    email: text(email),
    name: text(''),
    photoUrl: text(''),
    message: text(''),
    requestedAt: text(now),
    decidedAt: text(now)
  });
};

// Inicio de sesión con Google a través de la ventana emergente del emulador de Auth. Por defecto aprueba
// el acceso de la cuenta para entrar directamente en la app; con approve: false se queda en la solicitud.
export const signInWithGoogle = async (
  page: Page,
  email = uniqueEmail(),
  name = 'Persona de Prueba',
  { approve = true, onboarded = true }: { approve?: boolean; onboarded?: boolean } = {}
) => {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('load');
  // El botón solo responde cuando el script de la ventana ya está registrado; se reintenta hasta ver el formulario
  await expect(async () => {
    await popup.locator('#add-account-button').click();
    await expect(popup.locator('#email-input')).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await popup.locator('#email-input').fill(email);
  await popup.locator('#display-name-input').fill(name);
  await popup.locator('#sign-in').click();
  if (approve) {
    await approveAccess(email, { onboarded });
    await expect(page.getByRole('button', { name: 'Nueva tarea' })).toBeVisible();
  } else if (onboarded) {
    await markOnboarded(email);
  }
  return email;
};

// Fecha local (YYYY-MM-DD) a N días de hoy; los campos de fecha la aceptan escrita así
// Reloj de Playwright lejos de medianoche: las pruebas de alarmas ponen la alarma y el plazo unos minutos después de
// ahora, y cerca de medianoche caerían en días distintos. Se atrasa o se adelanta lo justo (poco: la sesión del
// emulador sigue valiendo). La hora se calcula aquí, en la zona horaria de la prueba (la de su test.use o, sin ella, la
// del equipo): antes de cargar nada, la página aún no tiene la zona emulada en todos los navegadores (en CI, Chromium
// en Linux daba la hora UTC)
export const installClockAwayFromMidnight = async (
  page: Page,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
  const value = (type: string) => Number(parts.formatToParts(new Date()).find((p) => p.type === type)?.value ?? 0);
  const minutes = value('hour') * 60 + value('minute');
  const shift = minutes >= 22 * 60 + 50 ? -120 : minutes < 15 ? 30 : 0;
  await page.clock.install({ time: new Date(Date.now() + shift * 60_000) });
};

export const localDateFromToday = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface NewTask {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimateMinutes?: number;
  repeat?: { frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'; monthlyOption?: string | RegExp };
}

// Despliega «Más opciones» del formulario de tarea (descripción, estimación, área, inicio, repetición…) si está plegado
export const showMoreOptions = async (page: Page) => {
  const toggle = page.getByRole('button', { name: /^Más opciones/ });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
};

// Rellena y guarda el formulario de tarea, que ya debe estar abierto
export const fillAndSaveTask = async (page: Page, task: NewTask) => {
  await page.getByPlaceholder('ej. Llamar al proveedor para acordar el plazo de entrega').fill(task.title);
  if (task.dueDate) await page.getByLabel('Fecha límite', { exact: true }).fill(task.dueDate);
  if (task.dueTime) await page.getByLabel('Hora límite').fill(task.dueTime);
  if (task.priority)
    await page
      .getByRole('dialog')
      .getByLabel(/^Prioridad/)
      .selectOption(task.priority);
  if (task.description || task.startDate || task.estimateMinutes || task.repeat) await showMoreOptions(page);
  if (task.description)
    await page
      .getByPlaceholder('Detalla el resultado esperado, personas involucradas o requerimientos físicos previos...')
      .fill(task.description);
  if (task.startDate) await page.getByLabel('Fecha de inicio', { exact: true }).fill(task.startDate);
  if (task.estimateMinutes) await page.getByLabel('Estimación (duración)').selectOption(String(task.estimateMinutes));
  if (task.repeat) {
    await page.getByLabel('Repetir').selectOption(task.repeat.frequency);
    if (task.repeat.monthlyOption) await page.getByRole('radio', { name: task.repeat.monthlyOption }).check();
  }
  const saveButton = page.getByRole('button', { name: 'Guardar la tarea' });
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.click();
  await expect(saveButton).toBeHidden();
};

export const expectNoHorizontalOverflow = async (page: Page, where: string) => {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > width + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 60)}`);
    return { scrollWidth: document.documentElement.scrollWidth, width, offenders };
  });
  expect(overflow.scrollWidth, `${where}: ${overflow.offenders.join(' | ')}`).toBeLessThanOrEqual(overflow.width);
};

// Ningún elemento visible tiene contenido que se salga de su caja (p. ej. una cifra más ancha que su tarjeta)
export const expectNoInnerOverflow = async (page: Page, where: string) => {
  const offenders = await page.evaluate(() =>
    [...document.querySelectorAll('header *, main *')]
      // Los elementos SVG no son cajas: su scrollWidth no indica desbordamiento
      .filter((el) => !(el instanceof SVGElement))
      .filter(
        (el) =>
          getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1
      )
      .slice(0, 5)
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}«${(el.textContent ?? '').trim().slice(0, 30)}» ${el.scrollWidth}>${el.clientWidth}`
      )
  );
  expect(offenders, where).toEqual([]);
};

// Enlace de un email de Firebase Auth (verificación o recuperación) que el emulador guarda en lugar de enviarlo
export const emulatorOobCode = async (email: string, requestType: 'VERIFY_EMAIL' | 'PASSWORD_RESET') => {
  let code: { oobCode: string; oobLink: string } | undefined;
  await expect
    .poll(
      async () => {
        const res = await fetch(`http://127.0.0.1:9399/emulator/v1/projects/${EMULATOR_PROJECT}/oobCodes`);
        const { oobCodes } = (await res.json()) as {
          oobCodes: { email: string; requestType: string; oobCode: string; oobLink: string }[];
        };
        code = oobCodes.filter((c) => c.email === email && c.requestType === requestType).at(-1);
        return Boolean(code);
      },
      { message: `email ${requestType} para ${email}` }
    )
    .toBe(true);
  return code!;
};

// Llama a una Cloud Function «callable» del emulador como lo hace la app, con el token de la cuenta
export const callFunction = (name: string, idToken: string, data: unknown) =>
  fetch(`http://127.0.0.1:5021/${EMULATOR_PROJECT}/europe-west1/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });

// Abre una sección. En tableta y escritorio están en la cabecera; en el móvil (< 768 px), en la barra inferior las
// cuatro primeras y las demás en la hoja «Más»
const BOTTOM_BAR_SECTIONS = ['Inicio', 'Listas', 'Agenda', 'Metas'];
export const openSection = async (page: Page, name: string) => {
  const isPhone = (page.viewportSize()?.width ?? 1280) < 768;
  if (isPhone && !BOTTOM_BAR_SECTIONS.includes(name))
    await page.getByRole('button', { name: /^Más secciones/ }).click();
  await page.getByRole('button', { name, exact: true }).click();
};

// Marca una tarea como hecha con el círculo de su tarjeta
export const completeTask = (page: Page, title: string) =>
  page.getByRole('button', { name: `Marcar «${title}» como hecha`, exact: true }).click();

// Abre el panel «⋯» de una tarea: Editar, Estado, Añadir al calendario y Eliminar
export const openTaskActions = (page: Page, title: string) =>
  page.getByRole('button', { name: `Acciones de «${title}»`, exact: true }).click();

// Cuenta con email y contraseña ya confirmada, creada directamente en el emulador de Auth, con su token
export const createVerifiedAccount = async (password = 'clave-segura-1', email = uniqueEmail()) => {
  const auth = 'http://127.0.0.1:9399/identitytoolkit.googleapis.com/v1';
  const json = { 'Content-Type': 'application/json' };
  const signUp = await fetch(`${auth}/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const { localId: uid } = (await signUp.json()) as { localId: string };
  await fetch(`${auth}/projects/${EMULATOR_PROJECT}/accounts:update`, {
    method: 'POST',
    headers: OWNER_HEADERS,
    body: JSON.stringify({ localId: uid, emailVerified: true })
  });
  const signIn = await fetch(`${auth}/accounts:signInWithPassword?key=demo-api-key`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const { idToken } = (await signIn.json()) as { idToken: string };
  return { email, uid, idToken };
};

// Documentos de una colección del emulador de Firestore (id y campos simples)
export const listDocuments = async (collection: string) => {
  const res = await fetch(
    `http://127.0.0.1:8281/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents/${collection}?pageSize=300`,
    { headers: OWNER_HEADERS }
  );
  const { documents = [] } = (await res.json()) as {
    documents?: { name: string; fields: Record<string, Record<string, unknown>> }[];
  };
  return documents.map(({ name, fields }) => ({
    id: name.split('/').pop()!,
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Object.values(value)[0]]))
  })) as ({ id: string } & Record<string, unknown>)[];
};
