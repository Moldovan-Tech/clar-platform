import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { precacheServiceWorker } from './vite-plugins/precache.ts';
import { versionFile } from './vite-plugins/versionFile.ts';

// package.json es la única fuente de la versión que muestra la app
const { version } = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

export default defineConfig(() => {
  return {
    // precacheServiceWorker: lo que guarda el service worker para abrir CLAR sin conexión
    // versionFile: /version.json, lo publicado ahora (no lo guarda el service worker)
    plugins: [react(), tailwindcss(), versionFile(version), precacheServiceWorker()],
    build: {
      // El SDK de Firebase (Auth, Firestore y Functions) ronda los 670 kB sin comprimir y hace falta para entrar
      chunkSizeWarningLimit: 700,
      rolldownOptions: {
        output: {
          // Las librerías cambian poco entre versiones: en trozos aparte, el navegador las conserva en caché. Las
          // secciones que no se ven al arrancar se cargan al abrirlas (React.lazy en App)
          codeSplitting: {
            groups: [
              // Las notificaciones push solo hacen falta en los dispositivos que las activan: en un trozo aparte
              {
                name: 'firebase-messaging',
                test: /node_modules[\\/](@firebase[\\/](messaging|installations)|firebase[\\/]messaging)[\\/]/,
                priority: 10
              },
              { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'vendor', test: /node_modules/ }
            ]
          }
        }
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(version)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    // En desarrollo, Vite busca las dependencias en todo src al arrancar (también las de las secciones que se cargan
    // al abrirlas): si las descubriera a mitad de uso, recargaría la página (y una prueba e2e perdería lo que hacía)
    optimizeDeps: {
      entries: ['index.html', 'src/**/*.{ts,tsx}']
    }
  };
});
