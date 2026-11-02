import React, { useState } from 'react';
import { Compass, Briefcase, Cloud, Target, CalendarDays, Mic, WifiOff } from 'lucide-react';
import { BRAND_NAME, BRAND_TAGLINE, BrandMark } from './BrandMark';
import { AccessibilityTrigger, AccessibleScreen } from './AccessibilityPanel';
import { EmailAuthForm, type EmailAuthMode } from './EmailAuthForm';
import { LegalLink, LegalLinks } from './LegalLinks';
import { MIN_AGE } from '../services/legal';
import { LanguageSelector } from './LanguageSelector';
import { messages } from '../i18n/locale';

interface LoginScreenProps {
  onSignIn: () => void;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (account: { name: string; email: string; password: string }) => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
  isSigningIn: boolean;
  error: string | null;
  version: string;
}

// Logo de Google para el botón de inicio de sesión (inicio de sesión real con Firebase Auth)
const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

type FeatureKey = 'wheel' | 'goals' | 'top10' | 'agenda' | 'dictate' | 'offline';

const m = messages<{
  features: Record<FeatureKey, { title: string; text: string }>;
  intro: string;
  signUp: string;
  haveAccount: string;
  featuresLabel: string;
  yourData: string;
  dataStored: string;
  install: string;
  openSource: string;
  code: string;
  newTab: string;
  signInTitle: string;
  openingGoogle: string;
  continueGoogle: string;
  orEmail: string;
  // Alrededor de los enlaces a las condiciones de uso y a la política de privacidad
  consentBefore: string;
  terms: string;
  consentMiddle: string;
  privacy: string;
  storage: string;
}>(
  {
    features: {
      wheel: {
        title: 'Rueda de la Vida',
        text: 'Valora de 0 a 10 cada área de tu vida y mira cómo cambia con el tiempo.'
      },
      goals: {
        title: 'Metas y proyectos',
        text: 'Convierte cada meta en tareas concretas y, si te ayuda, agrúpalas en proyectos.'
      },
      top10: {
        title: 'Tu Top 10',
        text: 'Dos listas, profesional y personal. Las 10 primeras son tu foco; lo demás espera.'
      },
      agenda: {
        title: 'Agenda y alarmas',
        text: 'Fechas, repeticiones y alarmas que te avisan aunque CLAR esté cerrada. Lo de hoy, a la vista.'
      },
      dictate: {
        title: 'Dicta tus tareas',
        text: 'Pulsa el micrófono y dilo, o mantén pulsado el icono de la app: «Nueva tarea por voz».'
      },
      offline: {
        title: 'También sin conexión',
        text: 'Funciona sin conexión y se sincroniza entre tus dispositivos al volver.'
      }
    },
    intro: 'Una app gratuita para pasar de tus metas a la siguiente acción concreta, sin perderte en listas infinitas.',
    signUp: 'Crear cuenta gratis',
    haveAccount: 'Ya tengo cuenta',
    featuresLabel: 'Qué hace CLAR',
    yourData: 'Tus datos',
    dataStored:
      'Se guardan en tu cuenta, en la Unión Europea, y nadie más los ve en la app. Puedes descargarlos o borrarlos cuando quieras. Sin anuncios ni analítica.',
    install: 'Instálala en el móvil desde el navegador: «Añadir a la pantalla de inicio».',
    openSource: 'Código abierto (licencia MIT):',
    code: 'el código en GitHub',
    newTab: '(se abre en otra pestaña)',
    signInTitle: 'Entra en CLAR',
    openingGoogle: 'Abriendo Google…',
    continueGoogle: 'Continuar con Google',
    orEmail: 'o con tu email',
    consentBefore: `Al continuar, con Google o con tu email, confirmas que tienes al menos ${MIN_AGE} años (o la edad mínima legal para dar tu consentimiento en tu país de residencia, si es mayor) y aceptas las `,
    terms: 'condiciones de uso',
    consentMiddle: '. Cómo tratamos tus datos: ',
    privacy: 'política de privacidad',
    storage:
      'Si entras con email y contraseña, primero confirmarás tu email. Tus tareas, metas, proyectos, evaluaciones y agenda se guardan en tu cuenta, en servidores de Google Cloud en la Unión Europea (Bélgica).'
  },
  {
    features: {
      wheel: {
        title: 'Wheel of Life',
        text: 'Rate each area of your life from 0 to 10 and see how it changes over time.'
      },
      goals: {
        title: 'Goals and projects',
        text: 'Turn each goal into concrete tasks and, if it helps, group them into projects.'
      },
      top10: {
        title: 'Your Top 10',
        text: 'Two lists, work and personal. The first 10 are your focus; the rest can wait.'
      },
      agenda: {
        title: 'Agenda and alarms',
        text: "Dates, repeats and alarms that notify you even when CLAR is closed. Today's tasks, in plain sight."
      },
      dictate: {
        title: 'Dictate your tasks',
        text: 'Tap the microphone and say it, or press and hold the app icon: “Nueva tarea por voz · New task by voice”.'
      },
      offline: {
        title: 'Offline too',
        text: "Works offline and syncs across your devices when you're back online."
      }
    },
    intro: 'A free app to go from your goals to the next concrete action, without getting lost in endless lists.',
    signUp: 'Create a free account',
    haveAccount: 'I already have an account',
    featuresLabel: 'What CLAR does',
    yourData: 'Your data',
    dataStored:
      "It's stored in your account, in the European Union, and nobody else sees it in the app. You can download or delete it whenever you want. No ads, no analytics.",
    install: 'Install it on your phone from the browser: “Add to Home Screen”.',
    openSource: 'Open source (MIT license):',
    code: 'the code on GitHub',
    newTab: '(opens in a new tab)',
    signInTitle: 'Sign in to CLAR',
    openingGoogle: 'Opening Google…',
    continueGoogle: 'Continue with Google',
    orEmail: 'or with your email',
    consentBefore: `By continuing, with Google or with your email, you confirm that you are at least ${MIN_AGE} years old (or the minimum legal age to give consent in your country of residence, if higher) and you accept the `,
    terms: 'terms of use',
    consentMiddle: '. How we handle your data: ',
    privacy: 'privacy policy',
    storage:
      'If you sign in with email and password, you will confirm your email first. Your tasks, goals, projects, assessments and agenda are saved in your account, on Google Cloud servers in the European Union (Belgium).'
  }
);

