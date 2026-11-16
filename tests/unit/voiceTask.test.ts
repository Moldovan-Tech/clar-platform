import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDictatedDate, parseDictatedTask } from '../../src/services/voiceTask.ts';

// Sábado, 14 de noviembre de 2026
const TODAY = '2026-11-14';
const parse = (text: string, today = TODAY) => parseDictatedTask(text, today, { locale: 'es' });

describe('tarea dictada: título, plazo y prioridad', () => {
  it('entiende la forma completa', () => {
    assert.deepEqual(parse('Llamar al taller antes del viernes a las 5 de la tarde con prioridad alta'), {
      title: 'Llamar al taller',
      priority: 'HIGH',
      dueDate: '2026-11-20',
      dueTime: '17:00'
    });
    assert.deepEqual(parse('Llamar al taller antes del viernes y a las 17:30 con prioridad crítica'), {
      title: 'Llamar al taller',
      priority: 'CRITICAL',
      dueDate: '2026-11-20',
      dueTime: '17:30'
    });
  });

  it('acepta la prioridad antes del plazo y en otras formas', () => {
    assert.deepEqual(parse('Enviar el informe con prioridad urgente antes de pasado mañana'), {
      title: 'Enviar el informe',
      priority: 'CRITICAL',
      dueDate: '2026-11-16'
    });
    assert.equal(parse('Hacer la compra prioridad baja').priority, 'LOW');
    assert.equal(parse('Hacer la compra con baja prioridad').priority, 'LOW');
    assert.equal(parse('Hacer la compra prioridad: normal').priority, 'MEDIUM');
    assert.equal(parse('Hacer la compra con prioridad media').title, 'Hacer la compra');
  });

  it('entiende hoy, mañana y pasado mañana', () => {
    assert.equal(parse('Pagar la luz antes de hoy').dueDate, '2026-11-14');
    assert.equal(parse('Pagar la luz antes de mañana').dueDate, '2026-11-15');
    assert.equal(parse('Pagar la luz antes de pasado mañana').dueDate, '2026-11-16');
  });

  it('un día de la semana es el siguiente, contando hoy; «próximo» o «que viene» no cuentan hoy', () => {
    assert.equal(parse('Llamar a Ana antes del sábado').dueDate, '2026-11-14');
    assert.equal(parse('Llamar a Ana antes del próximo sábado').dueDate, '2026-11-21');
    assert.equal(parse('Llamar a Ana antes del sábado que viene').dueDate, '2026-11-21');
    assert.equal(parse('Llamar a Ana antes del lunes').dueDate, '2026-11-16');
    assert.equal(parse('Llamar a Ana antes del miércoles').dueDate, '2026-11-18');
    assert.equal(parse('Llamar a Ana antes del miercoles').dueDate, '2026-11-18');
  });

  it('entiende el día del mes, con o sin mes y año', () => {
    assert.equal(parse('Reservar mesa antes del 20 de noviembre').dueDate, '2026-11-20');
    assert.equal(parse('Reservar mesa antes del 20').dueDate, '2026-11-20');
    assert.equal(parse('Reservar mesa antes del 14').dueDate, '2026-11-14');
    // Ya pasó este mes: el del mes siguiente
    assert.equal(parse('Pagar la luz antes del 10').dueDate, '2026-12-10');
    // Ya pasó este año: el del año siguiente
    assert.equal(parse('Renovar el DNI antes del 3 de febrero').dueDate, '2027-02-03');
    assert.equal(parse('Renovar el DNI antes del 3 de febrero de 2028').dueDate, '2028-02-03');
    assert.equal(parse('Renovar el DNI antes del primero de diciembre').dueDate, '2026-12-01');
    assert.equal(parse('Renovar el DNI antes del dos de enero').dueDate, '2027-01-02');
    assert.equal(parse('Llamar a Ana antes del 31/12 a las 23:00').dueTime, '23:00');
    assert.equal(parse('Llamar a Ana antes del 5/1/27').dueDate, '2027-01-05');
    assert.equal(parse('Renovar el DNI antes del quince de marzo').dueDate, '2027-03-15');
    assert.equal(parse('Renovar el DNI antes del treinta y uno de diciembre').dueDate, '2026-12-31');
    assert.equal(parse('Renovar el DNI antes del veintiuno').dueDate, '2026-11-21');
    // Con el día de la semana y la fecha, manda la fecha
    assert.equal(parse('Llamar a Ana antes del viernes 27 de noviembre').dueDate, '2026-11-27');
    assert.equal(parse('Llamar a Ana antes del lunes, día 3').dueDate, '2026-12-03');
  });

  it('cambia de mes y de año', () => {
    assert.equal(parse('Pagar antes de mañana', '2026-12-31').dueDate, '2027-01-01');
    assert.equal(parse('Pagar antes del 2', '2026-12-28').dueDate, '2027-01-02');
    // Noviembre no tiene 31: el próximo 31 es el de diciembre
    assert.equal(parse('Pagar antes del 31').dueDate, '2026-12-31');
    assert.equal(parse('Pagar antes del lunes', '2026-12-30').dueDate, '2027-01-04');
    // El cambio al horario de verano (Madrid, 28 de marzo de 2027) no se salta ni repite días
    assert.equal(parse('Pagar antes de mañana', '2027-03-27').dueDate, '2027-03-28');
    assert.equal(parse('Pagar antes de pasado mañana', '2027-03-27').dueDate, '2027-03-29');
    assert.equal(parse('Pagar antes del domingo', '2027-03-27').dueDate, '2027-03-28');
  });

  it('entiende las horas dichas de muchas formas', () => {
    const time = (text: string) => parse(`Comprar pan antes de mañana ${text}`).dueTime;
    assert.equal(time('a las 9 y media'), '09:30');
    assert.equal(time('a las 9 y cuarto'), '09:15');
    assert.equal(time('a las 6 menos cuarto de la tarde'), '17:45');
    assert.equal(time('a las 10 y 20'), '10:20');
    assert.equal(time('a la una'), '01:00');
    assert.equal(time('a la una de la tarde'), '13:00');
    assert.equal(time('a las doce del mediodía'), '12:00');
    assert.equal(time('a mediodía'), '12:00');
    // Medianoche es el final del día: a las 00:00, la tarea nacería vencida
    assert.equal(time('a medianoche'), '23:59');
    assert.equal(time('a la medianoche'), '23:59');
    assert.equal(time('al mediodía'), '12:00');
    assert.equal(time('a las 12 de la mañana'), '12:00');
    assert.equal(time('a las 12 de la madrugada'), '00:00');
    assert.equal(time('a las 5 y veinte'), '05:20');
    assert.equal(time('a las 5 y veinticinco de la tarde'), '17:25');
    assert.equal(time('a las 11 de la noche'), '23:00');
    assert.equal(time('a las 12 de la noche'), '00:00');
    assert.equal(time('a las 7 de la mañana'), '07:00');
    assert.equal(time('a las 5:00 p. m.'), '17:00');
    assert.equal(time('a las 17 horas'), '17:00');
    assert.equal(time('a las 8 en punto'), '08:00');
    // Sin «de la tarde», la hora dicha
    assert.equal(time('a las 5'), '05:00');
  });

  it('solo con hora, vence hoy; la hora también puede ir antes del día', () => {
    assert.deepEqual(parse('Comprar pan antes de las 8'), { title: 'Comprar pan', dueDate: TODAY, dueTime: '08:00' });
    assert.deepEqual(parse('Llamar al médico antes de las 10 del lunes'), {
      title: 'Llamar al médico',
      dueDate: '2026-11-16',
      dueTime: '10:00'
    });
  });

  it('deja en el título lo que no es un plazo ni una prioridad', () => {
    assert.deepEqual(parse('Preparar la reunión antes de la reunión'), {
      title: 'Preparar la reunión antes de la reunión'
    });
    assert.deepEqual(parse('Terminar el informe'), { title: 'Terminar el informe' });
    assert.deepEqual(parse('Hablar con Ana antes del viernes por la tarde'), {
      title: 'Hablar con Ana antes del viernes por la tarde'
    });
    assert.deepEqual(parse('Pagar antes del 30 de febrero'), { title: 'Pagar antes del 30 de febrero' });
    assert.deepEqual(parse('Pagar antes de las 25'), { title: 'Pagar antes de las 25' });
    assert.deepEqual(parse('Revisar la prioridad del proyecto'), { title: 'Revisar la prioridad del proyecto' });
    // Una prioridad en medio del título, o sin «con» delante, es parte de él
    assert.deepEqual(parse('Responder los correos con prioridad alta del cliente'), {
      title: 'Responder los correos con prioridad alta del cliente'
    });
    assert.deepEqual(parse('Revisar tickets de alta prioridad'), { title: 'Revisar tickets de alta prioridad' });
    assert.deepEqual(parse('Hablar sobre la prioridad baja del cliente'), {
      title: 'Hablar sobre la prioridad baja del cliente'
    });
    // Un día imposible deja el plazo en el título, pero la prioridad del final sí cuenta
    assert.deepEqual(parse('Pagar antes del 30 de febrero con prioridad alta'), {
      title: 'Pagar antes del 30 de febrero',
      priority: 'HIGH'
    });
    // Sin título no se entiende nada
    assert.deepEqual(parse('Antes del viernes'), { title: 'Antes del viernes' });
    assert.deepEqual(parse('   '), { title: '' });
  });

  it('se queda con el «antes de» que es un plazo', () => {
    assert.deepEqual(parse('Comer antes de entrenar antes de mañana'), {
      title: 'Comer antes de entrenar',
      dueDate: '2026-11-15'
    });
  });

  it('entiende las tildes separadas (n + ~)', () => {
    assert.equal(parse('Pagar antes de man\u0303ana'.normalize('NFD')).dueDate, '2026-11-15');
    assert.equal(parse('Pagar antes del mie\u0301rcoles'.normalize('NFD')).dueDate, '2026-11-18');
  });

  it('sin plazo (una tarea que se repite), solo la prioridad, y el resto se queda en el título', () => {
    assert.deepEqual(
      parseDictatedTask('Pagar antes del viernes con prioridad alta', TODAY, { locale: 'es', due: false }),
      {
        title: 'Pagar antes del viernes',
        priority: 'HIGH'
      }
    );
    assert.deepEqual(parseDictatedTask('Pagar antes del viernes', TODAY, { locale: 'es', due: false }), {
      title: 'Pagar antes del viernes'
    });
  });

  it('conserva las mayúsculas y tildes del título y quita los nexos que sobran', () => {
    assert.equal(parse('Llamar a Óscar y antes del viernes').title, 'Llamar a Óscar');
    assert.equal(parse('Llamar a Óscar, antes del viernes.').title, 'Llamar a Óscar');
    assert.equal(parse('LLAMAR A ÓSCAR ANTES DEL VIERNES').dueDate, '2026-11-20');
  });
});

describe('meta o proyecto dictado: nombre y fecha', () => {
  it('separa la fecha del nombre', () => {
    assert.deepEqual(parseDictatedDate('Correr una media maratón antes del 1 de marzo', TODAY, { locale: 'es' }), {
      title: 'Correr una media maratón',
      date: '2027-03-01'
    });
  });

  it('sin fecha, o con hora o prioridad, el nombre se queda entero', () => {
    assert.deepEqual(parseDictatedDate('Correr una media maratón', TODAY, { locale: 'es' }), {
      title: 'Correr una media maratón'
    });
    assert.deepEqual(parseDictatedDate('Reformar la cocina antes del lunes a las 9', TODAY, { locale: 'es' }), {
      title: 'Reformar la cocina antes del lunes a las 9'
    });
    assert.deepEqual(parseDictatedDate('Reformar la cocina con prioridad alta', TODAY, { locale: 'es' }), {
      title: 'Reformar la cocina con prioridad alta'
    });
  });
});
