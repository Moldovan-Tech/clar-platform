import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  installClockAwayFromMidnight,
  openSection,
  patchDocument,
  showMoreOptions,
  signInWithGoogle,
  uidOf,
  uniqueEmail
} from './helpers';

const MADRID = 'Europe/Madrid';
test.use({ timezoneId: MADRID });

// Notificaciones del sistema de prueba: se apuntan en window.__notifications. El permiso empieza sin decidir.
const fakeNotifications = (target: Page | BrowserContext, initial: NotificationPermission = 'default') =>
  target.addInitScript((start) => {
    // `source`: de la página (new Notification) o del service worker (registration.showNotification)
    const shown: { title: string; body?: string; source: 'page' | 'sw' }[] = [];
    let permission = start;
    class FakeNotification {
      static get permission() {
        return permission;
      }
      static requestPermission() {
        permission = 'granted';
        return Promise.resolve(permission);
      }
      onclick: (() => void) | null = null;
      constructor(title: string, options?: NotificationOptions) {
        shown.push({ title, body: options?.body, source: 'page' });
      }
      close() {}
    }
    Object.defineProperty(window, 'Notification', { value: FakeNotification, configurable: true });
    Object.defineProperty(window, '__notifications', { value: shown });
    // Las del service worker (las que usa CLAR cuando lo tiene registrado), también apuntadas
    if ('ServiceWorkerRegistration' in window)
      ServiceWorkerRegistration.prototype.showNotification = function (title: string, options?: NotificationOptions) {
        shown.push({ title, body: options?.body, source: 'sw' });
        return Promise.resolve();
      };
  }, initial);
const notifications = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __notifications: { title: string; body?: string; source: 'page' | 'sw' }[] })
        .__notifications
  );

