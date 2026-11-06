import type { Plugin } from 'vite';

// VERSIÓN PUBLICADA: al compilar, /version.json con la versión y el trozo de entrada de la app. Su nombre lleva el
// hash de su contenido, que incluye los nombres de los trozos que carga: solo cambia si cambia el código, no en cada
// despliegue. Una ventana abierta lo compara con el suyo para saber si hay versión nueva (src/services/appUpdate.ts)
export const versionFileContent = (version: string, build: string) => `${JSON.stringify({ version, build })}\n`;

// Lo que hace falta de los archivos de la compilación (el bundle de Rolldown)
type BundleFile = { type: string; isEntry?: boolean; fileName: string };

// La dirección del trozo de entrada (p. ej. «/assets/index-abc.js»), la misma que pide index.html
export const entryOf = (bundle: Record<string, BundleFile>) => {
  const entries = Object.values(bundle).filter((file) => file.type === 'chunk' && file.isEntry);
  if (entries.length !== 1) throw new Error(`version.json: se esperaba un trozo de entrada y hay ${entries.length}`);
  return `/${entries[0].fileName}`;
};

export const versionFile = (version: string): Plugin => ({
  name: 'clar-version-file',
  apply: 'build',
  generateBundle(_options, bundle) {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: versionFileContent(version, entryOf(bundle))
    });
  }
});
