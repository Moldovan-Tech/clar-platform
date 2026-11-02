import { useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  accountLanguageSync,
  clearPendingLocale,
  hasPendingLocale,
  LINKED,
  LOCALE,
  setLocale,
  storedLocale
} from '../i18n/locale';
import { saveLanguage } from '../services/repository';

// El idioma de la cuenta (users/{uid}.language), al abrir la app con el perfil ya confirmado por el servidor, una vez
// (ver accountLanguageSync). Un cambio desde otro dispositivo no recarga esta app mientras se usa.
export const useAccountLanguage = (db: Firestore, uid: string, language: unknown, fromServer: boolean) => {
  // Cuándo se abrió la app, ya con la sesión iniciada: el tiempo en la página de entrada no cuenta, así un navegador
  // nuevo también se abre en el idioma de la cuenta
  const [openedAt] = useState(Date.now);
  const checked = useRef(false);
  useEffect(() => {
    if (!fromServer || checked.current) return;
    checked.current = true;
    const sync = accountLanguageSync({
      pending: hasPendingLocale(),
      stored: storedLocale(),
      account: language,
      page: LOCALE,
      sinceOpenMs: Date.now() - openedAt
    });
    if (sync.action === 'save')
      saveLanguage(db, uid, sync.language)
        .then(clearPendingLocale)
        .catch((e) => console.warn('Could not save the language:', e));
    // Si se abrió con un enlace ?lang=, esta visita se queda en el del enlace; la siguiente, en el de la cuenta
    else if (sync.action === 'adopt') setLocale(sync.language, { pending: false, reload: sync.reload && !LINKED });
  }, [db, uid, language, fromServer, openedAt]);
};