// Fecha y horas locales a N minutos de ahora (en el reloj de la página)
const fromNow = (page: Page, minutes: number) =>
  page.evaluate((m) => {
    const d = new Date(Date.now() + m * 60_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
  }, minutes);

const newTaskWithAlarm = async (page: Page, title: string, due: { date: string; time: string }, alarm: string) => {
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  await page.getByPlaceholder('ej. Llamar al proveedor para acordar el plazo de entrega').fill(title);
  await page.getByLabel('Fecha límite', { exact: true }).fill(due.date);
  await page.getByLabel('Hora límite').fill(due.time);
  await page.getByLabel(/^Alarma/).fill(alarm);
};

test('an alarm warns in CLAR and with a system notification, only once', async ({ page }) => {
  test.slow(); // Recarga la página
  await fakeNotifications(page);
  await installClockAwayFromMidnight(page, MADRID);
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Listas');

  const title = `Llamar al banco ${Date.now().toString(36)}`;
  const due = await fromNow(page, 30);
  const alarm = await fromNow(page, 2);
  await newTaskWithAlarm(page, title, due, alarm.time);
  await expect(page.getByText(new RegExp(`^Sonará (hoy|mañana) a las ${alarm.time}\\.`))).toBeVisible();
  await page.getByRole('button', { name: 'Activar también las notificaciones del sistema' }).click();
  await expect(page.getByText('También recibirás una notificación del sistema.')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar la tarea' }).click();

  // La tarjeta lleva la campana con el día y la hora
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(card).toContainText(new RegExp(`Alarma:(hoy|mañana) ${alarm.time}`));
  const alert = page.getByRole('region', { name: `Alarma: ${title}` });
  await expect(alert).toHaveCount(0);

  // A su hora, con una ventana abierta: la notificación del sistema sale ya y el aviso de la app espera a que se
  // cierre (fuera de la ventana no se llegaría a él con el teclado)
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  await page.clock.fastForward('03:00');
  await expect
    .poll(() => notifications(page))
    .toEqual([expect.objectContaining({ title: `Alarma de las ${alarm.time}: ${title}` })]);
  await expect(alert).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(`Vence: `);

  // «Ver tarea» la abre para editarla y quita el aviso
  await alert.getByRole('button', { name: 'Ver tarea' }).click();
  const editor = page.getByRole('dialog', { name: 'Editar la tarea' });
  await expect(editor.getByLabel(/^Alarma/)).toHaveValue(alarm.time);
  await page.keyboard.press('Escape');
  await expect(alert).toHaveCount(0);

  // Al recargar no vuelve a sonar
  const reloaded = page.waitForEvent('load');
  await page.reload();
  await reloaded;
  await openSection(page, 'Listas');
  await expect(card).toBeVisible();
  await page.clock.fastForward('01:00');
  await expect(alert).toHaveCount(0);
  expect(await notifications(page)).toEqual([]);
});

test('an alarm that passed with CLAR closed warns on opening while the task is not due yet', async ({ page }) => {
  // Aunque el navegador no deje guardar las alarmas ya avisadas (almacenamiento lleno o bloqueado), avisa igual
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')!.value as Storage['setItem'];
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (key.startsWith('clar_alarms_fired:')) throw new DOMException('Lleno', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await installClockAwayFromMidnight(page, MADRID);
  const email = uniqueEmail();
  await page.goto('/');
  await signInWithGoogle(page, email);
  await openSection(page, 'Listas');

  // La alarma se puso hace diez minutos y su hora pasó hace cinco, con CLAR cerrada: la tarea llega así (como al abrir
  // CLAR, o desde otro dispositivo), sin recargar ni adelantar el reloj
  const uid = await uidOf(email);
  const title = `Enviar el informe ${Date.now().toString(36)}`;
  const id = `task-qa-${Date.now()}`;
  const alarmTime = (await fromNow(page, -5)).time;
  const due = await fromNow(page, 20);
  const setAt = await page.evaluate(() => new Date(Date.now() - 10 * 60_000).toISOString());
  const text = (value: string) => ({ stringValue: value });
  await patchDocument(`users/${uid}/tasks/${id}`, {
    id: text(id),
    userId: text(uid),
    listContext: text('WORK'),
    title: text(title),
    description: text(''),
    priority: text('MEDIUM'),
    status: text('PENDING'),
    isSomeday: { booleanValue: false },
    observations: { arrayValue: {} },
    createdAt: text(setAt),
    updatedAt: text(setAt),
    dueDate: text(due.date),
    dueTime: text(due.time),
    alarmTime: text(alarmTime),
    alarmSetAt: text(setAt)
  });
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });

  // El aviso dice su hora y, como llega tarde, cuándo era
  const alert = page.getByRole('region', { name: `Alarma: ${title}` });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(`Alarma · ${alarmTime}`);
  await expect(alert).toContainText(new RegExp(`Era (a las|el .+ a las) ${alarmTime}: CLAR no estaba abierta`));
  // Sin permiso de notificaciones, el aviso sale solo dentro de la app; se cierra con su botón
  await alert.getByRole('button', { name: `Cerrar la alarma de «${title}»` }).click();
  await expect(alert).toHaveCount(0);
});

test('an alarm needs a due date; it rings that day, before the due time if there is one, also when repeating', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Listas');
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  const alarmField = page.getByLabel(/^Alarma/);
  await expect(alarmField).toBeDisabled();
  await expect(alarmField).toHaveAccessibleDescription(/Pon una fecha límite para poder añadir una alarma\./);

  // Solo con fecha: ese día, a su hora
  await page.getByLabel('Fecha límite', { exact: true }).fill('2030-06-15');
  await expect(alarmField).toBeEnabled();
  await alarmField.fill('20:00');
  await expect(alarmField).toHaveAccessibleDescription(/^Sonará el 15 jun a las 20:00\./);

  // Repetida sin hora: también la lleva, cada repetición su día (desde el 10 de junio de 2030)
  await showMoreOptions(page);
  await page.getByLabel('Fecha de inicio', { exact: true }).fill('2030-06-10');
  await page.getByLabel('Repetir').selectOption('WEEKLY');
  await expect(alarmField).toBeEnabled();
  await expect(alarmField).toHaveValue('20:00');
  await expect(alarmField).toHaveAccessibleDescription(/^Sonará el .+ a las 20:00\./);

  // Con hora límite, tiene que ser antes: si no, lo dice y no deja guardar
  await page.getByLabel('Hora límite').fill('09:00');
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'La alarma tiene que ser antes de la hora límite (09:00): cámbiala o quítala.' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar la tarea' })).toBeDisabled();
  await alarmField.fill('08:30');
  await expect(alarmField).toHaveAccessibleDescription(/^Sonará el .+ a las 08:30\./);
});