// Lo que hace CLAR, en la página de presentación (los textos los aprobó la persona responsable; las funciones extra
// no se anuncian)
const FEATURES: { icon: React.ReactNode; title: string; text: string }[] = [
  { icon: <Compass className="h-5 w-5 text-indigo-600" aria-hidden="true" />, ...m.features.wheel },
  { icon: <Target className="h-5 w-5 text-indigo-600" aria-hidden="true" />, ...m.features.goals },
  { icon: <Briefcase className="h-5 w-5 text-indigo-600" aria-hidden="true" />, ...m.features.top10 },
  { icon: <CalendarDays className="h-5 w-5 text-indigo-600" aria-hidden="true" />, ...m.features.agenda },
  { icon: <Mic className="h-5 w-5 text-indigo-600" aria-hidden="true" />, ...m.features.dictate },
  { icon: <WifiOff className="h-5 w-5 text-indigo-600" aria-hidden="true" />, ...m.features.offline }
];

export const REPOSITORY_URL = 'https://github.com/Moldovan-Tech/clar-platform';

// PÁGINA DE PRESENTACIÓN: qué es CLAR y, al lado (debajo en el móvil), cómo entrar o crear una cuenta
export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onPasswordReset,
  isSigningIn,
  error,
  version
}) => {
  // «Crear cuenta gratis» abre el formulario en «Crear una cuenta»; «Ya tengo cuenta», en «Entrar» (se vuelve a montar)
  const [emailMode, setEmailMode] = useState<{ mode: EmailAuthMode; key: number }>({ mode: 'signin', key: 0 });
  const goToForm = (mode: EmailAuthMode) => {
    setEmailMode((current) => ({ mode, key: current.key + 1 }));
    requestAnimationFrame(() => {
      const target = document.getElementById(mode === 'signup' ? 'email-auth' : 'entrar');
      const reduceMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('a11y-reduce-motion');
      target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      target?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
    });
  };
  return (
    <AccessibleScreen>
      {(openAccessibility) => (
        <div className="min-h-screen bg-slate-50 antialiased">
          {/* El idioma, a la vista antes de nada */}
          <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
            <LanguageSelector />
          </div>
          <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_28rem] lg:items-start lg:gap-12 lg:py-14">
            {/* Qué es CLAR */}
            <section aria-labelledby="landing-title" className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BrandMark size={56} />
                  <h1 id="landing-title" className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                    <span className="tracking-[0.2em]">{BRAND_NAME}</span>
                    <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                      v{version}
                    </span>
                  </h1>
                </div>
                <p className="text-xl font-semibold text-slate-800 sm:text-2xl">{BRAND_TAGLINE}</p>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{m.intro}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => goToForm('signup')}
                    className="min-h-11 rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                  >
                    {m.signUp}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToForm('signin')}
                    className="min-h-11 rounded-2xl border-2 border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                  >
                    {m.haveAccount}
                  </button>
                </div>
              </div>

              <ul aria-label={m.featuresLabel} className="grid gap-3 sm:grid-cols-2">
                {FEATURES.map((feature) => (
                  <li
                    key={feature.title}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <span className="mt-0.5 shrink-0">{feature.icon}</span>
                    <div className="space-y-1">
                      <h2 className="text-sm font-bold text-slate-900">{feature.title}</h2>
                      <p className="text-xs leading-relaxed text-slate-600">{feature.text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Cloud className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  {m.yourData}
                </h2>
                <p>{m.dataStored}</p>
                <p>{m.install}</p>
                <p>
                  {m.openSource}{' '}
                  <a
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
                  >
                    {m.code}
                    <span className="sr-only"> {m.newTab}</span>
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* Entrar o crear una cuenta */}
            <div
              id="entrar"
              className="w-full space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl lg:sticky lg:top-8"
            >
              <h2 className="text-lg font-bold text-slate-900">{m.signInTitle}</h2>
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-50 disabled:opacity-60"
              >
                <GoogleIcon />
                <span>{isSigningIn ? m.openingGoogle : m.continueGoogle}</span>
              </button>
              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-slate-600" aria-hidden="true">
                <span className="h-px flex-1 bg-slate-200" />
                {m.orEmail}
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div id="email-auth">
                <EmailAuthForm
                  key={emailMode.key}
                  initialMode={emailMode.mode}
                  onSignIn={onEmailSignIn}
                  onSignUp={onEmailSignUp}
                  onReset={onPasswordReset}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {m.consentBefore}
                <LegalLink to="terms">{m.terms}</LegalLink>
                {m.consentMiddle}
                <LegalLink to="privacy">{m.privacy}</LegalLink>.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600">{m.storage}</p>
            </div>
          </main>

          <footer className="space-y-2 border-t border-slate-200 bg-white px-4 py-6 text-center">
            <AccessibilityTrigger onClick={openAccessibility} />
            <LegalLinks />
          </footer>
        </div>
      )}
    </AccessibleScreen>
  );
};
