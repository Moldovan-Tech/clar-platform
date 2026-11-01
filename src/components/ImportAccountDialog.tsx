import React, { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';
import { IMPORT_LABELS, IMPORT_ORDER, type ImportPlan } from '../services/importData';
import { LOCALE_TAG, messages } from '../i18n/locale';

interface ImportAccountDialogProps {
  plan: ImportPlan;
  onImport: (onProgress: (done: number, total: number) => void) => Promise<void>;
  onClose: () => void;
  // Se abre desde el menú de la cuenta, que ya no existe al cerrarse: adónde vuelve el foco
  returnFocusTo?: () => HTMLElement | null;
}

const formatExportedAt = (iso: string) =>
  new Date(iso).toLocaleString(LOCALE_TAG, { dateStyle: 'long', timeStyle: 'short' });

const m = messages(
  {
    importItems: (n: number) => `Importar ${n} ${n === 1 ? 'elemento' : 'elementos'}`,
    restoreAreas: 'Recuperar las áreas',
    addArea: 'Añadir el área',
    addAreas: 'Añadir las áreas',
    lostConnection:
      'Se perdió la conexión: la importación seguirá sola cuando vuelva y puedes cerrar esta ventana. Si cierras CLAR antes, importa otra vez el archivo para completar el resto: lo que ya entró no se repite.',
    stalled:
      'La importación no avanza: puede que no haya conexión. Seguirá sola cuando vuelva y puedes cerrar esta ventana. Si cierras CLAR antes, importa otra vez el archivo para completar el resto: lo que ya entró no se repite.',
    offline: 'Sin conexión no se puede importar. Vuelve a intentarlo cuando tengas conexión.',
    failed: 'No se pudo importar.',
    title: 'Importar datos',
    close: 'Cerrar',
    exportedAt: (date: string) => `Descarga del ${date}. `,
    summary:
      'Lo que ya está en tu cuenta no se toca y lo que no es válido se descarta: importar dos veces el mismo archivo no duplica nada.',
    caption: 'Qué hay en el archivo',
    type: 'Tipo',
    fresh: 'Nuevos',
    existing: 'Ya en tu cuenta',
    invalid: 'No válidos',
    empty: 'El archivo no tiene tareas, metas ni otros datos.',
    restored:
      'Tu Rueda aún tiene las áreas de partida: se recupera la del archivo, con sus nombres y sus áreas ocultas.',
    added: (labels: string, count: number) =>
      `Se añaden a tu Rueda ${count === 1 ? 'el área' : 'las áreas'} ${labels}.`,
    hidden: ' (oculta)',
    quote: (label: string) => `«${label}»`,
    nothingNew: 'Ya tienes en tu cuenta todo lo de este archivo.',
    retired:
      'Las reuniones y los correos se guardan en tu cuenta y van en tu descarga, pero la app ya no los muestra («Tiempo protegido» está ahora en la Ayuda como recomendaciones).',
    progress: (done: number, total: number) => `Importando… ${done} de ${total}`,
    progressLabel: 'Avance de la importación',
    cancel: 'Cancelar',
    importing: 'Importando…'
  },
  {
    importItems: (n) => `Import ${n} ${n === 1 ? 'item' : 'items'}`,
    restoreAreas: 'Restore the areas',
    addArea: 'Add the area',
    addAreas: 'Add the areas',
    lostConnection:
      "The connection was lost: the import will continue by itself when it's back, and you can close this window. If you close CLAR before that, import the file again to finish the rest: what's already in won't be repeated.",
    stalled:
      "The import isn't moving forward: you may be offline. It will continue by itself when the connection is back, and you can close this window. If you close CLAR before that, import the file again to finish the rest: what's already in won't be repeated.",
    offline: "You can't import while offline. Try again when you have a connection.",
    failed: "Couldn't import.",
    title: 'Import data',
    close: 'Close',
    exportedAt: (date) => `Downloaded on ${date}. `,
    summary:
      "What's already in your account isn't touched and anything invalid is discarded: importing the same file twice doesn't duplicate anything.",
    caption: "What's in the file",
    type: 'Type',
    fresh: 'New',
    existing: 'Already in your account',
    invalid: 'Invalid',
    empty: "The file doesn't have any tasks, goals or other data.",
    restored:
      "Your Wheel still has the starting areas: the file's Wheel is restored, with its names and its hidden areas.",
    added: (labels, count) => `${count === 1 ? 'This area is' : 'These areas are'} added to your Wheel: ${labels}.`,
    hidden: ' (hidden)',
    quote: (label) => `“${label}”`,
    nothingNew: 'Everything in this file is already in your account.',
    retired:
      'Meetings and emails are saved in your account and included in your download, but the app no longer shows them (“Protected time” is now tips in the Help).',
    progress: (done, total) => `Importing… ${done} of ${total}`,
    progressLabel: 'Import progress',
    cancel: 'Cancel',
    importing: 'Importing…'
  }
);

// Vista previa de la importación de «Descargar mis datos (JSON)»: qué entra, qué ya está y qué no es válido. Mientras
// importa no se puede cerrar (lo escrito se quedaría a medias sin aviso).
export const ImportAccountDialog: React.FC<ImportAccountDialogProps> = ({ plan, onImport, onClose, returnFocusTo }) => {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importing = progress !== null && error === null;
  // Falló una importación ya empezada (no un aviso antes de empezar, que deja volver a intentarlo)
  const failed = progress !== null && error !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalFocus(
    true,
    dialogRef,
    () => {
      if (!importing) onClose();
    },
    returnFocusTo
  );

  const rows = IMPORT_ORDER.filter((name) => {
    const { new: fresh, existing, invalid } = plan.counts[name];
    return fresh + existing + invalid > 0;
  });
  const hasWork = plan.total > 0 || plan.areas !== null;
  const importLabel =
    plan.total > 0
      ? m.importItems(plan.total)
      : plan.restoredAreas
        ? m.restoreAreas
        : plan.addedAreas.length === 1
          ? m.addArea
          : m.addAreas;

  // Sin conexión, las escrituras esperan a que vuelva y el avance se pararía sin decir nada: se explica y se puede
  // cerrar (lo ya enviado se guarda al volver la conexión)
  useEffect(() => {
    if (!importing) return;
    const onOffline = () => {
      setError(m.lostConnection);
      requestAnimationFrame(() => closeRef.current?.focus());
    };
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [importing]);

  // Si lleva un minuto sin avanzar (p. ej. el navegador cree que hay conexión y no la hay), se dice y se puede cerrar
  const STALL_MS = 60_000;
  const done = progress?.done;
  useEffect(() => {
    if (!importing) return;
    const timer = window.setTimeout(() => {
      setError(m.stalled);
      requestAnimationFrame(() => closeRef.current?.focus());
    }, STALL_MS);
    return () => window.clearTimeout(timer);
  }, [importing, done]);

  const handleImport = async () => {
    if (importing) return;
    if (!navigator.onLine) {
      setError(m.offline);
      return;
    }
    setError(null);
    setProgress({ done: 0, total: plan.total });
    try {
      await onImport((done, total) => setProgress({ done, total }));
    } catch (e) {
      setError(e instanceof Error ? e.message : m.failed);
      // El botón de importar ya no está: el foco pasa a «Cerrar»
      requestAnimationFrame(() => closeRef.current?.focus());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs sm:p-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-account-title"
        aria-describedby="import-account-summary"
        className="animate-in fade-in zoom-in-95 my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl duration-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
          <h2 id="import-account-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Upload className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            {m.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            aria-label={m.close}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p id="import-account-summary" className="text-xs leading-relaxed text-slate-600">
            {plan.exportedAt ? m.exportedAt(formatExportedAt(plan.exportedAt)) : ''}
            {m.summary}
          </p>

          {rows.length > 0 ? (
            <table className="w-full text-left text-xs">
              <caption className="sr-only">{m.caption}</caption>
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-600">
                  <th scope="col" className="py-1.5 pr-2 font-semibold">
                    {m.type}
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                    {m.fresh}
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                    {m.existing}
                  </th>
                  <th scope="col" className="py-1.5 pl-2 text-right font-semibold">
                    {m.invalid}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((name) => {
                  const { new: fresh, existing, invalid } = plan.counts[name];
                  return (
                    <tr key={name} className="border-b border-slate-100 text-slate-800">
                      <th scope="row" className="py-1.5 pr-2 font-medium">
                        {IMPORT_LABELS[name]}
                      </th>
                      <td className="px-2 py-1.5 text-right font-bold">{fresh}</td>
                      <td className="px-2 py-1.5 text-right">{existing}</td>
                      <td className={`py-1.5 pl-2 text-right ${invalid ? 'font-semibold text-red-700' : ''}`}>
                        {invalid}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-600">{m.empty}</p>
          )}

          {plan.restoredAreas && <p className="text-xs text-slate-700">{m.restored}</p>}
          {!plan.restoredAreas && plan.addedAreas.length > 0 && (
            <p className="text-xs text-slate-700">
              {m.added(
                plan.addedAreas.map((a) => `${m.quote(a.label)}${a.hidden ? m.hidden : ''}`).join(', '),
                plan.addedAreas.length
              )}
            </p>
          )}
          {!hasWork && rows.length > 0 && <p className="text-xs font-medium text-slate-700">{m.nothingNew}</p>}
          {rows.some((name) => name === 'meetings' || name === 'emails') && (
            <p className="text-xs text-slate-600">{m.retired}</p>
          )}

          {progress && !error && (
            <div className="space-y-1">
              <p role="status" className="text-xs font-medium text-slate-700">
                {m.progress(progress.done, progress.total)}
              </p>
              <progress
                value={progress.done}
                max={Math.max(progress.total, 1)}
                aria-label={m.progressLabel}
                className="h-2 w-full overflow-hidden rounded-full accent-indigo-600"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              disabled={importing}
              data-autofocus={!hasWork || error ? true : undefined}
              className="min-h-11 rounded-xl px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              {failed || !hasWork ? m.close : m.cancel}
            </button>
            {hasWork && !failed && (
              <button
                type="button"
                onClick={handleImport}
                // Sin `disabled`, para que no pierda el foco mientras importa
                aria-disabled={importing}
                data-autofocus
                className="min-h-11 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs hover:bg-slate-800 aria-disabled:opacity-60"
              >
                {importing ? m.importing : importLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
