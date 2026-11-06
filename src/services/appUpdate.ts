// VERSIÓN NUEVA DE CLAR: cada compilación publica en /version.json (vite-plugins/versionFile.ts) su trozo de entrada,
// cuyo nombre solo cambia si cambia el código. Hosting lo sirve sin caché y el service worker no lo guarda. Una ventana
// abierta lo pide de vez en cuando (useAppUpdate): si no es el trozo con el que se cargó, hay versión nueva y se ofrece
// recargar. No se compara con el service worker: al recargar, la página ya es la nueva antes de que él se actualice, y
// avisaría de una versión que ya se ve.

export const VERSION_FILE = '/version.json';

export interface PublishedBuild {
  version: string;
  build: string;
}

// El contenido de /version.json, o null si no lo es (en desarrollo, la dirección devuelve la app)
export const parsePublishedBuild = (data: unknown): PublishedBuild | null => {
  if (!data || typeof data !== 'object') return null;
  const { version, build } = data as Record<string, unknown>;
  return typeof version === 'string' && version && typeof build === 'string' && build ? { version, build } : null;
};

export const isNewBuild = (published: PublishedBuild | null, current: string) =>
  Boolean(published && published.build !== current);

// El trozo de entrada con el que se cargó esta página: el último script de módulo con dirección (en desarrollo, antes
// va el cliente de Vite; los trozos que se cargan después no añaden scripts)
export const loadedBuild = (doc: Pick<Document, 'querySelectorAll'> = document) => {
  const scripts = doc.querySelectorAll<HTMLScriptElement>('script[type="module"][src]');
  const entry = scripts[scripts.length - 1];
  return entry ? new URL(entry.src, 'http://x').pathname : '';
};

// Lo publicado ahora, o null si no se puede saber (sin conexión, error del servidor, en desarrollo)
export const fetchPublishedBuild = async (): Promise<PublishedBuild | null> => {
  try {
    const response = await fetch(VERSION_FILE, { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
    return parsePublishedBuild(await response.json());
  } catch {
    return null;
  }
};

// Pasa a la versión nueva: vuelve a cargar la página. El service worker pide la página primero a la red, así que llega
// la nueva, con sus trozos; el navegador comprueba entonces el service worker y este guarda la copia nueva sin conexión.
// Al entrar se ven las novedades de la versión, si las hay
export const applyUpdate = () => window.location.reload();
