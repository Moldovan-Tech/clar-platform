import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { injectPrecache, precacheList, writePrecache } from '../../vite-plugins/precache.ts';

// Lo que guarda el service worker para abrir CLAR sin conexión: la app en «/», sus trozos e iconos
test('the precache list has the app at «/», its chunks and icons, without the worker, the Google return or hidden files', () => {
  assert.deepEqual(
    precacheList([
      'index.html',
      'sw.js',
      'manifest.json',
      'icon-192.png',
      'assets/index-abc.js',
      'assets/index-abc.css',
      'assets/index-abc.js.map',
      'oauth/google.html',
      'oauth/google.js',
      '.well-known/x',
      'og-image.png',
      'robots.txt',
      // Lo publicado ahora (aviso de versión nueva): guardado, diría lo de antes
      'version.json'
    ]),
    ['/', '/assets/index-abc.css', '/assets/index-abc.js', '/icon-192.png', '/manifest.json']
  );
});

test('the list and the version go into the service worker, and a worker without their marks fails the build', () => {
  const source = "const PRECACHE = [];\nconst VERSION = 'dev';\n";
  assert.equal(
    injectPrecache(source, ['/', '/assets/a.js'], 'abc123'),
    'const PRECACHE = ["/","/assets/a.js"];\nconst VERSION = \'abc123\';\n'
  );
  assert.throws(() => injectPrecache('const PRECACHE = [];', ['/'], 'abc'), /public\/sw\.js/);
});

test('after a build the service worker carries every file, and its version changes with their content', () => {
  const dist = mkdtempSync(path.join(tmpdir(), 'clar-precache-'));
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html>');
  writeFileSync(path.join(dist, 'assets', 'app-1.js'), 'uno');
  const worker = "const PRECACHE = [];\nconst VERSION = 'dev';\n";
  const build = () => {
    writeFileSync(path.join(dist, 'sw.js'), worker);
    writePrecache(dist);
    return readFileSync(path.join(dist, 'sw.js'), 'utf8');
  };
  const first = build();
  assert.match(first, /const PRECACHE = \["\/","\/assets\/app-1\.js"\];/);
  assert.equal(build(), first);
  writeFileSync(path.join(dist, 'assets', 'app-1.js'), 'dos');
  assert.notEqual(/VERSION = '(\w+)'/.exec(build())![1], /VERSION = '(\w+)'/.exec(first)![1]);
});
