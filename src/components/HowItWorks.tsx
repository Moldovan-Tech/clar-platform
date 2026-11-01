import React from 'react';
import { pushAvailable } from '../services/push';
import { RELEASE_NOTES } from '../services/releaseNotes';
import { ReleaseChanges } from './ReleaseNotes';
import { AppTab } from '../types';
import { LegalLink } from './LegalLinks';
import { messages } from '../i18n/locale';
import {
  FolderKanban,
  BookOpen,
  Compass,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  Database,
  Link2,
  CalendarDays,
  LayoutDashboard,
  Target,
  Sparkles
} from 'lucide-react';

interface HowItWorksProps {
  onNavigate: (tab: AppTab) => void;
  // Volver a ver el recorrido guiado o la bienvenida
  onStartTour: () => void;
  onShowWelcome: () => void;
  onContact: () => void;
  // La sincronización con Google Calendar está en uso en la cuenta. Las funciones extra no se anuncian: la Ayuda solo
  // las explica a quien las tiene
  calendarSync: boolean;
}

// Lo que la Ayuda explica según la cuenta y el dispositivo: la sincronización con Google Calendar (función extra) y
// las alarmas con CLAR cerrada (notificaciones push, si esta instalación las ofrece)
interface HelpOptions {
  calendarSync: boolean;
  push: boolean;
}

