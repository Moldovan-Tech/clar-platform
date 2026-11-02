import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  where,
  runTransaction,
  setDoc,
  waitForPendingWrites,
  writeBatch,
  type Firestore
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { EmailDraft, Goal, MeetingGuard, Project, TaskDraft, TaskItem, WheelArea, WheelOfLifeLog } from '../types';
import { isUnchanged, normalizeTask } from './tasks';
import { onboardingRecord, type OnboardingOutcome, type OnboardingRecord } from './onboarding';
import type { Locale } from '../i18n/locale';

// Datos de cada persona en users/{uid}/<colección>/<id>. Las reglas (firestore.rules) solo dejan acceder al propio uid.
export type UserCollection = 'tasks' | 'wheelLogs' | 'meetings' | 'emails' | 'goals' | 'projects' | 'taskDrafts';
export const USER_COLLECTIONS: UserCollection[] = [
  'tasks',
  'wheelLogs',
  'meetings',
  'emails',
  'goals',
  'projects',
  'taskDrafts'
];

// Las que la app sigue en vivo. Las reuniones y los correos de «Tiempo protegido» (retirado en la 1.3.0) ya no se ven
// ni se crean: los guardados siguen en la cuenta, van en la descarga, la importación los trae y se borran con la cuenta
export type LiveCollection = Exclude<UserCollection, 'meetings' | 'emails'>;
export const LIVE_COLLECTIONS: LiveCollection[] = ['tasks', 'wheelLogs', 'goals', 'projects', 'taskDrafts'];
// Las retiradas no están en la caché del dispositivo (nada las sigue): se leen siempre del servidor. Sin conexión, la
// lectura falla y se avisa, en vez de dejarlas fuera sin decir nada
const RETIRED_COLLECTIONS: UserCollection[] = ['meetings', 'emails'];

export interface UserData {
  tasks: TaskItem[];
  wheelLogs: WheelOfLifeLog[];
  meetings: MeetingGuard[];
  emails: EmailDraft[];
  goals: Goal[];
  projects: Project[];
  taskDrafts: TaskDraft[];
}

const userCollection = (db: Firestore, uid: string, name: UserCollection) => collection(db, 'users', uid, name);

const byDateDesc = (a?: string, b?: string) => (b ?? '').localeCompare(a ?? '');

// Orden en cliente: un orderBy en la consulta excluiría los documentos sin ese campo
const SORTERS = {
  tasks: (a: TaskItem, b: TaskItem) => byDateDesc(a.createdAt, b.createdAt),
  wheelLogs: (a: WheelOfLifeLog, b: WheelOfLifeLog) => a.timestamp.localeCompare(b.timestamp),
  goals: (a: Goal, b: Goal) => byDateDesc(a.createdAt, b.createdAt),
  projects: (a: Project, b: Project) => byDateDesc(a.createdAt, b.createdAt),
  taskDrafts: (a: TaskDraft, b: TaskDraft) => byDateDesc(a.updatedAt, b.updatedAt)
};

export interface SnapshotInfo {
  // false mientras los datos vienen solo de la caché local y aún no se han confirmado con el servidor
  fromServer: boolean;
  // true mientras haya escrituras locales que el servidor aún no ha confirmado
  hasPendingWrites: boolean;
}

export const subscribeToCollection = <K extends LiveCollection>(
  db: Firestore,
  uid: string,
  name: K,
  onData: (items: UserData[K], info: SnapshotInfo) => void,
  onError: (error: Error) => void
): (() => void) =>
  onSnapshot(
    userCollection(db, uid, name),
    { includeMetadataChanges: true },
    (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data());
      // Las tareas anteriores a la 0.6.0 usan `completed` en lugar de `status`
      const items = (name === 'tasks' ? docs.map((d) => normalizeTask(d as TaskItem)) : docs) as UserData[K];
      items.sort(SORTERS[name] as (a: unknown, b: unknown) => number);
      onData(items, { fromServer: !snapshot.metadata.fromCache, hasPendingWrites: snapshot.metadata.hasPendingWrites });
    },
    onError
  );

