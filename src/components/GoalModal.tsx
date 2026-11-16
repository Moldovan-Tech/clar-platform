import React, { useEffect, useRef, useState } from 'react';
import { Target, Trash2, X } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { Goal, WheelCategory } from '../types';
import { GOAL_TITLE_MAX, GOAL_WHY_MAX, validateGoal } from '../services/goals';
import { useAreas } from '../hooks/useAreas';
import { DateField } from './DateField';
import { DiscardChangesPrompt } from './DiscardChangesPrompt';
import { DictateButton, DictationUnderstood } from './DictateButton';
import { useDictatedDate } from '../hooks/useDictatedDate';
import { messages } from '../i18n/locale';

interface GoalModalProps {
  // Meta que se edita, o ninguna para crear una
  goal?: Goal;
  // Al crearla desde un área de «Metas», esa área ya elegida
  initialArea?: WheelCategory;
  onSave: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  // Proyectos de la meta: mientras tenga alguno, no se puede eliminar
  projectCount?: number;
  onClose: () => void;
}

const m = messages(
  {
    editGoal: 'Editar la meta',
    newGoal: 'Nueva meta',
    close: 'Cerrar',
    intro: 'Una meta concreta dentro de un área de tu Rueda. Vincúlale tareas para ver cómo avanza.',
    goal: 'Meta',
    titlePlaceholder: 'ej. Correr una media maratón',
    area: 'Área de la Rueda',
    chooseArea: 'Elige un área…',
    why: '¿Para qué?',
    optional: '(opcional)',
    whyPlaceholder: 'Lo que te importa de conseguirla',
    targetDate: 'Fecha objetivo',
    dictateGoal: 'Dictar la meta',
    dictateWhy: 'Dictar el para qué',
    understoodDate: (day: string) => `fecha objetivo: ${day}`,
    hasProjects: (n: number) =>
      `Tiene ${n === 1 ? 'un proyecto' : `${n} proyectos`}: para eliminarla, elimínalos o pásalos a otra meta antes.`,
    deleteNote: 'Sus tareas se quedan, sin meta.',
    deleteForGood: 'Eliminar definitivamente',
    keep: 'No eliminar',
    deleteGoal: 'Eliminar la meta',
    cancel: 'Cancelar',
    saveChanges: 'Guardar los cambios',
    createGoal: 'Crear la meta',
    discardEdit: 'Has cambiado esta meta y no has guardado los cambios.',
    discardNew: 'Has empezado una meta nueva y no la has guardado.'
  },
  {
    editGoal: 'Edit goal',
    newGoal: 'New goal',
    close: 'Close',
    intro: 'A concrete goal within an area of your Wheel. Link tasks to it to see how it’s going.',
    goal: 'Goal',
    titlePlaceholder: 'e.g. Run a half marathon',
    area: 'Wheel area',
    chooseArea: 'Choose an area…',
    why: 'Why?',
    optional: '(optional)',
    whyPlaceholder: 'What matters to you about achieving it',
    targetDate: 'Target date',
    dictateGoal: 'Dictate the goal',
    dictateWhy: 'Dictate the why',
    understoodDate: (day) => `target date: ${day}`,
    hasProjects: (n) =>
      n === 1
        ? 'It has a project: to delete the goal, delete the project or move it to another goal first.'
        : `It has ${n} projects: to delete the goal, delete them or move them to another goal first.`,
    deleteNote: 'Its tasks stay, without a goal.',
    deleteForGood: 'Delete permanently',
    keep: 'Don’t delete',
    deleteGoal: 'Delete goal',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    createGoal: 'Create goal',
    discardEdit: 'You’ve changed this goal and haven’t saved the changes.',
    discardNew: 'You’ve started a new goal and haven’t saved it.'
  }
);

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase';

