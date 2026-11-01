import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { fillAndSaveTask, openSection, patchDocument, readDocument, signInWithGoogle, uidOf } from './helpers';

const openAccount = async (page: Page) => {
  await page.getByRole('button', { name: 'Tu cuenta' }).click();
  return page.getByRole('dialog', { name: 'Tu cuenta' });
};

// Elige el archivo en «Importar datos (JSON)» del menú de la cuenta
const importFile = async (page: Page, path: string) => {
  const account = await openAccount(page);
  const chooser = page.waitForEvent('filechooser');
  await account.getByRole('button', { name: 'Importar datos (JSON)' }).click();
  await (await chooser).setFiles(path);
  return account;
};

test('the account download is imported into another account, and importing it again adds nothing', async ({
  browser
}, testInfo) => {
  test.slow(); // Dos cuentas, una descarga y tres importaciones
  const stamp = Date.now().toString(36);
  const goalTitle = `Correr una media maratón ${stamp}`;
  const taskTitle = `Salir a correr cinco kilómetros ${stamp}`;

  // Cuenta de origen: una tarea vinculada a una meta nueva
  const source = await (await browser.newContext()).newPage();
  await source.goto('/');
  await signInWithGoogle(source);
  await source.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  const form = source.getByRole('dialog');
  await form.getByRole('button', { name: 'Nueva meta', exact: true }).click();
  await form.getByLabel('Nombre de la nueva meta').fill(goalTitle);
  await form.getByLabel('Área de la nueva meta').selectOption({ label: 'Salud' });
  await form.getByRole('button', { name: 'Crear la meta' }).click();
  await fillAndSaveTask(source, { title: taskTitle });

  const account = await openAccount(source);
  const download = source.waitForEvent('download');
  await account.getByRole('button', { name: 'Descargar mis datos (JSON)' }).click();
  const file = testInfo.outputPath('clar.json');
  await (await download).saveAs(file);
  await account.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // En la misma cuenta no entra nada: ya está todo
  await importFile(source, file);
  const sameAccount = source.getByRole('dialog', { name: 'Importar datos' });
  await expect(sameAccount).toContainText('Ya tienes en tu cuenta todo lo de este archivo.');
  await expect(sameAccount.getByRole('row', { name: /^Tareas/ })).toHaveText(/Tareas\s*0\s*1\s*0/);
  await expect(sameAccount.getByRole('button', { name: /^Importar/ })).toHaveCount(0);
  await sameAccount.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  await expect(sameAccount).toBeHidden();
  // El foco vuelve al botón de la cuenta
  await expect(source.getByRole('button', { name: 'Tu cuenta' })).toBeFocused();

  // Otra cuenta: la vista previa cuenta lo nuevo y, al importar, la tarea y la meta están
  const target = await (await browser.newContext()).newPage();
  await target.goto('/');
  await signInWithGoogle(target);
  await importFile(target, file);
  const preview = target.getByRole('dialog', { name: 'Importar datos' });
  await expect(preview.getByRole('row', { name: /^Metas/ })).toHaveText(/Metas\s*1\s*0\s*0/);
  await expect(preview.getByRole('row', { name: /^Tareas/ })).toHaveText(/Tareas\s*1\s*0\s*0/);
  await preview.getByRole('button', { name: 'Importar 2 elementos' }).click();
  await expect(preview).toBeHidden();
  await expect(target.getByRole('status').filter({ hasText: 'Importado' })).toHaveText('Importado: 2 elementos.');
  await openSection(target, 'Listas');
  await expect(target.getByRole('main')).toContainText(taskTitle);
  await openSection(target, 'Metas');
  await expect(target.getByRole('list', { name: `Tareas por hacer de «${goalTitle}»` })).toContainText(taskTitle);

  // Importarlo otra vez no duplica nada
  await importFile(target, file);
  await expect(preview).toContainText('Ya tienes en tu cuenta todo lo de este archivo.');
});

