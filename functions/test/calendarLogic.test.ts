import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';
import { openToken, parseTokenKey, sealToken } from '../src/calendarCrypto';
import { buildTaskEvent, eventIdFor, parseConnectRequest, recurrenceRule, taskIdForEvent } from '../src/calendarLogic';

// Lo propio del servidor; que el evento coincide con el de la app lo comprueba tests/unit/calendarSync.test.ts
const MADRID = 'Europe/Madrid';
const URL = 'https://clar.example';
const due = { title: 'Pagar el alquiler', status: 'PENDING', dueDate: '2026-10-16', dueTime: '12:00' };

describe('calendar events on the server', () => {
  it('leaves out tasks without a deadline or in «Algún día», and marks the closed ones', () => {
    assert.equal(buildTaskEvent({ title: 'Sin fecha' }, MADRID, URL), null);
    assert.equal(buildTaskEvent({ ...due, isSomeday: true }, MADRID, URL), null);
    assert.equal(buildTaskEvent({ ...due, dueDate: '16/10/2026' }, MADRID, URL), null);
    // Un día que no existe tampoco (Google lo rechazaría)
    assert.equal(buildTaskEvent({ ...due, dueDate: '2026-02-30' }, MADRID, URL), null);
    assert.equal(buildTaskEvent({ ...due, dueDate: '2026-13-45' }, MADRID, URL), null);
    assert.equal(buildTaskEvent(due, 'Nowhere/Nada', URL), null);
    assert.equal(buildTaskEvent({ ...due, status: 'DONE' }, MADRID, URL)?.summary, '✓ Pagar el alquiler');
    assert.equal(buildTaskEvent({ ...due, status: 'CANCELLED' }, MADRID, URL)?.summary, '✕ Pagar el alquiler');
    // Las de antes de los estados
    assert.equal(
      buildTaskEvent({ ...due, status: undefined, completed: true }, MADRID, URL)?.summary,
      '✓ Pagar el alquiler'
    );
  });

  it('marks its events, leaves the time free, and does not remind about closed tasks', () => {
    const open = buildTaskEvent({ ...due, alarmTime: '11:30' }, MADRID, URL);
    assert.equal(open?.transparency, 'transparent');
    assert.deepEqual(open?.extendedProperties, { private: { clarTask: '1' } });
    assert.deepEqual(open?.reminders.overrides, [{ method: 'popup', minutes: 30 }]);
    assert.deepEqual(
      buildTaskEvent({ ...due, alarmTime: '11:30', status: 'DONE' }, MADRID, URL)?.reminders.overrides,
      []
    );
    assert.deepEqual(
      buildTaskEvent({ ...due, alarmTime: '11:30', status: 'CANCELLED' }, MADRID, URL)?.reminders.overrides,
      []
    );
  });

  it('keeps the series only on the pending task: a done repetition stays as a single event', () => {
    const recurrence = { frequency: 'WEEKLY', interval: 1, weekdays: [5] };
    assert.deepEqual(buildTaskEvent({ ...due, recurrence }, MADRID, URL)?.recurrence, [
      'RRULE:FREQ=WEEKLY;INTERVAL=1;WKST=MO;BYDAY=FR'
    ]);
    assert.equal(buildTaskEvent({ ...due, recurrence, status: 'DONE' }, MADRID, URL)?.recurrence, undefined);
    // Las fechas que la serie salta (borradas o sueltas en la app): EXDATE a la hora local del inicio, solo las
    // posteriores a la actual, sin repetir y en orden; lo que no es un día se ignora
    const skip = ['2026-10-30', '2026-10-09', '2026-10-23', '2026-10-23', 'mañana'];
    assert.deepEqual(buildTaskEvent({ ...due, recurrence: { ...recurrence, skip } }, MADRID, URL)?.recurrence, [
      'RRULE:FREQ=WEEKLY;INTERVAL=1;WKST=MO;BYDAY=FR',
      'EXDATE;TZID=Europe/Madrid:20261023T120000,20261030T120000'
    ]);
    // Una repetición que no vale no rompe el evento: queda suelto
    assert.equal(buildTaskEvent({ ...due, recurrence: { frequency: 'HOURLY' } }, MADRID, URL)?.recurrence, undefined);
  });

  it('writes every N periods as the INTERVAL of the series', () => {
    assert.deepEqual(
      buildTaskEvent({ ...due, recurrence: { frequency: 'DAILY', interval: 3 } }, MADRID, URL)?.recurrence,
      ['RRULE:FREQ=DAILY;INTERVAL=3']
    );
    assert.deepEqual(
      buildTaskEvent({ ...due, recurrence: { frequency: 'WEEKLY', interval: 2, weekdays: [1, 5] } }, MADRID, URL)
        ?.recurrence,
      ['RRULE:FREQ=WEEKLY;INTERVAL=2;WKST=MO;BYDAY=MO,FR']
    );
    assert.equal(
      recurrenceRule(
        { frequency: 'MONTHLY', interval: 2, monthlyMode: 'DAY_OF_MONTH', monthDay: 16 },
        false,
        '2026-10-16',
        MADRID
      ),
      'RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=16'
    );
    // Un intervalo que no es un número entero cuenta como 1
    assert.equal(
      recurrenceRule({ frequency: 'DAILY', interval: '3' }, false, '2026-10-16', MADRID),
      'RRULE:FREQ=DAILY;INTERVAL=1'
    );
  });

  it('sends a task repeated from completion as a single event, the current repetition, with its reminder', () => {
    for (const frequency of ['DAILY', 'WEEKLY']) {
      const recurrence = { frequency, interval: 2, from: 'COMPLETION' };
      assert.equal(recurrenceRule(recurrence, false, '2026-10-16', MADRID), null);
      const event = buildTaskEvent({ ...due, alarmTime: '11:30', recurrence }, MADRID, URL);
      assert.equal(event?.recurrence, undefined);
      assert.deepEqual(event?.start, { dateTime: '2026-10-16T10:00:00.000Z', timeZone: MADRID });
      assert.deepEqual(event?.reminders.overrides, [{ method: 'popup', minutes: 30 }]);
    }
    // Solo en días y semanas: en meses y años, o con otro valor, es una serie en fechas fijas
    assert.equal(
      recurrenceRule(
        { frequency: 'MONTHLY', interval: 1, monthDay: 16, from: 'COMPLETION' },
        false,
        '2026-10-16',
        MADRID
      ),
      'RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=16'
    );
    assert.equal(
      recurrenceRule({ frequency: 'DAILY', interval: 2, from: 'SCHEDULE' }, false, '2026-10-16', MADRID),
      'RRULE:FREQ=DAILY;INTERVAL=2'
    );
  });

  it('drops a series whose end is not a real day, rather than repeating it forever', () => {
    assert.equal(
      recurrenceRule({ frequency: 'DAILY', interval: 1, until: '2026-02-30' }, false, '2026-02-01', MADRID),
      null
    );
  });

  it('writes the end of a series in UTC at the end of the local day', () => {
    assert.equal(
      recurrenceRule({ frequency: 'DAILY', interval: 1, until: '2026-12-31' }, false, '2026-10-16', MADRID),
      'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261231T225959Z'
    );
    assert.equal(
      recurrenceRule({ frequency: 'DAILY', interval: 1, until: '2026-12-31' }, true, '2026-10-16', MADRID),
      'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261231'
    );
  });

  it('caps long texts and keeps an event whose start is after its deadline valid for Google', () => {
    const event = buildTaskEvent({ ...due, title: 't'.repeat(2_000), description: 'd'.repeat(9_000) }, MADRID, URL);
    assert.equal(event?.summary.length, 1_000);
    assert.equal(event?.description.length, 8_000);
    // Lo que se recorta es lo de la tarea: el enlace a CLAR se queda
    assert.ok(event?.description.endsWith('…\n\nTarea de CLAR: https://clar.example'));
    // Sin partir un emoji
    const emoji = buildTaskEvent({ ...due, title: '😀'.repeat(1_200) }, MADRID, URL);
    assert.equal(Array.from(emoji!.summary).length, 1_000);
    assert.equal(emoji!.summary.slice(0, -1), '😀'.repeat(999));
    const reversed = buildTaskEvent({ ...due, startDate: '2026-10-20', startTime: '09:00' }, MADRID, URL);
    assert.ok(reversed && 'dateTime' in reversed.start && 'dateTime' in reversed.end);
    assert.ok(Date.parse(reversed.start.dateTime) < Date.parse(reversed.end.dateTime));
    const allDay = buildTaskEvent({ title: 'x', startDate: '2026-10-20', dueDate: '2026-10-16' }, MADRID, URL);
    // Un inicio después del plazo no cuenta: es una tarea solo con fecha, el día límite a las 09:00
    assert.deepEqual(allDay?.start, { dateTime: '2026-10-16T07:00:00.000Z', timeZone: MADRID });
  });

  it('keeps a closed task with only a date at its alarm hour, without the reminder', () => {
    const open = buildTaskEvent({ title: 'x', dueDate: '2026-10-16', alarmTime: '17:00' }, MADRID, URL)!;
    assert.deepEqual(open.start, { dateTime: '2026-10-16T15:00:00.000Z', timeZone: MADRID });
    assert.deepEqual(open.reminders.overrides, [{ method: 'popup', minutes: 0 }]);
    for (const status of ['DONE', 'CANCELLED']) {
      const closed = buildTaskEvent({ title: 'x', dueDate: '2026-10-16', alarmTime: '17:00', status }, MADRID, URL)!;
      assert.deepEqual(closed.start, open.start);
      assert.deepEqual(closed.reminders.overrides, []);
    }
  });

  it('sends the notes as text when the HTML list does not fit', () => {
    const observations = Array.from({ length: 300 }, (_, i) => ({
      type: 'checklist',
      text: `Punto ${i} ${'x'.repeat(20)}`
    }));
    const event = buildTaskEvent({ title: 'x', dueDate: '2026-10-16', observations }, MADRID, URL)!;
    assert.doesNotMatch(event.description, /<ul>/);
    assert.match(event.description, /^Notas:\n- \[ \] Punto 0/);
    assert.ok(Array.from(event.description).length <= 8_000);
    // Con pocas, en HTML; un salto de línea de Windows también es un salto
    const short = buildTaskEvent(
      { title: 'x', dueDate: '2026-10-16', description: 'a\r\nb', observations: observations.slice(0, 2) },
      MADRID,
      URL
    )!;
    assert.ok(short.description.startsWith('a<br>b<br><br>Notas:<ul><li>☐ Punto 0'));
  });

  it('gives each task the same event id, with only the characters Google accepts', () => {
    assert.equal(eventIdFor('task-1'), eventIdFor('task-1'));
    assert.notEqual(eventIdFor('task-1'), eventIdFor('task-2'));
    assert.match(eventIdFor('Tarea ñ/1')!, /^[a-v0-9]{5,1024}$/);
    assert.equal(eventIdFor('x'.repeat(600)), null);
    // Y de vuelta, para comprobar la tarea de un evento
    assert.equal(taskIdForEvent(eventIdFor('Tarea ñ/1')!), 'Tarea ñ/1');
    assert.equal(taskIdForEvent('abc123'), null);
    assert.equal(taskIdForEvent('clar1'), null);
  });

  it('accepts a connection request only back to the app, with a PKCE verifier and a real time zone', () => {
    const ok = {
      code: '4/abc',
      codeVerifier: 'v'.repeat(43),
      redirectUri: 'https://clar.example/oauth/google.html',
      timeZone: MADRID
    };
    const origins = ['https://clar.example'];
    assert.deepEqual(parseConnectRequest(ok, origins), ok);
    assert.equal(parseConnectRequest({ ...ok, redirectUri: 'https://evil.example/oauth/google.html' }, origins), null);
    assert.equal(parseConnectRequest({ ...ok, redirectUri: 'https://clar.example/otra' }, origins), null);
    assert.equal(parseConnectRequest({ ...ok, codeVerifier: 'corto' }, origins), null);
    assert.equal(parseConnectRequest({ ...ok, timeZone: 'Nowhere/Nada' }, origins), null);
    assert.equal(parseConnectRequest({ ...ok, code: '' }, origins), null);
    assert.equal(parseConnectRequest(null, origins), null);
  });
});

describe('calendar permission encryption', () => {
  const key = randomBytes(32);

  it('opens what it sealed, only for the same account and with the same key', () => {
    const sealed = sealToken('refresh-token-value', key, 'ana');
    assert.notEqual(sealed.data, Buffer.from('refresh-token-value').toString('base64'));
    assert.equal(openToken(sealed, key, 'ana'), 'refresh-token-value');
    assert.throws(() => openToken(sealed, key, 'bruno'));
    assert.throws(() => openToken(sealed, randomBytes(32), 'ana'));
    const tampered = { ...sealed, data: Buffer.from('otro').toString('base64') };
    assert.throws(() => openToken(tampered, key, 'ana'));
  });

  it('needs a key of 32 bytes in base64', () => {
    assert.equal(parseTokenKey(key.toString('base64')).length, 32);
    assert.throws(() => parseTokenKey('corta'), /32 bytes/);
  });
});