const m = messages(
  {
    title: 'Ayuda',
    intro:
      'CLAR va de lo que te importa a lo que haces hoy: decides qué áreas de tu vida quieres mejorar (Rueda), les pones metas, conviertes cada meta en acciones concretas (tareas; si quieres, agrupas las relacionadas en proyectos con fecha de fin), eliges qué toca hoy (Top 10 y Agenda) y proteges el tiempo para hacerlas. En el móvil, la barra inferior lleva Inicio, Listas, Agenda y Metas; la Rueda, Proyectos y la Ayuda están en «Más».',
    quickGuide: 'Guía rápida',
    quickGuideText:
      'Un recorrido de un minuto por lo esencial, la introducción al método, o escríbenos con una idea o un fallo: te responderemos por email.',
    startTour: 'Repetir el recorrido',
    showWelcome: 'Ver la introducción',
    contact: 'Escríbenos',
    firstSteps: 'Primeros pasos',
    steps: [
      { title: 'Evalúa tu Rueda de la Vida', text: 'Es tu punto de partida y muestra qué áreas necesitan atención.' },
      { title: 'Ponle una meta a un área', text: 'En «Metas», empieza por las áreas más bajas.' },
      { title: 'Añade tareas a tus metas', text: 'Con «Añadir tarea» en cada meta: acciones físicas concretas.' },
      {
        title: 'Protege tu tiempo',
        text: 'Mañanas sin reuniones y el correo a horas fijas: más abajo, las recomendaciones.'
      }
    ],
    screens: {
      home: {
        title: 'Inicio',
        points: [
          'El foco de la lista activa (Profesional o Personal) y sus indicadores: Top 10 y Rueda de la Vida.',
          'Tus estadísticas: tareas hechas por día, semana y mes (y las canceladas, que no cuentan como hechas), cuántas terminas antes o después del plazo, tu velocidad, tu racha y tus pendientes, con las vencidas y las bloqueadas.',
          'Tus metas activas con su progreso, y tus proyectos activos con su batería y su plazo.',
          'Recomendaciones según tus datos, por ejemplo empezar por la tarea vencida más antigua.'
        ]
      },
      wheel: {
        title: 'Rueda de la Vida',
        points: [
          'Puntúa de 0 a 10 tu satisfacción en cada área. Empiezas con 7: Salud, Carrera Profesional, Finanzas, Familia, Ocio, Relaciones y Espiritualidad.',
          '«Editar áreas» te deja renombrarlas, añadir las tuyas y ocultar las que no uses (entre 3 y 12 a la vista). Un área oculta conserva sus evaluaciones, sus metas y sus tareas.',
          'Cada vez que pulsas «Guardar la evaluación» se guarda una evaluación nueva; las anteriores nunca se modifican.',
          'Activa la comparativa histórica para superponer una evaluación anterior y ver qué áreas han mejorado.',
          'Las áreas más bajas son las mejores candidatas para una meta: en «Metas» aparecen las primeras.'
        ]
      },
      goals: {
        title: 'Metas',
        points: [
          'Una meta es lo que quieres conseguir en un área de tu Rueda, por ejemplo «Correr una media maratón» en Salud. Puede llevar un para qué y una fecha objetivo.',
          'Las áreas aparecen de la puntuación más baja a la más alta, según tu última evaluación. Las que tienen 5 o menos y aún no tienen metas salen en «Necesitan atención».',
          'Cada meta muestra su progreso (tareas hechas sobre el total) y las tareas que le quedan. Pulsa una para editarla.',
          '«Añadir tarea» crea una tarea ya vinculada a la meta. También puedes vincularla, o crear la meta, desde el formulario de la tarea; la tarea toma el área de su meta.',
          'Cuando la consigas, márcala como lograda; si deja de interesarte, archívala. Las logradas y archivadas quedan plegadas al final.',
          'Cada meta muestra también sus proyectos activos, con su avance; «Nuevo proyecto» crea uno ya en esa meta.'
        ]
      },
      projects: {
        title: 'Proyectos (opcional)',
        points: [
          'Los proyectos son opcionales: una herramienta para agrupar tareas relacionadas que buscan cumplir una meta o una parte de ella. Una meta puede tener ninguno, uno o varios; sus tareas pueden ir sueltas, en un proyecto o mezcladas.',
          'Por ejemplo, la meta «Tener la casa a punto» puede tener el proyecto «Reformar la cocina», con fecha de fin, y otras tareas sueltas. Las tareas de un proyecto cuentan en el avance de su meta.',
          'Su avance se ve como una batería: el porcentaje de tareas hechas (las canceladas no cuentan).',
          'Abre un proyecto para ver y manejar sus tareas igual que en «Listas»: completarlas, cambiar su estado, editarlas o borrarlas. «Añadir tarea» la crea ya en el proyecto.',
          'Avisa si va fuera de plazo (pasó la fecha de fin y quedan tareas), si termina pronto y si alguna tarea vence después del fin. Cuando acabes, márcalo como terminado; también lo puedes archivar.',
          'Al eliminar un proyecto, sus tareas siguen en la meta. Una meta con proyectos no se puede eliminar hasta quitárselos.'
        ]
      },
      tasks: {
        title: 'Listas',
        points: ({ calendarSync, push }: HelpOptions) => [
          'Dos listas separadas, Profesional y Personal, para no mezclar contextos. Cambia entre ellas con el selector de la barra superior.',
          'Las 10 primeras tareas, según el orden y los filtros que elijas (prioridad, fecha límite, estimación, última actualización, estado o área), forman tu Top 10; el resto queda en segundo plano.',
          'Si la fecha límite está a más de una semana, la tarea cuenta un nivel menos de prioridad. También puedes indicar cuánto te llevará (estimación).',
          'Al crear una tarea, el analizador te pide una acción física concreta (por ejemplo «Llamar al taller…») en lugar de un tema abstracto.',
          'Meta: vincula la tarea a una de tus metas y tomará su área (si el título se parece a una meta, CLAR te propone vincularla). Sin meta, el motor de sugerencias te propone el área de la Rueda con la que se relaciona. Si la meta aún no existe, «Nueva meta» la crea ahí mismo con su nombre y su área.',
          'Tareas que dependen de otras: en «Más opciones», «Empieza después de» elige la tarea a la que espera. Mientras esa no esté hecha o cancelada, esta sale con un candado («Bloqueada: espera a…»), no entra en el Top 10 y no se puede marcar como hecha. Al terminar la otra se desbloquea sola. Varias tareas pueden esperar a la misma y avanzar en paralelo.',
          'Cada tarea tiene un estado: Pendiente, En progreso, Bloqueada, Hecha o Cancelada. Mientras espera a otra tarea no se puede poner «En progreso» ni «Hecha». Hecha y Cancelada la archivan; una cancelada no cuenta como hecha en las estadísticas ni en el avance de las metas. Desde «Archivadas» la reactivas cambiando su estado.',
          'Celebraciones: al hacer una tarea que llevaba 14 días o más en tu lista, lograr una meta o terminar un proyecto, el aviso lo celebra con un mensaje y un breve confeti. Si prefieres no verlas, apágalas en «Accesibilidad».',
          'Si cierras con cambios sin guardar el formulario de una tarea que ya existe, una meta o un proyecto, o el editor de áreas, CLAR te pregunta antes de descartarlos; si cierras la pestaña, te avisa el navegador. Una tarea nueva con algo escrito se guarda sola como borrador.',
          'Puedes darle una fecha límite o un intervalo, con hora opcional: el título se pone violeta cuando falta menos de una semana y rojo cuando ha vencido. El día que vence, hasta su hora límite, destaca con la etiqueta «Hoy» y el título en negrita (en las listas, también con un borde violeta). Las fechas se escriben como dd/mm/aaaa o se eligen en el calendario, con la semana empezando en lunes.',
          'Borradores: si cierras una tarea nueva con algo escrito sin guardarla, se guarda sola en «Borradores» (junto a «Archivadas»), tal como estaba, con «Deshacer» por si no la querías. Con «Continuar» sigues con ella; al guardarla, pasa a tu lista. Los cambios de una tarea que ya existe no se guardan solos: al cerrar con cambios, CLAR te pregunta.',
          'Dictar: en los navegadores que lo permiten, el micrófono del formulario escribe la tarea o una nota mientras hablas (hasta 30 segundos cada vez; vuelve a pulsarlo para parar). En Android, al mantener pulsado el icono de la app instalada (en el ordenador, con el botón derecho), «Nueva tarea por voz · New task by voice» abre una tarea nueva con el micrófono escuchando; tras instalar una versión nueva, puede tardar un día en salir. En la app del iPhone no se puede dictar: usa el micrófono del teclado.',
          'Pulsa el título de una tarea, o su lápiz, para editarla. El menú «⋯» tiene el estado, el calendario, la descarga y eliminar.',
          'Con fecha límite, «Añadir al calendario», en el menú «⋯» de la tarea, la lleva a Google Calendar, Outlook o cualquier calendario (archivo .ics), con su descripción y sus notas. Con solo fecha, el evento dura una hora y empieza a la hora de su alarma o, sin alarma, a las 09:00. Si tiene hora de inicio y no hora límite, el evento dura una hora.' +
            (calendarSync
              ? ' Con «Sincronizar con Google Calendar», si conectas tu cuenta de Google (en el menú de tu cuenta), tus tareas con fecha aparecen solas en un calendario «CLAR» y se actualizan al cambiarlas (las de «Algún día», no); lo que cambies en Google no vuelve a CLAR.'
              : ''),
          '«Descargar (JSON)», en el menú «⋯», guarda la tarea con todos sus datos (y los nombres de su meta, su proyecto y las tareas de las que depende). Las metas y los proyectos también se descargan, con sus tareas.',
          'Alarma: una hora para que CLAR te avise el día límite. Suena ese día a esa hora; con hora límite, tiene que ser antes de ella (con la tarea a las 11:00, una alarma a las 10:57 suena 3 minutos antes). La tarjeta dice cuándo sonará («hoy 17:00»), y en una tarea que se repite, cada repetición la lleva. Si la pones cuando esa hora ya ha pasado, no suena.',
          push
            ? 'La alarma avisa mientras CLAR esté abierta: dentro de la app y, si lo permites, con una notificación del sistema. Con «Avisarme también con CLAR cerrada», en el menú de tu cuenta, te llega aunque CLAR esté cerrada o el móvil bloqueado, y «Probar notificación» comprueba que llega. Al tocar la notificación se abre la tarea. En el iPhone solo funciona desde CLAR en la pantalla de inicio, con iOS 16.4 o posterior: en Safari, Compartir › «Añadir a pantalla de inicio»; después abre CLAR desde el icono y vuelve a entrar. En Android, para que salga en lo alto de la pantalla, activa «Mostrar en pantalla emergente» en los ajustes de notificaciones de CLAR. Si no llegó y abres CLAR después de su hora pero antes del plazo, avisa al momento y dice a qué hora era. El archivo .ics del calendario también la lleva.'
            : 'La alarma avisa mientras CLAR esté abierta, también en segundo plano: dentro de la app y, si lo permites (en el formulario o en el menú de tu cuenta), con una notificación del sistema (en el iPhone, solo si instalas CLAR en la pantalla de inicio). Con CLAR cerrada o el móvil bloqueado no puede sonar: si abres CLAR después de su hora pero antes del plazo, avisa al momento y dice a qué hora era. Para no perderla, añade la tarea al calendario con el archivo .ics, que lleva la alarma.',
          'Las horas (límite, de inicio y de la alarma) se escriben en 24 h, de 00:00 a 23:59: 9:30, 0930 o 21:45. Lo que no es una hora no se guarda.',
          'Las tareas pueden repetirse cada N días, semanas, meses o años (por ejemplo, «cada 3 días» o «cada mes, el 2.º lunes»): en «Más opciones», «Repetir». En días y semanas, la siguiente puede ir en fechas fijas o contar desde que la haces: con «3 días después de hacerla», vence 3 días después del día en que la marques Hecha. Al repetir, «Inicio» es desde cuándo se repite y la fecha límite hasta cuándo; cada repetición vence su propio día. Al marcarla Hecha o Cancelada se archiva y se crea la siguiente.',
          'Las ideas sin urgencia van a «Algún día» y no compiten con el Top 10.'
        ]
      },
      agenda: {
        title: 'Agenda',
        points: [
          'Vista semanal (de lunes a domingo) y por días con las tareas con fecha de tus dos listas, los intervalos y las próximas repeticiones de las tareas que se repiten en fechas fijas.',
          'En la vista por días, las tareas vencidas aparecen aparte. Pulsa una tarea para editarla.'
        ]
      }
    },
    // Consejos sin pantalla propia: no remiten a nada de la app
    tips: {
      title: 'Recomendaciones para proteger tu tiempo',
      points: [
        'El «triángulo de las Bermudas» del tiempo son sus tres grandes fugas: las reuniones, el correo y los mensajes. Si las contienes, te queda tiempo para lo importante.',
        'Deja las mañanas libres de reuniones para el trabajo que pide concentración (por ejemplo, ninguna antes de las 12:00) y pásalas a primera hora de la tarde.',
        'Cada reunión, con hora de fin, un orden del día cerrado y alguien que la modere.',
        'Al escribir un correo, empieza por el contenido y los adjuntos, y elige los destinatarios al final: así no sale antes de estar listo.',
        'Atiende el correo y los mensajes en bloques, a horas fijas (por ejemplo, a media mañana y al final de la tarde), en lugar de responder a cada uno en cuanto llega.'
      ]
    },
    goTo: (title: string) => `Ir a ${title}`,
    relations: 'Cómo se relacionan',
    relationItems: [
      {
        label: 'Rueda → Metas:',
        text: 'en «Metas», las áreas van de la puntuación más baja a la más alta; las que tienen 5 o menos y aún no tienen metas salen en «Necesitan atención».'
      },
      {
        label: 'Metas → Tareas:',
        text: '«Añadir tarea» crea la tarea ya vinculada a su meta, y la tarea toma el área de la meta. Si una meta, o una parte de ella, necesita varias tareas relacionadas, puedes agruparlas en un proyecto (opcional; una meta puede tener uno o varios). Al escribir una tarea, CLAR te propone la meta que más se parece; si no tiene meta, el motor de sugerencias propone un área de la Rueda. Así lo que haces cada día queda vinculado a lo que quieres mejorar.'
      },
      {
        label: 'Tareas → Top 10 y Agenda:',
        text: 'las más importantes forman tu Top 10 y las que tienen fecha, tu Agenda; una alarma te avisa antes del plazo.'
      },
      {
        label: 'Top 10 → Tu tiempo:',
        text: 'reserva las mañanas sin reuniones para trabajar tu Top 10.'
      },
      {
        label: 'Vuelta a la Rueda:',
        text: 'cuando tus metas avancen, vuelve a evaluar la Rueda y compárala con las evaluaciones anteriores: verás el efecto de tus acciones y las áreas cambiarán de orden en «Metas».'
      }
    ],
    data: 'Tus datos',
    dataText:
      'Todo se guarda en tu cuenta de CLAR, en servidores de Google Cloud en la Unión Europea (Bélgica), y solo tú puedes acceder: tus tareas (y sus borradores), metas, proyectos y evaluaciones, y las reuniones y los correos que guardaste con versiones anteriores (de los adjuntos, solo el nombre y el tamaño), que siguen en la descarga de tus datos. Si la administración tiene activada la aprobación de cuentas, revisa cada una antes de su primer uso; para ello ve tu nombre, tu email, tu foto de perfil (si entras con Google) y el mensaje de la solicitud, nunca tus datos. Los mensajes de «Escríbenos» se guardan con tu nombre y tu email para responderte por email. Se sincroniza entre tus dispositivos y la app sigue funcionando sin conexión: los cambios se envían al recuperarla. El indicador de la cabecera está verde cuando todo está guardado en el servidor y naranja cuando hay cambios pendientes o no hay conexión; púlsalo para forzar la sincronización. Desde el menú de tu cuenta puedes descargar tus datos e importar una descarga anterior (se añade lo que falta; lo que ya tienes no se toca), cambiar la contraseña (si entras con email), cerrar la sesión en todos tus dispositivos o eliminar la cuenta con todo su contenido. Si activas «Avisarme también con CLAR cerrada» en un dispositivo, se guardan además su identificador de notificaciones y su zona horaria, y tus alarmas pendientes con el nombre de la tarea; la notificación pasa por Firebase Cloud Messaging y solo lleva el nombre si lo pides.',
    dataCalendar:
      ' Con Google Calendar conectado, los datos de tus tareas con fecha se envían a un calendario «CLAR» de tu cuenta de Google.',
    dataDetails: 'Todo el detalle, en la',
    privacyPolicy: 'política de privacidad',
    releaseNotes: 'Novedades',
    version: (version: string, month: string) => `Versión ${version} · ${month}`,
    accessibility: 'Accesibilidad',
    accessibilityText: (
      <>
        En el menú de tu cuenta, <strong>Accesibilidad</strong> permite agrandar el texto, activar el alto contraste,
        reducir las animaciones, hacer más visible el foco del teclado y apagar las celebraciones. Las preferencias se
        guardan en cada dispositivo. Toda la app se puede usar con el teclado y se revisa automáticamente con las pautas
        WCAG 2.1 AA. El idioma (<strong>Español / English</strong>) se cambia arriba en la página de entrada o en el
        menú de tu cuenta, y se guarda en tu cuenta.
      </>
    ),
    credits: 'Créditos',
    creditsText: (
      <>
        Algunas ideas de esta app se inspiran en el libro <em>Gestiona tu tiempo, disfruta de la vida</em>, de Jonathan
        Benito Sipos. Esta app no está afiliada ni respaldada por el autor.
      </>
    )
  },
  {
    title: 'Help',
    intro:
      'CLAR takes you from what matters to you to what you do today: you decide which areas of your life you want to improve (Wheel), set goals for them, turn each goal into concrete actions (tasks; if you like, you group related ones into projects with an end date), choose what to do today (Top 10 and Agenda) and protect the time to do them. On mobile, the bottom bar has Home, Lists, Agenda and Goals; the Wheel, Projects and Help are under “More”.',
    quickGuide: 'Quick guide',
    quickGuideText:
      "A one-minute tour of the essentials, the introduction to the method, or contact us with an idea or a bug: we'll reply by email.",
    startTour: 'Replay the tour',
    showWelcome: 'See the introduction',
    contact: 'Contact us',
    firstSteps: 'Getting started',
    steps: [
      { title: 'Assess your Wheel of Life', text: "It's your starting point and shows which areas need attention." },
      { title: 'Set a goal for an area', text: 'In “Goals”, start with the lowest areas.' },
      { title: 'Add tasks to your goals', text: 'With “Add task” on each goal: concrete physical actions.' },
      { title: 'Protect your time', text: 'Meeting-free mornings and email at set times: the tips are further down.' }
    ],
    screens: {
      home: {
        title: 'Home',
        points: [
          'The focus of the active list (Work or Personal) and its indicators: Top 10 and Wheel of Life.',
          "Your stats: tasks done per day, week and month (and canceled ones, which don't count as done), how many you finish before or after the deadline, your pace, your streak and your pending tasks, with the overdue and blocked ones.",
          'Your active goals with their progress, and your active projects with their battery and deadline.',
          'Recommendations based on your data, for example starting with the oldest overdue task.'
        ]
      },
      wheel: {
        title: 'Wheel of Life',
        points: [
          'Rate your satisfaction in each area from 0 to 10. You start with 7: Health, Career, Finances, Family, Leisure, Relationships and Spirituality.',
          "“Edit areas” lets you rename them, add your own and hide the ones you don't use (between 3 and 12 visible). A hidden area keeps its assessments, its goals and its tasks.",
          'Each time you press “Save assessment”, a new assessment is saved; earlier ones are never changed.',
          'Turn on the history comparison to overlay an earlier assessment and see which areas have improved.',
          'The lowest areas are the best candidates for a goal: in “Goals” they come first.'
        ]
      },
      goals: {
        title: 'Goals',
        points: [
          'A goal is what you want to achieve in an area of your Wheel, for example “Run a half marathon” in Health. It can have a why and a target date.',
          'Areas appear from the lowest score to the highest, based on your latest assessment. Those with 5 or less and no goals yet show up in “Need attention”.',
          'Each goal shows its progress (tasks done out of the total) and the tasks it has left. Press one to edit it.',
          "“Add task” creates a task already linked to the goal. You can also link it, or create the goal, from the task form; the task takes its goal's area.",
          'When you achieve it, mark it as achieved; if you lose interest in it, archive it. Achieved and archived goals stay collapsed at the end.',
          'Each goal also shows its active projects, with their progress; “New project” creates one already in that goal.'
        ]
      },
      projects: {
        title: 'Projects (optional)',
        points: [
          'Projects are optional: a tool to group related tasks that aim to meet a goal or part of one. A goal can have none, one or several; its tasks can be on their own, in a project or both.',
          "For example, the goal “Get the house in shape” can have the project “Redo the kitchen”, with an end date, and other standalone tasks. A project's tasks count toward its goal's progress.",
          "Its progress shows as a battery: the percentage of tasks done (canceled ones don't count).",
          'Open a project to see and manage its tasks just like in “Lists”: complete them, change their status, edit them or delete them. “Add task” creates it already in the project.',
          "It warns you if it's overdue (the end date has passed and tasks are left), if it ends soon and if any task is due after the end. When you're done, mark it as finished; you can also archive it.",
          "When you delete a project, its tasks stay in the goal. A goal with projects can't be deleted until you remove them."
        ]
      },
      tasks: {
        title: 'Lists',
        points: ({ calendarSync, push }) => [
          "Two separate lists, Work and Personal, so you don't mix contexts. Switch between them with the selector in the top bar.",
          'The first 10 tasks, by the sorting and filters you choose (priority, due date, estimate, last update, status or area), make up your Top 10; the rest stay in the background.',
          'If the due date is more than a week away, the task counts one priority level lower. You can also say how long it will take you (estimate).',
          'When you create a task, the analyzer asks you for a concrete physical action (for example “Call the garage…”) instead of an abstract topic.',
          "Goal: link the task to one of your goals and it takes the goal's area (if the title looks like a goal, CLAR suggests linking it). Without a goal, the suggestion engine proposes the Wheel area it relates to. If the goal doesn't exist yet, “New goal” creates it right there with its name and area.",
          "Tasks that depend on others: in “More options”, “Starts after” picks the task it waits for. Until that one is done or canceled, this one shows a padlock (“Blocked: waiting for…”), doesn't enter the Top 10 and can't be marked as done. When the other one is finished, it unblocks on its own. Several tasks can wait for the same one and move forward in parallel.",
          "Each task has a status: Pending, In progress, Blocked, Done or Canceled. While it waits for another task it can't be set to “In progress” or “Done”. Done and Canceled archive it; a canceled task doesn't count as done in the stats or in goal progress. From “Archived” you reactivate it by changing its status.",
          "Celebrations: when you do a task that had been on your list for 14 days or more, achieve a goal or finish a project, the notice celebrates it with a message and a short burst of confetti. If you'd rather not see them, turn them off in “Accessibility”.",
          'If you close the form of an existing task, a goal or a project, or the area editor, with unsaved changes, CLAR asks you before discarding them; if you close the tab, the browser warns you. A new task with something written is saved on its own as a draft.',
          "You can give it a due date or a date range, with an optional time: the title turns purple when less than a week is left and red when it's overdue. On the day it's due, until its due time, it stands out with the “Today” label and a bold title (in the lists, also with a purple border). Dates are typed as dd/mm/yyyy or picked from the calendar, with weeks starting on Monday.",
          "Drafts: if you close a new task with something written without saving it, it's saved on its own in “Drafts” (next to “Archived”), just as it was, with “Undo” in case you didn't want it. With “Continue” you pick it up again; when you save it, it moves to your list. Changes to an existing task aren't saved on their own: if you close with changes, CLAR asks you.",
          "Dictation: in browsers that support it, the microphone in the form types the task or a note as you speak (up to 30 seconds at a time; press it again to stop). On Android, when you long-press the installed app's icon (on a computer, right-click it), “Nueva tarea por voz · New task by voice” opens a new task with the microphone listening; after installing a new version, it can take a day to appear. In the iPhone app you can't dictate: use the keyboard's microphone.",
          "Press a task's title, or its pencil, to edit it. The “⋯” menu has the status, the calendar, the download and delete.",
          "With a due date, “Add to calendar”, in the task's “⋯” menu, takes it to Google Calendar, Outlook or any calendar (.ics file), with its description and notes. With only a date, the event lasts one hour and starts at its alarm time or, without an alarm, at 09:00. If it has a start time and no due time, the event lasts one hour." +
            (calendarSync
              ? " With “Sync with Google Calendar”, if you connect your Google account (in your account menu), your tasks with a date appear on their own in a “CLAR” calendar and update when you change them (not the “Someday” ones); what you change in Google doesn't come back to CLAR."
              : ''),
          '“Download (JSON)”, in the “⋯” menu, saves the task with all its data (and the names of its goal, its project and the tasks it depends on). Goals and projects can be downloaded too, with their tasks.',
          "Alarm: a time for CLAR to notify you on the due date. It goes off that day at that time; with a due time, it has to be before it (with the task at 11:00, an alarm at 10:57 goes off 3 minutes before). The card says when it will go off (“today 17:00”), and in a repeating task, every repeat has it. If you set it when that time has already passed, it doesn't go off.",
          push
            ? "The alarm notifies you while CLAR is open: inside the app and, if you allow it, with a system notification. With “Also notify me when CLAR is closed”, in your account menu, it reaches you even when CLAR is closed or your phone is locked, and “Test notification” checks that it arrives. Tapping the notification opens the task. On iPhone it only works from CLAR on the Home Screen, with iOS 16.4 or later: in Safari, Share › “Add to Home Screen”; then open CLAR from the icon and sign in again. On Android, to have it appear at the top of the screen, turn on “Pop on screen” in CLAR's notification settings. If it didn't arrive and you open CLAR after its time but before the deadline, it notifies you right away and says what time it was. The calendar's .ics file includes it too."
            : "The alarm notifies you while CLAR is open, also in the background: inside the app and, if you allow it (in the form or in your account menu), with a system notification (on iPhone, only if you install CLAR on the Home Screen). With CLAR closed or your phone locked it can't go off: if you open CLAR after its time but before the deadline, it notifies you right away and says what time it was. So you don't miss it, add the task to your calendar with the .ics file, which includes the alarm.",
          "Times (due, start and alarm times) are written in 24-hour format, from 00:00 to 23:59: 9:30, 0930 or 21:45. Anything that isn't a time isn't saved.",
          "Tasks can repeat every N days, weeks, months or years (for example, “every 3 days” or “every month, on the 2nd Monday”): in “More options”, “Repeat”. For days and weeks, the next one can fall on fixed dates or count from when you do it: with “3 days after you do it”, it's due 3 days after the day you mark it Done. When it repeats, the start date is when it starts repeating and the due date is when it stops; each repeat is due on its own day. When you mark it Done or Canceled, it's archived and the next one is created.",
          "Ideas with no urgency go to “Someday” and don't compete with the Top 10."
        ]
      },
      agenda: {
        title: 'Agenda',
        points: [
          'Weekly view (Monday to Sunday) and daily view with the dated tasks from both your lists, date ranges and the next repeats of tasks that repeat on fixed dates.',
          'In the daily view, overdue tasks appear separately. Press a task to edit it.'
        ]
      }
    },
    tips: {
      title: 'Tips to protect your time',
      points: [
        'The “Bermuda Triangle” of time is its three big leaks: meetings, email and messages. Keep them in check and you have time left for what matters.',
        'Keep your mornings free of meetings for focused work (for example, none before 12:00) and move them to early afternoon.',
        'Every meeting with an end time, a closed agenda and someone to moderate it.',
        'When you write an email, start with the content and the attachments, and choose the recipients last: that way it never goes out before it’s ready.',
        'Deal with email and messages in batches, at set times (for example, mid-morning and late afternoon), instead of answering each one as it arrives.'
      ]
    },
    goTo: (title) => `Go to ${title}`,
    relations: 'How they connect',
    relationItems: [
      {
        label: 'Wheel → Goals:',
        text: 'in “Goals”, areas go from the lowest score to the highest; those with 5 or less and no goals yet show up in “Need attention”.'
      },
      {
        label: 'Goals → Tasks:',
        text: "“Add task” creates the task already linked to its goal, and the task takes the goal's area. If a goal, or part of it, needs several related tasks, you can group them into a project (optional; a goal can have one or several). When you write a task, CLAR suggests the goal that matches it best; if it has no goal, the suggestion engine suggests a Wheel area. That way what you do every day stays linked to what you want to improve."
      },
      {
        label: 'Tasks → Top 10 and Agenda:',
        text: 'the most important ones make up your Top 10 and the ones with a date, your Agenda; an alarm notifies you before the deadline.'
      },
      {
        label: 'Top 10 → Your time:',
        text: 'keep your mornings free of meetings to work on your Top 10.'
      },
      {
        label: 'Back to the Wheel:',
        text: "when your goals move forward, assess your Wheel again and compare it with earlier assessments: you'll see the effect of your actions, and the areas will change order in “Goals”."
      }
    ],
    data: 'Your data',
    dataText:
      "Everything is stored in your CLAR account, on Google Cloud servers in the European Union (Belgium), and only you can access it: your tasks (and their drafts), goals, projects and assessments, and the meetings and emails you saved with earlier versions (of the attachments, only the name and size), which are still in the download of your data. If the administrator has account approval turned on, they review each account before its first use; to do so they see your name, your email, your profile photo (if you sign in with Google) and the request message, never your data. “Contact us” messages are stored with your name and email so we can reply by email. Everything syncs across your devices and the app keeps working offline: changes are sent when you're back online. The indicator in the header is green when everything is saved on the server and orange when there are pending changes or no connection; press it to force a sync. From your account menu you can download your data and import an earlier download (what's missing is added; what you already have isn't touched), change your password (if you sign in with email), sign out on all your devices or delete your account with all its content. If you turn on “Also notify me when CLAR is closed” on a device, its notification ID and time zone are also stored, along with your pending alarms with the task name; the notification goes through Firebase Cloud Messaging and only includes the name if you ask for it.",
    dataCalendar:
      ' With Google Calendar connected, the data of your tasks with a date is sent to a “CLAR” calendar in your Google account.',
    dataDetails: 'All the details are in the',
    privacyPolicy: 'privacy policy',
    releaseNotes: "What's new",
    version: (version, month) => `Version ${version} · ${month}`,
    accessibility: 'Accessibility',
    accessibilityText: (
      <>
        In your account menu, <strong>Accessibility</strong> lets you make the text bigger, turn on high contrast,
        reduce animations, make the keyboard focus more visible and turn off celebrations. Preferences are saved on each
        device. The whole app can be used with the keyboard and is checked automatically against the WCAG 2.1 AA
        guidelines. The language (<strong>Español / English</strong>) is changed at the top of the sign-in page or in
        your account menu, and it is saved in your account.
      </>
    ),
    credits: 'Credits',
    creditsText: (
      <>
        Some ideas in this app are inspired by the book <em lang="es">Gestiona tu tiempo, disfruta de la vida</em>, by
        Jonathan Benito Sipos. This app is not affiliated with or endorsed by the author.
      </>
    )
  }
);

