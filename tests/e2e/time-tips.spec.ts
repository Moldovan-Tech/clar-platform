import { expect, test, type Page } from '@playwright/test';
import { localDateFromToday, openSection, patchDocument, readDocument, signInWithGoogle, uidOf } from './helpers';

// «TIEMPO PROTEGIDO» se retiró en la 1.3.0: ya no es una sección y sus ideas son recomendaciones de la Ayuda. Las
// reuniones y los correos que se guardaron antes siguen en la cuenta, pero no se ven en ninguna pantalla

// Una reunión guardada con una versión anterior, hoy a las 13:00
const seedMeeting = async (email: string, title: string) => {
  const start = new Date(`${localDateFromToday(0)}T13:00:00`);
  const text = (value: string) => ({ stringValue: value });
  await patchDocument(`users/${await uidOf(email)}/meetings/meet-legacy`, {
    id: text('meet-legacy'),
    title: text(title),
    startTime: text(start.toISOString()),
    endTime: text(new Date(start.getTime() + 45 * 60_000).toISOString()),
    agendaPoints: { arrayValue: { values: [text('Estado del proyecto')] } },
    moderatorName: text('Persona moderadora'),
    moderatorEmail: text(''),
    createdAt: text(new Date().toISOString())
  });
};

// Un correo guardado con una versión anterior
const seedEmail = async (email: string) => {
  const text = (value: string) => ({ stringValue: value });
  await patchDocument(`users/${await uidOf(email)}/emails/mail-legacy`, {
    id: text('mail-legacy'),
    subject: text('Resumen semanal'),
    createdAt: text(new Date().toISOString())
  });
};

const expectTips = async (page: Page, heading: string, tips: RegExp[]) => {
  const section = page.getByRole('region', { name: heading });
  await expect(section).toBeVisible();
  await expect(section.getByRole('listitem')).toHaveText(tips);
  // Son solo consejos: no llevan a ninguna pantalla
  await expect(section.getByRole('button')).toHaveCount(0);
};

test('there is no «Tiempo protegido» section: its tips are in the Help, and saved meetings are not shown', async ({
  page
}) => {
  const title = `Revisión semanal ${Date.now().toString(36)}`;
  await page.goto('/');
  const email = await signInWithGoogle(page);
  await seedMeeting(email, title);

  const nav = page.getByRole('navigation', { name: 'Secciones' });
  await expect(nav.getByRole('button', { name: 'Ayuda', exact: true })).toBeVisible();
  await expect(nav.getByRole('button', { name: /Tiempo protegido/ })).toHaveCount(0);
  // Inicio ya no cuenta las reuniones
  await openSection(page, 'Inicio');
  await expect(page.getByRole('heading', { name: 'Tu foco profesional' })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('Reuniones');

  await openSection(page, 'Agenda');
  await expect(page.getByRole('main')).toContainText('Tareas con fecha de tus dos listas y repeticiones previstas.');
  await expect(page.getByRole('main')).not.toContainText(title);

  await openSection(page, 'Ayuda');
  // Las novedades de la 1.3.0 sí lo nombran, para contar el cambio
  await expect(page.getByRole('heading', { name: 'Tiempo protegido', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('button', { name: /^Ir a / })).toHaveCount(6);
  await expectTips(page, 'Recomendaciones para proteger tu tiempo', [
    /triángulo de las Bermudas.*reuniones, el correo y los mensajes/,
    /mañanas libres de reuniones.*12:00.*primera hora de la tarde/,
    /hora de fin, un orden del día cerrado y alguien que la modere/,
    /empieza por el contenido y los adjuntos, y elige los destinatarios al final/,
    /correo y los mensajes en bloques, a horas fijas/
  ]);
});

test('in English, the Help has the tips to protect your time and there is no «Protected time» section', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  // El enlace con ?lang=en muestra esta visita en inglés
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const nav = page.getByRole('navigation', { name: 'Sections' });
  await expect(nav.getByRole('button', { name: 'Help', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(nav.getByRole('button', { name: /Protected time/ })).toHaveCount(0);

  await nav.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Protected time', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('button', { name: /^Go to / })).toHaveCount(6);
  await expectTips(page, 'Tips to protect your time', [
    /Bermuda Triangle.*meetings, email and messages/,
    /mornings free of meetings.*12:00.*early afternoon/,
    /end time, a set agenda and someone to moderate it/,
    /start with the content and the attachments, and choose the recipients last/,
    /email and messages in batches, at set times/
  ]);
});

test('the account menu deletes the meetings and emails saved with earlier versions, after confirming', async ({
  page
}) => {
  await page.goto('/');
  const email = await signInWithGoogle(page);
  await seedMeeting(email, 'Revisión semanal');
  await seedEmail(email);
  const uid = await uidOf(email);

  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  const account = page.getByRole('dialog', { name: 'Tu cuenta' });
  const remove = account.getByRole('button', { name: 'Eliminar las 2 reuniones y correos de versiones anteriores' });
  await expect(remove).toBeVisible();

  // Cancelar no borra nada
  await remove.click();
  await expect(account.getByRole('alert')).toContainText('Se borrarán para siempre');
  await account.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await readDocument(`users/${uid}/meetings/meet-legacy`)).not.toBeNull();

  await remove.click();
  await account.getByRole('alert').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(account).toContainText('Eliminados.');
  await expect(remove).toHaveCount(0);
  expect(await readDocument(`users/${uid}/meetings/meet-legacy`)).toBeNull();
  expect(await readDocument(`users/${uid}/emails/mail-legacy`)).toBeNull();

  // Sin nada guardado de antes, el menú ya no lo ofrece
  await account.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  await expect(page.getByRole('dialog', { name: 'Tu cuenta' })).toBeVisible();
  await expect(page.getByRole('button', { name: /de versiones anteriores/ })).toHaveCount(0);
});
