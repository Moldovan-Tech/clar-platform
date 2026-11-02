import { messages } from '../i18n/locale';

// Textos legales: páginas públicas que se ven sin iniciar sesión (Root.tsx elige la página por la ruta)

export type LegalPageId = 'privacy' | 'terms' | 'notice';

const m = messages(
  { privacy: 'Política de privacidad', terms: 'Condiciones de uso', notice: 'Aviso legal' },
  { privacy: 'Privacy policy', terms: 'Terms of use', notice: 'Legal notice' }
);

// Las rutas son las mismas en los dos idiomas
export const LEGAL_PAGES: { id: LegalPageId; path: string; title: string }[] = [
  { id: 'privacy', path: '/privacidad', title: m.privacy },
  { id: 'terms', path: '/condiciones', title: m.terms },
  { id: 'notice', path: '/aviso-legal', title: m.notice }
];

// La página legal de una ruta («/privacidad», también con barra final o mayúsculas), o undefined
export const legalPageFor = (pathname: string) => {
  const path = pathname.replace(/\/+$/, '').toLowerCase();
  return LEGAL_PAGES.find((page) => page.path === path);
};

export const legalPath = (id: LegalPageId) => LEGAL_PAGES.find((page) => page.id === id)!.path;

// Titular de CLAR: una persona física, sin actividad económica. El RGPD (art. 13.1.a) pide su identidad y sus datos de
// contacto: nombre completo, domicilio a efectos de notificaciones y email. Aparecen en los textos legales y una
// prueba unitaria falla mientras falten: no se publica una política de privacidad sin responsable
export const OWNER = {
  name: 'Ovidiu Mircea Moldovan Goloman',
  address: 'OneCoWork Recoletos, Calle de Prim 12, 28004 Madrid (España)',
  email: 'info@clar.life'
};

// Edad mínima para usar CLAR: la que fija el art. 7 de la LOPDGDD para consentir el tratamiento de datos. Fuera de
// España vale la de cada país si es mayor (el RGPD la fija en 16 años y deja a cada Estado bajarla hasta 13)
export const MIN_AGE = 14;

// Fecha de la versión vigente de los textos legales: cámbiala con cada cambio de contenido. Es también la versión de las
// condiciones que acepta cada cuenta (se guarda tal cual, en español, sea cual sea el idioma de la app)
export const LEGAL_UPDATED = '1 de noviembre de 2026';
// La misma fecha, en el idioma de la app: cámbiala junto con LEGAL_UPDATED (una prueba unitaria lo comprueba)
export const LEGAL_UPDATED_LABEL = messages<string>(LEGAL_UPDATED, '1 November 2026');

// Quién envía los emails de CLAR (encargado del tratamiento)
export const EMAIL_PROVIDER = 'IONOS';