test('an alarm saved after its time says it will not ring, and does not', async ({ page }) => {
  await fakeNotifications(page, 'granted');
  await installClockAwayFromMidnight(page, MADRID);
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Listas');
  const title = `Pagar la factura ${Date.now().toString(36)}`;
  const alarmTime = (await fromNow(page, -5)).time;
  await newTaskWithAlarm(page, title, await fromNow(page, 20), alarmTime);
  await expect(page.getByLabel(/^Alarma/)).toHaveAccessibleDescription(
    new RegExp(`^Esa hora ya ha pasado \\((hoy|el .+) a las ${alarmTime}\\): no sonará\\.`)
  );
  await page.getByRole('button', { name: 'Guardar la tarea' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Pasa un minuto: el aviso no sale
  await page.clock.fastForward('01:00');
  await expect(page.getByRole('region', { name: `Alarma: ${title}` })).toHaveCount(0);
  expect(await notifications(page)).toEqual([]);
});

test('with two tabs open, both show the alert and the system notification comes once', async ({ context }) => {
  test.slow(); // Dos pestañas
  await fakeNotifications(context, 'granted');
  const first = await context.newPage();
  await installClockAwayFromMidnight(first, MADRID);
  await first.goto('/');
  await signInWithGoogle(first);
  await openSection(first, 'Listas');
  const second = await context.newPage();
  await installClockAwayFromMidnight(second, MADRID);
  await second.goto('/');
  await openSection(second, 'Listas');

  const title = `Pagar la factura ${Date.now().toString(36)}`;
  await newTaskWithAlarm(first, title, await fromNow(first, 30), (await fromNow(first, 2)).time);
  await first.getByRole('button', { name: 'Guardar la tarea' }).click();
  await expect(second.getByRole('heading', { name: title })).toBeVisible();

  await first.clock.fastForward('03:00');
  await second.clock.fastForward('03:00');
  for (const page of [first, second])
    await expect(page.getByRole('region', { name: `Alarma: ${title}` })).toBeVisible();
  const shown = [...(await notifications(first)), ...(await notifications(second))];
  expect(shown.filter((n) => n.title.endsWith(`: ${title}`))).toHaveLength(1);
});

test('on Android the notification comes from the service worker, and the account menu offers to turn it on', async ({
  browser
}) => {
  test.slow(); // Contexto propio con el navegador de un móvil Android
  const context = await browser.newContext({
    timezoneId: 'Europe/Madrid',
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
  });
  await fakeNotifications(context);
  const page = await context.newPage();
  await installClockAwayFromMidnight(page, MADRID);
  await page.goto('/');
  await signInWithGoogle(page);
  await expect
    .poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration())))
    .toBe(true);

  // Antes no se ofrecían en Android; ahora sí, también fuera del formulario
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  const account = page.getByRole('dialog', { name: 'Tu cuenta' });
  await account.getByRole('button', { name: 'Activar las notificaciones de las alarmas' }).click();
  await expect(account.getByText('También recibirás una notificación del sistema.')).toBeVisible();
  await account.getByRole('button', { name: 'Cerrar', exact: true }).click();

  await openSection(page, 'Listas');
  const title = `Recoger el paquete ${Date.now().toString(36)}`;
  await newTaskWithAlarm(page, title, await fromNow(page, 30), (await fromNow(page, 2)).time);
  await page.getByRole('button', { name: 'Guardar la tarea' }).click();
  await page.clock.fastForward('03:00');
  await expect(page.getByRole('region', { name: `Alarma: ${title}` })).toBeVisible();
  // Una sola, y desde el service worker: Chrome en Android no admite las de la página
  const alarm = (await notifications(page)).filter((n) => n.title.endsWith(`: ${title}`));
  expect(alarm.map((n) => n.source)).toEqual(['sw']);
  await context.close();
});

// Una tarea con alarma puesta hace diez minutos, escrita en el servidor (como si llegara de otro dispositivo). Devuelve
// su título y la clave de su alarma («tarea@momento», la etiqueta de la notificación)
const serverTaskWithAlarm = async (page: Page, email: string, alarmInMinutes: number) => {
  const uid = await uidOf(email);
  const title = `Pagar el recibo ${Date.now().toString(36)}`;
  const id = `task-qa-${Date.now()}`;
  const alarm = await fromNow(page, alarmInMinutes);
  const due = await fromNow(page, alarmInMinutes + 20);
  const setAt = await page.evaluate(() => new Date(Date.now() - 10 * 60_000).toISOString());
  const text = (value: string) => ({ stringValue: value });
  // La alarma es ese día a esa hora, en la zona de la página
  const at = await page.evaluate(({ date, time }) => new Date(`${date}T${time}:00`).toISOString(), {
    date: due.date,
    time: alarm.time
  });
  const key = `${id}@${at}`;
  const write = () =>
    patchDocument(`users/${uid}/tasks/${id}`, {
      id: text(id),
      userId: text(uid),
      listContext: text('WORK'),
      title: text(title),
      description: text(''),
      priority: text('MEDIUM'),
      status: text('PENDING'),
      isSomeday: { booleanValue: false },
      observations: { arrayValue: {} },
      createdAt: text(setAt),
      updatedAt: text(setAt),
      dueDate: text(due.date),
      dueTime: text(due.time),
      alarmTime: text(alarm.time),
      alarmSetAt: text(setAt)
    });
  return { title, key, write };
};

