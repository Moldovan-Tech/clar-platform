# CLAR — decide qué hacer ahora, con claridad

[![CI](https://github.com/Moldovan-Tech/clar-platform/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Moldovan-Tech/clar-platform/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Moldovan-Tech/clar-platform?color=4f46e5)](https://github.com/Moldovan-Tech/clar-platform/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
**[English](#in-english)** · [Español](#clar--decide-qué-hacer-ahora-con-claridad)

[![Firebase](https://img.shields.io/badge/Firebase-Auth%20·%20Firestore%20·%20Functions-ffca28.svg?logo=firebase&logoColor=black)](https://firebase.google.com/)

**CLAR** es una app web gratuita y de código abierto para organizar tu tiempo: evalúas tu Rueda de la Vida, conviertes
lo que quieres mejorar en metas y proyectos, y cada día decides qué hacer con un Top 10 y una agenda con alarmas.
Funciona sin conexión y en español o en inglés. Pruébala en **https://clar.life**.

![CLAR: la lista de tareas con el Top 10](docs/screenshots/lists-es.png)

> Algunas ideas de esta app se inspiran en el libro _Gestiona tu tiempo, disfruta de la vida_, de Jonathan Benito Sipos.
> Este proyecto no está afiliado ni respaldado por el autor. Hasta la versión 0.7 se llamaba NeuroProductividad.

CLAR no es una herramienta clínica ni científica: aplica ideas sencillas de gestión del tiempo (prioridades claras,
tareas concretas y proteger tu tiempo de las interrupciones) para que sepas qué hacer ahora sin perderte en listas
infinitas.

## In English

**CLAR** is a free, open-source web app (PWA) to organize your time: rate your Wheel of Life, turn what you want to
improve into goals and projects, and decide what to do each day with a Top 10 and an agenda with alarms. It works
offline, in Spanish or English.

- **Try it:** https://clar.life/?lang=en
- **Stack:** React 19, TypeScript, Vite, Tailwind CSS 4 and Firebase (Auth, Firestore with offline cache, Cloud
  Functions, Hosting, Cloud Messaging). Tests with Node's test runner, the Firebase emulators and Playwright.
- **Run it locally** (Node.js ≥ 22.12 and Java 21 for the emulators; no Firebase account needed):

  ```bash
  git clone https://github.com/Moldovan-Tech/clar-platform.git && cd clar-platform
  npm ci && npm ci --prefix functions && npm ci --prefix tools/eslint
  npm run dev   # emulators + app; sign in with the emulated Google account admin@example.com
  ```

- **Contributing:** issues and pull requests are welcome. The docs and code comments are in Spanish; see
  [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha) for every script and
  [docs/requisitos.md](docs/requisitos.md) for the requirements. Security reports: [SECURITY.md](SECURITY.md).
- **License:** [MIT](LICENSE).

|                          Sign-in page                           |                         On the phone                          |
| :-------------------------------------------------------------: | :-----------------------------------------------------------: |
| ![The sign-in page in English](docs/screenshots/landing-en.png) | ![The lists on a phone](docs/screenshots/lists-mobile-en.png) |

---

## 🎨 Marca

- **Nombre:** CLAR, como «claro» sin la O: ver con claridad qué hacer ahora. Se escribe siempre en mayúsculas y con algo de espacio entre letras.
- **Símbolo:** una lente enfocada, un anillo índigo sobre un cuadrado pizarra con un brillo blanco. Está en `src/components/BrandMark.tsx` y `public/icon.svg`. Los PNG para Android e iOS (`public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` y `apple-touch-icon.png`) salen del mismo dibujo.
- **Colores:**

  | Uso                                         | Color                 | Tailwind                              |
  | :------------------------------------------ | :-------------------- | :------------------------------------ |
  | Fondo de marca, botones principales y texto | `#0f172a`             | `slate-900`                           |
  | Anillo del símbolo y acento                 | `#818cf8` · `#4f46e5` | `indigo-400` · `indigo-600`           |
  | Lista Profesional                           | `#4f46e5`             | `indigo-600`                          |
  | Lista Personal                              | `#059669` · `#047857` | `emerald-600` · `emerald-700` (texto) |
  | Plazo cercano · vencido                     | `#7c3aed` · `#dc2626` | `violet-600` · `red-600`              |
  | Pendiente de sincronizar o de aprobar       | `#ea580c` · `#c2410c` | `orange-600` · `orange-700`           |

  Los textos pequeños usan como mínimo `slate-500` sobre blanco para cumplir el contraste WCAG AA.

- **Tipografía:** la del sistema de cada dispositivo. No se cargan fuentes externas: no se envía la IP de nadie a terceros al abrir la app.
- **Lema:** «Decide qué hacer ahora, con claridad».

---

## 🧭 El método: de lo que te importa a lo que haces hoy

1. **Rueda de la Vida:** puntúas de 0 a 10 tu satisfacción en 7 áreas. Es el punto de partida.
2. **Metas:** lo que quieres conseguir en cada área, empezando por las más bajas. Las áreas con 5 o menos y sin metas salen en «Necesitan atención».
3. **Proyectos (opcional):** si una meta, o una parte de ella, necesita varias tareas relacionadas, se agrupan en un proyecto con fecha de fin. Una meta puede tener ninguno, uno o varios; es una herramienta, no un paso obligatorio.
4. **Tareas:** acciones físicas concretas, en la lista Profesional o Personal. Cada meta tiene «Añadir tarea», y una tarea vinculada toma el área de su meta; puede ir suelta o dentro de un proyecto.
5. **Top 10 y Agenda:** qué hacer hoy y cuándo, con alarmas antes del plazo.
6. **Proteger el tiempo** (recomendaciones en la Ayuda): mañanas sin reuniones, reuniones con hora de fin y orden del día, y el correo y los mensajes a horas fijas.

Al volver a evaluar la Rueda se ve el efecto de las acciones, y las áreas cambian de orden en «Metas».

**Navegación:** en tableta y escritorio, la cabecera lleva las secciones (Inicio, Listas, Agenda, Rueda de la Vida, Metas, Proyectos, Administración solo para la administración, y Ayuda), las dos listas, la sincronización y la cuenta. En el móvil, la barra inferior lleva Inicio, Listas, Agenda, Metas y «Más» (Rueda de la Vida, Proyectos, Ayuda, Administración, la sincronización y la cuenta), con un botón flotante «Nueva tarea».

---

## 🧠 Fundamentos y secciones

La lista completa y numerada de lo que hace la app, con sus requisitos no funcionales, está en [docs/requisitos.md](docs/requisitos.md).

### 1. Rueda de la Vida

- **Áreas de cada cuenta:** se empieza con 7 (_Salud, Carrera Profesional, Finanzas, Familia, Ocio, Relaciones, Espiritualidad_), que se pueden renombrar, ocultar y ampliar con áreas propias desde «Editar áreas» (entre 3 y 12 a la vista). Las 7 de partida conservan su nombre original como identificador y las nuevas tienen el suyo (`area-…`), así nada de lo guardado cambia; la lista va en el perfil (`wheelAreas`). Un área oculta sale de la Rueda, de las sugerencias y de las listas para elegir, pero conserva sus evaluaciones, sus metas (que siguen en «Metas») y sus tareas. Los nombres se muestran en toda la app y en las descargas; las sugerencias de área usan, para las nuevas, las palabras de su nombre (`src/services/wheel.ts`, `useAreas`).
- **Gráfico polar SVG:** las áreas a la vista evaluadas del 0 al 10 con deslizadores; el gráfico se redibuja al momento. Cada área indica cuántas metas activas tiene, y la tarjeta «Metas» lleva al paso siguiente.
- **Primer arranque guiado:** una cuenta sin evaluaciones abre directamente la Rueda con todas las áreas a 0 y un aviso de primer paso que enlaza a la «Ayuda» (pantallas, cómo se relacionan y dónde se guardan los datos).
- **Persistencia append-only:** cada evaluación se guarda como una nueva, con su fecha en UTC (ISO 8601); las anteriores no se modifican, y las reglas de Firestore lo impiden.
- **Comparativa histórica:** superpone a la evaluación actual cualquiera de las anteriores para ver qué áreas han mejorado.

### 2. Metas

- **Metas por área** (`users/{uid}/goals`): nombre, área de la Rueda, para qué y fecha objetivo; activas, logradas o archivadas.
- **Sección «Metas»:** las áreas van de la puntuación más baja a la más alta según la última evaluación (sin evaluación, en el orden de la Rueda), cada una con sus metas activas, su progreso (tareas hechas sobre el total) y las tareas que les quedan. Las áreas con 5 o menos y sin metas salen en «Necesitan atención», con un botón que abre la meta con esa área elegida. «Añadir tarea» crea una tarea ya vinculada a la meta. Las logradas y archivadas quedan plegadas al final.
- **Vínculo con las tareas** (`goalId`): la tarea toma el área de su meta al leerse, así cambiar el área de una meta no reescribe sus tareas. Al eliminar una meta, sus tareas se quedan sin meta y con su área.
- **Inicio:** una tarjeta con las metas activas y su progreso, y una recomendación cuando el área más baja de la última evaluación (5 o menos) no tiene metas.
- **Proyectos (opcionales)** (`users/{uid}/projects`, sección «Proyectos»): una herramienta para agrupar tareas relacionadas que buscan cumplir una meta o una parte de ella; una meta puede tener ninguno, uno o varios. Cada uno tiene nombre, meta (obligatoria), fecha de fin y descripción; activos, terminados o archivados. Las tareas de un proyecto (`projectId`) toman su meta al leerse (`applyProjectGoals`) y cuentan en el avance de la meta. Cada proyecto muestra su avance como una batería (tareas hechas sobre el total, sin las canceladas) y avisa si va fuera de plazo (pasó la fecha de fin con tareas abiertas), si termina en menos de una semana, si todas sus tareas están hechas y si alguna vence después del fin. En su vista, las tareas se manejan con las mismas tarjetas que en «Listas». Cada meta muestra sus proyectos activos; una meta con proyectos no se puede eliminar, y al eliminar un proyecto sus tareas siguen en la meta (`src/services/projects.ts`).

### 3. Listas y jerarquía visual

- **Dos listas separadas:** la **Lista Profesional** y la **Lista Personal** no se mezclan, para no saltar de un contexto a otro sin querer.
- **Jerarquía visual (Top 10):** en lugar de limitar el inventario, las 10 primeras tareas se destacan con tipografía más marcada, elevación y más espacio; de la 11 en adelante se muestran planas y más discretas.
- **Orden y filtros del Top 10:** por prioridad efectiva, fecha límite, estimación, actualización o área, y filtros por prioridad, estimación máxima, estado, plazo y área. Se guardan en cada dispositivo y el resumen «Top 10» cuenta lo mismo que muestra la lista.
- **Prioridad efectiva y estimación:** si la fecha límite está a más de una semana, la tarea cuenta un nivel menos de prioridad (las tareas sin fecha mantienen la suya). Cada tarea puede llevar una estimación de duración, visible en todas las listas.
- **Verbo físico:** el campo de la acción indica encima que empiece por una acción concreta (Llamar, Enviar, Reservar…).
- **Meta:** el formulario de la tarea permite vincularla a una meta activa o crearla ahí mismo con «Nueva meta» (nombre y área; el resto, en «Metas»); la tarjeta muestra la meta en lugar del área.
- **«Algún día»:** las ideas sin urgencia van a su propia pestaña y no compiten con el Top 10.
- **Tareas dependientes:** una tarea puede esperar a otra (`dependsOn`, una sola; «Empieza después de», en «Más opciones»). Mientras esa siga abierta, la dependiente sale con un candado, no entra en el Top 10 (va con el resto) y no se puede marcar como hecha ni en progreso; al hacerse o cancelarse la otra se desbloquea sola, y el aviso lo dice. Varias tareas pueden esperar a la misma, en paralelo. No se pueden crear ciclos, una tarea eliminada no bloquea y la siguiente repetición de una recurrente no hereda la espera (`src/services/dependencies.ts`).
- **Estado y archivo:** Cada tarea tiene un estado manual (Pendiente, En progreso, Bloqueada, Hecha, Cancelada). Marcarla como hecha es un toque, con «Deshacer»; el lápiz de la tarjeta, o pulsar su título, abre la edición. Las tareas hechas y las canceladas se archivan y se consultan en la ventana «Archivadas», desde donde se reactivan cambiando su estado. Una cancelada no cuenta como hecha: ni en las estadísticas ni en el avance de las metas.
- **Cambios sin guardar:** cerrar con cambios el formulario de una tarea, una meta o un proyecto, o el editor de áreas, pregunta antes de descartarlos («Seguir editando» o «Descartar»); cerrar o recargar la pestaña con un formulario cambiado lo avisa el navegador.
- **Fechas y colores del plazo:** Fecha límite o intervalo opcional, con hora opcional. El título se pone violeta cuando falta menos de una semana y rojo cuando ha vencido. El día que vence, hasta su hora límite, destaca con la etiqueta «Hoy» y el título en violeta oscuro y en negrita (en Listas y Proyectos, también con un borde violeta). Los campos de fecha usan un calendario propio con la semana empezando en lunes (se escriben como dd/mm/aaaa y se manejan con el teclado), sea cual sea el idioma del navegador.
- **Alarmas:** una hora para avisar antes del plazo (ver [Alarmas](#alarmas-092)).
- **Tareas recurrentes:** cada N días, semanas (eligiendo los días), meses (día del mes, «el 2.º lunes» o «el último viernes») o años, con N de 1 a 99 («Repetir: Cada [3] [días]», en «Más opciones»). En días y semanas, la siguiente puede ir en fechas fijas o contar desde que se hace: con «3 días después de hacerla» (`recurrence.from: 'COMPLETION'`), al completarla la siguiente vence 3 días después de ese día, sin serie en el calendario ni repeticiones previstas en la Agenda. Al repetir, «Inicio» es desde cuándo se repite y la fecha límite hasta cuándo (opcional); cada repetición vence su propio día, nunca como un intervalo. Al marcar una repetición como Hecha o Cancelada se archiva y se crea la siguiente en la misma operación (cancelar una repetición no termina la serie) (sin duplicados aunque se marque desde dos dispositivos); en fechas fijas, las ya vencidas, hora límite incluida, se saltan si se completa con retraso.
- **Calendario:** «Añadir al calendario», en el menú «⋯» de la tarea, la lleva a Google Calendar, Outlook.com, Outlook de Microsoft 365 o cualquier calendario (`.ics`, con la alarma), mediante enlaces y sin conectar cuentas. La descripción lleva la de la tarea y sus notas; con hora de inicio y sin hora límite, el evento dura una hora. Las recurrentes exportan la serie (RRULE con semanas que empiezan en lunes y el último día del mes cuando el día no existe); cada repetición en su día, también las antiguas que tenían fecha de inicio. Las series con hora van en hora local con la zona horaria del dispositivo, así el día y la hora no se mueven con el cambio de horario.

### 4. Motor de sugerencias

- **Vectorización TF-IDF:** limpieza léxica y frecuencia de término ponderada por frecuencia inversa de documento, al salir del campo Descripción (en «Más opciones»).
- **Similitud del coseno:** el vector resultante se compara con las áreas a la vista de la cuenta: las de partida con su vocabulario (más las palabras de su nombre si se renombraron) y las añadidas con las palabras de su nombre.
- **Sugerencia de área:** «Sugerencia: ¿Vincular a Finanzas? (82 % de confianza)», con «Usar esta área», cuando la tarea no tiene meta y el texto se parece lo bastante a un área (similitud de al menos 0,12 o alguna palabra clave en común).
- **Sugerencia de meta:** mientras se escribe el título, «Vincular a «meta»» propone la meta activa que más palabras comparte con él (`suggestGoal`).

### 5. Analizador de la acción siguiente

- **Filtro contra Proyectos Amorfos:** Intercepta descriptores abstractos como _"Marketing"_, _"Coche"_ o _"Finanzas"_.
- **Asistente:** pregunta «¿Cuál es el primer paso? Conviértelo en algo que puedas hacer ya.» y propone una acción concreta (por ejemplo «Llamar al taller para pedir presupuesto»), con un verbo de acción física.

### 6. Proteger el tiempo: el triángulo de las Bermudas

- **Recomendaciones, no herramientas:** desde la 1.3.0, la Ayuda tiene «Recomendaciones para proteger tu tiempo» contra las tres grandes fugas (reuniones, correo y mensajes): mañanas libres de reuniones para el trabajo concentrado (ninguna antes de las 12:00) y reuniones a primera hora de la tarde; cada reunión con hora de fin, orden del día cerrado y alguien que la modere; los correos empezando por el contenido y los adjuntos, con los destinatarios al final; y el correo y los mensajes en bloques, a horas fijas.
- **Lo guardado antes se conserva:** la sección «Tiempo protegido» (reuniones y correos) se retiró en la 1.3.0. Las reuniones y los correos que se guardaron con ella siguen en la cuenta, sin pantalla: van en «Descargar mis datos», la importación los trae y se borran con la cuenta (ver [la 1.3.0](#tiempo-protegido-a-la-ayuda-130)).

### Cuentas, Inicio, Agenda y accesibilidad

- **Cuentas y sincronización:** Inicio de sesión con Google o con email y contraseña (con verificación del email antes de solicitar acceso y recuperación de la contraseña por email); los datos de cada cuenta se guardan en Firestore (UE), funcionan sin conexión y se sincronizan entre dispositivos. En el primer inicio de sesión se ofrece importar los datos que la versión anterior guardaba solo en el navegador. Un indicador en la cabecera está verde cuando todo está guardado en el servidor y naranja cuando hay cambios pendientes o no hay conexión; al pulsarlo se fuerza la sincronización.
- **Cuenta autogestionada:** desde el menú de la cuenta se activan las notificaciones de las alarmas (y, en cada dispositivo, «Avisarme también con CLAR cerrada»), se cambia la contraseña, se cierra la sesión en todos los dispositivos (los demás pierden el acceso en menos de una hora), se descargan los datos, se importa una descarga anterior (se añade lo que falta y lo que ya está no se toca) y se elimina la cuenta con todo su contenido, confirmándolo con la contraseña o con Google.
- **Acceso:** la administración puede exigir la aprobación de cada cuenta (por defecto) o desactivarla; también puede retirar el acceso o bloquear una cuenta junto con su email. Sin acceso se ve una pantalla para solicitarlo con un mensaje opcional, desde la que también se pueden descargar o eliminar los datos guardados. La administración decide en **Administración** → **Solicitudes** y recibe un email por cada solicitud. Un aviso rojo, en «Administración» y en sus pestañas, cuenta las solicitudes pendientes, los mensajes sin leer y, con la aprobación desactivada, las cuentas que entraron solas desde la última vez que se miraron las solicitudes en ese dispositivo, que salen marcadas como «Nueva»; la persona recibe otro cuando se aprueba (detalles en [Aprobación de accesos](#aprobación-de-accesos)).
- **Accesibilidad:** panel propio (menú de la cuenta y pantallas de inicio de sesión y acceso) con tamaño del texto, alto contraste, reducir animaciones, foco muy visible y celebraciones, guardados en cada dispositivo. Toda la app se usa con el teclado (los diálogos atrapan y devuelven el foco, enlace para saltar al contenido) y una auditoría automática WCAG 2.1 AA revisa cada pantalla en CI.
- **Celebraciones:** al hacer una tarea que llevaba 14 días o más en la lista (las recurrentes no cuentan), lograr una meta o terminar un proyecto, el aviso añade un mensaje motivador, elegido sin repetir el último de su tipo entre al menos 12 (`src/services/celebrations.ts`), y sale un confeti breve en índigo y violeta (`CelebrationBurst`, decorativo; con menos movimiento no se ve). Solo por lo que se hace en esa pestaña y una vez por elemento y sesión; nunca al cancelar, deshacer, importar ni por cambios de otros dispositivos. Se apagan en «Accesibilidad».
- **Inicio:** el foco de la lista activa, las metas activas con su progreso, los proyectos activos con su batería y su plazo, y estadísticas de las tareas (hechas por día, semana y mes, y canceladas en el mes; antes o después del plazo; velocidad en tareas y horas estimadas por semana; tiempo medio hasta completarlas; racha; pendientes, vencidas y bloqueadas; reparto por área, con los nombres de la cuenta), con recomendaciones según esos datos (también si un proyecto va fuera de plazo).
- **Agenda:** vista semanal (de lunes a domingo) y por días (14 días, también los vacíos) con las tareas con fecha de las dos listas, los intervalos y las repeticiones previstas de las tareas que se repiten en fechas fijas. En la vista por días las tareas vencidas aparecen aparte; al pulsar una tarea se edita.
- **Contacto:** «Escríbenos» (en la Ayuda, en «Tu cuenta» y en la pantalla de acceso) envía ideas, fallos o dudas; la administración los lee y los responde por email desde la app.
- **Textos legales:** política de privacidad (`/privacidad`), condiciones de uso (`/condiciones`) y aviso legal (`/aviso-legal`), públicos y sin iniciar sesión (`src/Root.tsx` elige la página por la ruta, sin cargar Firebase). Están enlazados desde las pantallas de inicio de sesión y de acceso, el pie, el menú de la cuenta y la Ayuda; al entrar se acepta tener al menos 14 años (o la edad mínima del país de residencia, si es mayor) y las condiciones. El contenido está en `src/components/LegalTexts.tsx`, y el titular (nombre completo y domicilio a efectos de notificaciones), el email de contacto y la fecha de la versión, en `src/services/legal.ts`: al cambiar el contenido, cambia también la fecha. Una prueba unitaria falla si falta el titular, su domicilio o el email.

## 🗒️ Novedades por versión

### Metas, bienvenida, recorrido y contacto (0.9)

- **Metas:** objetivos concretos dentro de un área de la Rueda (`users/{uid}/goals`). Las tareas se vinculan con `goalId` y toman el área de su meta al leerse; el progreso de cada meta son sus tareas hechas sobre el total.
- **Sección «Metas» (0.9.1):** el paso entre la Rueda y las tareas. Las áreas van de la puntuación más baja a la más alta según la última evaluación, cada una con sus metas activas, su progreso y las tareas que les quedan. «Añadir tarea» crea una tarea ya vinculada a la meta. Las áreas con 5 o menos y sin metas salen en «Necesitan atención».
- **Navegación móvil:** barra inferior (Inicio, Listas, Agenda, Metas y «Más», con la Rueda, Tiempo protegido, la Ayuda, la sincronización y la cuenta), botón flotante «Nueva tarea» y hojas inferiores para «Más» y para ordenar y filtrar.
- **Tareas:** completar de un toque con «Deshacer» (comprobado en una transacción), menú «⋯» y formulario en dos niveles.
- **Bienvenida y recorrido guiado:** se muestran una vez por cuenta (`hasSeenOnboarding` en el perfil, con copia local) y se repiten desde Ayuda.
- **Contacto:** «Escríbenos» envía el mensaje a la Cloud Function `submitFeedback` (email confirmado, 5 por hora), que lo guarda en `feedback_tickets` y avisa por email. La administración lo lee en «Administración» → «Mensajes».

### Alarmas (0.9.2)

- **Una hora por tarea** (`alarmTime`, HH:mm). Todas las horas de la app se escriben en 24 h con un campo propio (`TimeField`, `src/services/timeInput.ts`: 9:30, 0930, 21:45), no con el selector del navegador, que en sistemas en 12 h muestra a. m./p. m. y podía guardar 23:00 en lugar de 11:00. El momento en que suena se calcula al leer, en la zona horaria del dispositivo (`src/services/alarms.ts`): el día límite a esa hora (con hora límite, tiene que ser antes; las de antes de 0.9.7 a la hora límite o más tarde suenan la víspera, como entonces). Cada repetición de una tarea que se repite hereda la alarma. Una alarma puesta o cambiada (ella, el día, la hora límite o la repetición: `alarmSetAt`) cuando su hora ya había pasado no suena, ni en la app ni por push; otros cambios de la tarea no la tocan (`functions/src/alarmLogic.ts` calcula lo mismo, y `sendDueAlarms` lo vuelve a calcular al enviar).
- **Avisa con la app abierta** (`useTaskAlarms`): un aviso dentro de CLAR con «Ver tarea» y, con permiso, una notificación del sistema (desde el service worker `public/sw.js` desde 0.9.5, que es lo que permite mostrarlas en Android, también en la app instalada; en Safari del iPhone sin instalar, solo el aviso dentro de la app). Con la app cerrada, o congelada en segundo plano por Android, solo suena si el dispositivo tiene activado «Avisarme también con CLAR cerrada» (notificaciones push); si no, avisa al volver. Las alarmas que pasaron con la app cerrada avisan al abrirla si la tarea aún no ha vencido, y el aviso dice a qué hora era. El aviso y la notificación llevan la hora de la alarma. Cada alarma avisa una sola vez, también con varias pestañas (`localStorage` y Web Locks).
- **Calendario:** el archivo .ics incluye la alarma (`VALARM`).

### Borradores de correo (0.9.2)

- **Borradores:** un correo de «Tiempo protegido» se puede guardar sin terminar (`status: 'draft'`) con «Guardar borrador» o, solo, al cerrar el editor con cambios. «Borradores» y «Guardados» se abren para continuar o editar (se guarda sobre el mismo documento) y se eliminan con «Deshacer».
- **Adjuntos:** «Elegir archivos» abre el selector del sistema; se guardan solo el nombre y el tamaño, como lista de lo que adjuntar al enviarlo.
- **Abrir en mi correo:** enlace `mailto:` con los destinatarios válidos, el asunto y el texto. CLAR no envía correos.

### Respuestas a los mensajes de contacto (0.9.2)

- En **Administración** → **Mensajes**, «Responder» envía la respuesta por email a quien escribió, desde el buzón de `SMTP_USER` y con su mensaje citado; si contesta, le llega a ese buzón. La Cloud Function `replyToFeedback` (solo la administración) guarda la respuesta en el mensaje (`replies`) únicamente si el envío sale, y un mensaje nuevo pasa a leído. Desde la app nadie puede escribir respuestas directamente (las reglas solo dejan cambiar el estado).
- «Desde mi correo» sigue abriendo el programa de correo, para responder desde otra cuenta.

### Proyectos, dependencias, «Cancelada» y descargas (0.9.3)

- **Estado «Cancelada»:** archiva la tarea como «Hecha», con su fecha y «Deshacer», pero no cuenta como hecha: ni en las estadísticas ni en el avance de metas y proyectos. Cancelar una repetición crea la siguiente.
- **Cambios sin guardar:** cerrar el formulario de una tarea, una meta o un proyecto con cambios pregunta antes de descartarlos; cerrar la pestaña, lo avisa el navegador (`useDiscardGuard`).
- **Tareas dependientes** (`dependsOn`): una tarea espera a otra y queda bloqueada hasta que esa esté hecha o cancelada; varias pueden esperar a la misma, en paralelo (ver [Listas](#3-listas-y-jerarquía-visual)).
- **Proyectos** (`users/{uid}/projects`): tareas con fecha de fin dentro de una meta, con su avance como una batería y avisos de plazo (ver [Metas](#2-metas)).
- **Descargas en JSON:** una tarea («⋯» → «Descargar (JSON)»), una meta o un proyecto, con todos sus datos y los nombres de lo relacionado (`src/services/exports.ts`).

### Áreas propias, horas en 24 h y avisos (0.9.4)

- **Áreas de la Rueda propias:** renombrar las 7 de partida, añadir áreas y ocultar las que no se usan, por cuenta (ver [Rueda de la Vida](#1-rueda-de-la-vida)).
- **Horas en 24 h:** un campo propio de `hh:mm` en todas las horas, en lugar del selector del navegador (que en sistemas en 12 h podía guardar 23:00 en lugar de 11:00). El aviso de una alarma dice su hora y, si llega tarde porque CLAR estaba cerrada, cuándo era.
- **Editar una tarea:** con el lápiz de su tarjeta o pulsando su título.
- **Avisos rojos de administración:** solicitudes pendientes, mensajes sin leer y cuentas nuevas que entraron solas.
- **Crear una meta desde la tarea:** «Nueva meta» en el formulario de la tarea, con nombre y área. Se guarda al momento y la tarea queda vinculada a ella.
- **Estadísticas de Inicio al día:** los proyectos activos (batería y plazo) y cuántos van fuera de plazo, las tareas canceladas en el mes y las bloqueadas, y una recomendación para el proyecto que va fuera de plazo.

### Importar los datos, calendario y alarmas en Android (0.9.5)

- **Importar datos (JSON):** en el menú de la cuenta, junto a «Descargar mis datos (JSON)». Acepta ese archivo (también los descargados antes de esta versión) y enseña antes qué entra: por cada tipo, lo nuevo, lo que ya está en la cuenta y lo que no es válido. Se añade solo lo que falta (mismo id: no se toca), así importar dos veces el mismo archivo no duplica nada. Si la cuenta aún tiene las áreas de partida, se recupera la configuración de áreas del archivo; si no, las que falten se añaden (con un número si el nombre ya existe, y ocultas pasado el máximo a la vista). Un registro con un texto o una lista que pasa su tope, con un elemento que no vale o un proyecto sin su meta cuenta entero como no válido: nunca se recorta nada. Cada registro se comprueba campo a campo y solo se guardan los campos conocidos (`src/services/importData.ts`); hace falta conexión, porque se mira en el servidor qué hay ya. La descarga lleva ahora `app`, `version` y `type: "account"`.
- **Notificaciones de las alarmas en Android:** CLAR registra un service worker (`public/sw.js`; desde 0.9.7 también guarda la app para abrirla sin conexión) y muestra la notificación desde él, así sale también en Android y en la app instalada mientras CLAR esté viva. El permiso se ofrece también en el menú de la cuenta, y las alarmas se revisan al reanudarse la app, al volver a mostrarse la página y al recuperar la conexión. Sin push en la instalación, el formulario dice que con CLAR cerrada o el móvil bloqueado la alarma no suena y propone el .ics.
- **Textos legales:** el responsable con su nombre completo y un domicilio a efectos de notificaciones (RGPD, art. 13.1.a); la edad mínima, 14 años o la del país de residencia si es mayor; una licencia técnica sobre el contenido para poder alojarlo y mostrarlo; el almacenamiento local del navegador (Local Storage e IndexedDB) y el service worker, explicados como técnicos (art. 22.2 de la LSSI), y en el aviso legal, la ausencia de afiliación con el autor del libro que inspira el método.
- **Calendario:** una tarea con hora de inicio y sin hora límite se exporta como un evento de una hora (antes llegaba hasta el final del día límite; si la fecha límite es otro día, la descripción la dice), y las notas de la tarea van en la descripción del evento, las de lista con su casilla (en los enlaces de Google y Outlook, recortada a 1.500 caracteres; el .ics la lleva entera). Las series con hora se exportan en hora local con su zona horaria: antes iban en UTC, y una serie de los lunes a las 00:30 caía en domingo y se movía una hora con el cambio de horario.
- **Eliminar la cuenta tras entrar con Google:** se confirma con el método con el que se entró en esta sesión (`useReauthMethods`); una cuenta con contraseña y Google puede cambiar al otro, y los errores de la ventana de Google salen en español.
- **Pruebas e2e más estables:** un paso de calentamiento (`tests/e2e/warm-up.setup.ts`) carga la app y despierta los emuladores antes de todas, y Vite busca las dependencias de todo `src` al arrancar.

### Alarmas con CLAR cerrada, proyectos opcionales y novedades (0.9.6)

- **Alarmas con CLAR cerrada (push):** con «Avisarme también con CLAR cerrada» activado en un dispositivo (menú de la cuenta; la notificación lleva solo la hora salvo que se pida el nombre de la tarea), las alarmas le llegan aunque la app esté cerrada o el móvil bloqueado, por Firebase Cloud Messaging y una Cloud Function que se ejecuta cada minuto (ver [Notificaciones push de las alarmas](#notificaciones-push-de-las-alarmas)).
- **Proyectos opcionales:** la bienvenida, el recorrido guiado (un paso más, «Proyectos (opcional)»), la sección y la ayuda presentan los proyectos como una herramienta opcional para agrupar tareas relacionadas de una meta o de una parte de ella (ninguno, uno o varios por meta).
- **Importar sin recortar:** un registro con un texto o una lista que pasa su tope cuenta entero como no válido.
- **Novedades de cada versión:** al entrar después de una actualización, una ventana cuenta una vez por cuenta las novedades de la versión (lo visto se guarda en el perfil, `releaseNotesSeen`, y en el dispositivo; las cuentas nuevas empiezan por la bienvenida, que las da por vistas). Están todas en la Ayuda y se abren también al pulsar la versión. El contenido está en `src/services/releaseNotes.ts`: al publicar una versión se añade su entrada al principio, y una prueba unitaria falla si la de `package.json` no tiene la suya.
- **CI:** `actions/checkout` y `actions/setup-node` en v7 (Node 24).

### Las tareas de hoy, alarmas a su hora y eventos con hora (0.9.7)

- **Las tareas de hoy destacan:** una tarea abierta que vence hoy, mientras no haya vencido, lleva la etiqueta «Hoy» (`TodayTag`), el título en violeta oscuro y en negrita y, en Listas y Proyectos, un borde violeta a la izquierda (`getDeadlineState` devuelve `today`). En Metas, el título y la etiqueta; en la Agenda, el título, con «(vence hoy)» para los lectores de pantalla.
- **Alarmas el día límite:** con solo fecha, la alarma suena ese día a su hora (antes, la víspera); con hora límite, tiene que ser antes y el formulario no deja guardar si no. Las tareas que se repiten ya no necesitan hora límite. Una alarma cuya hora había pasado al guardar la tarea no suena. La tarjeta dice cuándo sonará («hoy 17:00»). `sendDueAlarms` vuelve a calcular cada alarma de la cola con la tarea antes de enviarla, así las colas de antes se ponen en su nueva hora.
- **Sin conexión, también al abrirla:** el service worker guarda una copia de cada versión (la lista de archivos la pone al compilar `vite-plugins/precache.ts`: la app en «/», todos sus trozos y sus iconos; `/__/firebase/init.json`, aparte y si se puede; una instalación con un archivo que no llega, o que llega como HTML, no cuenta y sigue la versión anterior, que se conserva para las pestañas abiertas con ella). La app y sus rutas se sirven con `Cache-Control: no-cache` (`firebase.json`). Las páginas van primero a la red y, sin conexión, a la copia; los archivos, de la copia. Se registra al arrancar, también antes de iniciar sesión, y la configuración de Firebase se guarda además en el dispositivo (`clar_firebase_config`). Antes la app instalada en Android no se abría sin conexión.
- **El logo gira mientras carga:** el brillo blanco da vueltas dentro del anillo (`BrandMark spinning`, `LoadingScreen`) en las pantallas de arranque y en la de inicio; con «menos movimiento», quieto.
- **Calendario:** una tarea con solo fecha es un evento de una hora a la hora de su alarma o, sin alarma, a las 09:00 (los intervalos de varios días sin horas siguen de día completo). En la sincronización con Google Calendar, las notas van en HTML, como lista con viñetas (`eventDescription` en `functions/src/calendarLogic.ts`); los eventos ya sincronizados cambian al cambiar su tarea o al volver a conectar.

### Dictado, borradores, presentación y registro abierto (1.0.0)

- **Dictar tareas** (`src/services/speech.ts`, `DictateButton`): micrófono en el título y en las notas, con el reconocimiento de voz del navegador, en español y hasta 30 s por dictado; un solo dictado a la vez. Accesos «Nueva tarea por voz» (`/?nueva=voz`) y «Nueva tarea» en el manifiesto. `Permissions-Policy` deja el micrófono a la propia app.
- **Borradores de tareas** (`users/{uid}/taskDrafts`, `TaskDraftsModal`): una tarea nueva que se cierra sin guardar se queda en «Borradores», en Listas, con «Continuar» y «Eliminar»; se sincronizan, van en la descarga y se borran con la cuenta (no se importan).
- **Compartir y presentación:** «Compartir CLAR» en el menú de la cuenta (`ShareAppButton`), tarjeta Open Graph (`public/og-image.png`, fuera de la copia sin conexión) y la pantalla de entrada como página de presentación (`LoginScreen`), con enlace al repositorio.
- **Registro abierto:** con «Aprobación obligatoria» desactivada, una cuenta nueva con el email confirmado entra sola; una rechazada o retirada que vuelve a pedirlo espera a la administración (`newRequestStatus`). Al crear la cuenta con email se confirma la edad mínima y se aceptan las condiciones; el perfil guarda cuándo (`termsAcceptedAt`, `termsVersion`). Contra abusos: las reglas acotan el tamaño de lo que se escribe, cada función tiene como mucho 5 instancias (`functions/src/globalOptions.ts`), cada cuenta tiene como mucho 100 alarmas en cola y 20 registros de dispositivo por hora, y los avisos de «Escríbenos» a la administración salen como mucho cada 15 minutos (`flushFeedbackNotices`). Una dirección que no existe dice «Página no encontrada», y hay `robots.txt`.

### Celebraciones, repetir a tu manera y alarmas en el móvil (1.1.0)

- **Celebraciones** (`src/services/celebrations.ts`, `CelebrationBurst`): al completar una tarea creada hace 14 días o más (las que se repiten, no), lograr una meta o terminar un proyecto, el aviso de abajo añade un mensaje de una biblioteca (14 por tipo, sin repetir el último) y sale un confeti breve, decorativo y sin movimiento con «menos movimiento». Solo lo que se hace en esa pestaña: nunca al cancelar, borrar, deshacer, importar ni sincronizar. Se desactivan por dispositivo en Accesibilidad. Las animaciones de entrada de las ventanas (`animate-in`) ya funcionan.
- **Repetir:** «Repetir: Cada [N] [días|semanas|meses|años]» en una línea, con un número que se escribe con normalidad (1 a 99). Modo nuevo «N días/semanas después de hacerla» (`recurrence.from: 'COMPLETION'`): la siguiente vence N días o semanas después del día en que se completa; sin serie en el calendario ni repeticiones previstas en la Agenda.
- **Alarmas en el móvil:** tocar la notificación abre la tarea (`/?alarma=<clave>` o un mensaje del service worker), y una alarma que ya llegó por push no vuelve a notificarse al abrir CLAR (el service worker apunta las mostradas durante dos días). Icono monocromo para la barra de estado, la hora de la alarma en la notificación, «Probar notificación» (`sendTestPush`, 5 por hora), aviso si se quitó el permiso, y el dispositivo se vuelve a registrar si su suscripción se perdió. En el iPhone, Safari explica cómo añadir CLAR a la pantalla de inicio (las alarmas push solo llegan ahí, iOS 16.4+), y desde el icono Google entra por redirección (`src/services/platform.ts`).

### CLAR en inglés (1.2.0)

- **Idioma:** español (por defecto) o inglés, con «Español / English» en la página de inicio y en el menú de la cuenta. Se guarda en el dispositivo y en la cuenta (`users/{uid}.language`, `useAccountLanguage`); cambiarlo vuelve a cargar la app, así el idioma es fijo mientras está abierta.
- **Cómo se traduce:** `messages(es, en)` de `src/i18n/locale.ts`, junto a cada texto; el inglés tiene que tener la misma forma que el español o no compila. Fechas y números con `LOCALE_TAG` (`en-GB` en inglés). Las áreas de partida de la Rueda sin renombrar se guardan con su identificador y se ven en el idioma de la app (`storableAreas`).
- **Servidor:** `functions/src/i18n.ts` y `callable.ts`: los errores en el idioma de quien llama, los emails a la persona en el suyo (los de la administración, en español), las notificaciones push en el de cada dispositivo (`push_devices/{uid}/tokens/{id}.language`) y los eventos de Google Calendar en el de la cuenta.
- **Textos legales en inglés:** traducción con el aviso de que vale la versión en español. Al contacto se puede escribir en español o en inglés.

### Lista para compartir (1.2.1)

- **Enlace en inglés:** `https://clar.life/?lang=en` abre CLAR en inglés y lo deja elegido (`consumeLocaleParam` quita el parámetro de la dirección).
- **Tarjeta del enlace** bilingüe (`public/og-image.png`) y descripciones más cortas; README con portada en inglés y capturas (`docs/screenshots/`), `SECURITY.md`, la licencia con su titular.
- **Cabeceras:** `X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'self'` (la app no se puede incrustar en otras webs).
- **Arreglos:** un área renombrada no se toma por una de partida; elegir el idioma que ya se ve no lo cambia en la cuenta; la política de privacidad describe los registros técnicos (30 días).

### «Tiempo protegido», a la Ayuda (1.3.0)

- **Sección retirada:** sin la pestaña `bermudas` ni `BermudasShield`, `MeetingModal`, `EmailModal` y `src/services/email.ts`. Inicio ya no cuenta las reuniones y la Agenda no las muestra; la bienvenida y la página de entrada ya no presentan la sección.
- **Recomendaciones en la Ayuda:** «Recomendaciones para proteger tu tiempo» / “Tips to protect your time” (`HowItWorks`), solo consejos, sin botones ni referencias a pantallas (ver [Proteger el tiempo](#6-proteger-el-tiempo-el-triángulo-de-las-bermudas)).
- **Los datos se conservan:** `users/{uid}/meetings` y `users/{uid}/emails` ya no se siguen en vivo (`LIVE_COLLECTIONS`, que también decide el indicador de sincronización), pero siguen en `USER_COLLECTIONS`: van en «Descargar mis datos», la importación los trae y se borran con la cuenta. Las reglas los siguen admitiendo para la importación. La política de privacidad lo explica (versión del 1 de noviembre de 2026).

---

## 🛠️ Stack Tecnológico

| Capa                    | Tecnologías                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend**            | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons                                                                                                                                                                                                                                                                                                                                                                                         |
| **Algoritmia**          | Motor TF-IDF & Cosine Similarity en TS, Parser sintáctico de verbos en español                                                                                                                                                                                                                                                                                                                                                                    |
| **Visualización**       | SVG interactivo polar / radar, Matemáticas polares de deformación poligonal                                                                                                                                                                                                                                                                                                                                                                       |
| **Cuentas y datos**     | Firebase Authentication (Google y email con contraseña) y Cloud Firestore (`europe-west1`) con caché persistente: funciona sin conexión y sincroniza entre dispositivos                                                                                                                                                                                                                                                                           |
| **Hosting y funciones** | Firebase Hosting (SPA, en https://clar.life) y Cloud Functions for Firebase 2.ª gen (`europe-west1`): funciones invocables de acceso, contacto y registro de dispositivos para las alarmas push, el trigger `queueTaskAlarm` y la función programada `sendDueAlarms` (Firebase Cloud Messaging), con avisos por email (SMTP de IONOS, con nodemailer), y la función HTTP `api`, que solo sirve `/.well-known/assetlinks.json` para la APK Android |

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos

- Node.js $\ge 22.12$
- npm (el gestor utilizado por CI y el despliegue)
- Java 21 o superior para el emulador de Firestore (desarrollo local y pruebas)
- La Firebase CLI se instala con `npm ci` (`firebase-tools` en `devDependencies`); `npx firebase …` usa esa versión

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Moldovan-Tech/clar-platform.git
cd clar-platform

# 2. Instalar dependencias (frontend y Cloud Functions)
npm ci
npm ci --prefix functions
npm ci --prefix tools/eslint   # ESLint con su propio TypeScript 5.9 (typescript-eslint aún no admite TypeScript 7)

# 3. Iniciar la app en local: arranca los emuladores de Auth, Firestore y Functions (proyecto demo, sin tocar
#    producción) y la app conectada a ellos. El inicio de sesión con Google lo simula el emulador; entra con
#    admin@example.com para aprobar los accesos de las demás cuentas.
npm run dev

# 4. Compilar para producción
npm run build

# 5. Comprobar tipos, linter y formato (`npm run format` y `npm run lint:fix` corrigen lo automático).
#    Al hacer commit, un hook formatea y pasa el linter a los archivos del commit.
npm run typecheck
npm run lint
npm run format:check

# 6. Ejecutar pruebas unitarias, de integración, de reglas de Firestore, de las alarmas push y de las Cloud Functions
npm run test:unit
npm run test:integration
npm run test:rules
npm run test:push
npm --prefix functions test

# 7. Instalar Chromium y ejecutar pruebas E2E
npx playwright install chromium
npm run test:e2e
```

La app estará disponible en `http://localhost:3000` y la interfaz de los emuladores en `http://localhost:4020`. Los emuladores usan puertos distintos de los de por defecto de Firebase (Auth 9399, Firestore 8281, Functions 5021, Hosting 5002) para poder convivir con los de otros proyectos.

### Pruebas automatizadas

El banco de pruebas cubre lógica pura con el test runner de Node, la importación de datos locales, las reglas de seguridad de Firestore contra el emulador, la cola y el envío de las alarmas push contra el emulador de Firestore con un FCM simulado (`npm run test:push`), flujos de extremo a extremo en Chromium con Playwright, tras un paso de calentamiento (`tests/e2e/warm-up.setup.ts`), uno por función de la app (`tests/e2e/*.spec.ts`), con el emulador de Auth para el inicio de sesión, y una auditoría automática de accesibilidad WCAG 2.1 A y AA con axe-core en cada pantalla, también con alto contraste y texto muy grande (`tests/e2e/a11y.spec.ts`). `npm test` ejecuta todos los niveles; las Cloud Functions (lógica de accesos, contacto y alarmas —comparada con la de la app, también en los cambios de hora—, y `assetlinks.json`) se prueban aparte con `npm --prefix functions test`. GitHub Actions también valida tipos, compila la aplicación y las Cloud Functions, y ejecuta toda la suite en cada push y pull request.

### Despliegue en Firebase (Hosting + Cloud Functions + Firestore)

Firebase Hosting sirve la SPA compilada (`dist/`), la app lee y escribe directamente en Firestore (los datos de cada cuenta van en `users/{uid}/…`) y las Cloud Functions invocables (2.ª gen, región `europe-west1`) se ocupan de lo que no puede hacer el navegador: los accesos, el contacto y los avisos por email. Las reglas (`firestore.rules`) solo permiten a cada persona acceder a sus propios datos (crear y modificar exige el acceso aprobado; leer y borrar no, para que una cuenta sin acceso pueda llevarse o eliminar lo suyo) y hacen las evaluaciones de la Rueda _append-only_. La app lee su configuración de Firebase de `/__/firebase/init.json`, que sirve el propio Hosting, así que el ID del proyecto no está en el código. Las rutas se definen en `firebase.json`:

| Ruta                           | Destino                                               |
| :----------------------------- | :---------------------------------------------------- |
| `/.well-known/assetlinks.json` | Función `api` (Digital Asset Links de la APK Android) |
| `**`                           | `index.html` (fallback de la SPA)                     |

Todas las respuestas llevan cabeceras de seguridad, definidas en `firebase.json`: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (sin cámara, ubicación, pagos ni USB; el micrófono, solo para la propia app, para dictar) y una política de seguridad de contenidos (CSP) que solo permite el propio dominio, el inicio de sesión de Google, las APIs de Firebase (`*.googleapis.com`), las Cloud Functions (`*.cloudfunctions.net`) y las fotos de perfil de Google. Además, `X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'self'` impiden incrustar la app en otras webs. Por ahora el resto de la CSP y la `Cross-Origin-Opener-Policy` van en modo «solo informar» (`…-Report-Only`): no bloquean nada y avisan en la consola del navegador. Un servicio externo nuevo hay que añadirlo a la CSP.

Requisitos: un proyecto de Firebase en plan Blaze (Cloud Functions lo exige), una base de datos de Firestore `(default)` en `europe-west1`, los proveedores de inicio de sesión **Google** y **Correo electrónico/contraseña** activados en Authentication y la Firebase CLI con sesión iniciada (`npx firebase login`).

El ID del proyecto no se versiona: `.firebaserc` está en `.gitignore`. En cada clon, selecciona el proyecto una vez:

```bash
npx firebase use --add
```

Las funciones usan los parámetros `ANDROID_PACKAGE_NAME` y `ANDROID_SHA256_FINGERPRINT` (la función `api`), `ADMIN_EMAIL` y `SMTP_USER` (accesos y contacto) y, opcionales, `SMTP_HOST` (el servidor SMTP; por defecto `smtp.ionos.es`) y `APP_URL` (la dirección de la app en los emails). `firebase deploy` pide los que faltan y los guarda en `functions/.env.<project-id>`, ignorado por git; en CI salen de las variables y los secretos del repositorio. Para los emuladores no hace falta nada: `ANDROID_PACKAGE_NAME` y `ANDROID_SHA256_FINGERPRINT` tienen valores de ejemplo y el resto no se usa sin conexión a producción.

#### Aprobación de accesos

Por defecto, cada cuenta necesita la aprobación de la administración antes de usar la app, también las que ya existían. Al entrar sin acceso, la persona ve una pantalla para solicitarlo con un mensaje opcional; la administración decide en **Administración** → **Solicitudes** (aprobar, rechazar, retirar o bloquear) y el cambio se aplica al momento. Tras un rechazo o una retirada se puede volver a solicitar pasado un día.

- **Aprobación obligatoria:** un interruptor en **Solicitudes** (`settings/access.approvalRequired`; sin el documento, la aprobación es obligatoria). Al desactivarlo, tras confirmarlo, se aprueban al momento las solicitudes pendientes y cada persona recibe su email; mientras siga desactivado, las cuentas nuevas con el email confirmado entran sin esperar.
- **Lista negra:** «Bloquear» deja la cuenta en estado bloqueado y guarda su email en `blocked_emails`. Una cuenta bloqueada no puede volver a solicitar acceso, y una cuenta nueva con el mismo email empieza bloqueada, con la aprobación activada o no. La lista se conserva aunque la cuenta se elimine. «Desbloquear» deja la cuenta como retirada y libera el email.

- Las Cloud Functions `syncAccess`, `requestAccess`, `setAccess`, `setAccessMode`, `forgetAccess` y `revokeSessions` (esta última cierra las sesiones de la cuenta en todos los dispositivos) (`functions/src/access.ts`) son las únicas que escriben `access/{uid}`, `admins/{uid}`, `settings/access` y `blocked_emails`; desde la app solo la administración lee `settings`, y nadie lee ni escribe `blocked_emails`. Las reglas consultan `access/{uid}` para dejar crear y modificar en `users/{uid}/…`, y la marca `admins/{uid}` (con el email de la administración, que debe coincidir con el de quien lee) para la lista de solicitudes.
- La administración es la cuenta (de Google, o con email confirmado) cuyo email coincide con el parámetro `ADMIN_EMAIL`; se aprueba sola al entrar. En los emuladores (proyecto demo) es `admin@example.com`.
- Avisos por email, por SMTP con TLS (puerto 465) desde un buzón de IONOS, proveedor de la UE con contrato de encargado del tratamiento: a la administración por cada solicitud nueva y por cada mensaje de contacto, a la persona cuando se aprueba su acceso, y las respuestas de la administración a los mensajes. Los avisos a la administración no llevan datos de quien escribe ni su mensaje: se leen en la app. Los envía el buzón del parámetro `SMTP_USER` (en producción, `info@clar.life`), que también recibe lo que contesten; la contraseña está en Secret Manager como `SMTP_PASSWORD` y nunca en el repositorio ni en los `.env`. En los emuladores no se envía nada.

Configuración, una sola vez, con las variables `PROJECT_ID`, `PROJECT_NUMBER` y `SA` del despliegue automático (más abajo):

```bash
# 1. Un buzón del dominio en IONOS (p. ej. info@clar.life) y el contrato de encargado del tratamiento aceptado en el
#    panel de IONOS. Los registros MX, SPF, DKIM y DMARC los crea IONOS al crear el buzón
# 2. Guardar la contraseña del buzón en Secret Manager; el CLI la pide por teclado y no queda en el historial
npx firebase functions:secrets:set SMTP_PASSWORD --project "$PROJECT_ID"
# 3. Permisos: la cuenta de servicio de las funciones lee el secreto y la de GitHub Actions lo puede consultar al desplegar
gcloud secrets add-iam-policy-binding SMTP_PASSWORD --project "$PROJECT_ID" \
  --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role roles/secretmanager.secretAccessor
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA" --role roles/secretmanager.viewer --condition None
# 4. Email de la administración, como secreto del repositorio (gh lo pide por teclado), y el buzón que envía
gh secret set ADMIN_EMAIL
gh variable set SMTP_USER --body "info@clar.life"
```

```bash
# Emuladores locales (proyecto demo): Hosting en http://localhost:5002, Functions, Auth y Firestore
npm run emulators

# Despliegue: compila la SPA y las Cloud Functions antes de subirlas y publica las reglas de Firestore
npm run deploy
```

#### Notificaciones push de las alarmas

Con CLAR cerrada, las alarmas llegan por Firebase Cloud Messaging a los dispositivos donde se activó «Avisarme también con CLAR cerrada» (menú de la cuenta; se activa en cada dispositivo, con permiso de notificaciones). La notificación dice «Tienes una alarma de CLAR a las hh:mm» y cuándo vence; con «Mostrar el nombre de la tarea», «Alarma de las hh:mm: nombre de la tarea», porque se ve con el móvil bloqueado. El dispositivo registra su token, su zona horaria y esa preferencia (`registerPushDevice`, como mucho diez por cuenta; `push_tokens` dice de qué cuenta es cada token, así un dispositivo compartido solo recibe las alarmas de la última cuenta registrada, y un token que no se renueva en 30 días se borra). El trigger `queueTaskAlarm` pone al día en una transacción la próxima alarma de la tarea en `alarm_queue`, calculada en esa zona horaria con el mismo resultado que la app (`functions/src/alarmLogic.ts`), salvo si es la misma que ya se envió (`alarm_sent`). `sendDueAlarms`, cada minuto, toma en una transacción las que tocan, las envía y apunta que se enviaron; si ningún dispositivo la recibe por un fallo pasajero, vuelve a la cola con una espera creciente (cinco intentos), y los tokens que FCM da por inválidos se borran. Desactivarlas o cerrar sesión corta la suscripción del navegador al momento (también sin conexión) y borra el token (`unregisterPushDevice`). «Cerrar todas las sesiones», retirar el acceso y eliminar la cuenta borran los dispositivos y la cola (las alarmas ya enviadas solo se borran con la cuenta, para no repetirlas). Ninguna de estas colecciones se lee ni se escribe desde la app. `npm run test:push` prueba la cola y el envío contra el emulador de Firestore con un FCM simulado. Límite conocido: la zona horaria es la del último dispositivo registrado.

1. **Clave VAPID:** Firebase → Configuración del proyecto → Cloud Messaging → Certificados web push → «Generar par de claves». La clave pública va en la variable del repositorio `FCM_VAPID_KEY` (`gh variable set FCM_VAPID_KEY`). La compilación la lee como `VITE_FCM_VAPID_KEY`; sin ella, la app no usa push.
2. **APIs y permisos (una vez, con una cuenta propietaria):** activar `cloudscheduler.googleapis.com`, `eventarc.googleapis.com`, `pubsub.googleapis.com` y `run.googleapis.com`; dar a `github-deployer` los roles `roles/cloudscheduler.admin` y `roles/eventarc.developer`; y dar a los agentes de servicio los que pide el primer despliegue: `roles/iam.serviceAccountTokenCreator` al de Pub/Sub, y `roles/run.invoker` y `roles/eventarc.eventReceiver` a la cuenta de Compute (ver la configuración inicial). El primer despliegue del trigger puede fallar con «Permission denied while using the Eventarc Service Agent» mientras se propagan los permisos: basta con volver a lanzarlo unos minutos después.
3. **APK (TWA):** generarla con la delegación de notificaciones (Bubblewrap: `enableNotifications: true`) y el permiso `POST_NOTIFICATIONS` de Android 13+. Los accesos directos del manifiesto («Nueva tarea por voz», desde 1.0.0) se incluyen al generarla: con una APK anterior, hay que regenerarla (`bubblewrap update`) para que salgan. En la app instalada desde Chrome, salen solos tras la siguiente comprobación del manifiesto (como mucho, un día).
4. **Emuladores:** FCM no tiene emulador, así que con ellos no se usa push; el trigger funciona y la tarea programada no se ejecuta.

#### Secretos de Google para desplegar

El despliegue necesita dos secretos en Secret Manager, aunque no se use la función que los lee (sin ellos, falla):
`GOOGLE_OAUTH_CLIENT_SECRET` (el secreto de un cliente OAuth web de Google) y `CALENDAR_TOKEN_KEY` (una clave aleatoria,
p. ej. `openssl rand -base64 32`), con permiso de lectura para la cuenta de servicio de las funciones, como
`SMTP_PASSWORD`. Los detalles están en `functions/src/calendarSync.ts`.

#### Dominio propio (clar.life)

La dirección principal de la app es `https://clar.life` (la de Firebase Hosting sigue funcionando). Servida desde ese dominio, el inicio de sesión usa el mismo dominio (`authDomain`, en `src/services/authDomain.ts`), así el navegador no bloquea la ventana de Google por ser de otro sitio. Configuración, una sola vez:

1. **Firebase Hosting** → «Añadir dominio personalizado»: `clar.life`, y `www.clar.life` redirigido a `clar.life`. Hosting da los registros DNS (TXT para verificar y A para servir) que hay que añadir en el proveedor del dominio. El certificado HTTPS llega solo, en unas horas.
2. **Authentication** → Configuración → Dominios autorizados: `clar.life` y `www.clar.life`.
3. **Google Cloud** → APIs y servicios → Credenciales → el cliente OAuth web que usa Firebase: origen `https://clar.life` y URI de redirección `https://clar.life/__/auth/handler`.
4. Opcional: en **Authentication** → Plantillas, la URL de acción de los emails (verificación y contraseña) `https://clar.life/__/auth/action`.
5. Los enlaces de los emails (accesos, contacto y respuestas) apuntan al dominio con la variable `APP_URL`, configurada con `https://clar.life`; sin ella, usan la dirección de Firebase Hosting. Para cambiarla (el siguiente despliegue la aplica):

```bash
gh variable set APP_URL --body "https://clar.life"
```

#### Despliegue automático desde GitHub Actions

Cada push a `main` (por ejemplo, al mergear un pull request) despliega Hosting, las Cloud Functions y las reglas de Firestore si el job `validate` pasa. Los deploys se ejecutan de uno en uno. GitHub se autentica en Google Cloud con Workload Identity Federation: cada ejecución recibe un token temporal y no hay claves de cuenta de servicio guardadas.

El workflow necesita estos valores en el repositorio. Los secrets se ocultan en los logs, así que el ID del proyecto tampoco aparece ahí.

| Tipo     | Nombre                           | Valor                                                                         |
| :------- | :------------------------------- | :---------------------------------------------------------------------------- |
| Secret   | `FIREBASE_PROJECT_ID`            | ID del proyecto de Firebase                                                   |
| Secret   | `GCP_SERVICE_ACCOUNT`            | Email de la cuenta de servicio `github-deployer`                              |
| Secret   | `GCP_WORKLOAD_IDENTITY_PROVIDER` | Ruta completa del proveedor de identidad                                      |
| Variable | `ANDROID_PACKAGE_NAME`           | Package name de la APK                                                        |
| Variable | `ANDROID_SHA256_FINGERPRINT`     | Huella SHA-256 del certificado de firma de la APK                             |
| Secret   | `ADMIN_EMAIL`                    | Email de la administración: aprueba los accesos y lee y responde los mensajes |
| Variable | `SMTP_USER`                      | Buzón que envía los avisos y las respuestas, y recibe lo que contesten        |
| Variable | `SMTP_HOST`                      | Opcional: servidor SMTP del buzón (por defecto `smtp.ionos.es`)               |
| Variable | `APP_URL`                        | Opcional: dirección de la app en los emails (`https://clar.life`)             |
| Variable | `FCM_VAPID_KEY`                  | Opcional: clave pública Web Push de FCM; sin ella, la app no ofrece push      |

Configuración inicial, una sola vez, con una cuenta propietaria del proyecto:

```bash
PROJECT_ID=<project-id>
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="github-deployer@$PROJECT_ID.iam.gserviceaccount.com"
REPO_ID=1408574835  # gh api repos/Moldovan-Tech/clar-platform -q .id

# 1. Cuenta de servicio con los permisos para desplegar Hosting, Functions y las reglas de Firestore
#    (secretmanager.viewer: el CLI comprueba el secreto SMTP_PASSWORD al desplegar)
gcloud iam service-accounts create github-deployer --project "$PROJECT_ID" --display-name "GitHub Actions deployer"
for role in roles/firebasehosting.admin roles/cloudfunctions.admin roles/firebaserules.admin roles/datastore.indexAdmin roles/secretmanager.viewer roles/cloudscheduler.admin roles/eventarc.developer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA" --role "$role" --condition None
done
# Las funciones se ejecutan con la cuenta de servicio de Compute y el CLI comprueba también la de App Engine;
# desplegar exige poder actuar como ellas. Omite la de App Engine si el proyecto no la tiene.
for runtime_sa in "$PROJECT_NUMBER-compute@developer.gserviceaccount.com" "$PROJECT_ID@appspot.gserviceaccount.com"; do
  gcloud iam service-accounts add-iam-policy-binding "$runtime_sa" \
    --project "$PROJECT_ID" --member "serviceAccount:$SA" --role roles/iam.serviceAccountUser
done

# Alarmas push (sendDueAlarms con Cloud Scheduler y el trigger queueTaskAlarm con Eventarc): APIs y permisos de los
# agentes de servicio, que el CLI no puede dar con la cuenta de despliegue
gcloud services enable cloudscheduler.googleapis.com eventarc.googleapis.com pubsub.googleapis.com run.googleapis.com --project "$PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --condition None \
  --member "serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" --role roles/iam.serviceAccountTokenCreator
for role in roles/run.invoker roles/eventarc.eventReceiver; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --condition None \
    --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role "$role"
done

# 2. Workload Identity Federation, limitada a este repositorio y a la rama main
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"
gcloud iam workload-identity-pools create github --project "$PROJECT_ID" --location global --display-name "GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc neuroproductivity-platform --project "$PROJECT_ID" \
  --location global --workload-identity-pool github --issuer-uri https://token.actions.githubusercontent.com \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository_id == '$REPO_ID' && assertion.ref == 'refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository_id/$REPO_ID"

# 3. Secrets y variables del repositorio
gh secret set FIREBASE_PROJECT_ID --body "$PROJECT_ID"
gh secret set GCP_SERVICE_ACCOUNT --body "$SA"
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER \
  --body "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/neuroproductivity-platform"
gh variable set ANDROID_PACKAGE_NAME --body "<package-name>"
gh variable set ANDROID_SHA256_FINGERPRINT --body "<huella-sha256>"
gh variable set FCM_VAPID_KEY --body "<clave-publica-vapid>"
```

El repositorio utiliza `package-lock.json` (en la raíz, en `functions/` y en `tools/eslint/`) como únicos archivos de bloqueo; no añadas `bun.lock` ni `pnpm-lock.yaml`. Después de cambiar dependencias, actualiza y confirma `package.json` y `package-lock.json` juntos. Para comprobar la instalación reproducible, ejecuta `npm ci`, `npm ci --prefix functions` y `npm ci --prefix tools/eslint` antes de compilar y probar.

---

## 📂 Estructura del Proyecto

```text
├── docs/requisitos.md           # Requisitos funcionales y no funcionales de la versión actual
├── index.html                   # Entrada HTML (lang="es")
├── LICENSE                      # Licencia MIT
├── package.json                 # Dependencias y scripts
├── vite.config.ts               # Configuración de Vite y Tailwind
├── tsconfig.json                # Configuración de TypeScript estricto
├── playwright.config.ts         # Pruebas E2E (proyectos warm-up, chromium y global-settings)
├── firebase.json                # Firebase Hosting (rewrites y caché), Cloud Functions, Firestore y emuladores
├── firestore.rules              # Reglas: users/{uid} (crear y modificar exige acceso aprobado), access, admins,
│                                #   settings y feedback_tickets (solo la administración, y solo su estado)
├── public/                      # Manifiesto, iconos, pantalla de inicio, sw.js (service worker: sin conexión y notificaciones) y
│                                #   oauth/ (vuelta de la autorización de Google Calendar)
├── tools/eslint/                # ESLint con su propio TypeScript 5.9
├── .github/workflows/ci.yml     # Validación (tipos, linter, pruebas) y despliegue desde main
├── functions/                   # Cloud Functions for Firebase (región europe-west1)
│   ├── src/
│   │   ├── index.ts             # Exporta la función HTTP `api`, las de acceso, las de funciones extra, las de contacto
│   │   │                        #   y las de las alarmas push
│   │   ├── app.ts               # Función HTTP `api`: solo /.well-known/assetlinks.json (APK Android)
│   │   ├── adminApp.ts          # Firebase Admin compartido
│   │   ├── access.ts            # syncAccess, requestAccess, setAccess, setAccessMode, forgetAccess, revokeSessions
│   │   │                        #   y avisos por email (SMTP)
│   │   ├── accessLogic.ts       # Reglas puras del acceso (estados, esperas, modo de aprobación, correos)
│   │   ├── calendarSync.ts      # Google Calendar: connectGoogleCalendar, disconnectGoogleCalendar, syncTaskCalendar
│   │   │                        #   y la desconexión al perder la función
│   │   ├── calendarLogic.ts     # Evento de cada tarea (igual que «Añadir al calendario») y validación al conectar
│   │   ├── calendarCleanup.ts   # Dónde se guarda la conexión y cómo se desconecta (también al eliminar la cuenta)
│   │   ├── calendarCrypto.ts    # Cifrado AES-256-GCM del permiso de Google
│   │   ├── googleCalendar.ts    # API de Google (OAuth y Calendar), con fetch
│   │   ├── features.ts          # setFeatures: funciones extra de cada cuenta (solo la administración)
│   │   ├── featuresLogic.ts     # Catálogo de funciones extra y validación de lo que pide la administración
│   │   ├── featuresCleanup.ts   # Documento de las funciones extra de una cuenta y su borrado al eliminarla
│   │   ├── feedback.ts          # submitFeedback y replyToFeedback (mensajes de contacto y sus respuestas)
│   │   ├── feedbackLogic.ts     # Validación, límite por hora y correos del contacto
│   │   ├── feedbackCleanup.ts   # Borrado de los mensajes al eliminar la cuenta
│   │   ├── push.ts              # Alarmas push: registerPushDevice, unregisterPushDevice, queueTaskAlarm, sendDueAlarms
│   │   ├── alarmLogic.ts        # Momento de cada alarma en la zona del dispositivo (igual que la app) y su texto
│   │   └── pushCleanup.ts       # Dar de baja los dispositivos de una cuenta y borrar su cola
│   └── test/                    # assetlinks.json, Admin, lógica de acceso, de funciones extra, de contacto y de las alarmas
│       └── emulator/            # Alarmas push y funciones extra contra el emulador de Firestore (npm run test:push)
├── src/
│   ├── main.tsx                 # Montaje de React y preferencias de accesibilidad antes del primer render
│   ├── Root.tsx                 # Textos legales públicos según la ruta; si no, la app
│   ├── AuthGate.tsx             # Inicio de sesión obligatorio
│   ├── AccessGate.tsx           # La app solo se abre con el acceso aprobado (estado en vivo)
│   ├── App.tsx                  # Orquestador principal de estado y vistas
│   ├── navigation.ts            # Secciones, barra inferior del móvil y «Más»
│   ├── tourSteps.ts             # Pasos del recorrido guiado
│   ├── lazy.tsx                 # Carga bajo demanda con reintento
│   ├── index.css                # Tailwind CSS y estilos de accesibilidad (texto, contraste, movimiento, foco)
│   ├── types/index.ts           # Modelos de datos (TaskItem, Goal, Project, WheelArea, WheelOfLifeLog, EmailDraft…)
│   ├── env.d.ts                 # Tipos de Vite y la versión de la app (__APP_VERSION__)
│   ├── hooks/
│   │   ├── useModalFocus.ts     # Foco de los diálogos: entra, se queda dentro y vuelve al cerrar
│   │   ├── useDiscardGuard.ts   # Preguntar antes de descartar cambios sin guardar (y al cerrar la pestaña)
│   │   ├── useAreas.ts          # Áreas de la Rueda de la cuenta (contexto de React)
│   │   ├── useMediaQuery.ts     # Tamaño de pantalla (móvil o no)
│   │   ├── useNow.ts            # Reloj por minutos para plazos y prioridad efectiva
│   │   ├── useReauthMethods.ts  # Cómo confirmar con un inicio de sesión reciente (el método de esta sesión primero)
│   │   └── useTaskAlarms.ts     # Alarmas de las tareas mientras la app está abierta
│   ├── services/
│   │   ├── firebase.ts          # Firebase (Auth, Firestore con caché sin conexión, Functions) y sincronización forzada
│   │   ├── authDomain.ts        # Inicio de sesión en el dominio propio (clar.life)
│   │   ├── repository.ts        # Lectura en tiempo real y escritura de los datos de cada cuenta
│   │   ├── access.ts            # Solicitudes de acceso, modo de aprobación y llamadas a las Cloud Functions
│   │   ├── features.ts          # Funciones extra: catálogo, las de la cuenta y las de todas (administración)
│   │   ├── googleCalendar.ts    # Conectar Google Calendar (ventana de Google con PKCE) y estado de la conexión
│   │   ├── releaseNotes.ts      # Novedades de cada versión y cuándo se muestran
│   │   ├── auth.ts              # Email y contraseña: alta con verificación, acceso, recuperación y cambio
│   │   ├── account.ts           # Descarga de los datos, eliminación de la cuenta y cierre de todas las sesiones
│   │   ├── importData.ts        # Importar la descarga: validación campo a campo, qué entra y fusión de áreas
│   │   ├── accountImport.ts     # Importar la descarga: lectura del archivo y escritura por lotes
│   │   ├── push.ts              # Alarmas con CLAR cerrada: registro y baja del dispositivo (FCM)
│   │   ├── wheel.ts · goals.ts  # Áreas de la Rueda (propias de cada cuenta); metas, su orden y su progreso
│   │   ├── projects.ts          # Proyectos: avance, plazo, meta de sus tareas y orden
│   │   ├── dependencies.ts      # Tareas que esperan a otra: bloqueos, ciclos y candidatas
│   │   ├── exports.ts · download.ts # Descargas en JSON de una tarea, una meta o un proyecto
│   │   ├── tasks.ts             # Estados, plazos y prioridad efectiva
│   │   ├── taskListing.ts       # Orden, filtros y estimación del Top 10
│   │   ├── recurrence.ts        # Tareas recurrentes y su exportación RRULE
│   │   ├── alarms.ts · notifications.ts # Cuándo suena cada alarma; notificaciones del sistema (con public/sw.js)
│   │   ├── agenda.ts            # Agenda por días: plazos, intervalos y repeticiones
│   │   ├── calendar.ts          # Enlaces de Google y Outlook y archivos .ics (con la alarma)
│   │   ├── dateInput.ts · timeInput.ts # Fechas dd/mm/aaaa (semanas de lunes a domingo) y horas en 24 h
│   │   ├── stats.ts             # Estadísticas y recomendaciones de la pantalla de Inicio
│   │   ├── onboarding.ts        # Bienvenida vista, por cuenta
│   │   ├── feedback.ts · feedbackApi.ts # Contacto: información técnica, envío, mensajes y respuestas
│   │   ├── adminAlerts.ts       # Avisos rojos de la administración
│   │   ├── a11yPrefs.ts         # Preferencias del panel de accesibilidad
│   │   ├── celebrations.ts      # Celebraciones: cuándo, mensajes y elección sin repetir
│   │   ├── legal.ts             # Textos legales: rutas, titular, edad mínima y fecha de la versión
│   │   ├── nlpEngine.ts         # Motor TF-IDF y Similitud del Coseno
│   │   ├── syntaxAnalyzer.ts    # Analizador de verbos de acción física
│   │   └── localData.ts         # Importación de los datos de la versión sin cuentas (localStorage)
│   └── components/
│       ├── Navbar.tsx · NavParts.tsx · BottomNav.tsx · MoreSheet.tsx · BottomSheet.tsx # Cabecera, barra
│       │                        #   inferior y hojas del móvil
│       ├── BrandMark.tsx        # Símbolo de CLAR (lente), nombre y lema
│       ├── HomeView.tsx         # Inicio: foco de la lista, metas, estadísticas y recomendaciones
│       ├── WheelOfLife.tsx · AreasModal.tsx # Rueda de la Vida (gráfico polar SVG) y editor de sus áreas
│       ├── GoalsView.tsx · GoalModal.tsx · GoalProgress.tsx # Metas: por área, editor y progreso
│       ├── ProjectsView.tsx · ProjectModal.tsx · ProjectProgress.tsx # Proyectos: lista, vista, editor y batería
│       ├── DiscardChangesPrompt.tsx # «¿Descartar los cambios?»
│       ├── TaskList.tsx · TaskCard.tsx · TaskActionsMenu.tsx # Top 10 y resto, tarjeta y menú «⋯»
│       ├── TaskModal.tsx        # Captura con validación sintáctica, meta, sugerencias, fechas, alarma y repetición
│       ├── DateField.tsx · TimeField.tsx · TaskDates.tsx · TaskStatusSelect.tsx · ArchivedTasksModal.tsx
│       ├── AlarmAlerts.tsx · NotificationPermission.tsx # Avisos de alarma y permiso de notificaciones
│       ├── AgendaView.tsx       # Agenda semanal y por días
│       ├── LoginScreen.tsx · EmailAuthForm.tsx · EmailVerificationScreen.tsx # Inicio de sesión (Google o email)
│       ├── AccessRequestScreen.tsx # Solicitud de acceso, su estado y los datos de la cuenta
│       ├── AdminView.tsx · AccessAdminView.tsx · FeedbackAdminView.tsx # Administración: solicitudes y mensajes
│       ├── FeedbackDialog.tsx   # «Escríbenos»
│       ├── AccountMenu.tsx · AccessibilityPanel.tsx · DeleteAccountPanel.tsx
│       ├── CelebrationBurst.tsx # Confeti de las celebraciones
│       ├── CalendarConnection.tsx # Conectar, estado y desconectar Google Calendar (en «Tu cuenta»)
│       ├── ReleaseNotes.tsx     # Ventana «Novedades de la versión» y lista de cambios (también en la Ayuda)
│       ├── ImportLocalDataModal.tsx # Importación de datos locales en el primer inicio de sesión
│       ├── ImportAccountDialog.tsx # Vista previa y avance de «Importar datos (JSON)»
│       ├── NewGoalInline.tsx    # Crear una meta desde el formulario de la tarea
│       ├── WelcomeDialog.tsx · ProductTour.tsx # Bienvenida y recorrido guiado
│       ├── HowItWorks.tsx       # Ayuda
│       ├── LegalPage.tsx · LegalTexts.tsx · LegalLinks.tsx # Privacidad, condiciones y aviso legal
│       ├── Deferred.tsx         # Secciones y ventanas que se cargan al abrirlas
│       ├── SyncIndicator.tsx    # Indicador de sincronización (pulsar fuerza la sincronización)
│       └── SplashScreen.tsx     # Pantalla de arranque
└── tests/
    ├── unit/ · integration/     # Lógica pura e importación de datos locales (node:test)
    ├── rules/                   # Reglas de Firestore contra el emulador
    └── e2e/                     # Playwright: calentamiento (warm-up.setup.ts), flujos completos y auditoría WCAG (axe-core)
```

---

## 🧱 Arquitectura y modelo de datos

- **Sin servidor propio:** la SPA (React) habla directamente con Firebase: Authentication para las cuentas y Cloud Firestore (`europe-west1`) para los datos, con caché persistente para funcionar sin conexión y sincronizar entre dispositivos y pestañas. Las reglas de Firestore (`firestore.rules`) son la frontera de seguridad: cada cuenta solo lee y escribe lo suyo.
- **Cloud Functions invocables** (2.ª gen, `europe-west1`) para lo que no puede hacer el navegador: los accesos (`syncAccess`, `requestAccess`, `setAccess`, `setAccessMode`, `forgetAccess`, `revokeSessions`) el contacto (`submitFeedback`, `replyToFeedback`), con los avisos por email (SMTP de IONOS), y las notificaciones push de las alarmas (`registerPushDevice` y `unregisterPushDevice`, el trigger `queueTaskAlarm` sobre las tareas y `sendDueAlarms`, programada cada minuto; `functions/src/push.ts`), las funciones extra (`setFeatures`) y la sincronización con Google Calendar (`connectGoogleCalendar`, `disconnectGoogleCalendar` y los triggers `syncTaskCalendar`, `calendarFeatureChanged` y `calendarPrefChanged`; `functions/src/calendarSync.ts`). La función HTTP `api` solo sirve `/.well-known/assetlinks.json` para la APK Android.
- **En el navegador:** las sugerencias de área y de meta, el Top 10, las alarmas, las estadísticas, las descargas y los archivos de calendario.

**Modelo de datos (Firestore).** Los tipos están en `src/types/index.ts`.

| Ruta                                                                   | Contenido                                                                                                                                                                                                                       | Quién la escribe |
| :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------- |
| `users/{uid}`                                                          | Perfil: nombre, email, foto, alta y último acceso, bienvenida vista, áreas de la Rueda (`wheelAreas`), novedades vistas (`releaseNotesSeen`) y, en la cuenta de administración, sus funciones extra encendidas (`featurePrefs`) | La app           |
| `users/{uid}/tasks`                                                    | Tareas: lista, estado, prioridad, fechas, alarma, repetición, meta, proyecto, dependencia y notas                                                                                                                               | La app           |
| `users/{uid}/wheelLogs`                                                | Evaluaciones de la Rueda: una puntuación de 0 a 10 por área (solo se añaden)                                                                                                                                                    | La app           |
| `users/{uid}/goals` · `users/{uid}/projects`                           | Metas (área, para qué, fecha objetivo) y proyectos (meta, fecha de fin)                                                                                                                                                         | La app           |
| `users/{uid}/meetings` · `users/{uid}/emails`                          | Reuniones y correos de «Tiempo protegido» (retirado en la 1.3.0): los guardados antes, sin pantalla; van en la descarga y se borran con la cuenta                                                                               | La importación   |
| `access/{uid}` · `admins/{uid}` · `settings/access` · `blocked_emails` | Solicitudes y estado del acceso, marca de administración, modo de aprobación y emails bloqueados                                                                                                                                | Cloud Functions  |
| `calendar_tokens/{uid}` · `calendar_status/{uid}`                      | Conexión con Google Calendar: el permiso de Google cifrado, el calendario y la zona horaria; y el estado que ve la cuenta (`calendar_status`, solo lo lee ella)                                                                 | Cloud Functions  |
| `features/{uid}`                                                       | Funciones extra que la administración ha activado a la cuenta (`granted`)                                                                                                                                                       | Cloud Functions  |
| `feedback_tickets` · `feedback_limits`                                 | Mensajes de «Escríbenos» con sus respuestas, y su límite por hora                                                                                                                                                               | Cloud Functions  |
| `push_devices/{uid}` · `push_tokens` · `alarm_queue` · `alarm_sent`    | Tokens de FCM y zona horaria de cada dispositivo, de qué cuenta es cada token, la próxima alarma por enviar de cada tarea y la última enviada                                                                                   | Cloud Functions  |

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Haz un Fork del repositorio.
2. Crea una rama para tu funcionalidad (`git checkout -b feat/nueva-funcionalidad`).
3. Realiza tus cambios y comprueba la compilación y las pruebas (`npm run build && npm run typecheck && npm run lint && npm run format:check && npm test && npm --prefix functions test`).
4. Haz Commit de tus cambios (`git commit -m 'feat: añade nueva funcionalidad'`).
5. Haz Push a tu rama (`git push origin feat/nueva-funcionalidad`).
6. Abre un Pull Request que explique qué cambia y cómo se ha probado.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT** — consulta el archivo [LICENSE](LICENSE) para más detalles.