// Las reuniones y los correos de «Tiempo protegido» (retirado en la 1.3.0) ya no se ven ni se crean, pero los que se
// guardaron siguen en la descarga y la importación los trae a otra cuenta
test('meetings and emails saved before 1.3.0 stay in the download and are imported into another account', async ({
  browser
}, testInfo) => {
  test.slow(); // Dos cuentas, una descarga y una importación
  const text = (value: string) => ({ stringValue: value });
  const createdAt = new Date().toISOString();
  const source = await (await browser.newContext()).newPage();
  await source.goto('/');
  const sourceUid = await uidOf(await signInWithGoogle(source));
  await patchDocument(`users/${sourceUid}/meetings/meet-legacy`, {
    id: text('meet-legacy'),
    userId: text(sourceUid),
    title: text('Revisión semanal'),
    startTime: text('2026-10-20T11:00:00.000Z'),
    endTime: text('2026-10-20T11:45:00.000Z'),
    agendaPoints: { arrayValue: { values: [text('Estado del proyecto')] } },
    moderatorName: text('Persona moderadora'),
    moderatorEmail: text(''),
    createdAt: text(createdAt)
  });
  await patchDocument(`users/${sourceUid}/emails/email-legacy`, {
    id: text('email-legacy'),
    userId: text(sourceUid),
    subject: text('Acta de la reunión'),
    body: text('Adjunto el acta de la reunión de esta semana.'),
    attachments: {
      arrayValue: { values: [{ mapValue: { fields: { name: text('acta.pdf'), size: text('2 KB') } } }] }
    },
    noAttachmentsDeclared: { booleanValue: false },
    recipients: { arrayValue: { values: [text('equipo@example.com')] } },
    status: text('draft'),
    updatedAt: text(createdAt)
  });

  const account = await openAccount(source);
  const download = source.waitForEvent('download');
  await account.getByRole('button', { name: 'Descargar mis datos (JSON)' }).click();
  const file = testInfo.outputPath('clar.json');
  await (await download).saveAs(file);
  const exported = JSON.parse(await readFile(file, 'utf8')) as {
    meetings: { id: string; title: string }[];
    emails: { id: string; subject: string; status: string }[];
  };
  expect(exported.meetings.map(({ id, title }) => [id, title])).toEqual([['meet-legacy', 'Revisión semanal']]);
  expect(exported.emails.map(({ id, subject, status }) => [id, subject, status])).toEqual([
    ['email-legacy', 'Acta de la reunión', 'draft']
  ]);

  const target = await (await browser.newContext()).newPage();
  await target.goto('/');
  const targetUid = await uidOf(await signInWithGoogle(target));
  await importFile(target, file);
  const preview = target.getByRole('dialog', { name: 'Importar datos' });
  await expect(preview.getByRole('row', { name: /^Reuniones/ })).toHaveText(/Reuniones\s*1\s*0\s*0/);
  await expect(preview.getByRole('row', { name: /^Correos/ })).toHaveText(/Correos\s*1\s*0\s*0/);
  await preview.getByRole('button', { name: 'Importar 2 elementos' }).click();
  await expect(preview).toBeHidden();
  await expect(target.getByRole('status').filter({ hasText: 'Importado' })).toHaveText('Importado: 2 elementos.');
  expect((await readDocument(`users/${targetUid}/meetings/meet-legacy`))?.title).toBe('Revisión semanal');
  expect((await readDocument(`users/${targetUid}/emails/email-legacy`))?.subject).toBe('Acta de la reunión');
});

test('a file that is not the account download is refused with the reason', async ({ page }, testInfo) => {
  await page.goto('/');
  await signInWithGoogle(page);
  const single = testInfo.outputPath('tarea.json');
  await writeFile(single, JSON.stringify({ app: 'CLAR', version: '0.9.5', type: 'task', task: { id: 'task-1' } }));
  const account = await importFile(page, single);
  await expect(account.getByRole('alert')).toHaveText(
    'Este archivo es la descarga de una sola tarea, meta o proyecto. Aquí se importa la de «Descargar mis datos (JSON)».'
  );
  const broken = testInfo.outputPath('roto.json');
  await writeFile(broken, '{ esto no es JSON');
  const chooser = page.waitForEvent('filechooser');
  await account.getByRole('button', { name: 'Importar datos (JSON)' }).click();
  await (await chooser).setFiles(broken);
  await expect(account.getByRole('alert')).toHaveText('El archivo no es un JSON válido.');
  await expect(page.getByRole('dialog', { name: 'Importar datos' })).toHaveCount(0);
});

test('without a connection the import does not start and says why', async ({ page, context }, testInfo) => {
  await page.goto('/');
  await signInWithGoogle(page);
  const createdAt = new Date().toISOString();
  const file = testInfo.outputPath('clar.json');
  await writeFile(
    file,
    JSON.stringify({
      app: 'CLAR',
      type: 'account',
      tasks: [{ id: 'task-offline', title: 'Revisar el contrato', listContext: 'WORK', createdAt }]
    })
  );
  await importFile(page, file);
  const preview = page.getByRole('dialog', { name: 'Importar datos' });
  // La ventana se descarga al abrirse: se corta la conexión cuando ya está
  await expect(preview.getByRole('button', { name: 'Importar 1 elemento' })).toBeVisible();
  await context.setOffline(true);
  await preview.getByRole('button', { name: 'Importar 1 elemento' }).click();
  await expect(preview.getByRole('alert')).toHaveText(
    'Sin conexión no se puede importar. Vuelve a intentarlo cuando tengas conexión.'
  );
  await context.setOffline(false);
  await preview.getByRole('button', { name: 'Importar 1 elemento' }).click();
  await expect(preview).toBeHidden();
});