// Crear o editar una meta: nombre, área de la Rueda, para qué y fecha objetivo. Se monta al abrirse.
export const GoalModal: React.FC<GoalModalProps> = ({
  goal,
  initialArea,
  onSave,
  onDelete,
  projectCount = 0,
  onClose
}) => {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [area, setArea] = useState<WheelCategory>(goal?.area ?? initialArea ?? '');
  const { selectable } = useAreas();
  const [why, setWhy] = useState(goal?.why ?? '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Al pedir confirmación, el foco pasa al botón que confirma (y el lector lee el aviso, que lo describe)
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirmDelete) confirmRef.current?.focus();
  }, [confirmDelete]);

  // Cambios sin guardar: frente a como se abrió (la ventana se monta al abrirse)
  const snapshot = JSON.stringify([title, area, why, targetDate]);
  const [openedSnapshot] = useState(snapshot);
  // Una fecha a medio escribir (o imposible) también es un cambio
  const [dateDraft, setDateDraft] = useState(false);
  const guard = useDiscardGuard(snapshot !== openedSnapshot || dateDraft, onClose);
  // Dictado: el nombre puede llevar la fecha («… antes del 1 de marzo»); el para qué, solo texto
  const dictated = useDictatedDate(setTitle, targetDate, setTargetDate, m.understoodDate);
  const [typedWhy, setTypedWhy] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(true, dialogRef, guard.requestClose);

  const error = validateGoal({ title, area: area || undefined, why, targetDate: targetDate || undefined });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (error || !area) return;
    const now = new Date().toISOString();
    onSave({
      id: goal?.id ?? `goal-${Date.now()}`,
      userId: goal?.userId ?? '',
      title: title.trim(),
      area,
      why: why.trim() || undefined,
      targetDate: targetDate || undefined,
      status: goal?.status ?? 'ACTIVE',
      createdAt: goal?.createdAt ?? now,
      updatedAt: now
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs sm:p-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-modal-title"
        className="animate-in fade-in zoom-in-95 my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-200"
      >
        <div
          inert={guard.confirming}
          className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4"
        >
          <h2 id="goal-modal-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Target className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            {goal ? m.editGoal : m.newGoal}
          </h2>
          <button
            type="button"
            onClick={guard.requestClose}
            aria-label={m.close}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Con la validación del navegador: una fecha imposible (p. ej. 31/02) bloquea el envío con su mensaje */}
        <form onSubmit={handleSubmit} inert={guard.confirming} className="space-y-4 p-6">
          <p className="text-xs leading-relaxed text-slate-600">{m.intro}</p>

          <div>
            <label htmlFor="goal-title" className={labelClass}>
              {m.goal} <span className="text-red-600">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <input
                id="goal-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  dictated.onTyped();
                }}
                maxLength={GOAL_TITLE_MAX}
                placeholder={m.titlePlaceholder}
                className={`${inputClass} min-w-0 flex-1`}
                data-autofocus
              />
              <DictateButton
                label={m.dictateGoal}
                value={title}
                onChange={setTitle}
                pause={guard.confirming}
                typed={dictated.typed}
                onFinal={dictated.onFinal}
              />
            </div>
            <DictationUnderstood summary={dictated.summary} onUndo={dictated.undo} />
          </div>

          <div>
            <label htmlFor="goal-area" className={labelClass}>
              {m.area} <span className="text-red-600">*</span>
            </label>
            <select
              id="goal-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">{m.chooseArea}</option>
              {selectable(area || undefined).map(({ id, label: name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="goal-why" className={labelClass}>
              {m.why} <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
            </label>
            <div className="flex flex-wrap items-start gap-1">
              <textarea
                id="goal-why"
                rows={2}
                value={why}
                onChange={(e) => {
                  setWhy(e.target.value);
                  setTypedWhy((n) => n + 1);
                }}
                maxLength={GOAL_WHY_MAX}
                placeholder={m.whyPlaceholder}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <DictateButton
                label={m.dictateWhy}
                value={why}
                onChange={setWhy}
                pause={guard.confirming}
                typed={typedWhy}
              />
            </div>
          </div>

          <div>
            <span className={labelClass}>
              {m.targetDate}{' '}
              <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
            </span>
            <DateField
              label={m.targetDate}
              value={targetDate}
              onChange={dictated.onDateChanged}
              onDraftChange={setDateDraft}
              inputClassName={inputClass}
            />
          </div>

          {submitted && error && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {goal && projectCount > 0 ? (
              <p className="max-w-xs text-[11px] text-slate-600">{m.hasProjects(projectCount)}</p>
            ) : goal ? (
              confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  <span id="goal-delete-note">{m.deleteNote}</span>
                  <button
                    ref={confirmRef}
                    aria-describedby="goal-delete-note"
                    type="button"
                    onClick={() => {
                      onDelete(goal);
                      onClose();
                    }}
                    className="rounded-lg bg-red-700 px-3 py-2 font-bold text-white hover:bg-red-800"
                  >
                    {m.deleteForGood}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-2 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    {m.keep}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {m.deleteGoal}
                </button>
              )
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={guard.requestClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {m.cancel}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
              >
                {goal ? m.saveChanges : m.createGoal}
              </button>
            </div>
          </div>
        </form>

        {guard.confirming && (
          <DiscardChangesPrompt
            text={goal ? m.discardEdit : m.discardNew}
            onKeepEditing={guard.keepEditing}
            onDiscard={guard.discard}
          />
        )}
      </div>
    </div>
  );
};