test('an alarm that already arrived by push is not notified again on opening CLAR; the in-app alert stays', async ({
  page
}) => {
  await fakeNotifications(page, 'granted');
  await installClockAwayFromMidnight(page, MADRID);
  const email = uniqueEmail();
  await page.goto('/');
  await signInWithGoogle(page, email);
  await openSection(page, 'Listas');
  const { title, key, write } = await serverTaskWithAlarm(page, email, -5);
  // El service worker apuntó que la mostró con CLAR cerrada (public/sw.js)
  await page.evaluate(async (k) => {
    const cache = await caches.open('clar-push-shown');
    await cache.put(`/__clar/push-shown/${encodeURIComponent(k)}`, new Response(String(Date.now())));
  }, key);
  await write();
  await expect(page.getByRole('region', { name: `Alarma: ${title}` })).toBeVisible({ timeout: 15_000 });
  expect((await notifications(page)).filter((n) => n.title.endsWith(`: ${title}`))).toEqual([]);
});

test('tapping an alarm notification opens its task, with CLAR closed or open', async ({ page }) => {
  await installClockAwayFromMidnight(page, MADRID);
  const email = uniqueEmail();
  await page.goto('/');
  await signInWithGoogle(page, email);
  const { title, key, write } = await serverTaskWithAlarm(page, email, 30);
  await write();
  await openSection(page, 'Listas');
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });

  // Con CLAR cerrada, la notificación abre /?alarma=<clave>, que se quita de la dirección
  await page.goto(`/?alarma=${encodeURIComponent(key)}`);
  const editor = page.getByRole('dialog', { name: 'Editar la tarea' });
  await expect(editor).toBeVisible({ timeout: 15_000 });
  await expect(editor.getByPlaceholder('ej. Llamar al proveedor para acordar el plazo de entrega')).toHaveValue(title);
  expect(new URL(page.url()).searchParams.has('alarma')).toBe(false);
  await editor.getByRole('button', { name: 'Cerrar' }).first().click();
  await expect(editor).toBeHidden();

  // Con CLAR abierta, el service worker se lo pide con un mensaje
  await page.evaluate((k) => {
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'clar:open-alarm', key: k } }));
  }, key);
  await expect(editor).toBeVisible();
});

test('on an iPhone, Safari explains how to get the alarms: from CLAR on the Home Screen', async ({ browser }) => {
  test.slow(); // Contexto propio con el navegador de un iPhone
  const context = await browser.newContext({
    timezoneId: 'Europe/Madrid',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
  });
  // Safari en una pestaña no tiene notificaciones
  await context.addInitScript(() => {
    Reflect.deleteProperty(window, 'Notification');
  });
  const page = await context.newPage();
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  const account = page.getByRole('dialog', { name: 'Tu cuenta' });
  await expect(account.getByText(/«Añadir a pantalla de inicio»/)).toBeVisible();
  await expect(account.getByText(/iOS 16\.4 o posterior/)).toBeVisible();
  await context.close();
});

test('times are written in 24 hours; half-written or impossible ones are not saved', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Listas');
  const title = `Recoger el paquete ${Date.now().toString(36)}`;
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Nueva tarea' });
  await page.getByPlaceholder('ej. Llamar al proveedor para acordar el plazo de entrega').fill(title);
  await page.getByLabel('Fecha límite', { exact: true }).fill('2030-06-15');

  // «7 pm» no es una hora en 24 h: se marca y no deja guardar
  const dueTime = page.getByLabel('Hora límite');
  await dueTime.fill('7 pm');
  await expect(dueTime).toHaveAttribute('aria-invalid', 'true');
  await form.getByRole('button', { name: 'Guardar la tarea' }).click();
  await expect(form).toBeVisible();

  // 930 se lee como 09:30, y 915 como 09:15: la alarma suena ese día a las 09:15
  await dueTime.fill('930');
  await dueTime.blur();
  await expect(dueTime).toHaveValue('09:30');
  const alarm = page.getByLabel(/^Alarma/);
  await alarm.fill('915');
  await alarm.blur();
  await expect(alarm).toHaveValue('09:15');
  await expect(alarm).toHaveAccessibleDescription(/^Sonará el 15 jun a las 09:15\./);
  await form.getByRole('button', { name: 'Guardar la tarea' }).click();
  await expect(form).toBeHidden();
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(card).toContainText('Alarma:15 jun 09:15');
});
