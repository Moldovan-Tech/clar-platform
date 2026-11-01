/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { retryableLazy } from './lazy';
import { DeferredDialog, DeferredSection } from './components/Deferred';
import type { User } from 'firebase/auth';
import {
  AppTab,
  ListContext,
  TaskItem,
  TaskStatus,
  WheelArea,
  WheelCategory,
  WheelOfLifeLog,
  Goal,
  GoalStatus,
  Project,
  ProjectStatus,
  TaskDraft,
  TaskFormValues,
  UserProfile
} from './types';
import { formatDay, formatTaskDates, isArchived, isArchivedStatus, withStatus } from './services/tasks';
import { nextRecurringTask } from './services/recurrence';
import { forceSync, signOutAndClearCache, type FirebaseServices } from './services/firebase';
import {
  appendWheelLog,
  completeRecurringTask,
  deleteTask,
  undoTaskChange,
  restoreDeletedTask,
  saveGoal,
  deleteGoal,
  saveProject,
  deleteProject,
  subscribeToProfile,
  saveWheelAreas,
  type ProfileRecord,
  markOnboardingSeen,
  markReleaseNotesSeen,
  importUserData,
  saveTaskDraft,
  deleteTaskDraft,
  saveTaskFromDraft,
  saveTask,
  subscribeToCollection,
  LIVE_COLLECTIONS,
  type LiveCollection,
  type SnapshotInfo,
  countRetiredItems,
  deleteRetiredItems
} from './services/repository';
import { buildImport, clearLocalData, getLocalProfiles, type LocalProfileSummary } from './services/localData';
import { arrangeTasks, parseListPrefs, splitTop10, type ListPrefs } from './services/taskListing';
import { blockerOf, dependentsOf, tasksById } from './services/dependencies';
import { adminAlerts, requestsSeenKey } from './services/adminAlerts';
import { useNow } from './hooks/useNow';
import { Navbar } from './components/Navbar';
import { BottomNav, MORE_BUTTON_ID } from './components/BottomNav';
import { PHONE_QUERY, useMediaQuery } from './hooks/useMediaQuery';
import { MoreSheet } from './components/MoreSheet';
// Va ya en el paquete principal: también la usa la pantalla de acceso
import { FeedbackDialog } from './components/FeedbackDialog';
import { AlarmAlerts, type AlarmAlert } from './components/AlarmAlerts';
import { useTaskAlarms } from './hooks/useTaskAlarms';
import { useAccountLanguage } from './hooks/useAccountLanguage';
import { alarmLateNote, alarmSetAtFor, formatClock } from './services/alarms';
import {
  NOTIFICATIONS_GRANTED_EVENT,
  OPEN_ALARM_MESSAGE,
  notificationState,
  registerServiceWorker,
  requestNotifications,
  showSystemNotification
} from './services/notifications';
import {
  disablePush,
  enablePush,
  isPushEnabled,
  isPushTitleShown,
  pushAvailable,
  pushPermissionLost,
  registerPushDevice,
  sendTestPush,
  setPushTitleShown
} from './services/push';
import { TOUR_STEPS } from './tourSteps';
import { hasSeenLocally, hasSeenOnboarding, rememberLocally, type OnboardingOutcome } from './services/onboarding';
import {
  hasSeenRelease,
  releaseFor,
  rememberReleaseLocally,
  seenReleaseLocally,
  shouldShowReleaseNotes
} from './services/releaseNotes';
import { applyGoalAreas, latestScores } from './services/goals';
import { DEFAULT_AREAS, logAverage, resolveAreas, storableAreas } from './services/wheel';
import { AreasContext } from './hooks/useAreas';
import { applyProjectGoals, projectsOfGoal } from './services/projects';
import { exportFilename, goalExport, projectExport, taskExport } from './services/exports';
import { downloadJson } from './services/download';
import type { SyncStatus } from './components/SyncIndicator';
import { TaskList } from './components/TaskList';
import { TaskModal, type TaskFormData } from './components/TaskModal';
import { ArchivedTasksModal } from './components/ArchivedTasksModal';
import { DRAFTS_BUTTON_ID, TaskDraftsModal } from './components/TaskDraftsModal';
import { SplashScreen } from './components/SplashScreen';
import { AccountMenu } from './components/AccountMenu';
import { LegalLinks } from './components/LegalLinks';
import { ImportLocalDataModal } from './components/ImportLocalDataModal';
import { HomeView } from './components/HomeView';
import {
  loadClosedFeedback,
  replyToFeedback,
  setFeedbackStatus,
  subscribeToOpenFeedback,
  type FeedbackTicket,
  type ReplyResult
} from './services/feedbackApi';
import { FirebaseError } from 'firebase/app';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { loadA11yPrefs } from './services/a11yPrefs';
import { createCelebrations, type CelebrationTrigger } from './services/celebrations';
import { CelebrationBurst } from './components/CelebrationBurst';
import {
  setAccess,
  subscribeToAccessRequests,
  type AccessRequest,
  type DecisionStatus,
  setAccessMode,
  subscribeToApprovalRequired
} from './services/access';
import {
  EXTRA_FEATURES,
  activeFeatures,
  featurePrefsOf,
  saveFeaturePref,
  setFeatures,
  subscribeToAllFeatures,
  subscribeToOwnFeatures,
  type FeatureId,
  type FeaturePrefs
} from './services/features';
import {
  calendarSyncAvailable,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  subscribeToCalendarStatus,
  type CalendarStatus
} from './services/googleCalendar';
import { deleteAccount, downloadAccountData, signOutEverywhere } from './services/account';
import { prepareAccountImport, runAccountImport } from './services/accountImport';
import type { ImportPlan } from './services/importData';
import { changePassword, hasPassword } from './services/auth';
import { useReauthMethods } from './hooks/useReauthMethods';
import { CheckCircle2, Plus, Sparkles } from 'lucide-react';
import { BRAND_TAGLINE } from './components/BrandMark';
import { LOCALE_TAG, messages } from './i18n/locale';

interface AppProps {
  user: User;
  services: FirebaseServices;
  isAdmin?: boolean;
}

const initialsOf = (name: string) =>
  name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

// Secciones y ventanas que no se ven al arrancar: se cargan la primera vez que se abren
const AgendaView = retryableLazy(() => import('./components/AgendaView').then((m) => m.AgendaView));
const WheelOfLife = retryableLazy(() => import('./components/WheelOfLife').then((m) => m.WheelOfLife));
const HowItWorks = retryableLazy(() => import('./components/HowItWorks').then((m) => m.HowItWorks));
const AdminView = retryableLazy(() => import('./components/AdminView').then((m) => m.AdminView));
const GoalsView = retryableLazy(() => import('./components/GoalsView').then((m) => m.GoalsView));
const GoalModal = retryableLazy(() => import('./components/GoalModal').then((m) => m.GoalModal));
const ProjectsView = retryableLazy(() => import('./components/ProjectsView').then((m) => m.ProjectsView));
const ProjectModal = retryableLazy(() => import('./components/ProjectModal').then((m) => m.ProjectModal));
const AreasModal = retryableLazy(() => import('./components/AreasModal').then((m) => m.AreasModal));
const ImportAccountDialog = retryableLazy(() =>
  import('./components/ImportAccountDialog').then((m) => m.ImportAccountDialog)
);
const WelcomeDialog = retryableLazy(() => import('./components/WelcomeDialog').then((m) => m.WelcomeDialog));
const ProductTour = retryableLazy(() => import('./components/ProductTour').then((m) => m.ProductTour));
const ReleaseNotesDialog = retryableLazy(() => import('./components/ReleaseNotes').then((m) => m.ReleaseNotesDialog));

// Por qué no salió una respuesta a un mensaje de contacto (los códigos que devuelve replyToFeedback)
const REPLY_ERRORS: Record<string, string> = messages(
  {
    'functions/permission-denied': 'Solo la administración puede responder los mensajes.',
    'functions/invalid-argument': 'Escribe la respuesta.',
    'functions/not-found': 'El mensaje ya no existe: quizá se eliminó la cuenta que lo envió.',
    'functions/unavailable': 'No se pudo enviar la respuesta. Inténtalo de nuevo.',
    'functions/failed-precondition': 'El envío de correos no está configurado.',
    'functions/aborted':
      'Esta respuesta ya se estaba enviando y no se sabe si salió: para no duplicarla, no se reenvía. Cancela y escribe otra si hace falta.'
  },
  {
    'functions/permission-denied': 'Only the admin can reply to messages.',
    'functions/invalid-argument': 'Write your reply.',
    'functions/not-found': 'The message no longer exists: maybe the account that sent it was deleted.',
    'functions/unavailable': "Couldn't send the reply. Try again.",
    'functions/failed-precondition': "Sending emails isn't set up.",
    'functions/aborted':
      "This reply was already being sent and it's not known whether it went out: to avoid a duplicate, it isn't sent again. Cancel and write another one if needed."
  }
);

