import { expect, test } from '@playwright/test';
import {
  agendaEntry,
  completeTask,
  fillAndSaveTask,
  localDateFromToday,
  openSection,
  showMoreOptions,
  signInWithGoogle
} from './helpers';

const longDay = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const dayLabel = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return longDay.format(d);
};

const dayMonth = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });
// La fecha con que se nombran los controles de una repetición: «27 de noviembre»
const repeatDay = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayMonth.format(d);
};

test('agenda shows dated tasks of both lists, projected repetitions, and opens a task to edit it', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();

  const work = `Llamar al cliente ${Date.now().toString(36)}`;
  const personal = `Reservar la clase de yoga ${Date.now().toString(36)}`;

  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title: work, dueDate: localDateFromToday(1), dueTime: '10:00' });

  // Con la lista Personal activa, el formulario se abre ya en esa lista
  await page
    .locator('header')
    .getByRole('button', { name: /^Personal/ })
    .click();
  await page.getByRole('button', { name: 'Nueva Tarea' }).click();
  // Semanal desde dentro de dos días, sin fin
  await showMoreOptions(page);
  await page.getByLabel('Repetir').selectOption('WEEKLY');
  await page.getByLabel('Fecha de inicio', { exact: true }).fill(localDateFromToday(2));
  await fillAndSaveTask(page, { title: personal });

  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

  // Vista por días: cada tarea en su día, con su hora y su lista
  await page.getByRole('button', { name: 'Por días' }).click();
  // Están los 14 días, también hoy aunque no tenga nada
  const todayRegion = page.getByRole('region', { name: new RegExp(dayLabel(0), 'i') });
  await expect(todayRegion).toHaveAttribute('aria-current', 'date');
  await expect(todayRegion).toContainText('Sin nada programado');
  await expect(page.getByRole('region', { name: new RegExp(dayLabel(13), 'i') })).toBeVisible();
  const tomorrow = page.getByRole('region', { name: new RegExp(dayLabel(1), 'i') });
  await expect(agendaEntry(tomorrow, work)).toContainText('10:00');
  await expect(agendaEntry(tomorrow, work)).toContainText('Profesional');
  const inTwoDays = page.getByRole('region', { name: new RegExp(dayLabel(2), 'i') });
  await expect(agendaEntry(inTwoDays, personal)).toContainText('Personal');

  // Vista semanal: la repetición prevista de la tarea semanal aparece una semana después
  await page.getByRole('button', { name: 'Semana', exact: true }).click();
  const projected = agendaEntry(page.getByRole('listitem', { name: new RegExp(dayLabel(9), 'i') }), personal);
  // Semanas (de lunes a domingo) que hay que avanzar desde la actual para llegar al día 9
  const weeksAhead = Math.floor((((new Date().getDay() + 6) % 7) + 9) / 7);
  for (let week = 0; week < weeksAhead; week++) {
    await page.getByRole('button', { name: 'Semana siguiente' }).click();
  }
  await expect(projected).toContainText('Repetición prevista');
  // La repetición prevista tiene sus propios controles, con su fecha en el nombre
  const day9 = page.getByRole('listitem', { name: new RegExp(dayLabel(9), 'i') });
  await expect(day9.getByLabel(`Estado de «${personal}» del ${repeatDay(9)}`, { exact: true })).toHaveValue('PENDING');
  await expect(day9.getByRole('button', { name: `Marcar «${personal}» del ${repeatDay(9)} como hecha` })).toBeVisible();
  await expect(day9.getByRole('button', { name: `Marcar «${personal}» como hecha`, exact: true })).toHaveCount(0);

  // Pulsar una tarea abre el formulario para editarla
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await page.getByRole('button', { name: 'Por días' }).click();
  await agendaEntry(tomorrow, work).click();
  await expect(page.getByRole('heading', { name: 'Editar la tarea' })).toBeVisible();
});

