import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

// Se ejecuta contra el emulador de Firestore: npm run test:rules
describe('firestore.rules', () => {
  let env: RulesTestEnvironment;

  before(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-neuroproductivity',
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8281 }
    });
  });

  // Ana y Bruno tienen el acceso aprobado; las solicitudes solo las escriben las Cloud Functions
  const grantAccess = (uid: string, status = 'approved') =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `access/${uid}`), { status, email: `${uid}@example.com` });
    });

  beforeEach(async () => {
    await env.clearFirestore();
    await grantAccess('ana');
    await grantAccess('bruno');
  });

  after(async () => {
    await env.cleanup();
  });

  const task = { id: 'task-1', title: 'Llamar al taller', completed: false };
  const wheelLog = { id: 'wheel-1', timestamp: '2026-10-08T10:00:00.000Z', scores: { Salud: 7 } };

  it('lets a signed-in person read and write their own data', async () => {
    const ana = env.authenticatedContext('ana').firestore();

    await assertSucceeds(setDoc(doc(ana, 'users/ana'), { name: 'Ana' }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/tasks/task-1'), task));
    await assertSucceeds(updateDoc(doc(ana, 'users/ana/tasks/task-1'), { completed: true }));
    await assertSucceeds(getDoc(doc(ana, 'users/ana/tasks/task-1')));
    await assertSucceeds(deleteDoc(doc(ana, 'users/ana/tasks/task-1')));
  });

  it("denies reading or writing another person's data", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/ana/tasks/task-1'), task);
    });
    const bruno = env.authenticatedContext('bruno').firestore();

    await assertFails(getDoc(doc(bruno, 'users/ana')));
    await assertFails(getDoc(doc(bruno, 'users/ana/tasks/task-1')));
    await assertFails(setDoc(doc(bruno, 'users/ana/tasks/task-2'), task));
    await assertFails(deleteDoc(doc(bruno, 'users/ana/tasks/task-1')));
  });

  it('denies everything to signed-out visitors', async () => {
    const anonymous = env.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(anonymous, 'users/ana/tasks/task-1')));
    await assertFails(setDoc(doc(anonymous, 'users/ana/tasks/task-1'), task));
  });

  // Cada escritura comprueba el acceso (exists y get de access/{uid}): un lote grande, como el de una importación,
  // tiene que caber en el límite de llamadas de las reglas
  it('accepts a large batch of creates, as an import writes them', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const batch = writeBatch(ana);
    for (let i = 0; i < 450; i++) batch.set(doc(ana, `users/ana/tasks/task-${i}`), { ...task, id: `task-${i}` });
    await assertSucceeds(batch.commit());
  });

  it('keeps wheel evaluations append-only, allowing identical rewrites and deletion', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const ref = doc(ana, 'users/ana/wheelLogs/wheel-1');

    await assertSucceeds(setDoc(ref, wheelLog));
    await assertFails(updateDoc(ref, { scores: { Salud: 10 } }));
    await assertSucceeds(setDoc(ref, wheelLog));
    await assertSucceeds(deleteDoc(ref));
  });

  it('lets the profile hold only the account data, whether the welcome was seen, the Wheel areas and feature switches', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const profile = { name: 'Ana', email: 'ana@example.com', photoUrl: '', createdAt: '', lastLoginAt: '' };

    await assertSucceeds(setDoc(doc(ana, 'users/ana'), profile));
    await assertSucceeds(
      setDoc(
        doc(ana, 'users/ana'),
        {
          hasSeenOnboarding: true,
          onboardingVersion: 1,
          onboardingSeenAt: '2026-10-14T09:30:00.000Z',
          onboardingOutcome: 'completed'
        },
        { merge: true }
      )
    );
    // Sus áreas de la Rueda (nombres propios, ocultas y añadidas)
    await assertSucceeds(
      setDoc(doc(ana, 'users/ana'), { wheelAreas: [{ id: 'Salud', label: 'Cuerpo' }] }, { merge: true })
    );
    // La última versión cuyas novedades vio
    await assertSucceeds(setDoc(doc(ana, 'users/ana'), { releaseNotesSeen: '0.9.6' }, { merge: true }));
    // El idioma de la app
    await assertSucceeds(setDoc(doc(ana, 'users/ana'), { language: 'en' }, { merge: true }));
    await assertFails(setDoc(doc(ana, 'users/ana'), { language: 'fr' }, { merge: true }));
    // La aceptación de las condiciones de uso
    await assertSucceeds(
      setDoc(doc(ana, 'users/ana'), { termsAcceptedAt: '2026-10-21', termsVersion: '2026-10-21' }, { merge: true })
    );
    // Qué funciones extra tiene encendidas (solo cuenta para la administración)
    await assertSucceeds(setDoc(doc(ana, 'users/ana'), { featurePrefs: { googleCalendar: true } }, { merge: true }));
    await assertFails(updateDoc(doc(ana, 'users/ana'), { isAdmin: true }));
    await assertFails(setDoc(doc(env.authenticatedContext('bruno').firestore(), 'users/bruno'), { role: 'admin' }));
  });

  it('keeps goals private to their owner, who can create, change and delete them', async () => {
    const goal = { id: 'goal-1', title: 'Correr una media maratón', area: 'Salud', status: 'ACTIVE' };
    const ana = env.authenticatedContext('ana').firestore();
    const bruno = env.authenticatedContext('bruno').firestore();

    await assertSucceeds(setDoc(doc(ana, 'users/ana/goals/goal-1'), goal));
    await assertSucceeds(updateDoc(doc(ana, 'users/ana/goals/goal-1'), { status: 'ACHIEVED' }));
    await assertFails(getDoc(doc(bruno, 'users/ana/goals/goal-1')));
    await assertFails(setDoc(doc(bruno, 'users/ana/goals/goal-2'), goal));
    await assertFails(deleteDoc(doc(bruno, 'users/ana/goals/goal-1')));
    await assertSucceeds(deleteDoc(doc(ana, 'users/ana/goals/goal-1')));
  });

  it('keeps projects private to their owner, who can create, change and delete them', async () => {
    const project = { id: 'project-1', title: 'Reformar la cocina', goalId: 'goal-1', status: 'ACTIVE' };
    const ana = env.authenticatedContext('ana').firestore();
    const bruno = env.authenticatedContext('bruno').firestore();

    await assertSucceeds(setDoc(doc(ana, 'users/ana/projects/project-1'), project));
    await assertSucceeds(updateDoc(doc(ana, 'users/ana/projects/project-1'), { status: 'FINISHED' }));
    await assertFails(getDoc(doc(bruno, 'users/ana/projects/project-1')));
    await assertFails(setDoc(doc(bruno, 'users/ana/projects/project-2'), project));
    await assertFails(deleteDoc(doc(bruno, 'users/ana/projects/project-1')));
    await assertSucceeds(deleteDoc(doc(ana, 'users/ana/projects/project-1')));
  });

  it('keeps task drafts private to their owner, who can create, change and delete them', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const bruno = env.authenticatedContext('bruno').firestore();
    const draft = { id: 'draft-1', userId: 'ana', form: { title: 'Pedir cita' }, createdAt: '', updatedAt: '' };
    const ref = doc(ana, 'users/ana/taskDrafts/draft-1');

    await assertSucceeds(setDoc(ref, draft));
    await assertSucceeds(updateDoc(ref, { form: { title: 'Pedir cita en el taller' } }));
    await assertFails(getDoc(doc(bruno, 'users/ana/taskDrafts/draft-1')));
    await assertFails(setDoc(doc(bruno, 'users/ana/taskDrafts/draft-2'), draft));
    await assertSucceeds(deleteDoc(ref));
  });

  // «Tiempo protegido» se retiró en la 1.3.0: la app ya no crea reuniones ni correos, pero los guardados siguen en la
  // cuenta (descarga y borrado) y la importación los vuelve a escribir
  it('keeps meetings and emails private to their owner, who can still read, import and delete them', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const bruno = env.authenticatedContext('bruno').firestore();
    const meeting = doc(ana, 'users/ana/meetings/meet-1');
    const email = doc(ana, 'users/ana/emails/email-1');

    const batch = writeBatch(ana);
    batch.set(meeting, { id: 'meet-1', userId: 'ana', title: 'Revisión semanal', agendaPoints: ['Estado'] });
    batch.set(email, { id: 'email-1', userId: 'ana', subject: 'Acta', recipients: ['equipo@example.com'] });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDocs(collection(ana, 'users/ana/meetings')));
    await assertSucceeds(getDocs(collection(ana, 'users/ana/emails')));
    await assertFails(getDoc(doc(bruno, 'users/ana/meetings/meet-1')));
    await assertFails(getDoc(doc(bruno, 'users/ana/emails/email-1')));
    await assertFails(deleteDoc(doc(bruno, 'users/ana/emails/email-1')));
    await assertSucceeds(deleteDoc(meeting));
    await assertSucceeds(deleteDoc(email));
  });

  it('rejects oversized writes (many fields, huge texts or lists) but accepts generous ones', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const ref = doc(ana, 'users/ana/tasks/task-big');
    // Lo que acepta la importación (src/services/importData.ts) cabe siempre
    await assertSucceeds(setDoc(ref, { ...task, description: 'x'.repeat(100_000) }));
    await assertFails(setDoc(ref, { ...task, title: 'x'.repeat(2_001) }));
    await assertFails(setDoc(ref, { ...task, description: 'x'.repeat(100_001) }));
    // También al editar
    await assertSucceeds(updateDoc(ref, { why: 'x'.repeat(5_000) }));
    await assertFails(updateDoc(ref, { why: 'x'.repeat(5_001) }));
    await assertFails(
      setDoc(ref, { ...task, observations: Array.from({ length: 1_001 }, (_, i) => ({ id: `o${i}` })) })
    );
    await assertFails(
      setDoc(ref, { ...task, ...Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`extra${i}`, i])) })
    );
    const email = doc(ana, 'users/ana/emails/e1');
    await assertSucceeds(setDoc(email, { id: 'e1', subject: 'x'.repeat(5_000), body: 'x'.repeat(200_000) }));
    await assertFails(setDoc(email, { id: 'e1', subject: 's', body: 'x'.repeat(200_001) }));
    await assertFails(setDoc(email, { id: 'e1', recipients: Array.from({ length: 1_001 }, (_, i) => `p${i}@x.es`) }));
    const meeting = doc(ana, 'users/ana/meetings/m1');
    await assertSucceeds(setDoc(meeting, { id: 'm1', agendaPoints: Array.from({ length: 1_000 }, () => 'Punto') }));
    await assertFails(setDoc(meeting, { id: 'm1', agendaPoints: Array.from({ length: 1_001 }, () => 'Punto') }));
    const draft = doc(ana, 'users/ana/taskDrafts/d1');
    const form = (keys: number) => Object.fromEntries(Array.from({ length: keys }, (_, i) => [`k${i}`, '']));
    await assertSucceeds(setDoc(draft, { id: 'd1', form: form(60) }));
    await assertFails(setDoc(draft, { id: 'd1', form: form(61) }));
  });

  it('rejects collections outside the allowed list', async () => {
    const ana = env.authenticatedContext('ana').firestore();

    await assertFails(setDoc(doc(ana, 'users/ana/secrets/x'), { value: 1 }));
    await assertFails(setDoc(doc(ana, 'other/x'), { value: 1 }));
  });

  it('does not let a person create or change their data until their access is approved', async () => {
    for (const [uid, status] of [
      ['carla', 'pending'],
      ['dani', 'rejected'],
      ['eva', 'revoked']
    ]) {
      await grantAccess(uid, status);
    }
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/eva/tasks/task-1'), task);
    });
    for (const uid of ['carla', 'dani', 'eva', 'fran']) {
      const person = env.authenticatedContext(uid).firestore();
      await assertFails(setDoc(doc(person, `users/${uid}`), { name: uid }));
      await assertFails(setDoc(doc(person, `users/${uid}/tasks/task-2`), task));
    }
    await assertFails(
      updateDoc(doc(env.authenticatedContext('eva').firestore(), 'users/eva/tasks/task-1'), { completed: true })
    );
  });

  it('still lets a person without approved access download and delete their own data', async () => {
    await grantAccess('eva', 'revoked');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/eva'), { name: 'Eva' });
      await setDoc(doc(ctx.firestore(), 'users/eva/tasks/task-1'), task);
    });
    const eva = env.authenticatedContext('eva').firestore();
    await assertSucceeds(getDoc(doc(eva, 'users/eva')));
    await assertSucceeds(getDocs(collection(eva, 'users/eva/tasks')));
    await assertSucceeds(deleteDoc(doc(eva, 'users/eva/tasks/task-1')));
    await assertSucceeds(deleteDoc(doc(eva, 'users/eva')));
    // Pero nunca los de otra persona
    const fran = env.authenticatedContext('fran').firestore();
    await assertFails(getDocs(collection(fran, 'users/ana/tasks')));
  });

  it('lets each person read only their own access request, and the admin read all of them', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin'), {
        email: 'admin@example.com',
        since: '2026-10-11T10:00:00.000Z'
      });
    });
    const ana = env.authenticatedContext('ana').firestore();
    const admin = env.authenticatedContext('admin', { email: 'admin@example.com' }).firestore();

    await assertSucceeds(getDoc(doc(ana, 'access/ana')));
    await assertFails(getDoc(doc(ana, 'access/bruno')));
    await assertSucceeds(getDocs(collection(admin, 'access')));
    await assertFails(getDocs(collection(ana, 'access')));
    await assertSucceeds(getDoc(doc(admin, 'admins/admin')));
    await assertFails(getDoc(doc(ana, 'admins/admin')));
  });

  it('lets only the admin read contact messages and change just their status; nobody writes them from the app', async () => {
    const ticket = { uid: 'ana', email: 'ana@example.com', type: 'bug', subject: 'a', description: 'b', status: 'new' };
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin'), {
        email: 'admin@example.com',
        since: '2026-10-11T10:00:00.000Z'
      });
      await setDoc(doc(ctx.firestore(), 'feedback_tickets/t1'), ticket);
      await setDoc(doc(ctx.firestore(), 'feedback_limits/ana'), { sent: [] });
    });
    const ana = env.authenticatedContext('ana').firestore();
    const admin = env.authenticatedContext('admin', { email: 'admin@example.com' }).firestore();

    await assertSucceeds(getDocs(collection(admin, 'feedback_tickets')));
    await assertSucceeds(updateDoc(doc(admin, 'feedback_tickets/t1'), { status: 'read', updatedAt: 'now' }));
    await assertFails(updateDoc(doc(admin, 'feedback_tickets/t1'), { status: 'spam' }));
    await assertFails(updateDoc(doc(admin, 'feedback_tickets/t1'), { description: 'otra' }));
    // Las respuestas solo las guarda la Cloud Function, después de enviarlas por email
    await assertFails(
      updateDoc(doc(admin, 'feedback_tickets/t1'), { replies: [{ message: 'hola', sentAt: 'now' }], updatedAt: 'now' })
    );
    await assertFails(deleteDoc(doc(admin, 'feedback_tickets/t1')));
    // Quien escribe no puede leerlos ni crearlos directamente (pasa por la Cloud Function)
    await assertFails(getDoc(doc(ana, 'feedback_tickets/t1')));
    await assertFails(setDoc(doc(ana, 'feedback_tickets/t2'), ticket));
    await assertFails(getDoc(doc(ana, 'feedback_limits/ana')));
    await assertFails(getDoc(doc(admin, 'feedback_limits/ana')));
  });

  it('lets only the admin read the access settings; nobody reads or writes the email blocklist', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin'), {
        email: 'admin@example.com',
        since: '2026-10-11T10:00:00.000Z'
      });
      await setDoc(doc(ctx.firestore(), 'settings/access'), { approvalRequired: false });
      await setDoc(doc(ctx.firestore(), 'blocked_emails/x%40example.com'), { uid: 'x' });
    });
    const ana = env.authenticatedContext('ana').firestore();
    const admin = env.authenticatedContext('admin', { email: 'admin@example.com' }).firestore();

    await assertSucceeds(getDoc(doc(admin, 'settings/access')));
    await assertFails(getDoc(doc(ana, 'settings/access')));
    await assertFails(setDoc(doc(admin, 'settings/access'), { approvalRequired: true }));
    await assertFails(getDoc(doc(admin, 'blocked_emails/x%40example.com')));
    await assertFails(setDoc(doc(ana, 'blocked_emails/ana%40example.com'), { uid: 'ana' }));
  });

  it('ignores an admin marker whose email is not the reader’s (e.g. after changing the admin account)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/former'), {
        email: 'antes@example.com',
        since: '2026-10-01T10:00:00.000Z'
      });
    });
    const former = env.authenticatedContext('former', { email: 'otra@example.com' }).firestore();
    await assertFails(getDocs(collection(former, 'access')));
    const noEmail = env.authenticatedContext('former').firestore();
    await assertFails(getDocs(collection(noEmail, 'access')));
  });

  // Los dispositivos y la cola de las notificaciones push solo los usan las Cloud Functions
  it('keeps push devices and the alarm queue out of reach of every client, their owner included', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'push_devices/ana'), { timeZone: 'Europe/Madrid' });
      await setDoc(doc(ctx.firestore(), 'push_devices/ana/tokens/t1'), { token: 'x', timeZone: 'Europe/Madrid' });
      await setDoc(doc(ctx.firestore(), 'alarm_queue/ana__task-1'), { uid: 'ana', taskId: 'task-1' });
      await setDoc(doc(ctx.firestore(), 'alarm_sent/ana__task-1'), { uid: 'ana', taskId: 'task-1' });
      await setDoc(doc(ctx.firestore(), 'push_tokens/t1'), { uid: 'ana' });
    });
    const ana = env.authenticatedContext('ana').firestore();
    await assertFails(getDoc(doc(ana, 'push_devices/ana')));
    await assertFails(getDocs(collection(ana, 'push_devices/ana/tokens')));
    await assertFails(setDoc(doc(ana, 'push_devices/ana/tokens/t2'), { token: 'y' }));
    await assertFails(getDoc(doc(ana, 'alarm_queue/ana__task-1')));
    await assertFails(setDoc(doc(ana, 'alarm_queue/ana__task-2'), { uid: 'ana' }));
    await assertFails(deleteDoc(doc(ana, 'alarm_queue/ana__task-1')));
    await assertFails(getDoc(doc(ana, 'alarm_sent/ana__task-1')));
    await assertFails(getDoc(doc(ana, 'push_tokens/t1')));
    await assertFails(setDoc(doc(ana, 'push_tokens/t2'), { uid: 'ana' }));
  });

  it('lets each account read only its own extra features, the admin read all of them, and no client write them', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin'), {
        email: 'admin@example.com',
        since: '2026-10-11T10:00:00.000Z'
      });
      await setDoc(doc(ctx.firestore(), 'features/ana'), { granted: ['googleCalendar'], updatedAt: 'now' });
    });
    const ana = env.authenticatedContext('ana').firestore();
    const bruno = env.authenticatedContext('bruno').firestore();
    const admin = env.authenticatedContext('admin', { email: 'admin@example.com' }).firestore();

    await assertSucceeds(getDoc(doc(ana, 'features/ana')));
    await assertFails(getDoc(doc(bruno, 'features/ana')));
    await assertFails(getDocs(collection(ana, 'features')));
    await assertSucceeds(getDocs(collection(admin, 'features')));
    await assertFails(setDoc(doc(bruno, 'features/bruno'), { granted: ['googleCalendar'] }));
    await assertFails(updateDoc(doc(ana, 'features/ana'), { granted: [] }));
    await assertFails(deleteDoc(doc(ana, 'features/ana')));
    await assertFails(setDoc(doc(admin, 'features/bruno'), { granted: ['googleCalendar'] }));
  });

  it('lets an account read only the state of its Google Calendar connection, and nobody its permission', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin'), {
        email: 'admin@example.com',
        since: '2026-10-11T10:00:00.000Z'
      });
      await setDoc(doc(ctx.firestore(), 'calendar_status/ana'), { state: 'connected', calendarId: 'c1' });
      await setDoc(doc(ctx.firestore(), 'calendar_tokens/ana'), { calendarId: 'c1', timeZone: 'Europe/Madrid' });
    });
    const ana = env.authenticatedContext('ana').firestore();
    const bruno = env.authenticatedContext('bruno').firestore();
    const admin = env.authenticatedContext('admin', { email: 'admin@example.com' }).firestore();

    await assertSucceeds(getDoc(doc(ana, 'calendar_status/ana')));
    await assertFails(getDoc(doc(bruno, 'calendar_status/ana')));
    await assertFails(getDoc(doc(admin, 'calendar_status/ana')));
    await assertFails(setDoc(doc(ana, 'calendar_status/ana'), { state: 'connected' }));
    await assertFails(getDoc(doc(ana, 'calendar_tokens/ana')));
    await assertFails(getDoc(doc(admin, 'calendar_tokens/ana')));
    await assertFails(setDoc(doc(ana, 'calendar_tokens/ana'), { calendarId: 'otro' }));
  });

  it('never lets a client write access requests or the admin list, not even the admin', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin'), {
        email: 'admin@example.com',
        since: '2026-10-11T10:00:00.000Z'
      });
    });
    const carla = env.authenticatedContext('carla').firestore();
    const admin = env.authenticatedContext('admin', { email: 'admin@example.com' }).firestore();

    await assertFails(setDoc(doc(carla, 'access/carla'), { status: 'approved' }));
    await assertFails(updateDoc(doc(admin, 'access/ana'), { status: 'revoked' }));
    await assertFails(deleteDoc(doc(admin, 'access/ana')));
    await assertFails(setDoc(doc(carla, 'admins/carla'), { since: 'now' }));
  });
});