// Las escrituras se aplican al instante en la caché local; la promesa se resuelve cuando el servidor las confirma
export const saveTask = (db: Firestore, uid: string, task: TaskItem) =>
  setDoc(doc(userCollection(db, uid, 'tasks'), task.id), { ...task, userId: uid });

// Un borrador que se guarda como tarea: la tarea y el borrador borrado en un mismo lote, así nunca se pierde el
// borrador sin que exista la tarea (también sin conexión)
export const saveTaskFromDraft = (db: Firestore, uid: string, task: TaskItem, draftId: string) => {
  const batch = writeBatch(db);
  batch.set(doc(userCollection(db, uid, 'tasks'), task.id), { ...task, userId: uid });
  batch.delete(doc(userCollection(db, uid, 'taskDrafts'), draftId));
  return batch.commit();
};

// Tarea recurrente hecha: la tarea archivada (con el id de la siguiente) y la siguiente repetición se guardan
// en un mismo lote, así nunca queda una sin la otra
export const completeRecurringTask = (db: Firestore, uid: string, done: TaskItem, next: TaskItem) => {
  const batch = writeBatch(db);
  batch.set(doc(userCollection(db, uid, 'tasks'), done.id), { ...done, userId: uid });
  batch.set(doc(userCollection(db, uid, 'tasks'), next.id), { ...next, userId: uid });
  return batch.commit();
};

// «Deshacer» necesita al servidor: primero se espera a que confirme lo que se acaba de escribir (o se desiste si no
// hay conexión) y después se comprueba y se restaura en una transacción, para no pisar cambios de otro dispositivo
const UNDO_SYNC_TIMEOUT_MS = 5_000;
const whenSynced = (db: Firestore) =>
  Promise.race([
    waitForPendingWrites(db),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('offline')), UNDO_SYNC_TIMEOUT_MS))
  ]);

// Deshacer un cambio de estado: solo si las tareas escritas siguen igual (mismo estado y fecha de modificación) se
// restaura la anterior y, si se creó, se borra la siguiente repetición. Devuelve false si algo cambió entretanto.
export const undoTaskChange = async (
  db: Firestore,
  uid: string,
  written: TaskItem[],
  restored: TaskItem,
  removeId?: string
) => {
  await whenSynced(db);
  const tasks = userCollection(db, uid, 'tasks');
  return runTransaction(db, async (tx) => {
    const snapshots = await Promise.all(written.map((task) => tx.get(doc(tasks, task.id))));
    const current = snapshots.filter((s) => s.exists()).map((s) => s.data() as TaskItem);
    if (!isUnchanged(written, current)) return false;
    tx.set(doc(tasks, restored.id), { ...restored, userId: uid });
    if (removeId) tx.delete(doc(tasks, removeId));
    return true;
  });
};

// Recuperar una tarea eliminada, solo si nadie la ha vuelto a crear entretanto
export const restoreDeletedTask = async (db: Firestore, uid: string, task: TaskItem) => {
  await whenSynced(db);
  const ref = doc(userCollection(db, uid, 'tasks'), task.id);
  return runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) return false;
    tx.set(ref, { ...task, userId: uid });
    return true;
  });
};

export const deleteTask = (db: Firestore, uid: string, taskId: string) =>
  deleteDoc(doc(userCollection(db, uid, 'tasks'), taskId));

// La meta sola: sus tareas toman el área de la meta al leerlas (applyGoalAreas), no hay que reescribirlas
export const saveGoal = (db: Firestore, uid: string, goal: Goal) =>
  setDoc(doc(userCollection(db, uid, 'goals'), goal.id), { ...goal, userId: uid });

