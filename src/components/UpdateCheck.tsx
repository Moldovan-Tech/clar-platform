import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { UpdateCheck as UpdateCheckResult } from '../hooks/useAppUpdate';
import { messages } from '../i18n/locale';

const m = messages(
  {
    installed: (version: string) => `Usas la versión ${version}.`,
    checkUpdates: 'Buscar actualizaciones',
    checking: 'Buscando…',
    upToDate: 'Tienes la última versión.',
    updateAvailable: 'Hay una versión nueva.',
    updateNow: 'Actualizar ahora',
    checkFailed: 'No se pudo comprobar. Revisa la conexión y vuelve a intentarlo.'
  },
  {
    installed: (version) => `You're using version ${version}.`,
    checkUpdates: 'Check for updates',
    checking: 'Checking…',
    upToDate: 'You have the latest version.',
    updateAvailable: 'A new version is available.',
    updateNow: 'Update now',
    checkFailed: "Couldn't check for updates. Make sure you're online and try again."
  }
);

// En «Tu cuenta» (ajustes): la versión que se usa y el botón para buscar una nueva (useAppUpdate). Es siempre el mismo
// botón (así no se pierde el foco): con versión nueva pasa a «Actualizar ahora», que vuelve a cargar la app, como el
// aviso. El resultado se anuncia por una región viva que está siempre en la página
export const UpdateCheck: React.FC<{ onCheck: () => Promise<UpdateCheckResult>; onUpdate: () => void }> = ({
  onCheck,
  onUpdate
}) => {
  const [state, setState] = useState<'idle' | 'checking' | 'updating' | UpdateCheckResult>('idle');
  const result =
    state === 'new' ? m.updateAvailable : state === 'current' ? m.upToDate : state === 'failed' ? m.checkFailed : '';
  const update = state === 'new' || state === 'updating';
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-slate-200 px-4 py-2">
      <span className="text-xs font-bold text-slate-700">{m.installed(__APP_VERSION__)}</span>
      <button
        type="button"
        // aria-disabled y no disabled: un botón desactivado pierde el foco mientras busca
        aria-disabled={state === 'checking' || state === 'updating'}
        onClick={async () => {
          if (state === 'checking' || state === 'updating') return;
          if (update) {
            setState('updating');
            onUpdate();
            return;
          }
          setState('checking');
          setState(await onCheck());
        }}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs aria-disabled:opacity-70 ${
          update
            ? 'bg-slate-900 font-bold text-white hover:bg-slate-800'
            : 'border border-slate-300 bg-white font-semibold text-slate-800 hover:bg-slate-50'
        }`}
      >
        <RefreshCw className={`h-4 w-4 ${state === 'checking' ? 'animate-spin' : ''}`} aria-hidden="true" />
        {update ? m.updateNow : state === 'checking' ? m.checking : m.checkUpdates}
      </button>
      <p role="status" aria-live="polite" className="basis-full text-xs text-slate-600">
        {result}
      </p>
    </div>
  );
};
