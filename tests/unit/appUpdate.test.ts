import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  VERSION_FILE,
  fetchPublishedBuild,
  isNewBuild,
  loadedBuild,
  parsePublishedBuild
} from '../../src/services/appUpdate.ts';
import { entryOf, versionFileContent } from '../../vite-plugins/versionFile.ts';

// Versión nueva con la ventana abierta: /version.json dice el trozo de entrada publicado y la app lo compara con el
// suyo. El nombre del trozo lleva el hash de su contenido: solo cambia si cambia el código, no en cada despliegue
test('version.json carries the version and the entry chunk of the build', () => {
  const bundle = {
    'assets/index-abc.js': { type: 'chunk', isEntry: true, fileName: 'assets/index-abc.js' },
    'assets/HowItWorks-def.js': { type: 'chunk', isEntry: false, fileName: 'assets/HowItWorks-def.js' },
    'assets/index-abc.css': { type: 'asset', fileName: 'assets/index-abc.css' }
  };
  const build = entryOf(bundle);
  assert.equal(build, '/assets/index-abc.js');
  assert.deepEqual(parsePublishedBuild(JSON.parse(versionFileContent('1.3.2', build))), { version: '1.3.2', build });
  // Sin entrada, o con varias, la compilación falla
  assert.throws(() => entryOf({}), /version\.json/);
});

test('the page knows its entry chunk: the last module script with an address', () => {
  const doc = (srcs: string[]) => ({
    querySelectorAll: () => srcs.map((src) => ({ src: `https://clar.life${src}` }))
  });
  assert.equal(loadedBuild(doc(['/assets/index-abc.js']) as never), '/assets/index-abc.js');
  // En desarrollo, antes va el cliente de Vite
  assert.equal(loadedBuild(doc(['/@vite/client', '/src/main.tsx']) as never), '/src/main.tsx');
  assert.equal(loadedBuild(doc([]) as never), '');
});

test('only a well-formed version.json counts, and only another build is new', () => {
  for (const bad of [null, 'x', 42, {}, { version: '1.3.2' }, { build: 'b' }, { version: '', build: 'b' }])
    assert.equal(parsePublishedBuild(bad), null);
  const published = { version: '1.3.2', build: 'b2' };
  assert.equal(isNewBuild(published, 'b1'), true);
  assert.equal(isNewBuild(published, 'b2'), false);
  // Sin saber lo publicado (sin conexión, en desarrollo), nunca hay versión nueva
  assert.equal(isNewBuild(null, 'b1'), false);
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('the check asks for version.json without cache, and fails quietly offline or when it gets the app', async () => {
  const calls: [string, RequestInit | undefined][] = [];
  const respond = (response: Response | Error) => {
    globalThis.fetch = ((url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    }) as typeof fetch;
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  respond(json({ version: '1.3.2', build: 'b2' }));
  assert.deepEqual(await fetchPublishedBuild(), { version: '1.3.2', build: 'b2' });
  assert.deepEqual(calls[0], [VERSION_FILE, { cache: 'no-store' }]);

  // En desarrollo la dirección devuelve la app (HTML); sin conexión, falla la petición; o el servidor da error
  respond(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }));
  assert.equal(await fetchPublishedBuild(), null);
  respond(new TypeError('Failed to fetch'));
  assert.equal(await fetchPublishedBuild(), null);
  respond(json({ version: '1.3.2', build: 'b2' }, 503));
  assert.equal(await fetchPublishedBuild(), null);
});