// Al eliminar una meta, sus tareas se quedan con el área que tenía y sin el vínculo. El vínculo a una meta que ya no
// existe se ignora al leer, así que esta limpieza no tiene que ser atómica en conjunto: busca las tareas vinculadas
// en ese momento y desvincula cada una en su propia transacción, solo si sigue apuntando a esta meta (si entretanto se
// vinculó a otra en otro dispositivo, no se toca). Sin límite de cantidad: van de diez en diez.
const UNLINK_CONCURRENCY = 10;
export const deleteGoal = async (db: Firestore, uid: string, goal: Goal) => {
  await deleteDoc(doc(userCollection(db, uid, 'goals'), goal.id));
  const linked = await getDocs(query(userCollection(db, uid, 'tasks'), where('goalId', '==', goal.id)));
  const updatedAt = new Date().toISOString();
  const unlink = (ref: (typeof linked.docs)[number]['ref']) =>
    runTransaction(db, async (tx) => {
      const current = await tx.get(ref);
      if ((current.data() as TaskItem | undefined)?.goalId !== goal.id) return;
      tx.update(ref, { goalId: deleteField(), wheelCategory: goal.area, updatedAt });
    });
  for (let i = 0; i < linked.docs.length; i += UNLINK_CONCURRENCY) {
    await Promise.all(linked.docs.slice(i, i + UNLINK_CONCURRENCY).map((task) => unlink(task.ref)));
  }
};

// PROYECTOS: el proyecto solo; sus tareas toman la meta del proyecto al leerlas (applyProjectGoals)
export const saveProject = (db: Firestore, uid: string, project: Project) =>
  setDoc(doc(userCollection(db, uid, 'projects'), project.id), { ...project, userId: uid });

// Al eliminar un proyecto, sus tareas siguen en la meta del proyecto y sin el vínculo: cada una en su propia
// transacción y solo si sigue apuntando a este proyecto. Primero se desvinculan y después se borra el proyecto: si algo
// falla a medias, el proyecto sigue ahí (sus tareas siguen tomando su meta) y se puede volver a eliminar, que termina
// el trabajo. Una tarea que se vincule mientras tanto se desvincula en una segunda pasada.
const unlinkProjectTasks = async (db: Firestore, uid: string, project: Project) => {
  const linked = await getDocs(query(userCollection(db, uid, 'tasks'), where('projectId', '==', project.id)));
  const updatedAt = new Date().toISOString();
  const unlink = (ref: (typeof linked.docs)[number]['ref']) =>
    runTransaction(db, async (tx) => {
      const current = await tx.get(ref);
      if ((current.data() as TaskItem | undefined)?.projectId !== project.id) return;
      tx.update(ref, { projectId: deleteField(), goalId: project.goalId, updatedAt });
    });
  for (let i = 0; i < linked.docs.length; i += UNLINK_CONCURRENCY) {
    await Promise.all(linked.docs.slice(i, i + UNLINK_CONCURRENCY).map((task) => unlink(task.ref)));
  }
};

export const deleteProject = async (db: Firestore, uid: string, project: Project) => {
  await unlinkProjectTasks(db, uid, project);
  await deleteDoc(doc(userCollection(db, uid, 'projects'), project.id));
  await unlinkProjectTasks(db, uid, project);
};

export const appendWheelLog = (db: Firestore, uid: string, log: WheelOfLifeLog) =>
  setDoc(doc(userCollection(db, uid, 'wheelLogs'), log.id), { ...log, userId: uid });

export const saveTaskDraft = (db: Firestore, uid: string, draft: TaskDraft) =>
  setDoc(doc(userCollection(db, uid, 'taskDrafts'), draft.id), { ...draft, userId: uid });

export const deleteTaskDraft = (db: Firestore, uid: string, draftId: string) =>
  deleteDoc(doc(userCollection(db, uid, 'taskDrafts'), draftId));

