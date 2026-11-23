import React from 'react';
import { TaskStatus } from '../types';
import { TASK_STATUSES } from '../services/tasks';
import { messages } from '../i18n/locale';

const m = messages(
  { statusOf: (title: string) => `Estado de «${title}»`, blocked: ' (bloqueada)' },
  { statusOf: (title) => `Status of “${title}”`, blocked: ' (blocked)' }
);

interface TaskStatusSelectProps {
  status: TaskStatus;
  taskTitle: string;
  onChange: (status: TaskStatus) => void;
  size?: 'sm' | 'xs';
  // Espera a otra tarea: hasta que esa termine, no se puede marcar como hecha ni en progreso
  blocked?: boolean;
  // Id del texto que explica el campo (aria-describedby)
  describedBy?: string;
  className?: string;
}

const NEEDS_UNBLOCKED: TaskStatus[] = ['DONE', 'IN_PROGRESS'];

// Estado manual; elegir "Hecha" archiva la tarea y cualquier otro estado la reactiva
export const TaskStatusSelect: React.FC<TaskStatusSelectProps> = ({
  status,
  taskTitle,
  onChange,
  size = 'sm',
  blocked = false,
  describedBy,
  className = ''
}) => {
  const current = TASK_STATUSES.find((s) => s.value === status) ?? TASK_STATUSES[0];
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      aria-label={m.statusOf(taskTitle)}
      aria-describedby={describedBy}
      className={`cursor-pointer rounded-lg border font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none ${current.className} ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
      } ${className}`}
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value} disabled={blocked && NEEDS_UNBLOCKED.includes(s.value)}>
          {s.label}
          {blocked && NEEDS_UNBLOCKED.includes(s.value) ? m.blocked : ''}
        </option>
      ))}
    </select>
  );
};