test('changes the status of a task from the agenda: in progress, and done with «Deshacer»', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  const title = `Preparar la reunión de equipo ${Date.now().toString(36)}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title, dueDate: localDateFromToday(1), dueTime: '09:30' });

  await openSection(page, 'Agenda');
  await page.getByRole('button', { name: 'Por días' }).click();
  const tomorrow = page.getByRole('region', { name: new RegExp(dayLabel(1), 'i') });
  await expect(agendaEntry(tomorrow, title)).toBeVisible();

  // El selector de estado de la entrada: «En progreso» se queda en la agenda
  const status = tomorrow.getByLabel(`Estado de «${title}»`);
  await expect(status).toHaveValue('PENDING');
  await status.selectOption('IN_PROGRESS');
  await expect(status).toHaveValue('IN_PROGRESS');

  // El círculo la marca como hecha: sale de la agenda, y «Deshacer» la devuelve como estaba
  await completeTask(page, title);
  await expect(page.getByText('Tarea hecha y archivada. La encontrarás en «Archivadas».')).toBeVisible();
  await expect(agendaEntry(tomorrow, title)).toBeHidden();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(agendaEntry(tomorrow, title)).toBeVisible();
  await expect(status).toHaveValue('IN_PROGRESS');
  // Guardado: en las listas también está en progreso
  await openSection(page, 'Listas');
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(card.getByText('En progreso', { exact: true })).toBeVisible();
  await openSection(page, 'Agenda');
  // (la agenda vuelve a abrirse en la vista semanal)
  await page.getByRole('button', { name: 'Por días' }).click();

  // Cancelada desde el selector, también sale
  await status.selectOption('CANCELLED');
  await expect(page.getByText('Tarea cancelada y archivada. La encontrarás en «Archivadas».')).toBeVisible();
  await expect(agendaEntry(tomorrow, title)).toBeHidden();
});

test('a task waiting for another shows a lock in the agenda, and one with a date range has its controls once', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  const id = Date.now().toString(36);
  const first = `Pedir el presupuesto ${id}`;
  const waiting = `Firmar el presupuesto ${id}`;
  const range = `Preparar la mudanza ${id}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title: first, dueDate: localDateFromToday(1) });
  await page.getByRole('button', { name: 'Nueva Tarea' }).click();
  await showMoreOptions(page);
  await page.getByLabel(/^Empieza después de/).selectOption({ label: first });
  await fillAndSaveTask(page, { title: waiting, dueDate: localDateFromToday(2) });
  await page.getByRole('button', { name: 'Nueva Tarea' }).click();
  await fillAndSaveTask(page, { title: range, startDate: localDateFromToday(1), dueDate: localDateFromToday(3) });

  await openSection(page, 'Agenda');
  await page.getByRole('button', { name: 'Por días' }).click();

  // La que espera: sin círculo, se oye que está bloqueada y no se puede hacer ni empezar
  await expect(page.getByRole('button', { name: `Marcar «${waiting}» como hecha` })).toHaveCount(0);
  await expect(agendaEntry(page, waiting)).toHaveAccessibleName(/bloqueada: espera a otra tarea/);
  const status = page.getByLabel(`Estado de «${waiting}»`);
  await expect(status.getByRole('option', { name: 'Hecha (bloqueada)' })).toBeDisabled();
  await expect(status.getByRole('option', { name: 'En progreso (bloqueada)' })).toBeDisabled();

  // El intervalo sale en sus tres días, con los controles solo en el primero
  await expect(agendaEntry(page, range)).toHaveCount(3);
  await expect(page.getByLabel(`Estado de «${range}»`)).toHaveCount(1);
  await expect(page.getByRole('button', { name: `Marcar «${range}» como hecha` })).toHaveCount(1);

  // Al hacer la primera, la otra se desbloquea; al hacer el intervalo, sale de todos sus días
  await completeTask(page, first);
  await expect(page.getByRole('button', { name: `Marcar «${waiting}» como hecha` })).toBeVisible();
  await completeTask(page, range);
  await expect(agendaEntry(page, range)).toHaveCount(0);
});

