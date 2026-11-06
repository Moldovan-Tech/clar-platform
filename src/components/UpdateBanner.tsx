import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { messages } from '../i18n/locale';

interface UpdateBannerProps {
  onUpdate: () => void;
  onLater: () => void;
}

const m = messages(
  {
    label: 'Versión nueva de CLAR',
    text: 'Hay una versión nueva de CLAR.',
    update: 'Actualizar',
    updating: 'Actualizando…',
    later: 'Más tarde'
  },
  {
    label: 'New version of CLAR',
    text: 'A new version of CLAR is available.',
    update: 'Update',
    updating: 'Updating…',
    later: 'Later'
  }
);

// Aviso de versión nueva (useAppUpdate). No recarga solo, para no perder lo que se esté escribiendo: «Actualizar»
// vuelve a cargar la app y «Más tarde» lo oculta. En el móvil va justo debajo de la cabecera, sin taparla (abajo están
// la barra y el aviso de siempre); desde 768 px, abajo a la izquierda (debajo de la cabecera está «Nueva tarea»), y
// hasta 1024 px más arriba, para no pisar el aviso de siempre (abajo a la derecha). Se anuncia por la región viva que lo
// envuelve (App)
export const UpdateBanner: React.FC<UpdateBannerProps> = ({ onUpdate, onLater }) => {
  const [updating, setUpdating] = useState(false);
  return (
    <section
      aria-label={m.label}
      className="animate-in fade-in fixed top-[calc(4.25rem+env(safe-area-inset-top))] right-[calc(0.75rem+env(safe-area-inset-right))] left-[calc(0.75rem+env(safe-area-inset-left))] z-30 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs text-white shadow-xl duration-200 md:top-auto md:right-auto md:bottom-24 md:left-6 md:max-w-sm lg:bottom-6"
    >
      <RefreshCw className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
      <p className="min-w-0 flex-1 font-semibold">{m.text}</p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onLater}
          disabled={updating}
          className="min-h-11 rounded-lg px-3 font-semibold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {m.later}
        </button>
        <button
          type="button"
          onClick={() => {
            setUpdating(true);
            onUpdate();
          }}
          disabled={updating}
          className="min-h-11 rounded-lg bg-indigo-500 px-3 font-bold text-white hover:bg-indigo-400 disabled:opacity-70"
        >
          {updating ? m.updating : m.update}
        </button>
      </div>
    </section>
  );
};