export const saveUserProfile = (db: Firestore, user: User) =>
  setDoc(
    doc(db, 'users', user.uid),
    {
      name: user.displayName ?? '',
      email: user.email ?? '',
      photoUrl: user.photoURL ?? '',
      createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : '',
      lastLoginAt: new Date().toISOString()
    },
    { merge: true }
  );

// Cuándo aceptó las condiciones de uso (al crear la cuenta con email, con su casilla; con Google, al continuar tras el
// aviso de la pantalla de entrada): se apunta una vez, con la fecha de los textos legales de entonces. Sin conexión se
// deja para la próxima vez
export const recordTermsAcceptance = async (db: Firestore, uid: string, version: string) => {
  const ref = doc(db, 'users', uid);
  if ((await getDoc(ref)).data()?.termsAcceptedAt) return;
  await setDoc(ref, { termsAcceptedAt: new Date().toISOString(), termsVersion: version }, { merge: true });
};

// Perfil (users/{uid}) en vivo: por ahora solo interesa si ya vio la bienvenida. `fromServer` dice si el dato ya
// está confirmado por el servidor (al principio puede venir solo de la caché, o no existir aún)
// Lo que la app lee del perfil: si ya vio la bienvenida, sus áreas de la Rueda (sin validar: ver resolveAreas), qué
// funciones extra tiene encendidas la administración (sin validar: ver featurePrefsOf) y la última versión cuyas
// novedades vio (sin validar: ver shouldShowReleaseNotes)
export type ProfileRecord = OnboardingRecord & {
  language?: unknown;
  wheelAreas?: unknown;
  featurePrefs?: unknown;
  releaseNotesSeen?: unknown;
};

export const subscribeToProfile = (
  db: Firestore,
  uid: string,
  onData: (profile: ProfileRecord | null, fromServer: boolean) => void,
  onError: (error: Error) => void
) => {
  // Con escrituras propias pendientes aún no cuenta como confirmado: en un navegador nuevo (sin caché), lo que se guarda
  // al entrar (saveUserProfile) llega como «del servidor» antes que el resto del perfil, y la cuenta parecería no haber
  // visto la bienvenida ni tener idioma. Una vez confirmado, sigue así: lo que se guarde después va sobre el perfil
  // entero, y la bienvenida no se cierra y se vuelve a abrir con cada escritura
  let confirmed = false;
  return onSnapshot(
    doc(db, 'users', uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      confirmed ||= !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
      onData((snapshot.data() as ProfileRecord | undefined) ?? null, confirmed);
    },
    onError
  );
};

// Las áreas de la Rueda de la cuenta, en su orden (con las ocultas): se guardan enteras
export const saveWheelAreas = (db: Firestore, uid: string, areas: WheelArea[]) =>
  setDoc(doc(db, 'users', uid), { wheelAreas: areas }, { merge: true });

export const readWheelAreas = async (db: Firestore, uid: string) =>
  ((await getDoc(doc(db, 'users', uid))).data() as ProfileRecord | undefined)?.wheelAreas;

// El idioma de la app de la cuenta (src/i18n/locale.ts): el servidor lo usa para los emails
export const saveLanguage = (db: Firestore, uid: string, language: Locale) =>
  setDoc(doc(db, 'users', uid), { language }, { merge: true });

// Con `releaseNotesSeen`, también las novedades de esa versión, en la misma escritura
export const markOnboardingSeen = (db: Firestore, uid: string, outcome: OnboardingOutcome, releaseNotesSeen?: string) =>
  setDoc(
    doc(db, 'users', uid),
    { ...onboardingRecord(outcome), ...(releaseNotesSeen ? { releaseNotesSeen } : {}) },
    { merge: true }
  );

// Las novedades de esta versión, vistas
export const markReleaseNotesSeen = (db: Firestore, uid: string, version: string) =>
  setDoc(doc(db, 'users', uid), { releaseNotesSeen: version }, { merge: true });

// Firestore admite como máximo 500 operaciones por lote
const BATCH_LIMIT = 450;

