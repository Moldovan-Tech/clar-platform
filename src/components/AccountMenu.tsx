import React, { useRef, useState } from 'react';
import { useModalFocus } from '../hooks/useModalFocus';
import { describeAuthError, MIN_PASSWORD_LENGTH, type ReauthMethod } from '../services/auth';
import { UserProfile } from '../types';
import {
  X,
  LogOut,
  Download,
  Upload,
  Trash2,
  Cloud,
  Accessibility,
  KeyRound,
  MonitorSmartphone,
  MessageSquare,
  Sparkles,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { DeleteAccountPanel } from './DeleteAccountPanel';
import { LegalLink } from './LegalLinks';
import { NotificationPermission } from './NotificationPermission';
import { notificationState } from '../services/notifications';
import { isAndroid } from '../services/platform';
import type { ExtraFeature, FeatureId } from '../services/features';
import { CalendarConnection, type CalendarConnectionProps } from './CalendarConnection';
import { ShareAppButton } from './ShareApp';
import { LanguageSelector } from './LanguageSelector';
import { messages } from '../i18n/locale';

const m = messages(
  {
    retired: (n: number) =>
      `Eliminar ${n === 1 ? 'la reunión o el correo' : `las ${n} reuniones y correos`} de versiones anteriores`,
    retiredHelp:
      '«Tiempo protegido» ya no está en la app: lo que guardaste allí sigue en tu cuenta y en tu descarga hasta que lo elimines.',
    retiredConfirm: 'Se borrarán para siempre. Si los quieres conservar, descarga antes tus datos.',
    retiredDelete: 'Eliminar',
    retiredCancel: 'Cancelar',
    retiredDone: 'Eliminados.',
    language: 'Idioma',
    failed: 'No se pudo completar la acción.',
    shortPassword: `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    passwordChanged: 'Contraseña cambiada.',
    title: 'Tu cuenta',
    close: 'Cerrar',
    withPassword: 'Entras con email y contraseña',
    withGoogle: 'Entras con Google',
    // Alrededor del enlace a la política de privacidad
    dataBefore:
      'Tus datos se guardan en tu cuenta (Google Cloud, UE) y solo tú puedes acceder a ellos. Se sincronizan entre tus dispositivos y, sin conexión, los cambios se envían al recuperarla. Más detalles en la ',
    privacy: 'política de privacidad',
    accessibility: 'Accesibilidad: tamaño del texto, contraste y animaciones',
    preparingDownload: 'Preparando descarga…',
    download: 'Descargar mis datos (JSON)',
    readingFile: 'Leyendo el archivo…',
    import: 'Importar datos (JSON)',
    importHelp: 'El archivo de «Descargar mis datos». Se añade lo que falta; lo que ya tienes no se toca.',
    alarmNotifications: 'Notificaciones de las alarmas',
    enableAlarmNotifications: 'Activar las notificaciones de las alarmas',
    pushOn: 'Listo: en este dispositivo, las alarmas te llegarán aunque CLAR esté cerrada.',
    pushOff: 'En este dispositivo, las alarmas solo avisarán con CLAR abierta.',
    saving: 'Guardando…',
    pushLabel: 'Avisarme también con CLAR cerrada (en este dispositivo)',
    pushHelp:
      'La hora de la alarma (y el nombre de la tarea, si lo muestras) pasa por Firebase Cloud Messaging (Google) hasta este dispositivo.',
    permissionLost:
      'Las notificaciones de CLAR están bloqueadas en los ajustes de este dispositivo: así no te llega ninguna alarma. Vuelve a permitirlas o desactiva esta opción.',
    testSent: 'Enviada: te llegará en unos segundos, también si cierras CLAR ahora.',
    sending: 'Enviando…',
    test: 'Probar notificación',
    androidHelp:
      'En Android, para que aparezca en lo alto de la pantalla: Ajustes › Notificaciones › CLAR (o Chrome) › «Mostrar en pantalla emergente». Si llegan tarde, quita las restricciones de batería de Chrome.',
    showTitle: 'Mostrar el nombre de la tarea (también con el móvil bloqueado)',
    extraFeatures: 'Funciones extra',
    adminFeatures: 'Como administración, las tienes todas: enciende las que quieras usar.',
    grantedFeatures: 'Activadas para tu cuenta por la administración.',
    contact: 'Escríbenos: ideas, fallos o dudas',
    security: 'Seguridad',
    changePassword: 'Cambiar la contraseña',
    currentPassword: 'Contraseña actual',
    newPassword: 'Contraseña nueva',
    passwordHint: `Al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    saveNewPassword: 'Guardar la contraseña nueva',
    everywhere: 'Cerrar sesión en todos los dispositivos',
    everywhereHelp:
      'Se cerrará la sesión en todos tus dispositivos, también en este. Los demás dejarán de tener acceso en menos de una hora. Úsalo si has perdido un dispositivo o has entrado en uno que no es tuyo.',
    closingSessions: 'Cerrando sesiones…',
    closeAllSessions: 'Cerrar todas las sesiones',
    signOut: 'Cerrar sesión',
    deleteAccount: 'Eliminar mi cuenta y todos mis datos'
  },
  {
    retired: (n) => `Delete ${n === 1 ? 'the meeting or email' : `the ${n} meetings and emails`} from earlier versions`,
    retiredHelp:
      '“Protected time” is no longer in the app: what you saved there stays in your account and your download until you delete it.',
    retiredConfirm: "They'll be deleted for good. If you want to keep them, download your data first.",
    retiredDelete: 'Delete',
    retiredCancel: 'Cancel',
    retiredDone: 'Deleted.',
    language: 'Language',
    failed: "Couldn't complete the action.",
    shortPassword: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    passwordChanged: 'Password changed.',
    title: 'Your account',
    close: 'Close',
    withPassword: 'You sign in with email and password',
    withGoogle: 'You sign in with Google',
    dataBefore:
      "Your data is saved in your account (Google Cloud, EU) and only you can access it. It syncs across your devices and, when you're offline, your changes are sent once you're back online. More details in the ",
    privacy: 'privacy policy',
    accessibility: 'Accessibility: text size, contrast and animations',
    preparingDownload: 'Preparing download…',
    download: 'Download my data (JSON)',
    readingFile: 'Reading the file…',
    import: 'Import data (JSON)',
    importHelp: "The file from “Download my data”. What's missing is added; what you already have isn't touched.",
    alarmNotifications: 'Alarm notifications',
    enableAlarmNotifications: 'Turn on alarm notifications',
    pushOn: 'Done: on this device, your alarms will reach you even when CLAR is closed.',
    pushOff: 'On this device, alarms will only notify you while CLAR is open.',
    saving: 'Saving…',
    pushLabel: 'Also notify me when CLAR is closed (on this device)',
    pushHelp:
      'The alarm time (and the task name, if you show it) goes through Firebase Cloud Messaging (Google) to this device.',
    permissionLost:
      "CLAR's notifications are blocked in this device's settings, so no alarm reaches you. Allow them again or turn this option off.",
    testSent: 'Sent: it will arrive in a few seconds, even if you close CLAR now.',
    sending: 'Sending…',
    test: 'Test notification',
    androidHelp:
      "On Android, to make it appear at the top of the screen: Settings › Notifications › CLAR (or Chrome) › “Pop on screen”. If they arrive late, remove Chrome's battery restrictions.",
    showTitle: 'Show the task name (also when the phone is locked)',
    extraFeatures: 'Extra features',
    adminFeatures: 'As the admin, you have them all: turn on the ones you want to use.',
    grantedFeatures: 'Turned on for your account by the admin.',
    contact: 'Contact us: ideas, bugs or questions',
    security: 'Security',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters.`,
    saveNewPassword: 'Save the new password',
    everywhere: 'Sign out on all devices',
    everywhereHelp:
      "You'll be signed out on all your devices, including this one. The others will lose access in less than an hour. Use it if you've lost a device or signed in on one that isn't yours.",
    closingSessions: 'Signing out…',
    closeAllSessions: 'Sign out everywhere',
    signOut: 'Sign out',
    deleteAccount: 'Delete my account and all my data'
  }
);

interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  // La cuenta tiene contraseña (puede cambiarla)
  hasPassword: boolean;
  // Cómo confirmar la eliminación, primero el método con el que se entró en esta sesión
  reauthMethods: ReauthMethod[];
  onSignOut: () => void;
  onExportData: () => Promise<void>;
  // Lee y comprueba el archivo elegido; si vale, se abre la vista previa (y este menú se cierra)
  onImportData: (file: File) => Promise<void>;
  // Reuniones y correos de versiones anteriores (1.3.0 retiró «Tiempo protegido»): cuántos hay (null: aún no se sabe)
  // y borrarlos
  retired: { count: number | null; onDelete: () => Promise<void> };
  // Alarmas con CLAR cerrada en este dispositivo (notificaciones push); null si esta instalación no las ofrece
  push: {
    enabled: boolean;
    onChange: (on: boolean) => Promise<void>;
    // Si la notificación lleva el nombre de la tarea (por defecto no: se vería con el móvil bloqueado)
    showTitle: boolean;
    onShowTitleChange: (show: boolean) => Promise<void>;
    // Activadas, pero el permiso se quitó después en los ajustes: no llega ninguna
    permissionLost: boolean;
    // «Probar notificación»: el servidor envía un aviso ahora a este dispositivo
    onTest: () => Promise<void>;
  } | null;
  // Funciones extra: la administración las tiene todas y las enciende o apaga aquí (onToggle); el resto ve las que la
  // administración le ha activado. Sin ninguna, el apartado no aparece
  extraFeatures: {
    features: readonly ExtraFeature[];
    active: FeatureId[];
    onToggle: ((id: FeatureId, on: boolean) => void) | null;
  };
  // Conexión con Google Calendar, mientras su función está en uso (si no, null)
  calendar: CalendarConnectionProps | null;
  onDeleteAccount: (password?: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onSignOutEverywhere: () => Promise<void>;
  onOpenAccessibility: () => void;
  onContact: () => void;
  // Adónde vuelve el foco si el botón que abrió el menú ya no está (p. ej. la hoja «Más» del móvil)
  returnFocusTo?: () => HTMLElement | null;
}

type Busy = 'export' | 'import' | 'retired' | 'push' | 'push-test' | 'delete' | 'password' | 'everywhere' | null;
type Panel = 'password' | 'everywhere' | 'delete' | null;

const actionClass =
  'w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2';
const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

// Cuenta autogestionada: accesibilidad, datos, seguridad (contraseña y sesiones) y eliminación
export const AccountMenu: React.FC<AccountMenuProps> = ({
  isOpen,
  onClose,
  user,
  hasPassword,
  reauthMethods,
  onSignOut,
  onExportData,
  onImportData,
  retired,
  push,
  extraFeatures,
  calendar,
  onDeleteAccount,
  onChangePassword,
  onSignOutEverywhere,
  onOpenAccessibility,
  onContact,
  returnFocusTo
}) => {
  const [busy, setBusy] = useState<Busy>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [confirmRetired, setConfirmRetired] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  useModalFocus(isOpen, dialogRef, onClose, returnFocusTo);

  // El menú sigue montado cerrado: lo escrito (contraseñas incluidas) no debe verse al volver a abrirlo
  const clearPasswords = () => {
    setCurrentPassword('');
    setNewPassword('');
  };

  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setPanel(null);
      setError(null);
      setNotice(null);
      clearPasswords();
    }
  }

  if (!isOpen) return null;

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>, done?: string) => {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (done) setNotice(done);
    } catch (e) {
      setError(describeAuthError(e, e instanceof Error && e.message ? e.message : m.failed));
    } finally {
      setBusy(null);
    }
  };

  const toggle = (next: Panel) => {
    setPanel((current) => (current === next ? null : next));
    setError(null);
    setNotice(null);
    clearPasswords();
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(m.shortPassword);
      return;
    }
    void run(
      'password',
      async () => {
        await onChangePassword(currentPassword, newPassword);
        clearPasswords();
        setPanel(null);
      },
      m.passwordChanged
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-xs sm:p-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={m.title}
        className="animate-in fade-in zoom-in-95 my-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl duration-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">{m.title}</h2>
          <button
            onClick={onClose}
            aria-label={m.close}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">
                {user.initials}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900">{user.name}</h3>
              {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
              <p className="text-[11px] text-slate-600">
                {reauthMethods[0] === 'password' ? m.withPassword : m.withGoogle}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-600">
            <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <p>
              {m.dataBefore}
              <LegalLink to="privacy" newTab>
                {m.privacy}
              </LegalLink>
              .
            </p>
          </div>

          <div aria-live="polite">
            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {notice}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {/* El idioma de la app, en este dispositivo y en la cuenta (al cambiarlo, la app se vuelve a cargar) */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-2">
              <span className="text-xs font-bold text-slate-700">{m.language}</span>
              <LanguageSelector />
            </div>
            <button type="button" onClick={onOpenAccessibility} disabled={busy !== null} className={actionClass}>
              <Accessibility className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              {m.accessibility}
            </button>
            <button
              type="button"
              onClick={() => run('export', onExportData)}
              disabled={busy !== null}
              className={actionClass}
            >
              <Download className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              {busy === 'export' ? m.preparingDownload : m.download}
            </button>
            <button
              type="button"
              onClick={() => importInput.current?.click()}
              disabled={busy !== null}
              aria-describedby="account-import-help"
              className={actionClass}
            >
              <Upload className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              {busy === 'import' ? m.readingFile : m.import}
            </button>
            <p id="account-import-help" className="px-1 text-[11px] text-slate-600">
              {m.importHelp}
            </p>
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Para poder elegir otra vez el mismo archivo
                e.target.value = '';
                if (file) void run('import', () => onImportData(file));
              }}
            />
            {retired.count !== null && retired.count > 0 && (
              <div className="space-y-1.5 rounded-xl border border-slate-200 px-4 py-2.5">
                <p className="text-[11px] text-slate-600">{m.retiredHelp}</p>
                {confirmRetired ? (
                  <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-2.5 text-[11px] text-red-900">
                    <p>{m.retiredConfirm}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          setConfirmRetired(false);
                          void run('retired', retired.onDelete, m.retiredDone);
                        }}
                        className="min-h-9 rounded-lg bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700"
                      >
                        {m.retiredDelete}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRetired(false)}
                        className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {m.retiredCancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setConfirmRetired(true)}
                    className={actionClass}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" />
                    {m.retired(retired.count)}
                  </button>
                )}
              </div>
            )}
            <div className="rounded-xl border border-slate-200 px-4 py-2.5">
              <p className="text-xs font-bold text-slate-700">{m.alarmNotifications}</p>
              {/* Con push, la casilla de abajo pide también el permiso: el botón solo haría falta sin ella */}
              {push ? (
                notificationState() === 'denied' && !push.enabled && <NotificationPermission />
              ) : (
                <NotificationPermission buttonLabel={m.enableAlarmNotifications} />
              )}
              {push && (
                <div className="mt-2 space-y-1">
                  <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={push.enabled}
                      disabled={busy !== null}
                      onChange={(e) => {
                        const on = e.target.checked;
                        void run('push', () => push.onChange(on), on ? m.pushOn : m.pushOff);
                      }}
                      aria-describedby="account-push-help"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    {busy === 'push' ? m.saving : m.pushLabel}
                  </label>
                  <p id="account-push-help" className="text-[11px] text-slate-600">
                    {m.pushHelp}
                  </p>
                  {push.permissionLost && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {m.permissionLost}
                    </p>
                  )}
                  {push.enabled && !push.permissionLost && (
                    <div className="space-y-1 pl-6">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void run('push-test', push.onTest, m.testSent)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                      >
                        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                        {busy === 'push-test' ? m.sending : m.test}
                      </button>
                      {isAndroid() && <p className="text-[11px] text-slate-600">{m.androidHelp}</p>}
                    </div>
                  )}
                  {push.enabled && (
                    <label className="flex min-h-9 cursor-pointer items-center gap-2 pl-6 text-xs text-slate-800">
                      <input
                        type="checkbox"
                        checked={push.showTitle}
                        disabled={busy !== null}
                        onChange={(e) => {
                          const show = e.target.checked;
                          void run('push', () => push.onShowTitleChange(show));
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      {m.showTitle}
                    </label>
                  )}
                </div>
              )}
            </div>
            {extraFeatures.features.length > 0 && (
              <section aria-labelledby="account-features" className="rounded-xl border border-slate-200 px-4 py-2.5">
                <h3 id="account-features" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
                  {m.extraFeatures}
                </h3>
                <p className="text-[11px] text-slate-600">
                  {extraFeatures.onToggle ? m.adminFeatures : m.grantedFeatures}
                </p>
                <ul className="mt-2 space-y-2">
                  {extraFeatures.features.map((feature) => {
                    const { onToggle } = extraFeatures;
                    const descriptionId = `account-feature-${feature.id}`;
                    const labelId = `${descriptionId}-label`;
                    const on = extraFeatures.active.includes(feature.id);
                    return (
                      <li key={feature.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p id={labelId} className="text-xs font-semibold text-slate-800">
                              {feature.label}
                            </p>
                            <p id={descriptionId} className="text-[11px] text-slate-600">
                              {feature.description}
                            </p>
                          </div>
                          {onToggle && (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={on}
                              aria-labelledby={labelId}
                              aria-describedby={descriptionId}
                              onClick={() => onToggle(feature.id, !on)}
                              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border-2 ${
                                on ? 'border-indigo-600 bg-indigo-600' : 'border-slate-500 bg-slate-200'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  on ? 'left-0.5 translate-x-5' : 'left-0.5 translate-x-0 border border-slate-500'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {feature.id === 'googleCalendar' && on && calendar && <CalendarConnection {...calendar} />}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <button type="button" onClick={onContact} disabled={busy !== null} className={actionClass}>
              <MessageSquare className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              {m.contact}
            </button>
            <ShareAppButton className={actionClass} />
          </div>

          {/* SEGURIDAD */}
          <section aria-labelledby="account-security" className="space-y-2">
            <h3 id="account-security" className="text-xs font-bold tracking-wider text-slate-700 uppercase">
              {m.security}
            </h3>
            {hasPassword && (
              <button
                type="button"
                onClick={() => toggle('password')}
                aria-expanded={panel === 'password'}
                disabled={busy !== null}
                className={actionClass}
              >
                <KeyRound className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                {m.changePassword}
              </button>
            )}
            {panel === 'password' && (
              <form onSubmit={submitPassword} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="space-y-1">
                  <label htmlFor="current-password" className="block text-xs font-semibold text-slate-700">
                    {m.currentPassword}
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700">
                    {m.newPassword}
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    aria-describedby="new-password-hint"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                  <p id="new-password-hint" className="text-[11px] text-slate-600">
                    {m.passwordHint}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {busy === 'password' ? m.saving : m.saveNewPassword}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => toggle('everywhere')}
              aria-expanded={panel === 'everywhere'}
              disabled={busy !== null}
              className={actionClass}
            >
              <MonitorSmartphone className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              {m.everywhere}
            </button>
            {panel === 'everywhere' && (
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <p className="text-xs leading-relaxed text-slate-700">{m.everywhereHelp}</p>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run('everywhere', onSignOutEverywhere)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {busy === 'everywhere' ? m.closingSessions : m.closeAllSessions}
                </button>
              </div>
            )}

            <button type="button" onClick={onSignOut} disabled={busy !== null} className={actionClass}>
              <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
              {m.signOut}
            </button>
          </section>

          {panel === 'delete' ? (
            <DeleteAccountPanel
              methods={reauthMethods}
              busy={busy === 'delete'}
              onConfirm={(password) => run('delete', () => onDeleteAccount(password))}
              onCancel={() => {
                setPanel(null);
                // El botón que lo abrió vuelve a estar: el foco vuelve a él
                requestAnimationFrame(() => deleteButtonRef.current?.focus());
              }}
            />
          ) : (
            <button
              ref={deleteButtonRef}
              type="button"
              onClick={() => toggle('delete')}
              disabled={busy !== null}
              className="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {m.deleteAccount}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