const screensFor = (
  options: HelpOptions
): { tab: AppTab; title: string; icon: React.ReactNode; points: string[] }[] => {
  const { screens } = m;
  return [
    { tab: 'home', icon: <LayoutDashboard className="h-5 w-5 text-indigo-600" />, ...screens.home },
    { tab: 'wheel', icon: <Compass className="h-5 w-5 text-indigo-600" />, ...screens.wheel },
    { tab: 'goals', icon: <Target className="h-5 w-5 text-indigo-600" />, ...screens.goals },
    { tab: 'projects', icon: <FolderKanban className="h-5 w-5 text-indigo-600" />, ...screens.projects },
    {
      tab: 'tasks',
      icon: <Briefcase className="h-5 w-5 text-indigo-600" />,
      title: screens.tasks.title,
      points: screens.tasks.points(options)
    },
    { tab: 'agenda', icon: <CalendarDays className="h-5 w-5 text-indigo-600" />, ...screens.agenda }
  ];
};

export const HowItWorks: React.FC<HowItWorksProps> = ({
  onNavigate,
  onStartTour,
  onShowWelcome,
  onContact,
  calendarSync
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          {m.title}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{m.intro}</p>
      </div>

      {/* RECORRIDO Y BIENVENIDA: se pueden repetir cuando se quiera */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{m.quickGuide}</h3>
          <p className="text-xs text-slate-700">{m.quickGuideText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStartTour}
            className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
          >
            {m.startTour}
          </button>
          <button
            type="button"
            onClick={onShowWelcome}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {m.showWelcome}
          </button>
          <button
            type="button"
            onClick={onContact}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {m.contact}
          </button>
        </div>
      </div>

      {/* PRIMEROS PASOS */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">{m.firstSteps}</h3>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {m.steps.map(({ title, text }, i) => (
            <li key={title} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div>
                <span className="block text-sm font-bold text-slate-900">{title}</span>
                <span className="mt-0.5 block text-xs text-slate-600">{text}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* PANTALLAS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {screensFor({ calendarSync, push: pushAvailable() }).map((screen) => (
          <section
            key={screen.tab}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              {screen.icon}
              {screen.title}
            </h3>
            <ul className="flex-1 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
              {screen.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onNavigate(screen.tab)}
              className="flex items-center gap-1 self-start text-xs font-bold text-indigo-700 hover:text-indigo-900"
            >
              {m.goTo(screen.title)}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>
        ))}
      </div>

      {/* RECOMENDACIONES PARA PROTEGER TU TIEMPO */}
      <section
        aria-labelledby="help-tips"
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h3 id="help-tips" className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          {m.tips.title}
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
          {m.tips.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      {/* RELACIONES ENTRE PANTALLAS */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase">
          <Link2 className="h-4 w-4 text-indigo-600" />
          {m.relations}
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
          {m.relationItems.map(({ label, text }) => (
            <li key={label}>
              <strong>{label}</strong> {text}
            </li>
          ))}
        </ul>
      </div>

      {/* TUS DATOS */}
      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
        <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-900 uppercase">
          <Database className="h-4 w-4" />
          {m.data}
        </h3>
        <p className="text-sm leading-relaxed text-amber-950">
          {m.dataText}
          {calendarSync && m.dataCalendar} {m.dataDetails}{' '}
          <LegalLink to="privacy" newTab>
            {m.privacyPolicy}
          </LegalLink>
          .
        </p>
      </div>

      {/* NOVEDADES: la versión actual, a la vista; las anteriores, plegadas */}
      <section
        aria-labelledby="help-release-notes"
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h3
          id="help-release-notes"
          className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          {m.releaseNotes}
        </h3>
        {RELEASE_NOTES.map((release, index) =>
          index === 0 ? (
            <div key={release.version} className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">{m.version(release.version, release.month)}</h4>
              <ReleaseChanges release={release} />
            </div>
          ) : (
            <details key={release.version} className="space-y-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-900">
                {m.version(release.version, release.month)}
              </summary>
              <ReleaseChanges release={release} />
            </details>
          )
        )}
      </section>

      {/* ACCESIBILIDAD */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">{m.accessibility}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{m.accessibilityText}</p>
      </div>

      {/* CRÉDITOS: única mención al autor, como cita de la fuente y sin dar a entender respaldo */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">{m.credits}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{m.creditsText}</p>
      </div>
    </div>
  );
};