const commitInBatches = async (
  db: Firestore,
  ops: ((batch: ReturnType<typeof writeBatch>) => void)[],
  { size = BATCH_LIMIT, onProgress }: { size?: number; onProgress?: (done: number, total: number) => void } = {}
) => {
  for (let i = 0; i < ops.length; i += size) {
    const batch = writeBatch(db);
    const chunk = ops.slice(i, i + size);
    chunk.forEach((op) => op(batch));
    await batch.commit();
    onProgress?.(i + chunk.length, ops.length);
  }
};

// Ids de lo que ya hay en la cuenta, leídos del servidor (la caché local podría no tenerlo todo). Sin conexión falla.
export const existingIds = async (db: Firestore, uid: string) =>
  Object.fromEntries(
    await Promise.all(
      USER_COLLECTIONS.map(async (name) => {
        const snapshot = await getDocsFromServer(userCollection(db, uid, name));
        return [name, new Set(snapshot.docs.map((d) => d.id))] as const;
      })
    )
  ) as Record<UserCollection, Set<string>>;

// Escribe los registros en el orden de las colecciones, en lotes pequeños para ir contando el avance
const IMPORT_BATCH = 100;
export const importRecords = (
  db: Firestore,
  uid: string,
  data: UserData,
  order: UserCollection[],
  onProgress?: (done: number, total: number) => void
) =>
  commitInBatches(
    db,
    order.flatMap((name) =>
      (data[name] as { id: string }[]).map(
        (item) => (batch: ReturnType<typeof writeBatch>) =>
          batch.set(doc(userCollection(db, uid, name), item.id), { ...item, userId: uid })
      )
    ),
    { size: IMPORT_BATCH, onProgress }
  );

export const importUserData = (db: Firestore, uid: string, data: UserData) =>
  commitInBatches(
    db,
    USER_COLLECTIONS.flatMap((name) =>
      ((data[name] ?? []) as { id: string }[]).map(
        (item) => (batch: ReturnType<typeof writeBatch>) =>
          batch.set(doc(userCollection(db, uid, name), item.id), { ...item, userId: uid })
      )
    )
  );

export const exportUserData = async (db: Firestore, uid: string): Promise<UserData> => {
  const entries = await Promise.all(
    USER_COLLECTIONS.map(async (name) => {
      const read = RETIRED_COLLECTIONS.includes(name) ? getDocsFromServer : getDocs;
      const snapshot = await read(userCollection(db, uid, name));
      return [name, snapshot.docs.map((d) => d.data())] as const;
    })
  );
  return Object.fromEntries(entries) as unknown as UserData;
};

// Reuniones y correos guardados con versiones anteriores a la 1.3.0: cuántos quedan y borrarlos (menú de la cuenta)
export const countRetiredItems = async (db: Firestore, uid: string) => {
  const counts = await Promise.all(
    RETIRED_COLLECTIONS.map(async (name) => (await getCountFromServer(userCollection(db, uid, name))).data().count)
  );
  return counts.reduce((sum, n) => sum + n, 0);
};
export const deleteRetiredItems = async (db: Firestore, uid: string) => {
  const snapshots = await Promise.all(
    RETIRED_COLLECTIONS.map((name) => getDocsFromServer(userCollection(db, uid, name)))
  );
  await commitInBatches(db, [
    ...snapshots.flatMap((snapshot) =>
      snapshot.docs.map((d) => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref))
    )
  ]);
};

export const deleteAllUserData = async (db: Firestore, uid: string) => {
  const snapshots = await Promise.all(USER_COLLECTIONS.map((name) => getDocs(userCollection(db, uid, name))));
  await commitInBatches(db, [
    ...snapshots.flatMap((snapshot) =>
      snapshot.docs.map((d) => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref))
    ),
    (batch) => batch.delete(doc(db, 'users', uid))
  ]);
};
