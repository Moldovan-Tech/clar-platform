import { LOCALE_TAG, messages } from '../i18n/locale';

// NOVEDADES DE CADA VERSIÓN, contadas para quien usa la app (los detalles técnicos están en el README). Al publicar una
// versión se añade su entrada al principio, con la misma versión que package.json (tests/unit/releaseNotes.test.ts lo
// comprueba) y cada cambio en español y en inglés. Al entrar después de una actualización, cada cuenta ve una vez las de
// su versión; todas están en la Ayuda.
// Las funciones extra no se anuncian aquí: solo las ve quien las tiene, en el menú de su cuenta.

export interface ReleaseChange {
  title: string;
  text: string;
}

export interface ReleaseNote {
  version: string;
  // Cuándo salió, para mostrarlo en el idioma de la app (p. ej. «octubre de 2026», «October 2026»)
  month: string;
  changes: ReleaseChange[];
}

const monthFormat = new Intl.DateTimeFormat(LOCALE_TAG, { month: 'long', year: 'numeric', timeZone: 'UTC' });
// El mes de salida (`month` de 1 a 12)
const released = (year: number, month: number) => monthFormat.format(Date.UTC(year, month - 1));

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '1.3.2',
    month: released(2026, 11),
    changes: [
      messages(
        {
          title: 'Aviso de versión nueva',
          text: 'Si CLAR está abierta cuando sale una versión nueva, te lo dice con un aviso: pulsa «Actualizar» para pasar a ella sin cerrar la app, o «Más tarde» para seguir con lo que hacías. Si tienes un formulario abierto, el aviso espera a que lo cierres.'
        },
        {
          title: 'New version notice',
          text: 'If CLAR is open when a new version comes out, a notice tells you: press “Update” to switch to it without closing the app, or “Later” to carry on with what you were doing. If you have a form open, the notice waits until you close it.'
        }
      ),
      messages(
        {
          title: 'Buscar actualizaciones',
          text: 'En «Tu cuenta», debajo del idioma, puedes ver qué versión usas y buscar una nueva cuando quieras.'
        },
        {
          title: 'Check for updates',
          text: "In “Your account”, below the language, you can see which version you're using and check for a new one whenever you like."
        }
      ),
      messages(
        {
          title: 'Mantenimiento',
          text: 'Componentes del servidor actualizados, con sus arreglos de seguridad.'
        },
        {
          title: 'Maintenance',
          text: 'Server components updated, with their security fixes.'
        }
      )
    ]
  },
  {
    version: '1.3.1',
    month: released(2026, 11),
    changes: [
      messages(
        {
          title: 'Arreglos',
          text: 'Al entrar con tu cuenta desde otro navegador o dispositivo, CLAR ya no vuelve a mostrar la bienvenida, y se abre en el idioma de tu cuenta en lugar de cambiarlo por el del navegador.'
        },
        {
          title: 'Fixes',
          text: "When you sign in from another browser or device, CLAR no longer shows the welcome again, and it opens in your account's language instead of replacing it with the browser's."
        }
      )
    ]
  },
  {
    version: '1.3.0',
    month: released(2026, 11),
    changes: [
      messages(
        {
          title: '«Tiempo protegido» pasa a la Ayuda',
          text: 'La sección «Tiempo protegido» se convierte en «Recomendaciones para proteger tu tiempo», en la Ayuda: mañanas sin reuniones, reuniones con hora de fin y orden del día, y el correo y los mensajes a horas fijas. Las reuniones ya no salen en Inicio ni en la Agenda.'
        },
        {
          title: '“Protected time” moves to Help',
          text: '“Protected time” becomes “Tips to protect your time”, in Help: meeting-free mornings, meetings with an end time and an agenda, and email and messages at set times. Meetings no longer show on Home or in the Agenda.'
        }
      ),
      messages(
        {
          title: 'Reuniones y correos guardados',
          text: 'Si guardaste reuniones o correos (también borradores), siguen en tu cuenta y en «Descargar mis datos». Puedes eliminarlos desde el menú de tu cuenta.'
        },
        {
          title: 'Saved meetings and emails',
          text: 'If you saved meetings or emails (drafts too), they are still in your account and in “Download my data”. You can delete them from your account menu.'
        }
      )
    ]
  },
  {
    version: '1.2.1',
    month: released(2026, 10),
    changes: [
      messages(
        {
          title: 'Arreglos',
          text: 'Un área de la Rueda que renombraste conserva su nombre al cambiar de idioma, y la página de entrada y la política de privacidad explican mejor quién ve tus datos y qué registros técnicos se guardan.'
        },
        {
          title: 'Fixes',
          text: 'A Wheel area you renamed keeps its name when you switch languages, and the sign-in page and the privacy policy explain better who sees your data and which technical logs are kept.'
        }
      )
    ]
  },
  {
    version: '1.2.0',
    month: released(2026, 10),
    changes: [
      messages(
        {
          title: 'CLAR en inglés',
          text: 'Ahora puedes usar CLAR en inglés: elige «English» en la página de entrada o en el menú de tu cuenta. El idioma se guarda en tu cuenta, y las notificaciones y los emails te llegan en él. El español sigue siendo el idioma por defecto.'
        },
        {
          title: 'CLAR in English',
          text: 'You can now use CLAR in English: choose “English” on the sign-in page or in your account menu. The language is saved in your account, and notifications and emails reach you in it. Spanish is still the default.'
        }
      ),
      messages(
        {
          title: 'Escríbenos también en inglés',
          text: 'En «Escríbenos» puedes escribir en español o en inglés.'
        },
        {
          title: 'Write to us in English too',
          text: 'In “Contact us” you can write in Spanish or English.'
        }
      )
    ]
  },
  {
    version: '1.1.0',
    month: released(2026, 10),
    changes: [
      messages(
        {
          title: 'Celebraciones',
          text: 'Al terminar una tarea que llevaba 14 días o más en tu lista, lograr una meta o terminar un proyecto, CLAR te lo celebra con un mensaje y un poco de confeti. Si prefieres que no, se desactivan en Accesibilidad.'
        },
        {
          title: 'Celebrations',
          text: "When you finish a task that had been on your list for 14 days or more, achieve a goal or finish a project, CLAR celebrates with a message and a bit of confetti. If you'd rather not, turn them off in Accessibility."
        }
      ),
      messages(
        {
          title: 'Repite a tu manera',
          text: 'En «Más opciones», «Repetir» se lee como «Cada 3 días» o «Cada 2 semanas», y el número se escribe sin pelearte con él. Y hay un modo nuevo, «3 días después de hacerla», para lo que se repite contando desde que lo haces.'
        },
        {
          title: 'Repeat your way',
          text: "In “More options”, “Repeat” reads like “Every 3 days” or “Every 2 weeks”, and you type the number without fighting it. And there's a new mode, “3 days after you do it”, for things that repeat counting from when you do them."
        }
      ),
      messages(
        {
          title: 'Alarmas que abren su tarea',
          text: 'Al tocar la notificación de una alarma se abre su tarea, y al abrir CLAR después no te llega otra notificación de la misma alarma. Con «Probar notificación», en el menú de tu cuenta, compruebas que te llegan con CLAR cerrada.'
        },
        {
          title: 'Alarms that open their task',
          text: "Tapping an alarm notification opens its task, and when you open CLAR afterwards you don't get another notification for the same alarm. With “Test notification”, in your account menu, you can check that they reach you when CLAR is closed."
        }
      ),
      messages(
        {
          title: 'En el iPhone',
          text: 'CLAR explica cómo añadirla a la pantalla de inicio, que es desde donde puede avisarte de las alarmas (con iOS 16.4 o posterior). Desde el icono, entrar con Google abre la página de Google en lugar de una ventana, y si no se puede dictar, te propone el micrófono del teclado.'
        },
        {
          title: 'On iPhone',
          text: "CLAR explains how to add it to your Home Screen, which is where it can notify you of alarms from (with iOS 16.4 or later). From the icon, signing in with Google opens Google's page instead of a window, and if dictation isn't available, CLAR suggests the keyboard's microphone."
        }
      )
    ]
  },
  {
    version: '1.0.0',
    month: released(2026, 10),
    changes: [
      messages(
        {
          title: 'Dicta tus tareas',
          text: 'En los navegadores que lo permiten, el micrófono del formulario escribe la tarea o una nota mientras hablas, hasta 30 segundos cada vez. En Android, al mantener pulsado el icono de la app, «Nueva tarea por voz» abre una tarea nueva con el micrófono escuchando.'
        },
        {
          title: 'Dictate your tasks',
          text: 'In browsers that support it, the microphone in the form types the task or a note as you speak, up to 30 seconds at a time. On Android, when you long-press the app icon, “Nueva tarea por voz · New task by voice” opens a new task with the microphone listening.'
        }
      ),
      messages(
        {
          title: 'Borradores',
          text: 'Si cierras una tarea nueva con algo escrito sin guardarla, se queda en «Borradores», en Listas, tal como estaba. Con «Continuar» sigues con ella cuando quieras; al guardarla, pasa a tu lista.'
        },
        {
          title: 'Drafts',
          text: 'If you close a new task with something written without saving it, it stays in “Drafts”, in Lists, just as it was. With “Continue” you pick it up whenever you want; when you save it, it moves to your list.'
        }
      ),
      messages(
        {
          title: 'Comparte CLAR',
          text: '«Compartir CLAR», en el menú de tu cuenta, manda el enlace a quien quieras. Quien entra por primera vez ve antes qué es CLAR y cómo se tratan sus datos.'
        },
        {
          title: 'Share CLAR',
          text: '“Share CLAR”, in your account menu, sends the link to anyone you like. People who come in for the first time see first what CLAR is and how their data is handled.'
        }
      ),
      messages(
        {
          title: 'Otros cambios',
          text: 'Al crear una cuenta con email se confirma la edad mínima y se aceptan las condiciones, y una dirección que no existe ahora lo dice en lugar de abrir la app.'
        },
        {
          title: 'Other changes',
          text: "When you create an account with email, you confirm the minimum age and accept the terms, and an address that doesn't exist now says so instead of opening the app."
        }
      )
    ]
  },
  {
    version: '0.9.7',
    month: released(2026, 10),
    changes: [
      messages(
        {
          title: 'Lo de hoy, a la vista',
          text: 'Las tareas que vencen hoy llevan la etiqueta «Hoy» y el título en negrita y, en las listas, un borde violeta. Así ves de un vistazo lo que toca hoy, también en Metas y en la Agenda.'
        },
        {
          title: "Today's tasks, in plain sight",
          text: "Tasks due today have the “Today” label and a bold title and, in the lists, a violet border. So you see at a glance what's on for today, also in Goals and in the Agenda."
        }
      ),
      messages(
        {
          title: 'Alarmas a su hora',
          text: 'Una tarea con solo fecha te avisa ese mismo día a la hora de su alarma (antes sonaba la víspera). Con hora límite, la alarma tiene que ser antes. La tarjeta dice cuándo sonará («hoy 17:00»), el formulario te avisa si esa hora ya ha pasado, y las tareas que se repiten pueden llevar alarma sin hora límite.'
        },
        {
          title: 'Alarms on time',
          text: 'A task with only a date notifies you that same day at its alarm time (it used to go off the day before). With a due time, the alarm has to be earlier. The card says when it will go off (“today 17:00”), the form warns you if that time has already passed, and repeating tasks can have an alarm without a due time.'
        }
      ),
      messages(
        {
          title: 'Sin conexión, también al abrirla',
          text: 'CLAR se abre sin conexión, también la app instalada en Android, una vez abierta con conexión en ese dispositivo. Y mientras carga, el brillo del logo da vueltas dentro del círculo.'
        },
        {
          title: 'Offline, even when opening it',
          text: "CLAR opens offline, the installed Android app too, once it has been opened online on that device. And while it loads, the logo's sparkle spins inside the circle."
        }
      ),
      messages(
        {
          title: 'Al calendario, con su hora',
          text: '«Añadir al calendario» pone una tarea con solo fecha a la hora de su alarma o, si no tiene, a las 09:00, durante una hora. Con el archivo .ics, el aviso del calendario suena a la vez que el de CLAR.'
        },
        {
          title: 'To your calendar, at its time',
          text: "“Add to calendar” puts a task with only a date at its alarm time or, if it has none, at 09:00, for one hour. With the .ics file, the calendar reminder goes off at the same time as CLAR's."
        }
      )
    ]
  },
  {
    version: '0.9.6',
    month: released(2026, 10),
    changes: [
      messages(
        {
          title: 'Alarmas con CLAR cerrada',
          text: 'Con «Avisarme también con CLAR cerrada», en el menú de tu cuenta, las alarmas te llegan aunque la app esté cerrada o el móvil bloqueado, en los navegadores que lo permiten (en el iPhone, con CLAR instalada en la pantalla de inicio). Se activa en cada dispositivo, y la notificación solo lleva el nombre de la tarea si lo pides.'
        },
        {
          title: 'Alarms when CLAR is closed',
          text: 'With “Also notify me when CLAR is closed”, in your account menu, alarms reach you even when the app is closed or your phone is locked, in browsers that support it (on iPhone, with CLAR installed on the Home Screen). You turn it on for each device, and the notification only shows the task name if you ask for it.'
        }
      ),
      messages(
        {
          title: 'Proyectos, cuando te ayuden',
          text: 'La bienvenida, el recorrido guiado y la Ayuda presentan los proyectos como lo que son: una forma opcional de agrupar tareas relacionadas de una meta, o de una parte de ella. Una meta puede no tener ninguno, o tener uno o varios.'
        },
        {
          title: 'Projects, when they help',
          text: 'The welcome, the guided tour and Help present projects as what they are: an optional way to group related tasks of a goal, or of part of one. A goal can have none, one or several.'
        }
      ),
      messages(
        {
          title: 'Importar sin recortes',
          text: 'Al importar una descarga, un registro con un texto o una lista más largos de lo permitido no entra recortado: cuenta como no válido, y la vista previa te lo dice.'
        },
        {
          title: 'Imports without cuts',
          text: "When you import a download, a record with a text or a list longer than allowed isn't brought in cut short: it counts as invalid, and the preview tells you so."
        }
      ),
      messages(
        {
          title: 'Privacidad al día',
          text: 'La política de privacidad explica las alarmas con CLAR cerrada.'
        },
        {
          title: 'Privacy, up to date',
          text: 'The privacy policy explains alarms when CLAR is closed.'
        }
      ),
      messages(
        {
          title: 'Novedades al entrar',
          text: 'Desde ahora, al entrar después de una actualización, CLAR te cuenta sus novedades una vez. Las de cada versión están en la Ayuda, y las de la actual, también al pulsar el número de versión.'
        },
        {
          title: "What's new when you sign in",
          text: "From now on, when you sign in after an update, CLAR tells you what's new, once. Every version's notes are in Help, and the current one's also when you tap the version number."
        }
      )
    ]
  }
];