// Textos de la app: avisos, errores y etiquetas
const m = messages(
  {
    replyFailed: 'No se pudo enviar la respuesta. Comprueba la conexión e inténtalo de nuevo.',
    yourAccount: 'Tu cuenta',
    approvalLoadFailed: 'No se pudo cargar la configuración de la aprobación de cuentas.',
    approvalOn: 'Aprobación obligatoria activada.',
    approvalOffApproved: (approved: number) =>
      `Aprobación desactivada. Se han aprobado ${approved === 1 ? '1 solicitud' : `${approved} solicitudes`}.`,
    approvalOff: 'Aprobación desactivada: las cuentas nuevas entran solas.',
    approvalFailed: 'No se pudo cambiar la aprobación de cuentas. Revisa tu conexión e inténtalo de nuevo.',
    featuresLoadFailed: 'No se pudieron cargar las funciones extra de las cuentas. Vuelve a cargar la página.',
    featuresSaved: 'Funciones extra guardadas.',
    featuresNoAccess: 'Esta cuenta ya no tiene acceso: no puede tener funciones extra.',
    featuresFailed: 'No se pudieron guardar las funciones extra. Revisa tu conexión e inténtalo de nuevo.',
    requestsLoadFailed: 'No se pudieron cargar las solicitudes de acceso.',
    messagesLoadFailed: 'No se pudieron cargar los mensajes.',
    changeFailed: 'No se pudo guardar el cambio. Revisa tu conexión e inténtalo de nuevo.',
    decisionFailed: 'No se pudo guardar la decisión. Revisa tu conexión e inténtalo de nuevo.',
    // Lo que no se pudo hacer, dentro de couldNot
    actions: {
      sync: 'sincronizar',
      loadData: 'cargar tus datos',
      removeDraft: 'borrar el borrador',
      restoreDraft: 'recuperar el borrador',
      saveDraft: 'guardar el borrador',
      undoDraft: 'deshacer el borrador',
      deleteDraft: 'eliminar el borrador',
      saveTask: 'guardar la tarea',
      saveTaskAndNext: 'guardar la tarea y su siguiente repetición',
      updateStatus: 'actualizar el estado',
      saveGoal: 'guardar la meta',
      deleteGoal: 'eliminar la meta',
      saveProject: 'guardar el proyecto',
      deleteProject: 'eliminar el proyecto',
      deleteTask: 'eliminar la tarea',
      saveAssessment: 'guardar la evaluación',
      saveFeature: 'guardar la función extra',
      saveAreas: 'guardar las áreas',
      saveProgress: 'guardar tu progreso'
    },
    couldNot: (action: string) => `No se pudo ${action}. Revisa tu conexión e inténtalo de nuevo.`,
    synced: 'Todo está sincronizado con el servidor.',
    syncFailed: 'No se pudo sincronizar. Revisa tu conexión: tus cambios siguen guardados en este dispositivo.',
    emptyDraftDeleted: 'Borrador vacío: eliminado.',
    draftRestored: 'Borrador recuperado.',
    draftSaved: 'Borrador guardado.',
    savedAsDraft: 'Guardada en «Borradores», en Listas: puedes seguir con ella.',
    draftAsBefore: 'El borrador vuelve a estar como antes.',
    draftRemoved: 'Borrador quitado.',
    draftDeleted: 'Borrador eliminado.',
    taskSaved: 'Tarea guardada.',
    taskSavedSomeday: 'Tarea guardada en «Algún día».',
    taskAdded: 'Tarea añadida.',
    undoing: 'Deshaciendo…',
    taskRestored: 'Tarea recuperada.',
    taskChanged: 'No se puede deshacer: la tarea ha cambiado entretanto.',
    undoOffline: 'No se pudo deshacer: hace falta conexión. Puedes cambiarlo a mano.',
    waitsFor: (title: string) => `Esta tarea espera a «${title}»: márcala como hecha o cancélala antes.`,
    freedOne: (title: string) => ` Ya puedes empezar «${title}».`,
    freedMany: (count: number) => ` Ya puedes empezar ${count} tareas que esperaban a esta.`,
    closedWithNext: (canceled: boolean, next: string, freed: string) =>
      `Tarea ${canceled ? 'cancelada' : 'hecha'} y archivada. Siguiente repetición: ${next}.${freed}`,
    closedArchived: (canceled: boolean, freed: string) =>
      `Tarea ${canceled ? 'cancelada' : 'hecha'} y archivada. La encontrarás en «Archivadas».${freed}`,
    taskReactivated: 'Tarea reactivada: vuelve a su lista.',
    goalSaved: 'Meta guardada.',
    goalCreated: 'Meta creada. Añádele tareas en «Metas».',
    goalAchieved: '¡Meta lograda!',
    goalArchived: 'Meta archivada.',
    goalReactivated: 'Meta reactivada.',
    goalDeleted: 'Meta eliminada. Sus tareas siguen en tus listas.',
    projectSaved: 'Proyecto guardado.',
    projectCreated: 'Proyecto creado. Añádele tareas.',
    projectFinished: 'Proyecto terminado.',
    projectArchived: 'Proyecto archivado.',
    projectReactivated: 'Proyecto reactivado.',
    projectDeleted: 'Proyecto eliminado. Sus tareas siguen en la meta.',
    taskDeleted: 'Tarea eliminada.',
    // Nombre de una evaluación de la Rueda sin nombre, con su fecha
    assessment: (date: string) => `Evaluación ${date}`,
    assessmentSaved: 'Evaluación guardada.',
    importedItems: (n: number) => `${n} ${n === 1 ? 'elemento' : 'elementos'}`,
    importedWheel: 'las áreas de tu Rueda',
    importedAreas: (n: number) => `${n} ${n === 1 ? 'área' : 'áreas'}`,
    imported: (parts: string[]) => `Importado: ${parts.join(' y ')}.`,
    localImported: 'Datos importados a tu cuenta.',
    localImportFailed: 'No se pudieron importar los datos. Comprueba tu conexión e inténtalo de nuevo.',
    areasSaved: 'Áreas guardadas.',
    allowNotifications: 'Para recibirlas, permite las notificaciones de CLAR en este navegador.',
    alarmTitle: (time: string, title: string) => `Alarma de las ${time}: ${title}`,
    skipToContent: 'Saltar al contenido',
    newTask: 'Nueva tarea',
    whatsNew: (version: string) => `CLAR v${version}: novedades de esta versión`,
    viewHelp: 'Ver la ayuda',
    undo: 'Deshacer'
  },
  {
    replyFailed: "Couldn't send the reply. Check your connection and try again.",
    yourAccount: 'Your account',
    approvalLoadFailed: "Couldn't load the account approval settings.",
    approvalOn: 'Approval required turned on.',
    approvalOffApproved: (approved) =>
      `Approval turned off. ${approved === 1 ? '1 request has' : `${approved} requests have`} been approved.`,
    approvalOff: 'Approval turned off: new accounts get in by themselves.',
    approvalFailed: "Couldn't change account approval. Check your connection and try again.",
    featuresLoadFailed: "Couldn't load the accounts' extra features. Reload the page.",
    featuresSaved: 'Extra features saved.',
    featuresNoAccess: "This account no longer has access: it can't have extra features.",
    featuresFailed: "Couldn't save the extra features. Check your connection and try again.",
    requestsLoadFailed: "Couldn't load the access requests.",
    messagesLoadFailed: "Couldn't load the messages.",
    changeFailed: "Couldn't save the change. Check your connection and try again.",
    decisionFailed: "Couldn't save the decision. Check your connection and try again.",
    actions: {
      sync: 'sync',
      loadData: 'load your data',
      removeDraft: 'delete the draft',
      restoreDraft: 'restore the draft',
      saveDraft: 'save the draft',
      undoDraft: 'undo the draft change',
      deleteDraft: 'delete the draft',
      saveTask: 'save the task',
      saveTaskAndNext: 'save the task and its next repeat',
      updateStatus: 'update the status',
      saveGoal: 'save the goal',
      deleteGoal: 'delete the goal',
      saveProject: 'save the project',
      deleteProject: 'delete the project',
      deleteTask: 'delete the task',
      saveAssessment: 'save the assessment',
      saveFeature: 'save the extra feature',
      saveAreas: 'save the areas',
      saveProgress: 'save your progress'
    },
    couldNot: (action) => `Couldn't ${action}. Check your connection and try again.`,
    synced: 'Everything is synced with the server.',
    syncFailed: "Couldn't sync. Check your connection: your changes are still saved on this device.",
    emptyDraftDeleted: 'Empty draft: deleted.',
    draftRestored: 'Draft restored.',
    draftSaved: 'Draft saved.',
    savedAsDraft: 'Saved in “Drafts”, in Lists: you can pick it up later.',
    draftAsBefore: 'The draft is back to how it was.',
    draftRemoved: 'Draft removed.',
    draftDeleted: 'Draft deleted.',
    taskSaved: 'Task saved.',
    taskSavedSomeday: 'Task saved in “Someday”.',
    taskAdded: 'Task added.',
    undoing: 'Undoing…',
    taskRestored: 'Task restored.',
    taskChanged: "Can't undo: the task has changed in the meantime.",
    undoOffline: "Couldn't undo: you need a connection. You can change it by hand.",
    waitsFor: (title) => `This task is waiting for “${title}”: mark that one as done or cancel it first.`,
    freedOne: (title) => ` You can now start “${title}”.`,
    freedMany: (count) => ` You can now start ${count} tasks that were waiting for this one.`,
    closedWithNext: (canceled, next, freed) =>
      `Task ${canceled ? 'canceled' : 'done'} and archived. Next repeat: ${next}.${freed}`,
    closedArchived: (canceled, freed) =>
      `Task ${canceled ? 'canceled' : 'done'} and archived. You'll find it in “Archived”.${freed}`,
    taskReactivated: 'Task reactivated: it goes back to its list.',
    goalSaved: 'Goal saved.',
    goalCreated: 'Goal created. Add tasks to it in “Goals”.',
    goalAchieved: 'Goal achieved!',
    goalArchived: 'Goal archived.',
    goalReactivated: 'Goal reactivated.',
    goalDeleted: 'Goal deleted. Its tasks stay in your lists.',
    projectSaved: 'Project saved.',
    projectCreated: 'Project created. Add tasks to it.',
    projectFinished: 'Project finished.',
    projectArchived: 'Project archived.',
    projectReactivated: 'Project reactivated.',
    projectDeleted: 'Project deleted. Its tasks stay in the goal.',
    taskDeleted: 'Task deleted.',
    assessment: (date) => `Assessment ${date}`,
    assessmentSaved: 'Assessment saved.',
    importedItems: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    importedWheel: 'your Wheel areas',
    importedAreas: (n) => `${n} ${n === 1 ? 'area' : 'areas'}`,
    imported: (parts) => `Imported: ${parts.join(' and ')}.`,
    localImported: 'Data imported into your account.',
    localImportFailed: "Couldn't import the data. Check your connection and try again.",
    areasSaved: 'Areas saved.',
    allowNotifications: 'To get them, allow notifications for CLAR in this browser.',
    alarmTitle: (time, title) => `Alarm at ${time}: ${title}`,
    skipToContent: 'Skip to content',
    newTask: 'New task',
    whatsNew: (version) => `CLAR v${version}: what's new in this version`,
    viewHelp: 'View help',
    undo: 'Undo'
  }
);

