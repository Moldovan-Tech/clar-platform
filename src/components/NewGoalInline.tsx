import React, { useEffect, useRef, useState } from 'react';
import { GOAL_TITLE_MAX, validateGoal } from '../services/goals';
import { useAreas } from '../hooks/useAreas';
import { messages } from '../i18n/locale';
import { DictateButton } from './DictateButton';

const m = messages(
  {
    newGoal: 'Nueva meta',
    name: 'Nombre de la nueva meta',
    placeholder: 'ej. Correr una media maratón',
    area: 'Área de la nueva meta',
    create: 'Crear la meta',
    cancel: 'Cancelar',
    dictate: 'Dictar la nueva meta',
    note: 'Se guarda al crearla, aunque luego no guardes la tarea. El para qué y la fecha objetivo los puedes añadir en «Metas».'
  },
  {
    newGoal: 'New goal',
    name: 'Name of the new goal',
    placeholder: 'e.g. Run a half marathon',
    area: 'Area of the new goal',
    create: 'Create goal',
    cancel: 'Cancel',
    dictate: 'Dictate the new goal',
    note: 'It’s saved when you create it, even if you don’t save the task. You can add the why and the target date in “Goals”.'
  }
);

// Crear una meta sin salir del formulario de la tarea: nombre y área (lo demás se completa luego en «Metas»). Enter
// en el nombre o en el área la crea (no guarda la tarea) y Escape cierra solo esta parte, no el formulario.
export const NewGoalInline: React.FC<{
  defaultArea?: string;
  onCreate: (goal: { title: string; area: string }) => void;
  onCancel: () => void;
}> = ({ defaultArea, onCreate, onCancel }) => {
  const { visible, selectable } = useAreas();
  const [title, setTitle] = useState('');
  // El área de la tarea, si está a la vista (una meta nueva no va a un área oculta); si no, la primera
  const [area, setArea] = useState(visible.some((a) => a.id === defaultArea) ? defaultArea! : (visible[0]?.id ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const create = () => {
    const problem = validateGoal({ title, area });
    if (problem) return setError(problem);
    onCreate({ title: title.trim(), area });
  };
  const keys = useRef({ create, cancel: onCancel });
  useEffect(() => {
    keys.current = { create, cancel: onCancel };
  });
  useEffect(() => {
    titleRef.current?.focus();
    // Las teclas ya gestionadas aquí no llegan a la ventana ni al formulario de la tarea
    const group = groupRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        keys.current.cancel();
      } else if (e.key === 'Enter' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        keys.current.create();
      }
    };
    group?.addEventListener('keydown', onKeyDown);
    return () => group?.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      ref={groupRef}
      role="group"
      aria-labelledby="task-new-goal-heading"
      className="mt-2 space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3"
    >
      <p id="task-new-goal-heading" className="text-xs font-bold text-slate-800">
        {m.newGoal}
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-center gap-1">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
              setTyped((n) => n + 1);
            }}
            maxLength={GOAL_TITLE_MAX}
            aria-label={m.name}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'task-new-goal-error' : undefined}
            placeholder={m.placeholder}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <DictateButton
            label={m.dictate}
            value={title}
            onChange={(value) => {
              setTitle(value);
              setError(null);
            }}
            typed={typed}
          />
        </div>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          aria-label={m.area}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        >
          {selectable(area || undefined).map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p id="task-new-goal-error" role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={create}
          className="min-h-11 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
        >
          {m.create}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          {m.cancel}
        </button>
      </div>
      <p className="text-[11px] text-slate-600">{m.note}</p>
    </div>
  );
};