export const releaseFor = (version: string) => RELEASE_NOTES.find((r) => r.version === version) ?? null;

const VERSION = /^\d+(\.\d+)*$/;

// Compara dos versiones numéricas (0.9.10 va después de 0.9.6): negativo, cero o positivo
export const compareVersions = (a: string, b: string) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
};

// Si lo guardado dice que ya se vieron las novedades de `current` (o las de una versión posterior)
export const hasSeenRelease = (seen: unknown, current: string) =>
  typeof seen === 'string' && VERSION.test(seen) && compareVersions(seen, current) >= 0;

// Si al entrar toca enseñar las novedades de esta versión: tiene entrada, la cuenta ya pasó la bienvenida (las nuevas
// empiezan por ella, que las da por vistas) y no las ha visto, ni según su perfil ni en este dispositivo
export const shouldShowReleaseNotes = ({
  current,
  onboarded,
  seenInProfile,
  seenHere
}: {
  current: string;
  onboarded: boolean;
  seenInProfile: unknown;
  seenHere: unknown;
}) =>
  Boolean(releaseFor(current)) &&
  onboarded &&
  !hasSeenRelease(seenInProfile, current) &&
  !hasSeenRelease(seenHere, current);

// Copia en este dispositivo de la última versión cuyas novedades se vieron: así no se repiten sin conexión ni antes de
// que llegue el perfil
const localKey = (uid: string) => `clar_release_notes:${uid}`;

export const seenReleaseLocally = (uid: string, storage: Storage = localStorage) => {
  try {
    return storage.getItem(localKey(uid));
  } catch {
    return null;
  }
};

export const rememberReleaseLocally = (uid: string, version: string, storage: Storage = localStorage) => {
  try {
    storage.setItem(localKey(uid), version);
  } catch {
    // Sin almacenamiento local basta con el perfil
  }
};