export default function App({ user, services, isAdmin = false }: AppProps) {
  // Cómo confirmar la eliminación de la cuenta: primero el método con el que se entró (Google o la contraseña)
  const reauthMethods = useReauthMethods(user);
  const { db } = services;
  const uid = user.uid;

  // Perfil para la interfaz a partir de la cuenta (Google o email)
  const profile: UserProfile = {
    id: uid,
    name: user.displayName || user.email || m.yourAccount,
    email: user.email ?? undefined,
    photoUrl: user.photoURL ?? undefined,
    role: '',
    color: 'indigo',
    initials: initialsOf(user.displayName || user.email || ''),
    authProvider: 'google',
    createdAt: user.metadata.creationTime ?? ''
  };
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  // Reuniones y correos de antes de la 1.3.0 que siguen en la cuenta: se cuentan al abrir el menú (en el servidor; sin
  // conexión no se sabe y no se ofrece borrarlos)
  const [retiredCount, setRetiredCount] = useState<number | null>(null);
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    let current = true;
    countRetiredItems(db, uid)
      .then((count) => {
        if (current) setRetiredCount(count);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [isAccountMenuOpen, db, uid]);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);

  // Datos de la cuenta, sincronizados en tiempo real con Firestore (y disponibles sin conexión desde la caché)
  const [storedTasks, setTasks] = useState<TaskItem[]>([]);
  const [wheelLogs, setWheelLogs] = useState<WheelOfLifeLog[]>([]);
  const [wheelSynced, setWheelSynced] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // Las tareas de un proyecto tienen la meta del proyecto, y las vinculadas a una meta, el área de la meta
  const tasks = useMemo(
    () => applyGoalAreas(applyProjectGoals(storedTasks, projects), goals),
    [storedTasks, projects, goals]
  );
  // Proyecto abierto en «Proyectos» y editor de proyectos (uno que se edita, o uno nuevo con su meta ya elegida)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectEditor, setProjectEditor] = useState<{ project?: Project; goalId?: string } | null>(null);
  // Editor de metas: abierto con la meta que se edita, o vacío para crear una
  // Meta que se edita, o una nueva (con su área ya elegida si se crea desde un área de «Metas»)
  const [goalEditor, setGoalEditor] = useState<{ goal?: Goal; area?: WheelCategory } | null>(null);

  // Datos de la versión sin cuentas que siguen en este navegador, pendientes de importar
  const [localProfiles, setLocalProfiles] = useState<LocalProfileSummary[]>(() => getLocalProfiles());
  const [isImportPostponed, setIsImportPostponed] = useState(false);

  const [activeContext, setActiveContext] = useState<ListContext>('WORK');
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // Orden y filtros del Top 10, guardados en este dispositivo para cada cuenta
  const listPrefsKey = `neuro_list_prefs_v1:${uid}`;
  const [listPrefs, setListPrefs] = useState<ListPrefs>(() => parseListPrefs(localStorage.getItem(listPrefsKey)));
  useEffect(() => {
    localStorage.setItem(listPrefsKey, JSON.stringify(listPrefs));
  }, [listPrefs, listPrefsKey]);
  const now = useNow();
  const firstRunChecked = useRef(false);
  // Secciones que abre la persona: una vez que navega, el primer arranque ya no la lleva a la Rueda
  const hasNavigated = useRef(false);
  const navigate = (tab: AppTab) => {
    hasNavigated.current = true;
    setActiveTab(tab);
    // Entrar en «Proyectos» desde la navegación lleva a la lista
    if (tab === 'projects') setSelectedProjectId(null);
  };
  const openProject = (projectId: string) => {
    navigate('projects');
    setSelectedProjectId(projectId);
  };

  // ACCESOS (solo administración): solicitudes en vivo para la pestaña y su contador de pendientes
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);
  // APROBACIÓN DE CUENTAS (solo administración): obligatoria o libre
  const [approvalRequired, setApprovalRequired] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToApprovalRequired(db, setApprovalRequired, (e) => {
      console.error('Error loading access settings:', e);
      setAccessError(m.approvalLoadFailed);
    });
  }, [db, isAdmin]);
  const handleSetApprovalRequired = async (required: boolean) => {
    setAccessError(null);
    try {
      const { approved } = await setAccessMode(services.functions, required);
      showToast(required ? m.approvalOn : approved > 0 ? m.approvalOffApproved(approved) : m.approvalOff);
    } catch (e) {
      console.error('Error changing access mode:', e);
      setAccessError(m.approvalFailed);
    }
  };

  // FUNCIONES EXTRA de cada cuenta (solo administración): en vivo, para su apartado en las solicitudes. Mientras no
  // se han cargado (o si fallan), null: no se pueden cambiar, así no se guarda una lista vacía por error
  const [accountFeatures, setAccountFeatures] = useState<Record<string, FeatureId[]> | null>(null);
  // Su error va aparte: se ve mientras no se puedan cambiar, aunque otra acción borre el de las solicitudes
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToAllFeatures(
      db,
      (features) => {
        setAccountFeatures(features);
        setFeaturesError(null);
      },
      (e) => {
        console.error('Error loading extra features:', e);
        setAccountFeatures(null);
        setFeaturesError(m.featuresLoadFailed);
      }
    );
  }, [db, isAdmin]);
  const handleSetFeatures = async (targetUid: string, features: FeatureId[]) => {
    setAccessError(null);
    try {
      await setFeatures(services.functions, targetUid, features);
      showToast(m.featuresSaved);
      return true;
    } catch (e) {
      console.error('Error setting extra features:', e);
      setAccessError(
        e instanceof FirebaseError && e.code === 'functions/failed-precondition' ? m.featuresNoAccess : m.featuresFailed
      );
      return false;
    }
  };

  // MENSAJES DE CONTACTO (solo administración): los abiertos en vivo; los cerrados, bajo demanda en su vista
  const [feedbackTickets, setFeedbackTickets] = useState<FeedbackTicket[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  // Al dejar de ser administración se vacían las solicitudes y se sale de su pestaña
  const [wasAdmin, setWasAdmin] = useState(isAdmin);
  if (wasAdmin !== isAdmin) {
    setWasAdmin(isAdmin);
    if (!isAdmin) {
      setAccessRequests([]);
      setAccountFeatures(null);
      setFeedbackTickets([]);
      setActiveTab((tab) => (tab === 'access' ? 'tasks' : tab));
    }
  }
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToAccessRequests(db, setAccessRequests, (e) => {
      console.error('Error loading access requests:', e);
      setAccessError(m.requestsLoadFailed);
    });
  }, [db, isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToOpenFeedback(db, setFeedbackTickets, (e) => {
      console.error('Error loading feedback:', e);
      setFeedbackError(m.messagesLoadFailed);
    });
  }, [db, isAdmin]);
  // Lo pendiente en Administración (aviso rojo): solicitudes por decidir, mensajes sin leer y cuentas que entraron
  // solas desde la última vez que se miraron las solicitudes en este dispositivo (la primera vez, desde ahora)
  const [requestsSeenAt, setRequestsSeenAt] = useState(() => {
    const stored = localStorage.getItem(requestsSeenKey(uid));
    if (stored) return stored;
    const now = new Date().toISOString();
    if (isAdmin) localStorage.setItem(requestsSeenKey(uid), now);
    return now;
  });
  const markRequestsSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(requestsSeenKey(uid), now);
    setRequestsSeenAt(now);
  }, [uid]);
  const pendingAccessCount = adminAlerts(accessRequests, feedbackTickets, requestsSeenAt).total;
  // Devuelve si se guardó: la vista solo ajusta su lista de cerrados cuando la escritura fue bien
  const handleSetFeedbackStatus = async (ticket: FeedbackTicket, status: FeedbackTicket['status']) => {
    setFeedbackError(null);
    try {
      await setFeedbackStatus(db, ticket.id, status);
      return true;
    } catch (e) {
      console.error('Error updating feedback:', e);
      setFeedbackError(m.changeFailed);
      return false;
    }
  };

  // RESPONDER A UN MENSAJE: la función lo envía por email y, si sale, lo guarda
  const handleReplyFeedback = async (
    ticket: FeedbackTicket,
    replyId: string,
    message: string
  ): Promise<ReplyResult> => {
    try {
      return { reply: await replyToFeedback(services.functions, ticket.id, replyId, message) };
    } catch (e) {
      console.error('Error replying to feedback:', e);
      return { error: (e instanceof FirebaseError && REPLY_ERRORS[e.code]) || m.replyFailed };
    }
  };

  // CONTACTO: desde la ayuda o la cuenta
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const handleDecideAccess = async (targetUid: string, status: DecisionStatus) => {
    setAccessError(null);
    try {
      await setAccess(services.functions, targetUid, status);
    } catch (e) {
      console.error('Error deciding access:', e);
      setAccessError(m.decisionFailed);
    }
  };

  // Estado de pantalla de inicio móvil (Splash Screen)
  const [showSplash, setShowSplash] = useState(true);

  // Modales
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [newTaskIsSomeday, setNewTaskIsSomeday] = useState(false);
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | undefined>();
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | undefined>();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Toast / Banner de notificación
  // Con `undo`, el aviso ofrece «Deshacer» y dura un poco más. Con `celebration`, añade ese mensaje debajo del suyo,
  // sale con confeti y dura 3 s más (para leerlo). `id` reinicia el confeti si llega otra celebración seguida
  const [toast, setToast] = useState<{ message: string; undo?: () => void; celebration?: string; id: number } | null>(
    null
  );
  const toastTimer = useRef<number | undefined>(undefined);
  const toastCount = useRef(0);

  const showToast = useCallback((message: string, undo?: () => void, celebration?: string) => {
    window.clearTimeout(toastTimer.current);
    toastCount.current += 1;
    setToast({ message, undo, celebration, id: toastCount.current });
    toastTimer.current = window.setTimeout(() => setToast(null), (undo ? 5000 : 4000) + (celebration ? 3000 : 0));
  }, []);

  // CELEBRACIONES (src/services/celebrations.ts): solo desde los manejadores de lo que se hace en esta pestaña (nunca
  // desde las instantáneas, que traen también lo de otras pestañas y dispositivos, ni al importar). Se apagan en
  // «Accesibilidad», en cada dispositivo
  const [celebrationFor] = useState(() => createCelebrations());
  const celebrate = (trigger: CelebrationTrigger) =>
    loadA11yPrefs().celebrations ? celebrationFor(trigger)?.message : undefined;

  const reportError = useCallback(
    (action: string) => (e: unknown) => {
      console.error(`Error al ${action}:`, e);
      showToast(m.couldNot(action));
    },
    [showToast]
  );

  // SINCRONIZACIÓN: verde solo si las colecciones que se siguen en vivo están confirmadas por el servidor y sin
  // escrituras pendientes
  const [syncByCollection, setSyncByCollection] = useState<Record<LiveCollection, SnapshotInfo>>(
    () =>
      Object.fromEntries(
        LIVE_COLLECTIONS.map((name) => [name, { fromServer: false, hasPendingWrites: false }])
      ) as Record<LiveCollection, SnapshotInfo>
  );
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const trackSync = (name: LiveCollection, info: SnapshotInfo) =>
    setSyncByCollection((current) =>
      current[name].fromServer === info.fromServer && current[name].hasPendingWrites === info.hasPendingWrites
        ? current
        : { ...current, [name]: info }
    );

  const syncStatus: SyncStatus = isSyncing
    ? 'syncing'
    : !isOnline
      ? 'offline'
      : Object.values(syncByCollection).every((s) => s.fromServer && !s.hasPendingWrites)
        ? 'synced'
        : 'pending';

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await forceSync(db, uid);
      showToast(synced ? m.synced : m.syncFailed);
    } catch (e) {
      reportError(m.actions.sync)(e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Suscripción en tiempo real a los datos de la cuenta
  useEffect(() => {
    const onError = reportError(m.actions.loadData);
    const unsubscribers = [
      subscribeToCollection(
        db,
        uid,
        'tasks',
        (items, info) => {
          setTasks(items);
          trackSync('tasks', info);
        },
        onError
      ),
      subscribeToCollection(
        db,
        uid,
        'wheelLogs',
        (logs, info) => {
          const { fromServer } = info;
          setWheelLogs(logs);
          trackSync('wheelLogs', info);
          if (fromServer) setWheelSynced(true);
          // Primer arranque: sin evaluaciones confirmadas por el servidor, la app abre en la Rueda de la Vida
          if (!firstRunChecked.current && (fromServer || logs.length > 0)) {
            firstRunChecked.current = true;
            if (logs.length === 0 && !hasNavigated.current) setActiveTab('wheel');
          }
        },
        onError
      ),
      subscribeToCollection(
        db,
        uid,
        'goals',
        (items, info) => {
          setGoals(items);
          trackSync('goals', info);
        },
        onError
      ),
      subscribeToCollection(
        db,
        uid,
        'projects',
        (items, info) => {
          setProjects(items);
          trackSync('projects', info);
        },
        onError
      ),
      subscribeToCollection(
        db,
        uid,
        'taskDrafts',
        (items, info) => {
          setTaskDrafts(items);
          trackSync('taskDrafts', info);
        },
        onError
      )
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [db, uid, reportError]);

  // Las escrituras se reflejan al instante (caché local) y se sincronizan con el servidor en segundo plano
  const openNewTask = (options?: { someday?: boolean; goalId?: string; project?: Project }) => {
    setEditingTask(null);
    setContinuingDraft(null);
    setNewTaskIsSomeday(Boolean(options?.someday));
    setNewTaskGoalId(options?.project?.goalId ?? options?.goalId);
    setNewTaskProjectId(options?.project?.id);
    setIsTaskModalOpen(true);
  };

  // BORRADORES: una tarea nueva cerrada sin guardar se guarda sola (TaskModal), y al guardarla como tarea se borra. Con
  // «Deshacer», el borrador vuelve a como estaba o, si era nuevo, desaparece
  const [continuingDraft, setContinuingDraft] = useState<TaskDraft | null>(null);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const continueDraft = (draft: TaskDraft) => {
    // El foco pasa al botón «Borradores» (la lista se cierra): al cerrar el formulario vuelve ahí
    document.getElementById(DRAFTS_BUTTON_ID)?.focus();
    setIsDraftsOpen(false);
    setEditingTask(null);
    setContinuingDraft(draft);
    setIsTaskModalOpen(true);
  };
  const handleSaveDraft = (form: TaskFormValues | null) => {
    const previous = continuingDraft;
    if (!form) {
      // Un borrador que se vació deja de serlo (con «Deshacer», vuelve como estaba)
      if (!previous) return;
      deleteTaskDraft(db, uid, previous.id).catch(reportError(m.actions.removeDraft));
      showToast(m.emptyDraftDeleted, () => {
        saveTaskDraft(db, uid, previous).catch(reportError(m.actions.restoreDraft));
        showToast(m.draftRestored);
      });
      return;
    }
    const now = new Date().toISOString();
    const draft: TaskDraft = {
      id: previous?.id ?? `draft-${Date.now()}`,
      userId: uid,
      form,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now
    };
    saveTaskDraft(db, uid, draft).catch(reportError(m.actions.saveDraft));
    showToast(previous ? m.draftSaved : m.savedAsDraft, () => {
      (previous ? saveTaskDraft(db, uid, previous) : deleteTaskDraft(db, uid, draft.id)).catch(
        reportError(m.actions.undoDraft)
      );
      showToast(previous ? m.draftAsBefore : m.draftRemoved);
    });
  };
  // Eliminar desde la lista: la propia lista ofrece «Deshacer» (el aviso queda debajo de ella), y el aviso también, al
  // cerrarla
  const handleDeleteDraft = (draft: TaskDraft) => {
    deleteTaskDraft(db, uid, draft.id).catch(reportError(m.actions.deleteDraft));
    showToast(m.draftDeleted, () => restoreDraft(draft));
  };
  const restoreDraft = (draft: TaskDraft) => {
    saveTaskDraft(db, uid, draft).catch(reportError(m.actions.restoreDraft));
    showToast(m.draftRestored);
  };

  const handleSaveTask = (taskData: TaskFormData) => {
    const now = new Date().toISOString();
    if (editingTask) {
      const current = tasks.find((t) => t.id === editingTask.id) ?? editingTask;
      saveTask(db, uid, {
        ...current,
        ...taskData,
        alarmSetAt: alarmSetAtFor(current, taskData, now),
        updatedAt: now
      }).catch(reportError(m.actions.saveTask));
      showToast(m.taskSaved);
      setEditingTask(null);
    } else {
      const newTask: TaskItem = {
        ...taskData,
        alarmSetAt: alarmSetAtFor(null, taskData, now),
        id: `task-${Date.now()}`,
        userId: uid,
        createdAt: now,
        updatedAt: now,
        status: 'PENDING'
      };
      // Desde un borrador: la tarea y el borrador borrado van juntos
      (continuingDraft ? saveTaskFromDraft(db, uid, newTask, continuingDraft.id) : saveTask(db, uid, newTask)).catch(
        reportError(m.actions.saveTask)
      );
      showToast(taskData.isSomeday ? m.taskSavedSomeday : m.taskAdded);
    }
  };

  // "Hecha" archiva la tarea; cualquier otro estado la devuelve a su lista
  // «Deshacer»: comprueba en el servidor que nada ha cambiado y restaura con la hora de ahora (es un cambio nuevo)
  const undo = (attempt: () => Promise<boolean>) => () => {
    showToast(m.undoing);
    attempt()
      .then((done) => showToast(done ? m.taskRestored : m.taskChanged))
      .catch((e: unknown) => {
        console.error('Error al deshacer:', e);
        showToast(m.undoOffline);
      });
  };

  const handleChangeStatus = (task: TaskItem, status: TaskStatus) => {
    if (status === task.status) return;
    // Bloqueada por otra tarea abierta: no se puede hacer ni empezar todavía
    const blocker = blockerOf(task, tasksById(tasks));
    if (blocker && (status === 'DONE' || status === 'IN_PROGRESS')) {
      showToast(m.waitsFor(blocker.title));
      return;
    }
    // Tarea recurrente marcada como Hecha o Cancelada: se crea la siguiente repetición (una sola vez por tarea). Cancelar
    // una repetición no termina la serie: para eso se quita la repetición al editarla
    const closing = isArchivedStatus(status);
    const next = closing && !task.nextOccurrenceId ? nextRecurringTask(task) : null;
    const canceled = status === 'CANCELLED';
    // Al cerrarla, las tareas que esperaban a ella se desbloquean
    const freed = closing && !isArchived(task) ? dependentsOf(task, tasks) : [];
    const freedNote =
      freed.length === 1 ? m.freedOne(freed[0].title) : freed.length > 1 ? m.freedMany(freed.length) : '';
    const updated = withStatus(task, status);
    // Deshacer devuelve la tarea como estaba (y quita la repetición que se acaba de crear) si nada cambió entretanto
    const restored = () => ({ ...task, updatedAt: new Date().toISOString() });
    if (next) {
      const done = { ...updated, nextOccurrenceId: next.id };
      completeRecurringTask(db, uid, done, next).catch(reportError(m.actions.saveTaskAndNext));
      // La fecha de la siguiente, sin la etiqueta de formatTaskDates (una repetición siempre tiene solo fecha límite)
      const nextDue = next.dueDate ? `${formatDay(next.dueDate)}${next.dueTime ? `, ${next.dueTime}` : ''}` : '';
      showToast(
        m.closedWithNext(canceled, nextDue, freedNote),
        undo(() => undoTaskChange(db, uid, [done, next], restored(), next.id))
      );
      return;
    }
    saveTask(db, uid, updated).catch(reportError(m.actions.updateStatus));
    if (closing) {
      // Se celebra si se hace (no al cancelarla) una tarea que llevaba 14 días o más en la lista y no se repite
      showToast(
        m.closedArchived(canceled, freedNote),
        undo(() => undoTaskChange(db, uid, [updated], restored())),
        celebrate({ type: 'task', task, to: status })
      );
    } else if (isArchived(task)) {
      showToast(m.taskReactivated);
    }
  };

  // METAS: si cambia de área, sus tareas heredan la nueva; al eliminarla, sus tareas se quedan sin meta
  const handleSaveGoal = (goal: Goal) => {
    const previous = goals.find((g) => g.id === goal.id);
    saveGoal(db, uid, goal).catch(reportError(m.actions.saveGoal));
    showToast(previous ? m.goalSaved : m.goalCreated);
  };
  // Desde el formulario de una tarea, que la confirma él mismo (con la ventana abierta, los avisos esperan)
  const handleCreateGoalFromTask = (goal: Goal) => {
    saveGoal(db, uid, goal).catch(reportError(m.actions.saveGoal));
  };
  const handleSetGoalStatus = (goal: Goal, status: GoalStatus) => {
    saveGoal(db, uid, { ...goal, status, updatedAt: new Date().toISOString() }).catch(reportError(m.actions.saveGoal));
    showToast(
      status === 'ACHIEVED' ? m.goalAchieved : status === 'ARCHIVED' ? m.goalArchived : m.goalReactivated,
      undefined,
      celebrate({ type: 'goal', goal, to: status })
    );
  };
  const handleDeleteGoal = (goal: Goal) => {
    deleteGoal(db, uid, goal).catch(reportError(m.actions.deleteGoal));
    showToast(m.goalDeleted);
  };

  // DESCARGAS EN JSON: una tarea, una meta o un proyecto, con todos sus datos y lo que hace falta para entenderlos
  const exportContext = () => ({ tasks, goals, projects, areas: wheelAreas, version: __APP_VERSION__ });
  const handleDownloadTask = (task: TaskItem) =>
    downloadJson(exportFilename('tarea', task.title), taskExport(task, exportContext()));
  const handleDownloadGoal = (goal: Goal) =>
    downloadJson(exportFilename('meta', goal.title), goalExport(goal, exportContext()));
  const handleDownloadProject = (project: Project) =>
    downloadJson(exportFilename('proyecto', project.title), projectExport(project, exportContext()));

  // PROYECTOS: al eliminar uno, sus tareas se quedan en su meta
  const handleSaveProject = (project: Project) => {
    const previous = projects.find((p) => p.id === project.id);
    saveProject(db, uid, project).catch(reportError(m.actions.saveProject));
    showToast(previous ? m.projectSaved : m.projectCreated);
    if (!previous) openProject(project.id);
  };
  const handleSetProjectStatus = (project: Project, status: ProjectStatus) => {
    saveProject(db, uid, { ...project, status, updatedAt: new Date().toISOString() }).catch(
      reportError(m.actions.saveProject)
    );
    showToast(
      status === 'FINISHED' ? m.projectFinished : status === 'ARCHIVED' ? m.projectArchived : m.projectReactivated,
      undefined,
      celebrate({ type: 'project', project, to: status })
    );
  };
  const handleDeleteProject = (project: Project) => {
    deleteProject(db, uid, project).catch(reportError(m.actions.deleteProject));
    if (selectedProjectId === project.id) setSelectedProjectId(null);
    showToast(m.projectDeleted);
  };

  const handleDeleteTask = (id: string) => {
    const deleted = tasks.find((t) => t.id === id);
    deleteTask(db, uid, id).catch(reportError(m.actions.deleteTask));
    showToast(
      m.taskDeleted,
      deleted && undo(() => restoreDeletedTask(db, uid, { ...deleted, updatedAt: new Date().toISOString() }))
    );
  };

  const handleAppendWheelSnapshot = (scores: Record<WheelCategory, number>, label?: string) => {
    const now = new Date();
    const log: WheelOfLifeLog = {
      id: `wheel-snapshot-${now.getTime()}`,
      userId: uid,
      timestamp: now.toISOString(),
      label:
        label ||
        m.assessment(
          now.toLocaleDateString(LOCALE_TAG, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        ),
      scores: { ...scores }
    };
    appendWheelLog(db, uid, log).catch(reportError(m.actions.saveAssessment));
    showToast(m.assessmentSaved);
  };

  // CUENTA
  const handleExportData = () => downloadAccountData(services, user);
  // IMPORTAR LA DESCARGA DE LA CUENTA: primero la vista previa (qué entra y qué ya está); al confirmar, se escribe
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const handleChooseImportFile = async (file: File) => {
    const plan = await prepareAccountImport(db, uid, file, wheelAreas);
    setIsAccountMenuOpen(false);
    setImportPlan(plan);
  };
  const handleRunImport = async (plan: ImportPlan, onProgress: (done: number, total: number) => void) => {
    await runAccountImport(db, uid, plan, onProgress);
    // Solo cierra su propia ventana: una importación que se reanudó al volver la conexión no cierra la de otra nueva
    setImportPlan((current) => (current === plan ? null : current));
    const parts = [
      plan.total > 0 && m.importedItems(plan.total),
      plan.restoredAreas ? m.importedWheel : plan.addedAreas.length > 0 && m.importedAreas(plan.addedAreas.length)
    ].filter((part): part is string => Boolean(part));
    showToast(m.imported(parts));
  };
  const handleDeleteAccount = (password?: string) =>
    deleteAccount(services, user, password, { withCalendar: calendarActive });

  // IMPORTACIÓN DE DATOS DE LA VERSIÓN SIN CUENTAS
  const handleImportLocalData = async (profileIds: string[]) => {
    try {
      await importUserData(db, uid, buildImport(profileIds));
    } catch (e) {
      // La ventana muestra el mensaje: el del SDK de Firebase es técnico y en inglés
      throw new Error(m.localImportFailed, { cause: e });
    }
    clearLocalData();
    setLocalProfiles([]);
    showToast(m.localImported);
  };

  const handleDiscardLocalData = () => {
    clearLocalData();
    setLocalProfiles([]);
  };

  const isImportOpen = localProfiles.length > 0 && !isImportPostponed;
  // BIENVENIDA: una vez por cuenta. Cuenta como vista si lo dice el perfil o este dispositivo; si no, se espera al
  // perfil confirmado por el servidor para no mostrarla a quien ya la vio en otro dispositivo
  const [profileOnboarding, setProfileOnboarding] = useState<{
    record: ProfileRecord | null;
    fromServer: boolean;
  }>({ record: null, fromServer: false });
  const [seenOnThisDevice] = useState(() => hasSeenLocally(uid));
  // ÁREAS DE LA RUEDA de la cuenta (en el perfil); sin nada guardado, las 7 de partida
  const [wheelAreas, setWheelAreas] = useState<WheelArea[]>(DEFAULT_AREAS);
  // Las funciones extra que la administración tiene encendidas (en el perfil)
  const [featurePrefs, setFeaturePrefs] = useState<FeaturePrefs>({});
  const [welcomeClosed, setWelcomeClosed] = useState(false);
  // IDIOMA: el de la cuenta y el de este dispositivo, al abrir (src/i18n/locale.ts)
  useAccountLanguage(db, uid, profileOnboarding.record?.language, profileOnboarding.fromServer);
  useEffect(
    () =>
      subscribeToProfile(
        db,
        uid,
        (record, fromServer) => {
          setProfileOnboarding({ record, fromServer });
          // Las áreas solo cambian (y con ellas las vistas que las usan) si cambia lo guardado
          const next = resolveAreas(record?.wheelAreas);
          setWheelAreas((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
          const prefs = featurePrefsOf(record?.featurePrefs);
          setFeaturePrefs((current) => (JSON.stringify(current) === JSON.stringify(prefs) ? current : prefs));
        },
        (e) => console.error('Error loading profile:', e)
      ),
    [db, uid]
  );
  // FUNCIONES EXTRA en uso: la administración enciende las suyas en su cuenta (en el perfil); el resto usa las que la
  // administración le ha activado. El interruptor cambia al momento; si no se pudiera guardar, el perfil lo devuelve
  // a como estaba
  const [grantedFeatures, setGrantedFeatures] = useState<FeatureId[]>([]);
  useEffect(() => subscribeToOwnFeatures(db, uid, setGrantedFeatures), [db, uid]);
  const extraFeatures = isAdmin
    ? {
        features: EXTRA_FEATURES,
        active: activeFeatures({ isAdmin, granted: grantedFeatures, prefs: featurePrefs }),
        onToggle: (id: FeatureId, on: boolean) => {
          setFeaturePrefs((current) => ({ ...current, [id]: on }));
          saveFeaturePref(db, uid, id, on).catch(reportError(m.actions.saveFeature));
        }
      }
    : {
        features: EXTRA_FEATURES.filter((f) => grantedFeatures.includes(f.id)),
        active: grantedFeatures,
        onToggle: null
      };
  // SINCRONIZACIÓN CON GOOGLE CALENDAR: su estado, mientras la función está en uso
  const calendarActive = isAdmin ? featurePrefs.googleCalendar === true : grantedFeatures.includes('googleCalendar');
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  // Al dejar de estar en uso se olvida el estado: al volver, no se ve el de antes mientras llega el actual
  const [wasCalendarActive, setWasCalendarActive] = useState(calendarActive);
  if (wasCalendarActive !== calendarActive) {
    setWasCalendarActive(calendarActive);
    if (!calendarActive) setCalendarStatus(null);
  }
  useEffect(() => {
    if (!calendarActive) return;
    return subscribeToCalendarStatus(db, uid, setCalendarStatus);
  }, [db, uid, calendarActive]);
  const calendar = calendarActive
    ? {
        available: calendarSyncAvailable(),
        status: calendarStatus,
        onConnect: (signal: AbortSignal, onAuthorized: () => void) =>
          connectGoogleCalendar(services, { signal, onAuthorized }),
        onDisconnect: () => disconnectGoogleCalendar(services)
      }
    : null;
  const [isAreasEditorOpen, setIsAreasEditorOpen] = useState(false);
  const handleSaveAreas = (areas: WheelArea[]) => {
    // Las de partida sin renombrar se guardan con su identificador: así se ven en el idioma de cada momento
    saveWheelAreas(db, uid, storableAreas(areas)).catch(reportError(m.actions.saveAreas));
    showToast(m.areasSaved);
  };

  // También se puede volver a ver desde la guía. Si al entrar por primera vez hay datos de la versión sin cuentas,
  // primero se resuelve su importación: una sola ventana modal a la vez
  const [isWelcomeReplay, setIsWelcomeReplay] = useState(false);
  const isWelcomeOpen =
    isWelcomeReplay ||
    (!welcomeClosed &&
      !isImportOpen &&
      profileOnboarding.fromServer &&
      !hasSeenOnboarding(profileOnboarding.record, seenOnThisDevice));

  // RECORRIDO GUIADO: tras la bienvenida o desde la guía. Empieza en las listas (allí están el Top 10 y los filtros);
  // al terminar, la primera vez, lleva a la Rueda para el primer paso
  const [isTourOpen, setIsTourOpen] = useState(false);
  // Solo el recorrido de la primera vez (tras la bienvenida automática) acaba en la Rueda; al repetirlo desde la
  // ayuda, se vuelve a donde se estaba
  const [isFirstRunTour, setIsFirstRunTour] = useState(false);

  // «NUEVA TAREA POR VOZ», el acceso directo del icono de la app (public/manifest.json): /?nueva=voz abre el formulario
  // con el micrófono escuchando, y /?nueva=1, sin él. Se quita de la dirección al arrancar, para que recargar no lo
  // repita, y se abre más abajo, cuando no hay otra ventana
  const [launchNewTask, setLaunchNewTask] = useState(() => new URLSearchParams(window.location.search).get('nueva'));
  const [dictateNewTask, setDictateNewTask] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('nueva')) return;
    url.searchParams.delete('nueva');
    window.history.replaceState(window.history.state, '', url);
  }, []);
  // ALARMA PULSADA: al tocar la notificación de una alarma se abre su tarea (public/sw.js). Con CLAR cerrada llega como
  // /?alarma=<clave>, que se quita de la dirección al arrancar; con CLAR abierta, como mensaje del service worker. Se
  // abre más abajo, como el acceso directo
  const [launchAlarm, setLaunchAlarm] = useState(() => new URLSearchParams(window.location.search).get('alarma'));
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('alarma')) {
      url.searchParams.delete('alarma');
      window.history.replaceState(window.history.state, '', url);
    }
    const onMessage = (event: MessageEvent<{ type?: unknown; key?: unknown } | null>) => {
      if (event.data?.type === OPEN_ALARM_MESSAGE && typeof event.data.key === 'string') setLaunchAlarm(event.data.key);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);
  const startTour = (firstRun = false) => {
    navigate('tasks');
    setIsFirstRunTour(firstRun);
    setIsTourOpen(true);
  };
  const finishTour = () => {
    setIsTourOpen(false);
    if (isFirstRunTour && wheelSynced && wheelLogs.length === 0) navigate('wheel');
  };

  // NOVEDADES DE LA VERSIÓN: lo visto se guarda en el perfil y en este dispositivo, y nunca se apunta una versión
  // anterior a la ya vista (p. ej. desde una pestaña que aún tiene la versión de antes)
  const currentRelease = releaseFor(__APP_VERSION__);
  const [seenReleaseHere] = useState(() => seenReleaseLocally(uid));
  const releaseSeenInProfile = hasSeenRelease(profileOnboarding.record?.releaseNotesSeen, __APP_VERSION__);
  const rememberReleaseSeen = () => {
    if (!hasSeenRelease(seenReleaseLocally(uid), __APP_VERSION__)) rememberReleaseLocally(uid, __APP_VERSION__);
  };
  const [releaseNotesClosed, setReleaseNotesClosed] = useState(false);
  const markReleaseNotesRead = () => {
    rememberReleaseSeen();
    if (!releaseSeenInProfile)
      markReleaseNotesSeen(db, uid, __APP_VERSION__).catch(reportError(m.actions.saveProgress));
    setReleaseNotesClosed(true);
  };

  const finishWelcome = (outcome: OnboardingOutcome) => {
    rememberLocally(uid, outcome);
    // La primera bienvenida da por vistas las novedades de esta versión, en la misma escritura (así otra pestaña no ve
    // un momento «bienvenida vista, novedades no»). Si algún día se vuelve a mostrar la bienvenida a quien ya la vio
    // (subiendo ONBOARDING_VERSION), sus novedades se siguen mostrando después
    const firstWelcome = !isWelcomeReplay && !profileOnboarding.record?.hasSeenOnboarding;
    if (firstWelcome) {
      rememberReleaseSeen();
      setReleaseNotesClosed(true);
    }
    markOnboardingSeen(db, uid, outcome, firstWelcome && !releaseSeenInProfile ? __APP_VERSION__ : undefined).catch(
      reportError(m.actions.saveProgress)
    );
    setWelcomeClosed(true);
    setIsWelcomeReplay(false);
    if (outcome === 'completed') startTour(!isWelcomeReplay);
  };

  // Hoja «Más» del móvil: secciones que no caben en la barra inferior, sincronización y cuenta
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  // Al pasar a tableta o escritorio (p. ej. girando el móvil) la hoja deja de verse: se cierra para que el resto de
  // la app no se quede inerte
  const isPhone = useMediaQuery(PHONE_QUERY);
  if (isMoreOpen && !isPhone) setIsMoreOpen(false);
  // El botón de la cuenta está en la cabecera en escritorio y dentro de «Más» en el móvil
  const accountButton = () => {
    const header = document.getElementById('account-button');
    return header?.offsetParent ? header : document.getElementById(MORE_BUTTON_ID);
  };
  // La pantalla de bienvenida no cuenta: es decorativa, se quita sola y deja pasar los clics mientras se desvanece
  // Las ventanas abiertas sin contar las novedades, que no se abren solas encima de ninguna
  const otherDialogOpen =
    isAreasEditorOpen ||
    isFeedbackOpen ||
    isWelcomeOpen ||
    isTourOpen ||
    isMoreOpen ||
    goalEditor !== null ||
    projectEditor !== null ||
    isTaskModalOpen ||
    isArchiveOpen ||
    isDraftsOpen ||
    isAccountMenuOpen ||
    isAccessibilityOpen ||
    isImportOpen ||
    importPlan !== null;

  // NOVEDADES: al entrar después de una actualización se abren solas una vez por cuenta, sin otra ventana abierta y con
  // el perfil confirmado por el servidor (como la bienvenida). Una vez abiertas siguen así hasta cerrarlas, aunque se
  // pierda la conexión; si se dan por vistas en otra pestaña, se cierran. También se abren al pulsar la versión
  const [releaseNotesShown, setReleaseNotesShown] = useState(false);
  const [isReleaseNotesReplay, setIsReleaseNotesReplay] = useState(false);
  if (
    !releaseNotesShown &&
    !releaseNotesClosed &&
    !otherDialogOpen &&
    launchNewTask === null &&
    launchAlarm === null &&
    profileOnboarding.fromServer &&
    shouldShowReleaseNotes({
      current: __APP_VERSION__,
      onboarded: hasSeenOnboarding(profileOnboarding.record, seenOnThisDevice),
      seenInProfile: profileOnboarding.record?.releaseNotesSeen,
      seenHere: seenReleaseHere
    })
  )
    setReleaseNotesShown(true);
  const isReleaseNotesOpen =
    currentRelease !== null &&
    (isReleaseNotesReplay || (releaseNotesShown && !releaseNotesClosed && !releaseSeenInProfile));
  const closeReleaseNotes = () => {
    markReleaseNotesRead();
    setIsReleaseNotesReplay(false);
  };
  // Si la ventana no se puede descargar y se cancela, se cierra sin darlas por vistas
  const dismissReleaseNotes = () => {
    setReleaseNotesClosed(true);
    setIsReleaseNotesReplay(false);
  };
  const isDialogOpen = otherDialogOpen || isReleaseNotesOpen;

  // El acceso directo se abre tras la pantalla de inicio, cuando no hay otra ventana (la bienvenida, el recorrido, la
  // importación o las novedades, que esperan a que se cierre el formulario) y con el perfil sabido, aunque sea el del
  // dispositivo (así también sin conexión). Si mientras tanto se abre el formulario de una tarea, el acceso se descarta:
  // no se pisa lo que se está escribiendo
  const launchReady =
    !showSplash &&
    (profileOnboarding.fromServer || hasSeenOnboarding(profileOnboarding.record, seenOnThisDevice)) &&
    !isDialogOpen;
  if (launchNewTask !== null && isTaskModalOpen) setLaunchNewTask(null);
  else if (launchNewTask !== null && launchReady) {
    setLaunchNewTask(null);
    openNewTask();
    setDictateNewTask(launchNewTask === 'voz');
  }

  // El service worker de las notificaciones (Android solo las muestra desde él) y, con permiso, el registro de este
  // dispositivo para las notificaciones push (las alarmas suenan aunque CLAR esté cerrada)
  useEffect(() => {
    registerServiceWorker();
  }, []);
  const [pushEnabled, setPushEnabled] = useState(() => isPushEnabled(uid));
  useEffect(() => {
    // Solo en los dispositivos donde se activó «Avisarme también con CLAR cerrada»
    const register = (force: boolean) =>
      registerPushDevice(services, uid, force).catch((e) => console.warn('Could not register for push:', e));
    void register(false);
    const onGranted = () => void register(true);
    window.addEventListener(NOTIFICATIONS_GRANTED_EVENT, onGranted);
    return () => window.removeEventListener(NOTIFICATIONS_GRANTED_EVENT, onGranted);
  }, [services, uid]);
  const handleTogglePush = async (on: boolean) => {
    if (on) {
      if (notificationState() !== 'granted' && (await requestNotifications()) !== 'granted')
        throw new Error(m.allowNotifications);
      await enablePush(services, uid);
    } else {
      await disablePush(services, uid);
    }
    setPushEnabled(on);
  };
  const [pushShowsTitle, setPushShowsTitle] = useState(() => isPushTitleShown(uid));
  const handlePushTitle = async (show: boolean) => {
    await setPushTitleShown(services, uid, show);
    setPushShowsTitle(show);
  };

  // ALARMAS: avisan mientras la app está abierta, dentro de ella (en todas las pestañas) y, con permiso, también con
  // una notificación del sistema. El aviso muestra la tarea tal como está ahora y desaparece si se marca como hecha.
  // Cada aviso guarda cuándo se mostró: si llega tarde (CLAR estaba cerrada a la hora de la alarma), lo dice
  const [alarmAlerts, setAlarmAlerts] = useState<AlarmAlert[]>([]);
  useTaskAlarms(uid, tasks, {
    onAlert: (alarm) =>
      setAlarmAlerts((list) => [...list.filter((a) => a.key !== alarm.key), { ...alarm, raisedAt: new Date() }]),
    onNotify: (alarm) =>
      showSystemNotification(
        m.alarmTitle(formatClock(alarm.at), alarm.task.title),
        [formatTaskDates(alarm.task), alarmLateNote(alarm.at, new Date())].filter(Boolean).join(' · '),
        alarm.key
      )
  });
  const visibleAlarms = alarmAlerts.flatMap((alarm) => {
    const task = tasks.find((t) => t.id === alarm.task.id);
    return task && !isArchived(task) ? [{ ...alarm, task }] : [];
  });
  const openAlarmTask = (task: TaskItem) => {
    setAlarmAlerts((list) => list.filter((a) => a.task.id !== task.id));
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };
  // La alarma pulsada se abre cuando lo haría el acceso directo y su tarea ha llegado. Si mientras tanto se abre otro
  // formulario, o la tarea ya no está (confirmado por el servidor), se descarta
  if (launchAlarm !== null && isTaskModalOpen) setLaunchAlarm(null);
  else if (launchAlarm !== null && launchReady) {
    // La clave es «tarea@momento»: sin «@» no es de una alarma y no abre nada
    const at = launchAlarm.lastIndexOf('@');
    const taskId = at > 0 ? launchAlarm.slice(0, at) : null;
    const task = taskId ? tasks.find((t) => t.id === taskId && !isArchived(t)) : undefined;
    if (task) {
      setLaunchAlarm(null);
      openAlarmTask(task);
    } else if (syncByCollection.tasks.fromServer) setLaunchAlarm(null);
  }

  // Conteo de tareas por contexto
  const archivedTasks = tasks.filter(isArchived);
  const workCount = tasks.filter((t) => t.listContext === 'WORK' && !t.isSomeday && !isArchived(t)).length;
  // «Top 10» cuenta lo mismo que muestra la lista: tareas activas del contexto tras aplicar los filtros, sin las
  // bloqueadas
  const taskIndex = tasksById(tasks);
  const top10Count = splitTop10(
    arrangeTasks(
      tasks.filter((t) => t.listContext === activeContext && !t.isSomeday && !isArchived(t)),
      listPrefs,
      now
    ),
    (task) => Boolean(blockerOf(task, taskIndex))
  ).top.length;
  const personalCount = tasks.filter((t) => t.listContext === 'PERSONAL' && !t.isSomeday && !isArchived(t)).length;

  // Cálculo de promedio actual de la Rueda
  const latestLog = wheelLogs[wheelLogs.length - 1];
  const wheelAverage = latestLog ? logAverage(latestLog.scores).toFixed(1) : '0.0';

  return (
    // Las áreas de la Rueda de la cuenta, para todas las vistas. En el móvil queda sitio abajo para la barra de secciones
    // y el botón «Nueva tarea»
    <AreasContext.Provider value={wheelAreas}>
      <div className="flex min-h-screen flex-col bg-slate-50 pr-[env(safe-area-inset-right)] pb-[calc(9rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white md:pb-0">
        {/* Con un diálogo abierto, el resto de la página queda inerte: ni el teclado ni los lectores de pantalla llegan */}
        <div className="contents" inert={isDialogOpen}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            {m.skipToContent}
          </a>
          {/* Barra de Navegación Superior con Contrato de 3 Zonas */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={navigate}
            activeContext={activeContext}
            setActiveContext={setActiveContext}
            activeUser={profile}
            onOpenAccount={() => setIsAccountMenuOpen(true)}
            taskCounts={{ work: workCount, personal: personalCount }}
            syncStatus={syncStatus}
            onForceSync={handleForceSync}
            isAdmin={isAdmin}
            pendingAccessCount={pendingAccessCount}
            onShowReleaseNotes={() => setIsReleaseNotesReplay(true)}
          />

          {/* NUEVA TAREA: debajo de la cabecera en tableta y escritorio; en el móvil, botón flotante sobre la barra */}
          <div className="mx-auto hidden w-full max-w-7xl justify-end px-4 pt-4 sm:px-6 md:flex lg:px-8">
            <button
              type="button"
              onClick={() => openNewTask()}
              data-tour="new-task"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800 sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {m.newTask}
            </button>
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 pt-4 pb-8 focus:outline-none sm:px-6 lg:px-8"
          >
            {/* INICIO: foco de la lista activa, estadísticas y recomendaciones */}
            {activeTab === 'home' && (
              <HomeView
                tasks={tasks}
                goals={goals}
                projects={projects}
                activeContext={activeContext}
                accountName={profile.name}
                top10Count={top10Count}
                wheelLogs={wheelLogs}
                wheelAverage={wheelAverage}
                now={now}
                onOpenAccount={() => setIsAccountMenuOpen(true)}
                onNavigate={navigate}
              />
            )}

            {/* PESTAÑA 1: LISTAS DUALES (GESTOR DUAL CON JERARQUÍA VISUAL TOP 10) */}
            {activeTab === 'tasks' && (
              <TaskList
                tasks={tasks}
                goals={goals}
                activeContext={activeContext}
                prefs={listPrefs}
                onPrefsChange={setListPrefs}
                archivedCount={archivedTasks.length}
                draftsCount={taskDrafts.length}
                onOpenDrafts={() => setIsDraftsOpen(true)}
                onChangeStatus={handleChangeStatus}
                onDeleteTask={handleDeleteTask}
                onDownloadTask={handleDownloadTask}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setIsTaskModalOpen(true);
                }}
                onOpenNewTask={openNewTask}
                onOpenArchive={() => setIsArchiveOpen(true)}
              />
            )}

            {/* AGENDA: tareas con fecha de las dos listas y repeticiones previstas */}
            {activeTab === 'agenda' && (
              <DeferredSection retry={AgendaView.retry}>
                <AgendaView
                  tasks={tasks}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              </DeferredSection>
            )}

            {/* PESTAÑA 2: RUEDA DE LA VIDA (MÓDULO 1) */}
            {activeTab === 'wheel' && (
              // Se remonta cuando llegan los datos confirmados por el servidor para partir de la última evaluación
              <DeferredSection retry={WheelOfLife.retry}>
                <WheelOfLife
                  key={wheelSynced ? 'synced' : 'cache'}
                  logs={wheelLogs}
                  showFirstStep={wheelSynced && wheelLogs.length === 0}
                  onAppendSnapshot={handleAppendWheelSnapshot}
                  onOpenHelp={() => navigate('help')}
                  goals={goals}
                  onOpenGoals={() => navigate('goals')}
                  onEditAreas={() => setIsAreasEditorOpen(true)}
                />
              </DeferredSection>
            )}

            {/* METAS: de las áreas de la Rueda a las tareas, empezando por las áreas más bajas */}
            {activeTab === 'goals' && (
              <DeferredSection retry={GoalsView.retry}>
                <GoalsView
                  goals={goals}
                  tasks={tasks}
                  scores={wheelSynced || wheelLogs.length > 0 ? latestScores(wheelLogs) : undefined}
                  onNewGoal={(area) => setGoalEditor({ area })}
                  onEditGoal={(goal) => setGoalEditor({ goal })}
                  onSetGoalStatus={handleSetGoalStatus}
                  onAddTask={(goal) => openNewTask({ goalId: goal.id })}
                  projects={projects}
                  onOpenProject={(project) => openProject(project.id)}
                  onNewProject={(goal) => setProjectEditor({ goalId: goal.id })}
                  onDownloadGoal={handleDownloadGoal}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                  onOpenWheel={() => navigate('wheel')}
                />
              </DeferredSection>
            )}

            {/* PROYECTOS: tareas con fecha de fin dentro de una meta, con su avance (batería) y sus avisos de plazo */}
            {activeTab === 'projects' && (
              <DeferredSection retry={ProjectsView.retry}>
                <ProjectsView
                  projects={projects}
                  goals={goals}
                  tasks={tasks}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={setSelectedProjectId}
                  onNewProject={() => setProjectEditor({})}
                  onEditProject={(project) => setProjectEditor({ project })}
                  onSetProjectStatus={handleSetProjectStatus}
                  onAddTask={(project) => openNewTask({ project })}
                  onChangeTaskStatus={handleChangeStatus}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                  onDeleteTask={(task) => handleDeleteTask(task.id)}
                  onDownloadTask={handleDownloadTask}
                  onDownloadProject={handleDownloadProject}
                  onOpenGoals={() => navigate('goals')}
                />
              </DeferredSection>
            )}

            {/* PESTAÑA 3: CÓMO FUNCIONA LA APP */}
            {activeTab === 'help' && (
              <DeferredSection retry={HowItWorks.retry}>
                <HowItWorks
                  onNavigate={navigate}
                  onStartTour={() => startTour()}
                  onShowWelcome={() => setIsWelcomeReplay(true)}
                  onContact={() => setIsFeedbackOpen(true)}
                  calendarSync={calendarActive && calendarSyncAvailable()}
                />
              </DeferredSection>
            )}

            {activeTab === 'access' && isAdmin && (
              <DeferredSection retry={AdminView.retry}>
                <AdminView
                  requests={accessRequests}
                  currentUid={uid}
                  accessError={accessError ?? featuresError}
                  onDecide={handleDecideAccess}
                  requestsSeenAt={requestsSeenAt}
                  onSeenRequests={markRequestsSeen}
                  approvalRequired={approvalRequired}
                  onSetApprovalRequired={handleSetApprovalRequired}
                  features={accountFeatures}
                  onSetFeatures={handleSetFeatures}
                  tickets={feedbackTickets}
                  feedbackError={feedbackError}
                  onSetFeedbackStatus={handleSetFeedbackStatus}
                  onReplyFeedback={handleReplyFeedback}
                  loadClosedFeedback={(cursor) => loadClosedFeedback(db, cursor)}
                />
              </DeferredSection>
            )}
          </main>

          {/* FOOTER DISCRETO Y EDITORIAL */}
          <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReleaseNotesReplay(true)}
                  aria-label={m.whatsNew(__APP_VERSION__)}
                  className="font-bold text-slate-700 hover:text-indigo-700"
                >
                  CLAR v{__APP_VERSION__}
                </button>
                <span className="text-slate-300">·</span>
                <p className="text-slate-500">{BRAND_TAGLINE}.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 text-slate-600">
                <button
                  onClick={() => navigate('help')}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {m.viewHelp}
                </button>
                <LegalLinks newTab />
              </div>
            </div>
          </footer>

          <button
            type="button"
            onClick={() => openNewTask()}
            data-tour="new-task"
            aria-label={m.newTask}
            className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/30 transition-transform hover:bg-slate-800 active:scale-95 md:hidden"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </button>

          <BottomNav
            activeTab={activeTab}
            onNavigate={navigate}
            isMoreOpen={isMoreOpen}
            onOpenMore={() => setIsMoreOpen(true)}
            pendingAccessCount={isAdmin ? pendingAccessCount : 0}
          />
        </div>

        <MoreSheet
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          activeTab={activeTab}
          onNavigate={navigate}
          isAdmin={isAdmin}
          pendingAccessCount={pendingAccessCount}
          syncStatus={syncStatus}
          onForceSync={handleForceSync}
          activeUser={profile}
          onOpenAccount={() => setIsAccountMenuOpen(true)}
        />

        {/* Con una ventana abierta los avisos esperan: quedarían fuera de su foco (no se llegaría con el teclado) y
          taparían sus controles. Se muestran al cerrarla. */}
        <AlarmAlerts
          alarms={isDialogOpen ? [] : visibleAlarms}
          onOpenTask={openAlarmTask}
          onDismiss={(key) => setAlarmAlerts((list) => list.filter((a) => a.key !== key))}
        />

        {/* BANNER TOAST DE NOTIFICACIÓN: región viva siempre presente para que los lectores de pantalla lo anuncien. Una
          celebración va en una línea aparte, después del aviso de siempre */}
        <div role="status" aria-live="polite">
          {toast && (
            <div className="animate-in slide-in-from-bottom-3 fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(9.5rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-xs text-white shadow-xl duration-200 md:right-6 md:bottom-6 md:left-auto md:max-w-md">
              {toast.celebration ? (
                <Sparkles
                  key={toast.id}
                  className="celebration-icon h-4 w-4 shrink-0 text-violet-300"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              )}
              <span className="min-w-0 wrap-anywhere">
                <span className="font-semibold">{toast.message}</span>
                {toast.celebration && <span className="mt-0.5 block text-indigo-200">{toast.celebration}</span>}
              </span>
              {toast.undo && (
                <button
                  type="button"
                  onClick={toast.undo}
                  className="-my-1 ml-auto min-h-9 shrink-0 rounded-lg px-2.5 font-bold text-indigo-300 hover:bg-white/10 hover:text-indigo-200"
                >
                  {m.undo}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Confeti de la celebración: solo decora, debajo del aviso; se va con él (también al pulsar «Deshacer») */}
        {toast?.celebration && <CelebrationBurst key={toast.id} />}

        {/* PANTALLA DE INICIO MÓVIL (SPLASH SCREEN) */}
        {showSplash && (
          <SplashScreen version={__APP_VERSION__} autoDismissMs={1600} onFinish={() => setShowSplash(false)} />
        )}

        {/* MODAL 1: CAPTURA DE TAREA CON ANALIZADOR SINTÁCTICO Y TF-IDF */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
            setDictateNewTask(false);
            setContinuingDraft(null);
          }}
          draft={continuingDraft}
          onSaveDraft={handleSaveDraft}
          onSaveTask={handleSaveTask}
          initialContext={activeContext}
          initialSomeday={newTaskIsSomeday}
          initialGoalId={newTaskGoalId}
          initialProjectId={newTaskProjectId}
          autoDictate={dictateNewTask}
          editingTask={editingTask}
          goals={goals}
          projects={projects}
          tasks={tasks}
          onCreateGoal={handleCreateGoalFromTask}
        />

        {/* BORRADORES DE TAREAS */}
        <TaskDraftsModal
          isOpen={isDraftsOpen}
          onClose={() => setIsDraftsOpen(false)}
          drafts={taskDrafts}
          onContinue={continueDraft}
          onDelete={handleDeleteDraft}
          onRestore={restoreDraft}
        />

        {/* VENTANA DE TAREAS ARCHIVADAS (ESTADO HECHA) */}
        <ArchivedTasksModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
          tasks={archivedTasks}
          onChangeStatus={handleChangeStatus}
          onDeleteTask={handleDeleteTask}
        />

        {/* MODAL 2: CUENTA (CERRAR SESIÓN, DESCARGAR DATOS, ELIMINAR CUENTA) */}
        <AccountMenu
          isOpen={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
          user={profile}
          onSignOut={() => signOutAndClearCache(services)}
          hasPassword={hasPassword(user)}
          reauthMethods={reauthMethods}
          onExportData={handleExportData}
          onImportData={handleChooseImportFile}
          retired={{
            count: retiredCount,
            onDelete: async () => {
              await deleteRetiredItems(db, uid);
              setRetiredCount(0);
            }
          }}
          push={
            pushAvailable()
              ? {
                  enabled: pushEnabled,
                  onChange: handleTogglePush,
                  showTitle: pushShowsTitle,
                  onShowTitleChange: handlePushTitle,
                  permissionLost: pushPermissionLost(uid),
                  onTest: () => sendTestPush(services, uid)
                }
              : null
          }
          extraFeatures={extraFeatures}
          calendar={calendar}
          onDeleteAccount={handleDeleteAccount}
          onChangePassword={(currentPassword, newPassword) => changePassword(user, currentPassword, newPassword)}
          onSignOutEverywhere={() => signOutEverywhere(services)}
          returnFocusTo={accountButton}
          onContact={() => {
            setIsAccountMenuOpen(false);
            setIsFeedbackOpen(true);
          }}
          onOpenAccessibility={() => {
            setIsAccountMenuOpen(false);
            setIsAccessibilityOpen(true);
          }}
        />

        {/* Se abre desde el menú de la cuenta, que ya no existe al cerrarse: el foco vuelve al botón de la cuenta */}
        <AccessibilityPanel
          isOpen={isAccessibilityOpen}
          onClose={() => setIsAccessibilityOpen(false)}
          returnFocusTo={accountButton}
        />

        {/* CONTACTO: sugerencias, errores o mensajes (se monta al abrirse, así empieza limpio) */}
        {isFeedbackOpen && (
          <FeedbackDialog
            functions={services.functions}
            onClose={() => setIsFeedbackOpen(false)}
            returnFocusTo={accountButton}
          />
        )}

        {/* BIENVENIDA DE LA PRIMERA VEZ */}
        {isWelcomeOpen && (
          <DeferredDialog retry={WelcomeDialog.retry} onCancel={() => finishWelcome('skipped')}>
            <WelcomeDialog onFinish={finishWelcome} />
          </DeferredDialog>
        )}
        {isReleaseNotesOpen && currentRelease && (
          <DeferredDialog retry={ReleaseNotesDialog.retry} onCancel={dismissReleaseNotes}>
            <ReleaseNotesDialog
              release={currentRelease}
              onClose={closeReleaseNotes}
              returnFocusTo={() => document.getElementById('main-content')}
            />
          </DeferredDialog>
        )}
        {isTourOpen && (
          <DeferredDialog retry={ProductTour.retry} onCancel={finishTour}>
            <ProductTour steps={TOUR_STEPS} onFinish={finishTour} />
          </DeferredDialog>
        )}

        {/* METAS: crear o editar (se monta al abrirse, así empieza limpio) */}
        {goalEditor && (
          <DeferredDialog retry={GoalModal.retry} onCancel={() => setGoalEditor(null)}>
            <GoalModal
              goal={goalEditor.goal}
              initialArea={goalEditor.area}
              onSave={handleSaveGoal}
              onDelete={handleDeleteGoal}
              projectCount={goalEditor.goal ? projectsOfGoal(goalEditor.goal.id, projects).length : 0}
              onClose={() => setGoalEditor(null)}
            />
          </DeferredDialog>
        )}

        {/* PROYECTOS: crear o editar (se monta al abrirse, así empieza limpio) */}
        {projectEditor && (
          <DeferredDialog retry={ProjectModal.retry} onCancel={() => setProjectEditor(null)}>
            <ProjectModal
              project={projectEditor.project}
              initialGoalId={projectEditor.goalId}
              goals={goals}
              onSave={handleSaveProject}
              onDelete={handleDeleteProject}
              onClose={() => setProjectEditor(null)}
            />
          </DeferredDialog>
        )}

        {/* ÁREAS DE LA RUEDA: renombrar, ocultar y añadir (se monta al abrirse) */}
        {isAreasEditorOpen && (
          <DeferredDialog retry={AreasModal.retry} onCancel={() => setIsAreasEditorOpen(false)}>
            <AreasModal areas={wheelAreas} onSave={handleSaveAreas} onClose={() => setIsAreasEditorOpen(false)} />
          </DeferredDialog>
        )}

        {/* IMPORTAR LA DESCARGA DE LA CUENTA (se abre desde el menú de la cuenta, con el archivo ya comprobado) */}
        {importPlan && (
          <DeferredDialog retry={ImportAccountDialog.retry} onCancel={() => setImportPlan(null)}>
            <ImportAccountDialog
              plan={importPlan}
              onImport={(onProgress) => handleRunImport(importPlan, onProgress)}
              onClose={() => setImportPlan(null)}
              returnFocusTo={accountButton}
            />
          </DeferredDialog>
        )}

        {/* MODAL 3: IMPORTAR DATOS DE LA VERSIÓN SIN CUENTAS */}
        {isImportOpen && (
          <ImportLocalDataModal
            profiles={localProfiles}
            onImport={handleImportLocalData}
            onDiscard={handleDiscardLocalData}
            onLater={() => setIsImportPostponed(true)}
          />
        )}
      </div>
    </AreasContext.Provider>
  );
}