test('in the by-days view an overdue task is listed once, under «Vencidas»', async ({ page }) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  const title = `Pagar la factura ${Date.now().toString(36)}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title, dueDate: localDateFromToday(-1) });

  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await page.getByRole('button', { name: 'Por días' }).click();
  // La semana anterior incluye el día de vencimiento: la tarea no se repite en ese día
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  const overdue = page.getByRole('region', { name: /Vencidas/ });
  await expect(agendaEntry(overdue, title)).toBeVisible();
  await expect(agendaEntry(page, title)).toHaveCount(1);
  // También se puede hacer desde «Vencidas»
  await expect(overdue.getByLabel(`Estado de «${title}»`)).toHaveValue('PENDING');
  await completeTask(page, title);
  await expect(overdue).toBeHidden();
});

test('a repeated task with a start and a due date shows only its days, from the start to the due date', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  const title = `Revisar el correo de clientes ${Date.now().toString(36)}`;
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await showMoreOptions(page);
  await page.getByLabel('Repetir').selectOption('WEEKLY');
  // Lunes, miércoles y viernes durante tres semanas desde el lunes de la semana que viene
  const today = new Date();
  const nextMonday = (8 - today.getDay()) % 7 || 7;
  const start = localDateFromToday(nextMonday);
  const end = localDateFromToday(nextMonday + 18); // viernes de la tercera semana
  await page.getByLabel('Fecha de inicio', { exact: true }).fill(start);
  const days = page.locator('fieldset', { hasText: 'Días de la semana' });
  // El lunes ya viene marcado por ser el día del inicio
  await expect(days.getByRole('checkbox', { name: 'Lunes' })).toBeChecked();
  await days.getByText('X', { exact: true }).click();
  await days.getByText('V', { exact: true }).click();
  await page.getByLabel('Fecha límite', { exact: true }).fill(end);
  await expect(page.getByText('fin de la repetición (opcional)')).toBeVisible();
  await expect(page.getByLabel('Hasta (opcional)')).toHaveCount(0);
  await fillAndSaveTask(page, { title });

  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  const countPerDay = async () =>
    page
      .getByRole('list', { name: 'Semana' })
      .locator(':scope > li')
      .evaluateAll(
        (els, t) =>
          els.map(
            (el) =>
              [...el.querySelectorAll('button')].filter(
                // Solo el botón que abre la entrada (el del círculo se nombra con aria-label)
                (b) => b.textContent?.includes(t) && !b.hasAttribute('aria-label')
              ).length
          ),
        title
      );
  await page.getByRole('button', { name: 'Semana siguiente' }).click();
  // Ningún día «En curso»: solo lunes, miércoles y viernes
  await expect.poll(countPerDay).toEqual([1, 0, 1, 0, 1, 0, 0]);
  await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await expect.poll(countPerDay).toEqual([1, 0, 1, 0, 1, 0, 0]);
  // La serie termina en la fecha límite
  await page.getByRole('button', { name: 'Semana siguiente' }).click();
  await expect.poll(countPerDay).toEqual([0, 0, 0, 0, 0, 0, 0]);
});

test('on a phone, a title with a long link wraps and the page does not get wider than the screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await signInWithGoogle(page);
  await openSection(page, 'Listas');
  const title = 'Revisar https://tracker.example/boards/9929382056/views/2108790123456789012345678901234567';
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await fillAndSaveTask(page, { title, dueDate: localDateFromToday(0), dueTime: '23:59' });
  const widerBy = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await widerBy()).toBeLessThanOrEqual(0);

  await openSection(page, 'Agenda');
  await expect(page.getByRole('button', { name: /^23:59 Revisar https/ }).first()).toBeVisible();
  expect(await widerBy()).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Por días' }).click();
  await expect(page.getByRole('button', { name: /^23:59 Revisar https/ }).first()).toBeVisible();
  expect(await widerBy()).toBeLessThanOrEqual(0);
});

test('each repeat in the agenda has its own status, and can be deleted alone or with the following ones', async ({
  page
}) => {
  await page.goto('/');
  await signInWithGoogle(page);
  await page.getByRole('button', { name: 'Listas', exact: true }).click();
  const title = `Regar las plantas ${Date.now().toString(36)}`;
  // Cada día desde mañana
  await page.getByRole('button', { name: 'Añadir la primera tarea' }).click();
  await showMoreOptions(page);
  await page.getByLabel('Repetir').selectOption('DAILY');
  await page.getByLabel('Fecha de inicio', { exact: true }).fill(localDateFromToday(1));
  await fillAndSaveTask(page, { title });

  await openSection(page, 'Agenda');
  await page.getByRole('button', { name: 'Por días' }).click();
  const day = (n: number) => page.getByRole('region', { name: new RegExp(dayLabel(n), 'i') });
  const repeatStatus = (n: number) => day(n).getByLabel(`Estado de «${title}» del ${repeatDay(n)}`, { exact: true });
  const deleteRepeat = async (n: number, choice: 'Solo esta' | 'Esta y las siguientes') => {
    const name = `Borrar «${title}» del ${repeatDay(n)}`;
    const toggle = day(n).getByRole('button', { name, exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await day(n).getByRole('group', { name: 'Qué repeticiones borrar' }).getByRole('button', { name: choice }).click();
  };
  await expect(agendaEntry(day(1), title)).toContainText('Vence');
  await expect(agendaEntry(day(2), title)).toContainText('Repetición prevista');

  // El círculo de una repetición la hace (queda archivada como tarea aparte) y «Deshacer» la devuelve
  await day(2)
    .getByRole('button', { name: `Marcar «${title}» del ${repeatDay(2)} como hecha` })
    .click();
  await expect(page.getByText(/^Repetición del .+ hecha y archivada\.$/)).toBeVisible();
  await expect(agendaEntry(day(2), title)).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(agendaEntry(day(2), title)).toContainText('Repetición prevista');

  // Otro estado la convierte en una tarea de ese día, con ese estado; la serie sigue igual en los demás
  await repeatStatus(3).selectOption('IN_PROGRESS');
  await expect(
    page.getByText(/^La repetición del .+ pasa a «En progreso» y queda como una tarea aparte\.$/)
  ).toBeVisible();
  await expect(agendaEntry(day(3), title)).toContainText('Vence');
  await expect(day(3).getByLabel(`Estado de «${title}»`, { exact: true })).toHaveValue('IN_PROGRESS');
  await expect(day(3).getByLabel(`Estado de «${title}» del ${repeatDay(3)}`)).toHaveCount(0);
  // Una tarea suelta no se repite: no tiene papelera de repetición
  await expect(day(3).getByRole('button', { name: `Borrar «${title}» del ${repeatDay(3)}` })).toHaveCount(0);

  // Escape cierra las opciones de borrar sin borrar nada
  const toggle4 = day(4).getByRole('button', { name: `Borrar «${title}» del ${repeatDay(4)}`, exact: true });
  await toggle4.click();
  await page.keyboard.press('Tab');
  await expect(
    day(4).getByRole('group', { name: 'Qué repeticiones borrar' }).getByRole('button', { name: 'Solo esta' })
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle4).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle4).toBeFocused();

  // Borrar solo una repetición
  await deleteRepeat(4, 'Solo esta');
  await expect(page.getByText(/^Repetición del .+ borrada\.$/)).toBeVisible();
  // El foco no se pierde: pasa a su día
  await expect(day(4)).toBeFocused();
  await expect(agendaEntry(day(4), title)).toHaveCount(0);
  await expect(agendaEntry(day(5), title)).toContainText('Repetición prevista');

  // Borrar una y las siguientes: la serie termina el día anterior
  await deleteRepeat(6, 'Esta y las siguientes');
  await expect(
    page.getByText(/^Borradas las repeticiones desde el .+: la serie termina el día anterior\.$/)
  ).toBeVisible();
  for (const n of [6, 7, 12]) await expect(agendaEntry(day(n), title)).toHaveCount(0);
  await expect(agendaEntry(day(5), title)).toContainText('Repetición prevista');

  // Lo borrado sigue borrado al volver a abrir la app
  await page.reload();
  await openSection(page, 'Agenda');
  await page.getByRole('button', { name: 'Por días' }).click();
  for (const n of [4, 6, 7]) await expect(agendaEntry(day(n), title)).toHaveCount(0);
  await expect(agendaEntry(day(5), title)).toContainText('Repetición prevista');

  // Borrar solo la repetición actual (una tarea): pasa a la siguiente fecha de la serie, que ya es la del día 2
  await deleteRepeat(1, 'Solo esta');
  await expect(page.getByText(/^Repetición borrada\. Siguiente: .+\.$/)).toBeVisible();
  await expect(agendaEntry(day(1), title)).toHaveCount(0);
  await expect(agendaEntry(day(2), title)).toContainText('Vence');
  await expect(day(2).getByRole('button', { name: `Marcar «${title}» como hecha`, exact: true })).toBeVisible();

  // Y con las siguientes, se elimina la tarea con su serie; la del día 3 (aparte) se queda
  await deleteRepeat(2, 'Esta y las siguientes');
  await expect(page.getByText('Tarea eliminada, con sus repeticiones siguientes.')).toBeVisible();
  for (const n of [2, 5]) await expect(agendaEntry(day(n), title)).toHaveCount(0);
  await expect(agendaEntry(day(3), title)).toContainText('Vence');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(agendaEntry(day(2), title)).toContainText('Vence');
  await expect(agendaEntry(day(5), title)).toContainText('Repetición prevista');
});
