import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// La app en inglés: se fija antes de cargar los módulos (el idioma se lee al cargarlos)
(globalThis as { __CLAR_LOCALE__?: string }).__CLAR_LOCALE__ = 'en';
const { parseDictatedDate, parseDictatedTask } = await import('../../src/services/voiceTask.ts');

// Saturday, 14 November 2026
const TODAY = '2026-11-14';
const parse = (text: string, today = TODAY) => parseDictatedTask(text, today);

describe('dictated task in English', () => {
  it('understands the full form', () => {
    assert.deepEqual(parse('Call the garage before Friday at 5 pm with high priority'), {
      title: 'Call the garage',
      priority: 'HIGH',
      dueDate: '2026-11-20',
      dueTime: '17:00'
    });
    assert.deepEqual(parse('Call the garage by tomorrow at 9:30 with an urgent priority'), {
      title: 'Call the garage',
      priority: 'CRITICAL',
      dueDate: '2026-11-15',
      dueTime: '09:30'
    });
  });

  it('understands days', () => {
    assert.equal(parse('Pay the bill by today').dueDate, '2026-11-14');
    assert.equal(parse('Pay the bill by the day after tomorrow').dueDate, '2026-11-16');
    assert.equal(parse('Pay the bill by Saturday').dueDate, '2026-11-14');
    assert.equal(parse('Pay the bill by next Saturday').dueDate, '2026-11-21');
    assert.equal(parse('Pay the bill by the 20th').dueDate, '2026-11-20');
    assert.equal(parse('Pay the bill by the 10th').dueDate, '2026-12-10');
    assert.equal(parse('Pay the bill by November 20th').dueDate, '2026-11-20');
    assert.equal(parse('Pay the bill by February 3, 2028').dueDate, '2028-02-03');
    assert.equal(parse('Pay the bill by the 3rd of February').dueDate, '2027-02-03');
    assert.equal(parse('Pay the bill by 20/11').dueDate, '2026-11-20');
    assert.equal(parse('Pay the bill by Friday, November 27th').dueDate, '2026-11-27');
    assert.equal(parse('Pay the bill by Monday the 7th').dueDate, '2026-12-07');
  });

  it('understands times', () => {
    const time = (text: string) => parse(`Call mum by tomorrow ${text}`).dueTime;
    assert.equal(time('at 5'), '05:00');
    assert.equal(time('at 5 pm'), '17:00');
    assert.equal(time('at 5 p.m.'), '17:00');
    assert.equal(time('at 12 am'), '00:00');
    assert.equal(time('at 7 in the evening'), '19:00');
    assert.equal(time('at half past 9'), '09:30');
    assert.equal(time('at quarter to 6 pm'), '17:45');
    assert.equal(time('at noon'), '12:00');
    assert.equal(time('at midnight'), '23:59');
    assert.equal(time('at half five'), '05:30');
    assert.equal(time('at half five pm'), '17:30');
    assert.equal(time("at 5 o'clock"), '05:00');
    assert.equal(time("5 o'clock"), '05:00');
    assert.equal(time('and at 17:30'), '17:30');
  });

  it('a bare number is a time, and the time can go before the day', () => {
    assert.deepEqual(parse('Send the report by 5 pm'), { title: 'Send the report', dueDate: TODAY, dueTime: '17:00' });
    assert.deepEqual(parse('Call mum by 5 pm on Friday'), {
      title: 'Call mum',
      dueDate: '2026-11-20',
      dueTime: '17:00'
    });
  });

  it('leaves everything else in the title', () => {
    assert.deepEqual(parse('Pay by card'), { title: 'Pay by card' });
    assert.deepEqual(parse('Stop by the bakery'), { title: 'Stop by the bakery' });
    assert.deepEqual(parse('Review the project priority'), { title: 'Review the project priority' });
    assert.equal(parse('Fix bike priority: low').priority, 'LOW');
    assert.deepEqual(parse('Reply to high priority emails'), { title: 'Reply to high priority emails' });
    assert.deepEqual(parse('Discuss bugs with high priority from the client'), {
      title: 'Discuss bugs with high priority from the client'
    });
    // A bare number is neither a day nor a time
    assert.deepEqual(parse('Send the report by 5'), { title: 'Send the report by 5' });
  });

  it('goals and projects take only the date', () => {
    assert.deepEqual(parseDictatedDate('Run a half marathon by March 1st', TODAY), {
      title: 'Run a half marathon',
      date: '2027-03-01'
    });
    assert.deepEqual(parseDictatedDate('Run a half marathon by Friday at 5 pm', TODAY), {
      title: 'Run a half marathon by Friday at 5 pm'
    });
  });
});
