import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, CalendarDays, Compass, FolderKanban, ListChecks, Target } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';
import type { OnboardingOutcome } from '../services/onboarding';
import { BRAND_NAME, BrandMark } from './BrandMark';
import { messages } from '../i18n/locale';

interface WelcomeDialogProps {
  // completed: llegó al final · skipped: la cerró antes (con «Saltar» o Escape)
  onFinish: (outcome: OnboardingOutcome) => void;
}

// El método de un vistazo: de lo que te importa (áreas) a lo que haces hoy (Top 10 y Agenda).
// Los proyectos son opcionales: una forma de agrupar tareas relacionadas de una meta
type Item = { title: string; text: string };

const m = messages<{
  model: Item[];
  routine: Item[];
  steps: string[];
  headings: string[];
  stepOf: (n: number, total: number, name: string) => string;
  intro: React.ReactNode;
  points: string[];
  modelLabel: string;
  skip: string;
  back: string;
  startTour: string;
  next: string;
}>(
  {
    model: [
      { title: 'Áreas de vida', text: 'Tu Rueda: salud, trabajo, finanzas, familia…' },
      { title: 'Metas', text: 'Lo que quieres conseguir en cada área, empezando por las más bajas.' },
      {
        title: 'Proyectos (opcional)',
        text: 'Si una meta, o una parte de ella, necesita varias tareas relacionadas, agrúpalas en un proyecto con fecha de fin. Una meta puede tener uno o varios.'
      },
      { title: 'Tareas', text: 'Acciones físicas concretas para cada meta, en Profesional o Personal.' },
      { title: 'Top 10 y Agenda', text: 'Qué hacer hoy y cuándo, con alarmas antes del plazo.' }
    ],
    routine: [
      { title: 'Evalúa tu Rueda', text: 'Puntúa cada área del 0 al 10. Te lleva dos minutos.' },
      {
        title: 'Convierte una meta en acciones',
        text: 'En «Metas», elige el área que más quieres mejorar, ponle una meta y añádele la primera acción física: «Llamar…», «Enviar…».'
      },
      {
        title: 'Protege tu tiempo',
        text: 'Cada día, el Top 10 te dice qué toca. Reserva las mañanas sin reuniones para hacerlo: en la Ayuda tienes más recomendaciones.'
      }
    ],
    steps: ['Por qué', 'El método', 'Cómo empezar'],
    headings: [`Te damos la bienvenida a ${BRAND_NAME}`, 'Así funciona', 'Tu rutina en tres pasos'],
    stepOf: (n, total, name) => `Paso ${n} de ${total}: ${name}`,
    intro: (
      <>
        {BRAND_NAME} te ayuda a decidir <strong>qué hacer ahora</strong>, en línea con lo que de verdad te importa.
      </>
    ),
    points: [
      'Sacas las tareas de tu cabeza y las conviertes en acciones claras.',
      'Cada día ves solo lo importante: tu Top 10.',
      'Cuidas todas las áreas de tu vida, no solo el trabajo, con metas concretas.'
    ],
    modelLabel: 'De tus áreas de vida a lo que haces hoy',
    skip: 'Saltar',
    back: 'Atrás',
    startTour: 'Empezar el recorrido',
    next: 'Siguiente'
  },
  {
    model: [
      { title: 'Life areas', text: 'Your Wheel: health, work, finances, family…' },
      { title: 'Goals', text: 'What you want to achieve in each area, starting with the lowest ones.' },
      {
        title: 'Projects (optional)',
        text: 'If a goal, or part of one, needs several related tasks, group them into a project with an end date. A goal can have one or more.'
      },
      { title: 'Tasks', text: 'Concrete physical actions for each goal, in Work or Personal.' },
      { title: 'Top 10 and Agenda', text: 'What to do today and when, with alarms before the deadline.' }
    ],
    routine: [
      { title: 'Assess your Wheel', text: 'Score each area from 0 to 10. It takes two minutes.' },
      {
        title: 'Turn a goal into actions',
        text: 'In “Goals”, choose the area you most want to improve, set a goal and add its first physical action: “Call…”, “Send…”.'
      },
      {
        title: 'Protect your time',
        text: 'Each day, the Top 10 tells you what’s next. Keep your mornings free of meetings to do it: Help has more tips.'
      }
    ],
    steps: ['Why', 'The method', 'How to start'],
    headings: [`Welcome to ${BRAND_NAME}`, 'How it works', 'Your routine in three steps'],
    stepOf: (n, total, name) => `Step ${n} of ${total}: ${name}`,
    intro: (
      <>
        {BRAND_NAME} helps you decide <strong>what to do now</strong>, in line with what really matters to you.
      </>
    ),
    points: [
      'You get tasks out of your head and turn them into clear actions.',
      'Each day you see only what matters: your Top 10.',
      'You look after every area of your life, not just work, with concrete goals.'
    ],
    modelLabel: 'From your life areas to what you do today',
    skip: 'Skip',
    back: 'Back',
    startTour: 'Start the tour',
    next: 'Next'
  }
);

// Iconos de cada paso del modelo, en el orden del catálogo
const MODEL_ICONS = [Compass, Target, FolderKanban, ListChecks, CalendarDays];
const MODEL = m.model.map((item, index) => ({ ...item, icon: MODEL_ICONS[index] }));
const ROUTINE = m.routine;
const STEPS = m.steps;

// Bienvenida de la primera vez, en tres pantallas. Se puede saltar en cualquier momento.
export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ onFinish }) => {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isLast = step === STEPS.length - 1;
  useModalFocus(true, dialogRef, () => onFinish('skipped'));

  // Al cambiar de pantalla, el foco va a su título: el lector de pantalla la lee desde el principio
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const headings = m.headings;

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-xs sm:p-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-step"
        className="animate-in fade-in zoom-in-95 my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl duration-200"
      >
        <div className="space-y-5 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <BrandMark size={36} />
            <p id="welcome-step" className="text-xs font-semibold text-slate-600">
              {m.stepOf(step + 1, STEPS.length, STEPS[step])}
            </p>
          </div>

          <h2
            id="welcome-title"
            ref={headingRef}
            tabIndex={-1}
            data-autofocus
            className="text-xl font-extrabold text-slate-900 focus:outline-none"
          >
            {headings[step]}
          </h2>

          {step === 0 && (
            <div className="space-y-3 text-sm leading-relaxed text-slate-700">
              <p>{m.intro}</p>
              <ul className="list-disc space-y-1.5 pl-5">
                {m.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {step === 1 && (
            // Diagrama del modelo: una lista ordenada, legible también con lector de pantalla
            <ol aria-label={m.modelLabel} className="space-y-1">
              {MODEL.map(({ icon: Icon, title, text }, index) => (
                <li key={title}>
                  <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-600">{text}</p>
                    </div>
                  </div>
                  {index < MODEL.length - 1 && (
                    <ArrowDown className="mx-auto my-0.5 h-4 w-4 text-indigo-400" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          )}

          {step === 2 && (
            <ol className="space-y-3">
              {ROUTINE.map(({ title, text }, index) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="text-xs leading-relaxed text-slate-600">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
            {STEPS.map((name, index) => (
              <span
                key={name}
                className={`h-1.5 rounded-full transition-all ${index === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => onFinish('skipped')}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {m.skip}
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {m.back}
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? onFinish('completed') : setStep((s) => s + 1))}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800"
              >
                {isLast ? m.startTour : m.next}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
