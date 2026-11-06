import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPublishedBuild, isNewBuild, loadedBuild, PublishedBuild } from '../services/appUpdate';

// Cada cuánto mira una ventana abierta si hay versión nueva, y lo mínimo entre dos miradas al volver a ella o al
// recuperar la conexión (así cambiar de ventana a menudo no hace una petición cada vez)
const CHECK_EVERY_MS = 30 * 60_000;
const MIN_GAP_MS = 5 * 60_000;

export type UpdateCheck = 'new' | 'current' | 'failed';

// Avisa de una versión nueva de CLAR con la ventana abierta (src/services/appUpdate.ts). `checkNow` es la comprobación
// a mano («Tu cuenta»); `dismiss` («Más tarde») oculta el aviso de esa versión: vuelve a salir si se publica otra
export const useAppUpdate = () => {
  // El trozo con el que se cargó la página: no cambia mientras esté abierta
  const [current] = useState(loadedBuild);
  const [available, setAvailable] = useState<PublishedBuild | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  // La página recién cargada ya es la publicada: cuenta como mirada (se fija al montar)
  const lastCheck = useRef(0);

  const check = useCallback(async (): Promise<UpdateCheck> => {
    const previous = lastCheck.current;
    lastCheck.current = Date.now();
    const published = await fetchPublishedBuild();
    // Sin respuesta no cuenta como mirada: al recuperar la conexión se vuelve a mirar
    if (!published) {
      lastCheck.current = previous;
      return 'failed';
    }
    // Si se retira la versión nueva (se vuelve a publicar esta), el aviso se va
    if (!isNewBuild(published, current)) {
      setAvailable(null);
      return 'current';
    }
    setAvailable(published);
    return 'new';
  }, [current]);

  useEffect(() => {
    if (!lastCheck.current) lastCheck.current = Date.now();
    const checkIfDue = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck.current >= MIN_GAP_MS) void check();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, CHECK_EVERY_MS);
    // Al volver a la ventana: en el ordenador (también la app instalada), cambiar de ventana no siempre la oculta
    document.addEventListener('visibilitychange', checkIfDue);
    window.addEventListener('focus', checkIfDue);
    window.addEventListener('online', checkIfDue);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkIfDue);
      window.removeEventListener('focus', checkIfDue);
      window.removeEventListener('online', checkIfDue);
    };
  }, [check]);

  const dismiss = useCallback(() => setDismissed(available?.build ?? null), [available]);
  // La comprobación a mano vuelve a mostrar el aviso aunque se hubiera pulsado «Más tarde»
  const checkNow = useCallback(async () => {
    const result = await check();
    if (result === 'new') setDismissed(null);
    return result;
  }, [check]);

  return {
    available,
    showBanner: Boolean(available && available.build !== dismissed),
    dismiss,
    checkNow
  };
};
