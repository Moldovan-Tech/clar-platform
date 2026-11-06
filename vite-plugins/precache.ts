import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

// SIN CONEXIÓN: al compilar, el service worker (public/sw.js) recibe la lista de lo que guarda para abrir CLAR sin
// conexión (la app en «/», sus trozos y sus iconos) y una versión que cambia con su contenido: así cada versión
// publicada tiene su copia y la anterior se borra. En desarrollo no pasa por aquí y no guarda nada.

// Lo que no se guarda: el propio service worker, la vuelta de la autorización de Google (necesita conexión), los
// archivos ocultos, que Hosting no publica (firebase.json), y la imagen de la tarjeta al compartir el enlace (solo la
// piden otros sitios), ni robots.txt, ni version.json (dice lo publicado ahora: guardado, diría lo de antes)
const SKIP = [/^sw\.js$/, /^oauth\//, /(^|\/)\./, /\.map$/, /^og-image\.png$/, /^robots\.txt$/, /^version\.json$/];

// Las direcciones que se guardan, a partir de los archivos de la compilación (rutas relativas a dist)
export const precacheList = (files: string[]) =>
  files
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => !SKIP.some((pattern) => pattern.test(file)))
    .map((file) => (file === 'index.html' ? '/' : `/${file}`))
    .sort();

// El service worker con su lista y su versión
export const injectPrecache = (source: string, list: string[], version: string) => {
  const marks = ['const PRECACHE = [];', "const VERSION = 'dev';"];
  if (marks.some((mark) => !source.includes(mark)))
    throw new Error('public/sw.js: no se encuentra dónde poner la lista de archivos y la versión');
  return source
    .replace(marks[0], `const PRECACHE = ${JSON.stringify(list)};`)
    .replace(marks[1], `const VERSION = '${version}';`);
};

const filesIn = (dir: string, base = dir): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesIn(full, base) : [path.relative(base, full)];
  });

export const writePrecache = (outDir: string) => {
  const list = precacheList(filesIn(outDir));
  const hash = createHash('sha256');
  for (const url of list) hash.update(url).update(readFileSync(path.join(outDir, url === '/' ? 'index.html' : url)));
  const sw = path.join(outDir, 'sw.js');
  writeFileSync(sw, injectPrecache(readFileSync(sw, 'utf8'), list, hash.digest('hex').slice(0, 16)));
  return list;
};

// El plugin de Vite: al terminar la compilación (con public ya copiado a dist)
export const precacheServiceWorker = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'clar-precache',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      writePrecache(outDir);
    }
  };
};
