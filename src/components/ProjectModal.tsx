import React, { useEffect, useRef, useState } from 'react';
import { FolderKanban, Trash2, X } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { Goal, Project } from '../types';
import { PROJECT_DESCRIPTION_MAX, PROJECT_TITLE_MAX, validateProject } from '../services/projects';
import { areasInUse } from '../services/wheel';
import { useAreas } from '../hooks/useAreas';
import { DateField } from './DateField';
import { DiscardChangesPrompt } from './DiscardChangesPrompt';
import { DictateButton, DictationUnderstood } from './DictateButton';
import { useDictatedDate } from '../hooks/useDictatedDate';
import { messages } from '../i18n/locale';

interface ProjectModalProps {
  // Proyecto que se edita, o ninguno para crear uno
  project?: Project;
  // Al crearlo desde una meta, esa meta ya elegida
  initialGoalId?: string;
  goals: Goal[];
  onSave: (project: Project) => void;
  onDelete: (project: Project) => void;
  onClose: () => void;
}

const m = messages(
  {
    editProject: 'Editar el proyecto',
    newProject: 'Nuevo proyecto',
    close: 'Cerrar',
    intro: 'Un conjunto de tareas con fecha de fin para avanzar en una meta. Su avance se ve como una batería.',
    project: 'Proyecto',
    titlePlaceholder: 'ej. Reformar la cocina',
    goal: 'Meta',
    chooseGoal: 'Elige una meta…',
    noGoal: '(Meta no disponible)',
    achieved: ' (lograda)',
    archived: ' (archivada)',
    goalNote: 'Sus tareas contarán en el avance de esa meta.',
    endDate: 'Fecha de fin',
    dictateProject: 'Dictar el proyecto',
    dictateDescription: 'Dictar la descripción',
    understoodDate: (day: string) => `fecha de fin: ${day}`,
    description: 'Descripción',
    optional: '(opcional)',
    descriptionPlaceholder: 'Qué tiene que quedar hecho al terminar',
    deleteNote: 'Sus tareas se quedan en la meta, sin proyecto.',
    deleteForGood: 'Eliminar definitivamente',
    keep: 'No eliminar',
    deleteProject: 'Eliminar el proyecto',
    cancel: 'Cancelar',
    saveChanges: 'Guardar los cambios',
    createProject: 'Crear el proyecto',
    discardEdit: 'Has cambiado este proyecto y no has guardado los cambios.',
    discardNew: 'Has empezado un proyecto nuevo y no lo has guardado.'
  },
  {
    editProject: 'Edit project',
    newProject: 'New project',
    close: 'Close',
    intro: 'A set of tasks with an end date to move a goal forward. Its progress shows as a battery.',
    project: 'Project',
    titlePlaceholder: 'e.g. Redo the kitchen',
    goal: 'Goal',
    chooseGoal: 'Choose a goal…',
    noGoal: '(Goal not available)',
    achieved: ' (achieved)',
    archived: ' (archived)',
    goalNote: 'Its tasks will count toward that goal’s progress.',
    endDate: 'End date',
    dictateProject: 'Dictate the project',
    dictateDescription: 'Dictate the description',
    understoodDate: (day) => `end date: ${day}`,
    description: 'Description',
    optional: '(optional)',
    descriptionPlaceholder: 'What has to be done when it ends',
    deleteNote: 'Its tasks stay in the goal, without a project.',
    deleteForGood: 'Delete permanently',
    keep: 'Don’t delete',
    deleteProject: 'Delete project',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    createProject: 'Create project',
    discardEdit: 'You’ve changed this project and haven’t saved the changes.',
    discardNew: 'You’ve started a new project and haven’t saved it.'
  }
);

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-bold tracking-wider text-slate-600 uppercase';

