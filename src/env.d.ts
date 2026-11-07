// Versión de package.json, inyectada por Vite al compilar (vite.config.ts)
declare const __APP_VERSION__: string;
interface ImportMetaEnv {
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  // Clave pública VAPID de Firebase Cloud Messaging (notificaciones push de las alarmas); sin ella no se usan
  readonly VITE_FCM_VAPID_KEY?: string;
  // Id del cliente OAuth de Google (no es secreto) para sincronizar con Google Calendar; sin él no se ofrece
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
}
