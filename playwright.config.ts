import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // En CI, una prueba que falla se repite una vez: un fallo de tiempos de la máquina no bloquea el despliegue. Si pasa
  // al repetirla, el informe la marca como «flaky» y sigue a la vista para arreglarla
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    // Antes de todo, una carga de la app y una llamada a cada emulador: el arranque en frío (compilar la app y despertar
    // los emuladores) no se lo come el tiempo de la primera prueba de cada proceso
    { name: 'warm-up', testMatch: /warm-up\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /global-settings\.spec\.ts/,
      dependencies: ['warm-up']
    },
    // Pruebas que cambian la configuración global (p. ej. desactivar la aprobación de cuentas): van después de todas
    // las demás, para no cambiarles las reglas a mitad
    {
      name: 'global-settings',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /global-settings\.spec\.ts/,
      dependencies: ['chromium']
    }
  ],
  // npm run dev arranca los emuladores de Auth, Firestore y Functions (proyecto demo) y la app conectada a ellos
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Un id de cliente de Google de mentira: la app ofrece conectar Google Calendar (las pruebas interceptan Google).
    // Con espacios alrededor, como pueden venir de la variable del despliegue: la app los quita
    env: { VITE_GOOGLE_OAUTH_CLIENT_ID: ' e2e-client-id ' },
    // SIGINT deja que la CLI de Firebase apague los emuladores; con SIGTERM el de Firestore (Java) se queda vivo
    gracefulShutdown: { signal: 'SIGINT', timeout: 15_000 }
  }
});