// Crear o editar un proyecto: nombre, meta, fecha de fin y descripción. Se monta al abrirse.
export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  initialGoalId,
  goals,
  onSave,
  onDelete,
  onClose
}) => {
  const [title, setTitle] = useState(project?.title ?? '');
  const [goalId, setGoalId] = useState(project?.goalId ?? initialGoalId ?? '');
  const [endDate, setEndDate] = useState(project?.endDate ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirmDelete) confirmRef.current?.focus();
  }, [confirmDelete]);

  // Cambios sin guardar: frente a como se abrió
  const snapshot = JSON.stringify([title, goalId, endDate, description]);
  const [openedSnapshot] = useState(snapshot);
  // Una fecha a medio escribir (o imposible) también es un cambio
  const [dateDraft, setDateDraft] = useState(false);
  const guard = useDiscardGuard(snapshot !== openedSnapshot || dateDraft, onClose);
  // Dictado: el nombre puede llevar la fecha de fin («… antes del 30 de junio»); la descripción, solo texto
  const dictated = useDictatedDate(setTitle, endDate, setEndDate, m.understoodDate);
  const [typedDescription, setTypedDescription] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(true, dialogRef, guard.requestClose);

  // Metas que se pueden elegir: las activas, y la ya elegida aunque esté lograda o archivada
  const goalOptions = goals.filter((g) => g.status === 'ACTIVE' || g.id === goalId);
  const { areas, label } = useAreas();
  const error = validateProject({ title, goalId, endDate, description });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (error) return;
    const now = new Date().toISOString();
    onSave({
      id: project?.id ?? `project-${Date.now()}`,
      userId: project?.userId ?? '',
      title: title.trim(),
      goalId,
      endDate,
      description: description.trim() || undefined,
      status: project?.status ?? 'ACTIVE',
      createdAt: project?.createdAt ?? now,
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
        aria-labelledby="project-modal-title"
        className="animate-in fade-in zoom-in-95 my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-200"
      >
        <div
          inert={guard.confirming}
          className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4"
        >
          <h2 id="project-modal-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FolderKanban className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            {project ? m.editProject : m.newProject}
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
            <label htmlFor="project-title" className={labelClass}>
              {m.project} <span className="text-red-600">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <input
                id="project-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  dictated.onTyped();
                }}
                maxLength={PROJECT_TITLE_MAX}
                placeholder={m.titlePlaceholder}
                className={`${inputClass} min-w-0 flex-1`}
                data-autofocus
              />
              <DictateButton
                label={m.dictateProject}
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
            <label htmlFor="project-goal" className={labelClass}>
              {m.goal} <span className="text-red-600">*</span>
            </label>
            <select
              id="project-goal"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">{m.chooseGoal}</option>
              {goalId && !goals.some((g) => g.id === goalId) && <option value={goalId}>{m.noGoal}</option>}
              {areasInUse(
                areas,
                goalOptions.map((g) => g.area)
              ).map((area) => (
                <optgroup key={area} label={label(area)}>
                  {goalOptions
                    .filter((g) => g.area === area)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                        {g.status === 'ACHIEVED' ? m.achieved : g.status === 'ARCHIVED' ? m.archived : ''}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">{m.goalNote}</p>
          </div>

          <div>
            <span className={labelClass}>
              {m.endDate} <span className="text-red-600">*</span>
            </span>
            <DateField
              label={m.endDate}
              value={endDate}
              onChange={dictated.onDateChanged}
              onDraftChange={setDateDraft}
              inputClassName={inputClass}
            />
          </div>

          <div>
            <label htmlFor="project-description" className={labelClass}>
              {m.description}{' '}
              <span className="font-normal tracking-normal text-slate-500 normal-case">{m.optional}</span>
            </label>
            <div className="flex flex-wrap items-start gap-1">
              <textarea
                id="project-description"
                rows={2}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setTypedDescription((n) => n + 1);
                }}
                maxLength={PROJECT_DESCRIPTION_MAX}
                placeholder={m.descriptionPlaceholder}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <DictateButton
                label={m.dictateDescription}
                value={description}
                onChange={setDescription}
                pause={guard.confirming}
                typed={typedDescription}
              />
            </div>
          </div>

          {submitted && error && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {project ? (
              confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  <span id="project-delete-note">{m.deleteNote}</span>
                  <button
                    ref={confirmRef}
                    aria-describedby="project-delete-note"
                    type="button"
                    onClick={() => {
                      onDelete(project);
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
                  {m.deleteProject}
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
                {project ? m.saveChanges : m.createProject}
              </button>
            </div>
          </div>
        </form>

        {guard.confirming && (
          <DiscardChangesPrompt
            text={project ? m.discardEdit : m.discardNew}
            onKeepEditing={guard.keepEditing}
            onDiscard={guard.discard}
          />
        )}
      </div>
    </div>
  );
};
