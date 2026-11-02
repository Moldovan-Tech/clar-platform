# Requisitos del sistema — CLAR

- **Versión:** 1.3.1
- **Última revisión:** 2026-11-02

Este documento describe qué hace CLAR en la versión 1.3.1: sus requisitos funcionales y no funcionales tal como están implementados en el código de esta versión (la SPA de `src/`, las Cloud Functions de `functions/src/`, las reglas de Firestore, la configuración de Firebase Hosting y las pruebas). No recoge planes ni funciones futuras. Donde el README y el código no coinciden, manda el código.

**Convenciones.** RF: requisito funcional. RNF: requisito no funcional. Los identificadores son estables: un requisito nuevo toma el siguiente número libre de su sección y uno retirado no se reutiliza. Los textos entre «» son etiquetas de la interfaz. «Origen» señala los archivos principales de cada sección.

**Roles.**

- **Persona usuaria:** cualquier cuenta con sesión iniciada. Solo usa la app con el acceso aprobado.
- **Persona administradora:** la cuenta cuyo email verificado coincide con el configurado en el despliegue. Decide los accesos, activa funciones extra y atiende los mensajes de contacto.
- **Servidor:** las Cloud Functions, únicas que escriben los accesos, la configuración, las funciones extra de cada cuenta, la conexión con Google Calendar, los mensajes de contacto, los dispositivos de las notificaciones push y la cola de alarmas.

---

## 1. Requisitos funcionales

### 1.1 Rueda de la Vida (RF-RUE)

Origen: `src/components/WheelOfLife.tsx`, `src/components/AreasModal.tsx`, `src/services/wheel.ts`.

- **RF-RUE-01.** La app muestra la Rueda como un gráfico polar con las áreas a la vista de la cuenta. Cada área se puntúa de 0 a 10, en números enteros, con un deslizador, y el gráfico se redibuja al momento.
- **RF-RUE-02.** Cada cuenta empieza con 7 áreas: Salud, Carrera Profesional, Finanzas, Familia, Ocio, Relaciones y Espiritualidad.
- **RF-RUE-03.** «Guardar la evaluación» guarda siempre una evaluación nueva, con su fecha en UTC y un nombre opcional. Sin nombre, se llama «Evaluación» seguida de la fecha y la hora.
- **RF-RUE-04.** Una evaluación guarda solo las puntuaciones de las áreas a la vista. Las áreas ocultas conservan las de evaluaciones anteriores.
- **RF-RUE-05.** Las evaluaciones guardadas no se pueden modificar: las reglas de Firestore solo admiten reescribir el mismo contenido. Quien tiene la cuenta sí puede borrarlas (lo usa el borrado de la cuenta), pero la app no ofrece borrarlas una a una.
- **RF-RUE-06.** «Tus evaluaciones» lista cada evaluación con su fecha y su promedio. El promedio es la media de las áreas que puntuó esa evaluación.
- **RF-RUE-07.** «Comparar con una evaluación anterior» superpone en el gráfico la evaluación elegida y muestra la diferencia de cada área. Al abrir la sección está activada, con la evaluación más antigua elegida.
- **RF-RUE-08.** Al abrir la Rueda, los deslizadores parten de la última evaluación. Un área sin puntuación previa empieza en 0.
- **RF-RUE-09.** Cada área indica cuántas metas activas tiene. La tarjeta «Metas» lleva a esa sección con «Ir a Metas».
- **RF-RUE-10.** Primer arranque: si el servidor confirma que la cuenta no tiene evaluaciones y la persona aún no ha cambiado de sección, la app abre en la Rueda. Muestra un aviso de primer paso con un enlace a la Ayuda.
- **RF-RUE-11.** «Editar áreas» permite renombrar cualquier área, añadir áreas propias y ocultar o mostrar cada una («A la vista»).
- **RF-RUE-12.** Cada área necesita un nombre de hasta 30 caracteres, distinto de los demás sin distinguir mayúsculas. Tiene que haber entre 3 y 12 áreas a la vista; «Añadir un área» se desactiva al llegar a 12.
- **RF-RUE-13.** Un área ya guardada no se puede eliminar, solo ocultar. Un área recién añadida se puede quitar antes de guardar.
- **RF-RUE-14.** Un área oculta sale del gráfico, de las sugerencias de área y de las listas para elegir. Conserva sus evaluaciones, sus metas y sus tareas, y sigue elegida en lo que ya la tenía.
- **RF-RUE-15.** Las 7 áreas de partida usan su nombre original como identificador y las añadidas, uno propio, así que renombrar no cambia nada de lo guardado. La lista de áreas se guarda en el perfil de la cuenta.
- **RF-RUE-16.** Los nombres de las áreas de la cuenta se usan en toda la app y en las descargas. En el gráfico, los de más de 16 caracteres se recortan.

### 1.2 Metas (RF-MET)

Origen: `src/components/GoalsView.tsx`, `src/components/GoalModal.tsx`, `src/components/NewGoalInline.tsx`, `src/services/goals.ts`.

- **RF-MET-01.** Una meta tiene nombre (obligatorio, hasta 100 caracteres), área de la Rueda (obligatoria), «para qué» (opcional, hasta 280 caracteres) y fecha objetivo (opcional).
- **RF-MET-02.** Una meta está activa, lograda o archivada. Una activa se puede «Marcar como lograda» o «Archivar»; una lograda o archivada se puede «Reactivar».
- **RF-MET-03.** La sección «Metas» ordena las áreas de la puntuación más baja a la más alta según la última evaluación. En empate, o sin evaluación, sigue el orden de la Rueda.
- **RF-MET-04.** La sección muestra las áreas a la vista y, si tienen metas activas, también las ocultas o ya inexistentes.
- **RF-MET-05.** Sin ninguna evaluación, la sección invita a evaluar la Rueda.
- **RF-MET-06.** «Necesitan atención» lista las áreas con 5 o menos en la última evaluación y sin metas activas. Su botón abre una meta nueva con esa área ya elegida.
- **RF-MET-07.** Cada área tiene su botón «Nueva meta», con el área ya elegida. La sección tiene además un «Nueva meta» general.
- **RF-MET-08.** Cada meta activa muestra su fecha objetivo, su progreso y las tareas que le quedan, primero las de fecha límite más próxima. Pulsar una tarea abre su edición.
- **RF-MET-09.** El progreso de una meta son sus tareas hechas sobre el total de sus tareas, sin contar las canceladas. Incluye las tareas de sus proyectos.
- **RF-MET-10.** «Añadir tarea» abre una tarea nueva ya vinculada a la meta, y «Nuevo proyecto», un proyecto nuevo en esa meta. Cada meta muestra sus proyectos activos con su avance en porcentaje.
- **RF-MET-11.** Las metas logradas y archivadas aparecen plegadas al final, en «Logradas y archivadas».
- **RF-MET-12.** Una tarea vinculada a una meta toma el área de la meta al leerse. Cambiar el área de la meta cambia la de sus tareas sin reescribirlas.
- **RF-MET-13.** Eliminar una meta pide confirmación. Sus tareas se quedan sin meta y con el área que tenía la meta.
- **RF-MET-14.** Una meta con proyectos no se puede eliminar: la app pide eliminar sus proyectos o pasarlos a otra meta antes.
- **RF-MET-15.** El formulario de la tarea ofrece las metas activas, agrupadas por área, y la ya vinculada aunque esté lograda o archivada.
- **RF-MET-16.** «Nueva meta», dentro del formulario de la tarea, crea una meta con nombre y área y la vincula a la tarea. El área propuesta es la de la tarea si está a la vista; si no, la primera. Enter en el nombre o en el área crea la meta sin guardar la tarea, y Escape cierra solo esa parte. La confirmación sale junto al campo «Meta». La meta se guarda al momento, aunque luego no se guarde la tarea. Con un proyecto elegido no se ofrece.
- **RF-MET-17.** Mientras se escribe el título de una tarea sin meta ni proyecto, la app propone «Vincular a «meta»»: la meta activa cuyo nombre y «para qué» comparten más palabras con el título (de cuatro letras o más, sin tildes ni nexos). En empate gana la modificada más recientemente.

### 1.3 Proyectos (RF-PRO)

Origen: `src/components/ProjectsView.tsx`, `src/components/ProjectModal.tsx`, `src/components/ProjectProgress.tsx`, `src/services/projects.ts`.

Los proyectos son opcionales: una herramienta para agrupar tareas relacionadas que buscan cumplir una meta o una parte de ella. Una meta puede tener ninguno, uno o varios, y sus tareas pueden ir sueltas o en proyectos. La bienvenida, el recorrido, la sección y la ayuda los presentan así.

- **RF-PRO-01.** Un proyecto tiene nombre (obligatorio, hasta 100 caracteres), meta (obligatoria), fecha de fin (obligatoria) y descripción (opcional, hasta 280 caracteres).
- **RF-PRO-02.** Solo se puede crear un proyecto si existe alguna meta. Sin metas, la sección lo explica y ofrece «Ir a Metas».
- **RF-PRO-03.** Al elegir la meta del proyecto se ofrecen las activas, agrupadas por área, y la ya elegida aunque esté lograda o archivada.
- **RF-PRO-04.** Un proyecto está activo, terminado o archivado. Uno activo se puede «Marcar como terminado» o «Archivar»; los demás se pueden «Reactivar».
- **RF-PRO-05.** La lista muestra primero los activos, del que termina antes al que termina después. Los terminados y archivados van plegados, los más recientes primero.
- **RF-PRO-06.** Cada proyecto muestra su avance como una batería: el porcentaje de tareas hechas sin contar las canceladas, con «N de M tareas hechas». La carga es roja por debajo del 34 %, ámbar hasta el 66 % y verde desde el 67 %.
- **RF-PRO-07.** Un proyecto activo avisa de que va fuera de plazo si pasó su fecha de fin y le quedan tareas abiertas. La fecha de fin incluye todo ese día.
- **RF-PRO-08.** Un proyecto activo avisa de que termina pronto si le queda menos de una semana y tiene tareas abiertas. Si tiene tareas y ninguna sigue abierta, pide marcarlo como terminado.
- **RF-PRO-09.** El proyecto avisa de las tareas abiertas cuya fecha límite cae después de su fecha de fin.
- **RF-PRO-10.** Un proyecto abierto muestra su meta, su fecha de fin, su estado, su batería y sus avisos. Sus tareas abiertas se manejan con las mismas tarjetas que en «Listas»; las hechas y canceladas van plegadas.
- **RF-PRO-11.** «Añadir tarea», dentro de un proyecto, crea la tarea ya en el proyecto. Al crear un proyecto, la app lo abre.
- **RF-PRO-12.** Las tareas de un proyecto toman la meta del proyecto, y con ella su área, al leerse. En el formulario de la tarea, elegir un proyecto fija la meta y desactiva su selector.
- **RF-PRO-13.** El formulario de la tarea ofrece los proyectos activos y el ya elegido aunque esté terminado o archivado. El campo solo aparece si hay alguno.
- **RF-PRO-14.** Eliminar un proyecto pide confirmación. Sus tareas siguen en la meta del proyecto, sin proyecto.

### 1.4 Tareas y listas (RF-TAR)

Origen: `src/components/TaskList.tsx`, `src/components/TaskCard.tsx`, `src/components/TaskModal.tsx`, `src/services/tasks.ts`, `src/services/taskListing.ts`, `src/services/dependencies.ts`, `src/services/recurrence.ts`, `src/services/calendar.ts`, `src/services/exports.ts`.

**Listas y Top 10**

- **RF-TAR-01.** Cada tarea pertenece a la lista Profesional o a la Personal. La cabecera cambia de lista y muestra cuántas tareas activas tiene cada una.
- **RF-TAR-02.** «Listas» muestra la lista activa en las pestañas «Activas» y «Algún día», con su número de tareas, y da acceso a «Archivadas», que reúne las de las dos listas.
- **RF-TAR-03.** El Top 10 son las 10 primeras tareas activas tras aplicar el orden y los filtros, sin las que esperan a otra tarea. Van destacadas y numeradas; las demás siguen debajo, más discretas, en «El resto de tareas».
- **RF-TAR-04.** La lista se ordena por prioridad, fecha límite, estimación, fecha del último cambio o área. Cada criterio desempata con otros, y lo que no tiene fecha o estimación va al final.
- **RF-TAR-05.** Los filtros son prioridad efectiva, estimación máxima, estado (Pendiente, En progreso o Bloqueada), fecha límite (vencidas, próximos 7 días, con fecha o sin fecha) y área. Con un filtro de estimación, las tareas sin estimación no aparecen.
- **RF-TAR-06.** Los filtros activos se ven como etiquetas que se quitan con un toque, junto con cuántas tareas ocultan. «Quitar filtros» los quita todos.
- **RF-TAR-07.** El orden y los filtros se guardan en cada dispositivo, por cuenta. Un valor guardado desconocido vuelve al de por defecto.
- **RF-TAR-08.** En el móvil, el orden y los filtros se abren en una hoja inferior.
- **RF-TAR-09.** La prioridad es Crítica, Alta, Media (por defecto) o Baja. Con la fecha límite a más de una semana, la tarea cuenta un nivel menos, y la tarjeta lo indica con «plazo > 1 semana».
- **RF-TAR-10.** La estimación es opcional: 15 min, 30 min, 1 h, 2 h, medio día (4 h), 1 día (8 h) o más de 1 día. Se muestra en las tarjetas.
- **RF-TAR-11.** Las tareas de «Algún día» no entran en el Top 10 y tienen su propia pestaña. Una tarea creada desde esa pestaña va a «Algún día».
- **RF-TAR-12.** El título de una tarea abierta se pone violeta si vence en menos de una semana y rojo si ha vencido. El día que vence, mientras no haya vencido, destaca: el título en violeta oscuro y en negrita y la etiqueta «Hoy», con un borde violeta a la izquierda en Listas y Proyectos. En Metas lleva el título y la etiqueta (sus tareas llevan también los colores del plazo), y en la Agenda, el título. Los colores se actualizan cada minuto con la página abierta.
- **RF-TAR-13.** La tarjeta muestra fechas, repetición, alarma, estimación, prioridad, meta (o área, si no tiene meta) y el estado cuando no es «Pendiente».

**Formulario de la tarea**

- **RF-TAR-14.** El título es obligatorio y admite hasta 100 caracteres, con contador. Encima del campo se pide empezar por una acción concreta (Llamar, Enviar, Reservar…).
- **RF-TAR-15.** El analizador de la acción siguiente revisa el título mientras se escribe. Ante un tema abstracto conocido (p. ej. «Marketing», «Coche» o «Finanzas») o una sola palabra sin verbo de acción, pregunta por el primer paso y propone una acción concreta.
- **RF-TAR-16.** Mientras el aviso del analizador esté abierto, la tarea no se puede guardar. Se resuelve con «Usar sugerencia» o «Mantener redacción»; al editar una tarea ya guardada no bloquea.
- **RF-TAR-17.** El formulario tiene dos niveles. A la vista: lista, título, proyecto, meta, fecha y hora límite, alarma y prioridad. En «Más opciones»: descripción, estimación, área, dependencia, inicio, repetición, «Algún día» y notas.
- **RF-TAR-18.** Al salir del campo «Descripción», si la tarea no tiene meta, la app busca el área de la Rueda que más se parece al título y la descripción. Con una similitud del coseno de al menos 0,12 o alguna palabra clave en común, muestra «Sugerencia: ¿Vincular a «área»?» con su porcentaje de confianza y «Usar esta área».
- **RF-TAR-19.** La sugerencia compara el texto con las áreas a la vista: las de partida, con su vocabulario propio (más las palabras de su nombre si se renombraron); las añadidas, con las palabras de su nombre. El cálculo se hace en el navegador.
- **RF-TAR-20.** Con una meta elegida, el área es la de la meta y su selector se desactiva. Sin meta, el área se elige a mano o se acepta la sugerida, y el formulario dice cuál de las dos es.
- **RF-TAR-21.** Las notas son textos cortos que se añaden con «Añadir» o Intro y se quitan una a una.
- **RF-TAR-22.** Cerrar el formulario de una tarea que ya existe con cambios sin guardar (una tarea nueva se guarda como borrador: RF-TAR-56) pregunta «¿Descartar los cambios?», con «Seguir editando» y «Descartar». Una fecha o una hora a medio escribir también cuenta como cambio.
- **RF-TAR-23.** Cerrar o recargar la pestaña con el formulario cambiado hace que el navegador pida confirmación.

**Estados y archivo**

- **RF-TAR-24.** Cada tarea tiene un estado manual: Pendiente, En progreso, Bloqueada, Hecha o Cancelada. Una tarea nueva empieza en Pendiente.
- **RF-TAR-25.** Hecha y Cancelada archivan la tarea con la fecha del cambio. Cualquier otro estado la devuelve a su lista.
- **RF-TAR-26.** Una tarea cancelada no cuenta como hecha en las estadísticas ni en el avance de metas y proyectos.
- **RF-TAR-27.** El círculo de la tarjeta marca la tarea como hecha con un toque. El aviso ofrece «Deshacer» durante 5 s (8 s si celebra una tarea antigua: RF-NAV-15).
- **RF-TAR-28.** «Deshacer» comprueba en el servidor, en una transacción, que la tarea no ha cambiado entretanto. Si no hay conexión en 5 s o la tarea cambió, no deshace y lo avisa.
- **RF-TAR-29.** El lápiz de la tarjeta o su título abren la edición. El menú «⋯» reúne el estado, «Añadir al calendario», «Descargar (JSON)» y «Eliminar».
- **RF-TAR-30.** Eliminar desde el menú «⋯» no pide confirmación y ofrece «Deshacer». La tarea solo se recupera si nadie la ha vuelto a crear entretanto.
- **RF-TAR-31.** «Archivadas» muestra las tareas hechas y canceladas de las dos listas, de la cerrada más recientemente a la más antigua, con un buscador por título y descripción. Desde ahí se reactivan cambiando su estado o se eliminan, previa confirmación.

**Dependencias**

- **RF-TAR-32.** «Empieza después de» hace que una tarea espere a otra, de cualquiera de las dos listas. Una tarea solo puede esperar a una.
- **RF-TAR-33.** Solo se puede elegir una tarea abierta que no sea la misma ni espere ya a esta, directa o indirectamente. Al guardar se vuelve a comprobar que no se forma un ciclo.
- **RF-TAR-34.** Mientras la tarea esperada siga abierta, la dependiente muestra un candado y «Bloqueada: espera a «tarea»». No entra en el Top 10 y no se puede marcar como Hecha ni En progreso.
- **RF-TAR-35.** Al marcar como hecha o cancelada la tarea esperada, sus dependientes se desbloquean solas y el aviso dice cuáles se pueden empezar. Varias tareas pueden esperar a la misma.
- **RF-TAR-36.** Una tarea eliminada no bloquea a nadie. El formulario de una tarea indica qué tareas esperan a ella.

**Fechas, horas y repetición**

- **RF-TAR-37.** Una tarea puede tener fecha límite (plazo) o fecha de inicio y fecha límite (intervalo), cada una con hora opcional. Un intervalo exige fecha límite, y el inicio no puede ser posterior a ella.
- **RF-TAR-38.** Sin hora límite, el plazo vence al final del día. Una hora sin su fecha no se guarda.
- **RF-TAR-39.** Los campos de fecha usan un calendario propio con la semana empezando en lunes, sea cual sea el idioma del navegador. La fecha se escribe como dd/mm/aaaa (también con guiones, puntos o espacios, con año de dos cifras, como ddmmaaaa o como aaaa-mm-dd), entre los años 1900 y 2100.
- **RF-TAR-40.** El calendario se maneja con el teclado (flechas, Inicio, Fin, Re Pág y Av Pág, con Mayús para cambiar de año) y tiene «Hoy». Una fecha imposible bloquea el envío del formulario.
- **RF-TAR-41.** Todas las horas de la app se escriben en 24 h, de 00:00 a 23:59, en un campo propio que acepta 9:30, 09:30, 9.30, 9h30, 930 o 0930. Lo que no es una hora válida no se guarda y bloquea el envío.
- **RF-TAR-42.** Una tarea se puede repetir cada N días, semanas, meses o años, con N entre 1 y 99 en el formulario; la importación de datos admite hasta 999, como antes, para no rechazar archivos que ya valían. El control se lee en una línea: «Repetir: No se repite» o, al repetir, «Repetir: Cada [N] [días]», con la unidad en singular o en plural según N. El número se puede vaciar para escribir otro; mientras no sea un número del 1 al 99, lo dice junto al campo («Escribe un número del 1 al 99.»), y al salir del campo o al guardar se ajusta (vacío, el de antes; 0, 1). En días y semanas, la siguiente también puede contar desde que se hace (RF-TAR-57). Cada semana permite elegir los días (en fechas fijas); cada mes, el día del mes, el N.º día de la semana (del 1.º al 4.º) o el último día de la semana del mes.
- **RF-TAR-43.** Al repetir, «Inicio» es desde cuándo se repite (hoy, si se deja vacío) y la fecha límite, hasta cuándo (opcional). Cada repetición vence su propio día, a la hora límite, y nunca es un intervalo.
- **RF-TAR-44.** El formulario describe la regla, la primera repetición y la siguiente (contando desde que se hace, la siguiente si se hace el día de la primera). Avisa si el fin es anterior al inicio, si no cabe ninguna repetición o si la hora de inicio es posterior a la límite.
- **RF-TAR-45.** En los meses que no tienen el día elegido (p. ej. el 31), la repetición mensual cae el último día del mes.
- **RF-TAR-46.** Al marcar una repetición como Hecha o Cancelada, se archiva y se crea la siguiente en la misma escritura. Cancelar una repetición no termina la serie.
- **RF-TAR-47.** La siguiente repetición tiene un identificador derivado de la anterior, así que marcarla desde dos pestañas o dispositivos no la duplica. En fechas fijas, las repeticiones ya vencidas, hora límite incluida, se saltan. No se crea ninguna después del fin de la serie.
- **RF-TAR-48.** La siguiente repetición empieza pendiente, sin fecha de inicio y sin esperar a ninguna tarea. Hereda la alarma.
- **RF-TAR-49.** «Deshacer» sobre una repetición recién cerrada la restaura y borra la siguiente que se acababa de crear.

**Calendario y descargas**

- **RF-TAR-50.** «Añadir al calendario», en el menú «⋯», ofrece Google Calendar, Outlook.com, Outlook / Microsoft 365 y un archivo .ics. Funciona con enlaces, sin conectar ninguna cuenta, y exige fecha límite.
- **RF-TAR-51.** Con solo fecha límite (un día, sin horas), el evento dura una hora y empieza a la hora de la alarma o, sin alarma, a las 09:00; en el .ics, que lleva la alarma, el recordatorio del calendario suena con la de CLAR (los enlaces de Google y Outlook no llevan recordatorio: cada calendario pone el suyo). Un intervalo de varios días sin horas es de día completo. Con solo hora límite, el evento dura 30 minutos desde esa hora; si además es un intervalo de varios días, va desde las 00:00 del día de inicio hasta la hora límite. Con hora de inicio y sin hora límite, dura una hora desde la de inicio; si la fecha límite es otro día, la descripción la indica. La descripción del evento lleva la de la tarea, sus notas (las de lista, con su casilla marcada o no) y el enlace a CLAR. En los enlaces de Google Calendar y Outlook, la descripción se recorta a 1.500 caracteres (con «… (completa en CLAR)»); el .ics la lleva entera.
- **RF-TAR-52.** Una tarea recurrente en fechas fijas se exporta como serie (RRULE, con la semana empezando en lunes, e INTERVAL para «cada N») a Google Calendar y al .ics; los enlaces de Outlook no la admiten. Una que cuenta desde que se hace va sin serie (RF-TAR-57). Una serie va en hora local con la zona horaria del dispositivo (TZID en el .ics, `ctz` en Google), así el día de la semana y la hora no cambian con el horario de verano. El .ics incluye la alarma de la tarea.
- **RF-TAR-53.** «Descargar (JSON)» descarga una tarea, una meta o un proyecto con todos sus datos y los nombres de lo relacionado. La tarea incluye su área, su meta, su proyecto y las tareas a las que espera o que esperan a ella; la meta, su avance, sus proyectos y sus tareas; el proyecto, su avance, el estado de su plazo y sus tareas.
- **RF-TAR-54.** El archivo se genera en el navegador y se llama `clar-<tipo>-<nombre>-<fecha>.json`. Incluye la versión de la app y la fecha de la descarga.
- **RF-TAR-55.** En los navegadores con reconocimiento de voz, el título y las notas del formulario tienen un micrófono para dictar en español: lo dicho se añade a lo escrito, se ve según se reconoce y el dictado termina al callar, al volver a pulsarlo o a los 30 segundos. Si falta el permiso, la conexión o el micrófono, lo dice; donde el navegador no deja dictar (p. ej. la app de la pantalla de inicio del iPhone), propone el micrófono del teclado. El manifiesto ofrece los accesos «Nueva tarea por voz» (`/?nueva=voz`, el formulario con el micrófono del título escuchando) y «Nueva tarea» (`/?nueva=1`); salen al mantener pulsado el icono de la app instalada en Android o con el botón derecho en el ordenador (no en el iPhone). La app los abre cuando no hay otra ventana abierta (la pantalla de inicio, la bienvenida, el recorrido, la importación o las novedades, que esperan a que se cierre el formulario), también sin conexión si el perfil ya está en el dispositivo; si se abre antes otra ventana, el acceso se descarta. Quita el parámetro de la dirección. Hay un solo dictado a la vez, los 30 segundos cuentan desde que el navegador escucha, escribir a mano lo cancela y, si la página se oculta, se para.
- **RF-TAR-56.** Cerrar el formulario de una tarea nueva con algo escrito (título, descripción, notas, fechas, alarma, estimación, repetición o dependencia) la guarda sola como borrador, sin preguntar, con un aviso y «Deshacer». Los borradores se guardan en la cuenta (se sincronizan y funcionan sin conexión) y salen en «Borradores (N)», junto a «Archivadas», del más reciente al más antiguo, con «Continuar» (abre el formulario tal como estaba) y «Eliminar» (con «Deshacer»). Continuar un borrador y cerrarlo con cambios lo actualiza, y vaciarlo lo borra; guardarlo como tarea lo borra. Los cambios de una tarea que ya existe no se guardan como borrador: se pregunta antes de descartarlos (RF-TAR-22).
- **RF-TAR-57.** En días y semanas, «Cuándo vence la siguiente» ofrece «En fechas fijas» (como hasta ahora) o «N días después de hacerla» / «N semanas después de hacerla» (`recurrence.from: 'COMPLETION'`; sin él, en fechas fijas, también en las tareas y las descargas de antes). Al marcar la repetición como Hecha o Cancelada, la siguiente vence el día local en que se marca más N días o N semanas, se haga antes o después de su fecha, con las mismas horas y la misma alarma; no lleva días de la semana y no hay repeticiones vencidas que saltar. La tarjeta y el formulario lo describen así (p. ej. «3 días después de hacerla»). La Agenda solo muestra la repetición actual, y en el calendario (.ics, Google Calendar y la sincronización) es un evento suelto, sin serie. En meses y años no existe: la importación omite `from` en ellos, y cualquier valor distinto de `COMPLETION`.

### 1.5 Alarmas (RF-ALA)

Origen: `src/services/alarms.ts`, `src/services/notifications.ts`, `src/services/push.ts`, `src/hooks/useTaskAlarms.ts`, `src/components/AlarmAlerts.tsx`, `public/sw.js`, `functions/src/push.ts`, `functions/src/alarmLogic.ts`, `functions/src/pushCleanup.ts`.

- **RF-ALA-01.** Cada tarea puede llevar una alarma: una hora (hh:mm) para avisar el día límite. Exige fecha límite, también en una tarea que se repite.
- **RF-ALA-02.** La alarma suena el día límite a su hora. Con hora límite, tiene que ser antes de ella: si no, el formulario lo dice y no deja guardar. Las alarmas de antes de 0.9.7 a la hora límite o más tarde siguen sonando la víspera a esa hora. Las de antes de 0.9.7 solo con fecha, que sonaban la víspera, no se avisan con retraso si su hora de ahora ya pasó. Una alarma puesta o cambiada (ella, el día, la hora límite o la repetición) cuando su hora ya ha pasado no suena, ni con CLAR abierta ni cerrada; otros cambios de la tarea (su estado, «Deshacer», borrar su meta) no la tocan.
- **RF-ALA-03.** El momento de la alarma se calcula en la zona horaria del dispositivo. Si esa hora no existe por el cambio al horario de verano, se adelanta para mantener la antelación pedida.
- **RF-ALA-04.** El formulario dice cuándo sonará («Sonará hoy a las …», «mañana», «el …»), o que esa hora ya ha pasado y no sonará, y permite «Quitar» la alarma. La tarjeta de la tarea muestra el día y la hora («hoy 17:00», «15 oct 10:57»).
- **RF-ALA-05.** La alarma avisa solo con CLAR abierta (también en segundo plano mientras el sistema no la congele): con un aviso dentro de la app («Alarma · hh:mm», con «Ver tarea» y un botón para cerrarlo) y, si hay permiso, con una notificación del sistema, que se muestra desde el service worker de la app. Pulsarla abre la tarea en CLAR (en una ventana ya abierta o en una nueva, con `/?alarma=<clave>`, que se quita de la dirección). Sin notificaciones push en la instalación, el formulario avisa de que con CLAR cerrada o el móvil bloqueado no suena y propone el .ics; con ellas, remite a «Avisarme también con CLAR cerrada» (RF-ALA-11).
- **RF-ALA-06.** Con una alarma puesta, el formulario ofrece «Activar también las notificaciones del sistema» si el navegador las admite, y el menú de la cuenta, «Activar las notificaciones de las alarmas» (con push en la instalación, la casilla «Avisarme también con CLAR cerrada» pide el permiso y el botón no hace falta). Funcionan también en Android y en la app instalada (si la APK se generó con la delegación de notificaciones). En el iPhone, en Safari, el formulario y el menú explican que CLAR solo avisa desde su icono en la pantalla de inicio (Compartir › «Añadir a pantalla de inicio», abrirla desde el icono y volver a entrar; iOS 16.4 o posterior); en la app de la pantalla de inicio con un iOS anterior, que hace falta actualizarlo. Las notificaciones usan un icono monocromo para la barra de estado.
- **RF-ALA-07.** Una alarma que pasó con la app cerrada avisa al abrirla, si la tarea aún no ha vencido. Si el aviso llega más de 2 minutos tarde, dice a qué hora era.
- **RF-ALA-08.** Cada alarma avisa una sola vez aunque haya varias pestañas abiertas: una pestaña lanza la notificación del sistema y todas muestran el aviso. Cambiar la hora de la alarma o la fecha límite la vuelve a armar.
- **RF-ALA-09.** Las tareas archivadas o en «Algún día» no avisan. Un aviso desaparece si su tarea se archiva, y espera mientras haya una ventana abierta.
- **RF-ALA-10.** La app revisa las alarmas al menos una vez por minuto, al volver a la pestaña, al reanudarse en el móvil y al recuperar la conexión.
- **RF-ALA-11.** «Avisarme también con CLAR cerrada», en el menú de la cuenta, se activa en cada dispositivo (pide el permiso de notificaciones si falta). Con él, el dispositivo se registra para las notificaciones push (token de Firebase Cloud Messaging y zona horaria) y la alarma le llega aunque CLAR esté cerrada o el móvil bloqueado. El servidor calcula su momento en la zona horaria del último dispositivo registrado de la cuenta, con el mismo resultado que la app, y la envía en el minuto siguiente; un cambio de zona horaria del dispositivo, o una suscripción push que el navegador anuló o cambió (el iPhone lo hace sin avisar), se registra la próxima vez que se abre CLAR. Una alarma cuyo plazo ya venció no se envía, una ya enviada no se repite al editar la tarea ni al volver a activarlas, y al activarlas no se envían de golpe las que ya pasaron.
- **RF-ALA-12.** La notificación push dice «Tienes una alarma de CLAR a las hh:mm» y cuándo vence; con «Mostrar el nombre de la tarea» (por dispositivo), «Alarma de las hh:mm: nombre de la tarea». Lleva la misma etiqueta que la de la app, así no salen dos veces, y la hora de la alarma como su momento. El service worker apunta durante dos días las que mostró, y la app las suyas: al abrir CLAR después, la app muestra su aviso dentro, pero no otra notificación, y una push que llega después de la notificación de la app sale sin sonar. Al cerrar sesión se olvidan. Al pulsar una notificación, la tarea se abre en la ventana que se está usando o, si no, en una visible. Cambiar, completar o borrar la tarea actualiza o quita su alarma pendiente. Si ningún dispositivo la recibe por un fallo pasajero, se reintenta con una espera creciente (1, 2, 4 y 8 minutos) y, tras cinco intentos, se deja.
- **RF-ALA-13.** Desactivarlas o cerrar sesión en un dispositivo corta su suscripción al momento, también sin conexión, y borra su token en el servidor. «Cerrar todas las sesiones», cualquier decisión de la administración que deje la cuenta sin acceso (rechazarla, retirarle el acceso o bloquearla), que la cuenta quede bloqueada por su email al entrar o al pedir acceso, o eliminar la cuenta borran los dispositivos registrados y las alarmas pendientes; un dispositivo que lleva 30 días sin abrir CLAR se borra. Al volver a entrar, el dispositivo se registra de nuevo. Una cuenta tiene como mucho diez dispositivos, y un dispositivo solo recibe las alarmas de la última cuenta que se registró en él. Sin la clave pública de push en la compilación, o con los emuladores, la opción no aparece.
- **RF-ALA-14.** Con las alarmas con CLAR cerrada activadas, «Probar notificación» pide al servidor un aviso para este dispositivo, por el mismo camino que las alarmas (antes vuelve a registrar el dispositivo; como mucho 5 por hora; si el dispositivo ya no recibe avisos, lo dice y lo borra). Si el permiso de notificaciones se quitó después en los ajustes, el menú lo advierte. En Android explica cómo hacer que el aviso salga en lo alto de la pantalla («Mostrar en pantalla emergente») y que las restricciones de batería de Chrome pueden retrasarlo.

### 1.6 Agenda (RF-AGE)

Origen: `src/components/AgendaView.tsx`, `src/services/agenda.ts`.

- **RF-AGE-01.** La Agenda tiene vista «Semana», de lunes a domingo, y vista «Por días», de 14 días seguidos, también los vacíos. En la semana actual, la vista por días empieza hoy.
- **RF-AGE-02.** Se navega por semanas con anterior, siguiente y «Hoy», y se muestra el rango de fechas visible.
- **RF-AGE-03.** La Agenda muestra las tareas abiertas con fecha límite de las dos listas. Un plazo sale el día en que vence («Vence»); un intervalo, los días en que empieza, sigue «En curso» y vence.
- **RF-AGE-04.** Muestra las repeticiones previstas de las tareas recurrentes en fechas fijas («Repetición prevista»), hasta el fin de cada serie. De las que cuentan desde que se hacen, solo la repetición actual: las siguientes dependen de cuándo se hagan.
- **RF-AGE-05.** Retirado en la 1.3.0 (mostraba las reuniones de «Tiempo protegido»; ver 1.7).
- **RF-AGE-06.** Dentro de cada día van primero los elementos sin hora y después los demás, por hora. Cada tarea lleva el color de su lista y el de su plazo (las que vencen hoy, en negrita).
- **RF-AGE-07.** En la vista por días, las tareas vencidas salen aparte, en «Vencidas», y no se repiten en su día.
- **RF-AGE-08.** Pulsar una tarea de la Agenda abre su edición.

### 1.7 Tiempo protegido (RF-TIE), retirada en la 1.3.0

Origen: `src/services/repository.ts`, `src/services/importData.ts`, `firestore.rules`.

La sección «Tiempo protegido» (reuniones y correos) se retiró en la 1.3.0: sus ideas son ahora recomendaciones de la Ayuda (RF-NAV-16). La app ya no muestra ni crea reuniones ni correos. Los que se guardaron antes siguen en la cuenta, sin pantalla: van en la descarga (RF-CUE-15), la importación los trae (RF-CUE-28), se borran con la cuenta (RF-CUE-19) y las reglas siguen dejando a su dueño leerlos y borrarlos y, para la importación, escribirlos (RNF-SEG-03). Sus identificadores quedan retirados y no se reutilizan:

- **RF-TIE-01.** Retirado en la 1.3.0 (la sección y su explicación del «triángulo de las Bermudas»).
- **RF-TIE-02.** Retirado en la 1.3.0 (los datos obligatorios de una reunión).
- **RF-TIE-03.** Retirado en la 1.3.0 (ninguna reunión antes de las 12:00).
- **RF-TIE-04.** Retirado en la 1.3.0 (el orden del día y la persona moderadora).
- **RF-TIE-05.** Retirado en la 1.3.0 (la lista de reuniones, que también salían en la Agenda y en Inicio).
- **RF-TIE-06.** Retirado en la 1.3.0 (la redacción inversa de los correos).
- **RF-TIE-07.** Retirado en la 1.3.0 (los destinatarios, al final).
- **RF-TIE-08.** Retirado en la 1.3.0 (el aviso de correo largo).
- **RF-TIE-09.** Retirado en la 1.3.0 (el nombre y el tamaño de los adjuntos).
- **RF-TIE-10.** Retirado en la 1.3.0 (guardar el correo o su borrador).
- **RF-TIE-11.** Retirado en la 1.3.0 (el borrador al cerrar el editor).
- **RF-TIE-12.** Retirado en la 1.3.0 (las listas de borradores y guardados).
- **RF-TIE-13.** Retirado en la 1.3.0 (eliminar un correo con «Deshacer»).
- **RF-TIE-14.** Retirado en la 1.3.0 (abrir el correo en el programa de correo).

### 1.8 Inicio y estadísticas (RF-INI)

Origen: `src/components/HomeView.tsx`, `src/services/stats.ts`.

- **RF-INI-01.** La app abre en «Inicio», salvo en el primer arranque (RF-RUE-10). Inicio muestra el foco de la lista activa con dos indicadores: tareas en el Top 10 (sobre 10) y promedio de la última evaluación de la Rueda con el número de evaluaciones.
- **RF-INI-02.** Las estadísticas son de la lista activa. Solo cuentan como hechas las tareas en estado Hecha.
- **RF-INI-03.** Inicio muestra las tareas hechas hoy, esta semana (de lunes a domingo) y este mes, y avisa de las canceladas en el mes.
- **RF-INI-04.** Muestra un gráfico de barras con las tareas hechas en cada uno de los últimos 14 días, acompañado de una tabla con los mismos datos.
- **RF-INI-05.** Muestra cuántas tareas con plazo se terminaron antes y después de él en los últimos 30 días.
- **RF-INI-06.** Muestra la velocidad: tareas y horas estimadas por semana, de media en las 4 últimas semanas completas y la actual. Si hay datos, añade los días que se tarda de media en terminar una tarea desde que se crea (últimos 30 días).
- **RF-INI-07.** Muestra la racha de días seguidos con alguna tarea hecha (contando hoy, o desde ayer si hoy aún no hay ninguna) y las pendientes, con las vencidas, las que vencen esta semana y las bloqueadas.
- **RF-INI-08.** Una tarea cuenta como bloqueada si está en estado Bloqueada o espera a otra tarea abierta. Las tareas de «Algún día» no cuentan como pendientes.
- **RF-INI-09.** «Por área (último mes)» reparte las tareas hechas en los últimos 30 días entre las áreas de la Rueda, con los nombres de la cuenta.
- **RF-INI-10.** Inicio muestra hasta 6 metas activas con su progreso y hasta 6 proyectos activos con su batería y su fecha de fin, además de cuántos proyectos van fuera de plazo. Metas y proyectos incluyen las dos listas.
- **RF-INI-11.** Inicio muestra como mucho 3 recomendaciones, de más a menos urgente. Todas salvo la de las tareas terminadas a tiempo llevan un botón a la sección que corresponde. Pueden ser, en este orden:
  - un proyecto fuera de plazo;
  - tareas vencidas, empezando por la más antigua;
  - 5 o más tareas que vencen esta semana;
  - menos del 60 % de tareas terminadas a tiempo, con al menos 5 tareas con plazo en el último mes;
  - ninguna tarea hecha esta semana, con tareas pendientes;
  - el área más baja de la última evaluación (5 o menos) sin metas;
  - la Rueda sin evaluar, o sin evaluar desde hace más de 30 días.

### 1.9 Navegación y ayuda (RF-NAV)

Origen: `src/navigation.ts`, `src/components/Navbar.tsx`, `src/components/BottomNav.tsx`, `src/components/MoreSheet.tsx`, `src/components/SyncIndicator.tsx`, `src/components/HowItWorks.tsx`, `src/components/ReleaseNotes.tsx`, `src/services/releaseNotes.ts`, `src/services/celebrations.ts`, `src/components/CelebrationBurst.tsx`.

- **RF-NAV-01.** Las secciones son Inicio, Listas, Agenda, Rueda de la Vida, Metas, Proyectos y Ayuda. Administración solo aparece para la persona administradora, delante de Ayuda.
- **RF-NAV-02.** Desde 768 px de ancho, la cabecera lleva las secciones, las dos listas, el indicador de sincronización y la cuenta. «Nueva tarea» va debajo de la cabecera.
- **RF-NAV-03.** Por debajo de 768 px, una barra inferior lleva Inicio, Listas, Agenda, Metas y «Más», que abre una hoja con las demás secciones, la sincronización y la cuenta. Un botón flotante abre «Nueva tarea».
- **RF-NAV-04.** El indicador de sincronización está verde cuando todo está confirmado por el servidor y naranja con cambios pendientes, sin conexión o mientras sincroniza.
- **RF-NAV-05.** Pulsar el indicador fuerza la sincronización: reabre la conexión y espera la confirmación del servidor, como mucho 15 s. Un aviso dice si lo consiguió.
- **RF-NAV-06.** Cada acción que guarda, elimina o cambia algo muestra un aviso breve. Los avisos con «Deshacer» duran 5 s; los demás, 4 s. Con una celebración (RF-NAV-15), 3 s más.
- **RF-NAV-07.** Al arrancar, la app muestra una pantalla de inicio que se cierra sola en 1,6 s o al tocarla.
- **RF-NAV-08.** «Ayuda» explica cada sección con un botón «Ir a…», los primeros pasos, las recomendaciones para proteger el tiempo (RF-NAV-16), cómo se relacionan las secciones, dónde se guardan los datos, la accesibilidad y los créditos. Las funciones extra solo se explican a la cuenta que las tiene en uso.
- **RF-NAV-09.** Desde «Ayuda» se puede «Repetir el recorrido», «Ver la introducción» y abrir «Escríbenos».
- **RF-NAV-10.** El pie muestra la versión de la app (que abre sus novedades), «Ver la ayuda» y los enlaces a los textos legales, que se abren en otra pestaña.
- **RF-NAV-11.** Si una sección o ventana no se puede descargar, la app muestra un aviso con «Reintentar» en su lugar y el resto sigue funcionando. Una ventana que aún se está descargando se puede cancelar.
- **RF-NAV-12.** Al entrar después de una actualización, una ventana «Novedades de la versión N» cuenta los cambios de esa versión, una sola vez por cuenta, cuando no hay otra ventana abierta (la bienvenida, el recorrido o la importación). Lo visto se guarda en el perfil y en el dispositivo; como la bienvenida, espera al perfil confirmado por el servidor. Las cuentas nuevas empiezan por la bienvenida, que da por vistas las novedades de la versión.
- **RF-NAV-13.** La versión de la cabecera (desde 640 px) y la del pie abren las novedades de la versión. «Ayuda» tiene el apartado «Novedades», con la versión actual a la vista y las anteriores plegadas. Cada versión publicada tiene su entrada, con la misma versión que la app (una prueba lo comprueba). Las novedades nunca anuncian las funciones extra (otra prueba lo comprueba).
- **RF-NAV-14.** Una dirección que no es la de la app ni la de un texto legal muestra «Página no encontrada», con «Ir a CLAR» y los textos legales. `robots.txt` deja indexar la portada y los textos legales.
- **RF-NAV-15.** Celebraciones: al marcar como hecha, desde un estado abierto, una tarea creada hace 14 días o más (14 × 24 h; las recurrentes no cuentan, cada repetición es nueva), al lograr una meta activa o al terminar un proyecto activo, el aviso añade debajo un mensaje motivador y sale un confeti breve (unos 2 s) en los colores de la marca. El mensaje se elige al azar entre al menos 12 de cada tipo, sin repetir el último de su tipo; los de las tareas pueden decir cuántos días llevaba en la lista. Solo se celebra lo que se hace en esa pestaña, una vez por tarea, meta o proyecto y sesión (hacerla, deshacer y volver a hacerla no lo repite); nunca al cancelar, eliminar, archivar, reactivar, deshacer o importar, ni por cambios de otras pestañas o dispositivos. «Deshacer» sigue en el aviso y quita el confeti. El confeti es decorativo (oculto a los lectores de pantalla, no recibe el puntero) y con menos movimiento no se ve; el mensaje, sí. Se desactivan en el panel «Accesibilidad», en cada dispositivo (activadas por defecto).
- **RF-NAV-16.** «Ayuda» tiene el apartado «Recomendaciones para proteger tu tiempo», solo con consejos, sin botones ni referencias a pantallas: el «triángulo de las Bermudas» del tiempo (las reuniones, el correo y los mensajes); las mañanas libres de reuniones para el trabajo concentrado (por ejemplo, ninguna antes de las 12:00) y las reuniones a primera hora de la tarde; cada reunión con hora de fin, un orden del día cerrado y alguien que la modere; los correos empezando por el contenido y los adjuntos, con los destinatarios al final; y el correo y los mensajes en bloques, a horas fijas.

### 1.10 Cuentas y acceso (RF-CUE)

Origen: `src/AuthGate.tsx`, `src/AccessGate.tsx`, `src/services/auth.ts`, `src/services/account.ts`, `src/services/importData.ts`, `src/services/accountImport.ts`, `src/hooks/useReauthMethods.ts`, `src/components/AccountMenu.tsx`, `src/components/AccessRequestScreen.tsx`, `src/components/DeleteAccountPanel.tsx`, `src/components/ImportAccountDialog.tsx`, `src/services/features.ts`, `functions/src/access.ts`.

**Inicio de sesión y alta**

- **RF-CUE-01.** La app solo muestra datos con una sesión iniciada. Se entra con Google o con email y contraseña.
- **RF-CUE-02.** «Continuar con Google» abre una ventana para elegir la cuenta. Si el navegador bloquea la ventana o no la admite (p. ej. dentro de la APK), usa una redirección; en la app de la pantalla de inicio del iPhone, donde la ventana no devuelve el resultado, va siempre por redirección. Ahí, para eliminar una cuenta de Google hay que haber entrado en esa sesión hace menos de 4 minutos, según las horas del token del servidor; la pantalla de eliminar la cuenta lo explica antes.
- **RF-CUE-03.** «Crear una cuenta» pide nombre (opcional), email, una contraseña de al menos 8 caracteres y marcar «Tengo 14 años o más… y acepto las condiciones de uso», y envía un email para confirmar la dirección. El perfil guarda cuándo se aceptaron las condiciones y su versión (también al entrar con Google, que acepta con el aviso de la pantalla de entrada). Los emails de la cuenta van en español.
- **RF-CUE-04.** Una cuenta con contraseña tiene que confirmar su email antes de solicitar acceso. Su pantalla ofrece «Ya lo he confirmado», «Reenviar el email» y «Cerrar sesión».
- **RF-CUE-05.** Al entrar, un email desconocido y una contraseña incorrecta dan el mismo mensaje: «Email o contraseña incorrectos.».
- **RF-CUE-06.** «¿Olvidaste tu contraseña?» envía un enlace para crear otra. La respuesta es la misma tanto si el email tiene cuenta como si no.

**Solicitud de acceso**

- **RF-CUE-07.** La app solo se abre con el acceso aprobado. El estado llega en vivo: al aprobarse, rechazarse o retirarse el acceso, la pantalla cambia sin recargar.
- **RF-CUE-08.** Sin acceso, la app muestra una pantalla según el estado: «Solicita acceso», «Solicitud enviada», «Solicitud no aprobada», «Acceso retirado» o «Cuenta bloqueada». Si no puede consultar el servidor, muestra «No se pudo comprobar tu acceso» con «Reintentar».
- **RF-CUE-09.** La solicitud admite un mensaje opcional de hasta 500 caracteres para la persona administradora. El servidor exige que la cuenta tenga el email confirmado.
- **RF-CUE-10.** Tras un rechazo o una retirada se puede volver a solicitar acceso pasado un día. Una cuenta bloqueada no puede solicitarlo.
- **RF-CUE-11.** La persona recibe un email cuando la persona administradora aprueba su solicitud, también al desactivar la aprobación obligatoria.
- **RF-CUE-12.** Sin acceso aprobado se pueden descargar los datos, eliminar la cuenta, escribir con «Escríbenos» y cerrar la sesión.
- **RF-CUE-13.** Con el acceso aprobado, la app guarda en el perfil el nombre, el email, la foto, la fecha de alta y la del último acceso.

**Gestión de la cuenta**

- **RF-CUE-14.** El menú de la cuenta muestra el nombre, la foto o las iniciales y cómo se entró en esta sesión (Google o email). Da acceso a «Notificaciones de las alarmas» (activar el permiso y, si la instalación tiene push, «Avisarme también con CLAR cerrada» y «Mostrar el nombre de la tarea»), «Accesibilidad», «Descargar mis datos (JSON)», «Importar datos (JSON)», «Funciones extra» (si la cuenta tiene alguna; la persona administradora, siempre), «Escríbenos», la seguridad, «Cerrar sesión» y la eliminación de la cuenta.
- **RF-CUE-15.** «Descargar mis datos (JSON)» descarga los datos de la app: tareas, borradores de tareas, evaluaciones, metas, proyectos, áreas de la Rueda, nombre y email (los borradores no se importan), y las reuniones y los correos que se guardaron antes de la 1.3.0 (ver 1.7). No incluye el resto del perfil, la solicitud de acceso, las funciones extra ni los mensajes de «Escríbenos».
- **RF-CUE-16.** Una cuenta con contraseña puede «Cambiar la contraseña» escribiendo la actual y una nueva de al menos 8 caracteres.
- **RF-CUE-17.** «Cerrar sesión en todos los dispositivos» invalida las sesiones de la cuenta y cierra la de este dispositivo. Los demás pierden el acceso en menos de una hora.
- **RF-CUE-18.** «Cerrar sesión» borra la copia local de los datos del dispositivo. Si hay otras pestañas de la app abiertas, la copia se queda hasta cerrar sesión con una sola.
- **RF-CUE-19.** «Eliminar mi cuenta y todos mis datos» pide confirmarlo con el método con el que se entró en esta sesión: la contraseña o volver a entrar con Google. Una cuenta que tiene los dos puede cambiar al otro, y los errores de la ventana de Google (cerrada, otra cuenta, bloqueada) se explican en español. Borra los datos de la cuenta, su perfil, su solicitud de acceso, sus funciones extra, su conexión con Google Calendar y sus mensajes de «Escríbenos», y después la cuenta.

**Primera vez**

- **RF-CUE-20.** La bienvenida se muestra una sola vez por cuenta, en tres pantallas («Por qué», «El método» y «Cómo empezar»). «El método» va de las áreas de vida a las metas, los proyectos (opcionales: uno o varios por meta para agrupar tareas relacionadas), las tareas, y el Top 10 y la Agenda. El último paso de «Cómo empezar» propone reservar las mañanas sin reuniones y remite a las recomendaciones de la Ayuda. Se salta en cualquier momento con «Saltar» o Escape.
- **RF-CUE-21.** Que la bienvenida ya se vio se guarda en el perfil y en el dispositivo, así no se repite sin conexión ni en otro dispositivo. Hasta que el servidor confirma el perfil (también lo que la app guarda al entrar), la bienvenida, las novedades (RF-NAV-12) y el idioma de la cuenta (RF-CUE-33) esperan; una vez confirmado, sigue así.
- **RF-CUE-22.** Al terminar la bienvenida empieza un recorrido guiado de 10 pasos por los elementos principales (entre ellos, «Proyectos (opcional)», en el móvil dentro de «Más»), que empieza en «Listas». Se maneja con las flechas y Escape, y salta los pasos cuyo elemento no se ve.
- **RF-CUE-23.** Al acabar el recorrido de la primera vez, la app abre la Rueda si la cuenta aún no tiene evaluaciones.
- **RF-CUE-24.** Si el navegador guarda datos de la versión anterior sin cuentas, la app ofrece importarlos en el primer inicio de sesión, antes de la bienvenida. Se eligen los perfiles que importar (con sus tareas, evaluaciones, reuniones y correos; estos dos se guardan sin pantalla, ver 1.7); los datos de demostración nunca se importan.
- **RF-CUE-25.** Importar borra del navegador todos los datos locales antiguos, también los de los perfiles no marcados. «Descartar» los borra sin importar, previa confirmación, y «Más tarde» deja la decisión para otro momento.

**Importar datos**

- **RF-CUE-26.** «Importar datos (JSON)», en el menú de la cuenta, acepta el archivo de «Descargar mis datos (JSON)» (de hasta 5 MB, también de versiones anteriores) y rechaza, con el motivo, cualquier otro, incluidas las descargas de una sola tarea, meta o proyecto. Pide conexión.
- **RF-CUE-27.** Antes de importar, la app muestra la fecha de la descarga y, por cada tipo de dato, cuántos registros son nuevos, cuántos ya están en la cuenta (mismo identificador) y cuántos no son válidos, y qué áreas de la Rueda se añadirán.
- **RF-CUE-28.** Solo se guarda lo que falta: lo que ya está en la cuenta no se modifica, así importar dos veces el mismo archivo no duplica nada. Cada registro se comprueba campo a campo y se guardan solo los campos conocidos, con la cuenta actual como propietaria. Un registro cuenta entero como no válido si le falta algo obligatorio, si un texto o una lista pasa su tope (100.000 caracteres de descripción, 20.000 por nota, 200.000 de cuerpo de correo, 5.000 en los demás textos y 1.000 elementos por lista), si un elemento de una lista no vale o si es un proyecto cuya meta no está ni en la cuenta ni en el archivo: nunca se recorta nada. Los campos opcionales de formato (fechas, horas, referencias a otros registros) que no valen se omiten. Si la cuenta aún tiene las áreas de partida tal cual, se recupera la configuración de áreas del archivo (nombres, orden, ocultas y propias); si no, las que faltan se añaden al final, un nombre repetido lleva un número y, pasado el máximo de áreas a la vista, entran ocultas.
- **RF-CUE-29.** La importación muestra su avance y no se puede cerrar mientras escribe. Sin conexión no empieza. Si la conexión se pierde o la importación lleva un minuto sin avanzar, lo dice y deja cerrar la ventana: sigue sola al volver la conexión, y si se cierra CLAR antes, volver a importar el archivo completa el resto. Si falla, dice cuántos registros entraron.
- **RF-CUE-30.** «Funciones extra», en el menú de la cuenta, muestra las que la persona administradora le ha activado, con su descripción y sin interruptor. La persona administradora las tiene todas, con un interruptor por función: empiezan apagadas y lo que elige se guarda en su perfil.
- **RF-CUE-31.** «Compartir CLAR», en el menú de la cuenta, abre el menú de compartir del dispositivo con el nombre, la frase de la app y su dirección; donde no lo hay, copia la dirección y lo dice. Cerrar el menú de compartir no es un error.
- **RF-CUE-32.** Sin sesión iniciada, la pantalla de entrada es también la página de presentación: qué es CLAR (la Rueda, las metas y proyectos, el Top 10, la agenda y las alarmas, el dictado y el uso sin conexión), cómo se tratan los datos, que es de código abierto (con enlace al repositorio) y, al lado (debajo en el móvil), cómo entrar. «Crear cuenta gratis» lleva al formulario en «Crear una cuenta», y «Ya tengo cuenta», a «Entrar». Las funciones extra no se anuncian. Al compartir el enlace, se ve una tarjeta con el logo, el nombre y la frase (Open Graph, `public/og-image.png`).
- **RF-CUE-33.** La app está en español (por defecto) o en inglés. «Español / English» está arriba en la página de inicio y en el menú de la cuenta; al cambiarlo, la app se vuelve a cargar en ese idioma. Un enlace con `?lang=en` (o `?lang=es`) abre la app en ese idioma y lo guarda en el dispositivo; una cuenta sin idioma, o nueva, se queda con él, y una que ya tiene uno lo conserva (esa visita se ve en el del enlace). El parámetro se quita de la dirección. La elección se guarda en el dispositivo y en la cuenta (`users/{uid}.language`): elegida antes de entrar, pasa a la cuenta al entrar; si no, al abrir la app manda la de la cuenta (solo al abrirla, no mientras se usa). Se traducen la interfaz, la ayuda, las novedades, los textos legales (en inglés, con el aviso de que vale la versión en español y un botón para cambiar a ella), los emails a la persona (verificación y contraseña, acceso aprobado, respuestas a sus mensajes), las notificaciones push (cada dispositivo registra su idioma), los mensajes de error del servidor y los eventos de Google Calendar. Lo que escribe la persona no se traduce; las áreas de partida de la Rueda sin renombrar se ven en el idioma de la app. Las fechas y los números siguen el idioma (en inglés, con el formato europeo: 24 h y el día antes que el mes) y el dictado se hace en él. Los emails a la administración siguen en español. Los accesos directos del icono y la descripción del enlace al compartir van en los dos idiomas.
- **RF-CUE-34.** Si la cuenta tiene reuniones o correos guardados con versiones anteriores a la 1.3.0, el menú de la cuenta lo dice y ofrece eliminarlos, con confirmación («Se borrarán para siempre»). Se cuentan en el servidor al abrir el menú (sin conexión no se ofrece). La descarga de los datos los lee del servidor: sin conexión, avisa en lugar de dejarlos fuera.

### 1.11 Administración (RF-ADM)

Origen: `src/components/AdminView.tsx`, `src/components/AccessAdminView.tsx`, `src/components/FeedbackAdminView.tsx`, `src/services/adminAlerts.ts`, `src/services/features.ts`, `functions/src/access.ts`, `functions/src/accessLogic.ts`, `functions/src/features.ts`, `functions/src/featuresLogic.ts`, `functions/src/feedback.ts`.

- **RF-ADM-01.** La cuenta de la persona administradora se aprueba sola al entrar, siempre que su email esté verificado. Si cambia el email configurado, la marca de la cuenta anterior se borra la próxima vez que alguien entra en la app o la administración actúa.
- **RF-ADM-02.** «Administración» tiene dos pestañas: «Solicitudes» y «Mensajes».
- **RF-ADM-03.** «Aprobación obligatoria» activa o desactiva la aprobación de cuentas. Sin configuración guardada, está activada.
- **RF-ADM-04.** Desactivarla pide confirmación y aprueba las solicitudes pendientes cuyo email no esté bloqueado. Cada persona aprobada recibe su email, y un aviso dice cuántas se aprobaron.
- **RF-ADM-05.** Con la aprobación desactivada, una cuenta nueva o pendiente con el email confirmado entra sola. Las rechazadas, retiradas y bloqueadas siguen igual: si vuelven a pedir acceso (pasado un día), la solicitud queda pendiente de la persona administradora. Volver a activar la aprobación no quita el acceso a las cuentas que entraron mientras estaba desactivada.
- **RF-ADM-06.** «Solicitudes» agrupa las cuentas en «Pendientes», «Con acceso», «Rechazadas o retiradas» y «Bloqueadas». Cada una muestra nombre, email, foto, estado, fechas de solicitud y de decisión, y el mensaje.
- **RF-ADM-07.** Las acciones dependen del estado: pendiente, «Aprobar», «Rechazar» y «Bloquear»; con acceso, «Retirar acceso» y «Bloquear»; rechazada o retirada, «Aprobar» y «Bloquear»; bloqueada, «Desbloquear», que la deja retirada. El servidor admite además aprobar una cuenta bloqueada, que la interfaz no ofrece, y rechaza cualquier otro cambio.
- **RF-ADM-08.** La persona administradora no puede cambiar su propio acceso.
- **RF-ADM-09.** «Bloquear» guarda también el email en una lista negra, que se conserva aunque la cuenta se elimine. Una cuenta nueva con ese email empieza bloqueada, y «Desbloquear» o «Aprobar» la cuenta bloqueada libera el email.
- **RF-ADM-10.** Cada solicitud pendiente nueva genera un email a la persona administradora, sin datos de quien la envía.
- **RF-ADM-11.** Un aviso rojo en «Administración» y en sus pestañas cuenta las solicitudes pendientes, los mensajes sin leer y las cuentas nuevas con acceso. Son cuentas nuevas las aprobadas cuya solicitud es posterior a la última vez que se miraron las solicitudes en ese dispositivo, y salen marcadas como «Nueva».
- **RF-ADM-12.** Mirar la pestaña «Solicitudes» da por vistas las cuentas nuevas en ese dispositivo.
- **RF-ADM-13.** «Mensajes» muestra en vivo los mensajes abiertos (nuevos y leídos), del más reciente al más antiguo. Los cerrados se cargan bajo demanda, por páginas, con «Ver los cerrados» y «Cargar más».
- **RF-ADM-14.** Cada mensaje muestra tipo, estado, asunto, descripción, nombre, email, la información técnica si se adjuntó y las respuestas enviadas.
- **RF-ADM-15.** «Responder» envía por email a quien escribió una respuesta de hasta 5000 caracteres, desde el buzón de CLAR y con su mensaje citado. La respuesta se guarda en el mensaje solo si el envío sale, y un mensaje nuevo pasa a leído.
- **RF-ADM-16.** Una respuesta nunca se envía dos veces: lleva un identificador que se repite en los reintentos. Si un envío quedó a medias sin saber si salió, no se reenvía y la app lo avisa.
- **RF-ADM-17.** «Desde mi correo» abre el programa de correo para responder desde otra cuenta. «Marcar como leído», «Cerrar» y «Reabrir» cambian el estado del mensaje; reabrir lo deja leído.
- **RF-ADM-18.** Cada mensaje nuevo de «Escríbenos» genera un email a la persona administradora, sin el contenido ni los datos de quien escribe.
- **RF-ADM-19.** En «Solicitudes», cada cuenta con acceso, salvo la propia, tiene «Funciones extra». Abre la lista del catálogo de funciones extra, con su nombre y su descripción, para marcar las que tendrá la cuenta y «Guardar»; «Cancelar» o Escape cierran sin guardar, y el foco vuelve al botón. Las que tiene se ven en su fila. El botón espera a que se hayan cargado las funciones de todas las cuentas, y si la cuenta pierde el acceso con el panel abierto, lo elegido se descarta.
- **RF-ADM-20.** Una función extra está en uso para la cuenta desde que se guarda, sin que tenga que activarla, y deja de estarlo al desmarcarla. La cuenta lo ve en su menú al momento.
- **RF-ADM-21.** El servidor solo guarda funciones del catálogo, sin repetir, para una cuenta con el acceso aprobado (en la misma transacción que lo comprueba). La persona administradora no puede cambiar las suyas por esta vía: las enciende en su cuenta (RF-CUE-30).
- **RF-ADM-22.** Retirar el acceso, rechazar o bloquear una cuenta borra sus funciones extra en la misma transacción que cambia su acceso, también cuando queda bloqueada por su email al entrar o al pedir acceso: si se vuelve a aprobar, empieza sin ninguna. Una cuenta sin funciones no tiene documento. El catálogo está en el código, con los mismos identificadores en la app y en el servidor.

### 1.12 Contacto (RF-CON)

Origen: `src/components/FeedbackDialog.tsx`, `src/services/feedback.ts`, `functions/src/feedback.ts`, `functions/src/feedbackLogic.ts`.

- **RF-CON-01.** «Escríbenos» se abre desde la Ayuda, el menú de la cuenta y la pantalla de acceso. Funciona también sin acceso aprobado.
- **RF-CON-02.** El mensaje tiene tipo («Sugerencia», «Error o fallo» o «Mensaje general»), asunto obligatorio de hasta 120 caracteres y descripción obligatoria de hasta 2000, con contador.
- **RF-CON-03.** Se puede adjuntar información técnica, de forma opcional y viéndola antes de enviarla: versión de CLAR, sistema, navegador con su versión mayor, tipo de dispositivo, idioma y conexión.
- **RF-CON-04.** Del sistema solo se da la versión de Android, iOS e iPadOS; de Windows, macOS, ChromeOS y Linux, solo el nombre. El dispositivo es móvil por debajo de 768 px, tableta por debajo de 1024 px y escritorio a partir de ahí.
- **RF-CON-05.** Para enviar hace falta el email confirmado. Cada cuenta puede enviar como mucho 5 mensajes por hora.
- **RF-CON-06.** El servidor quita los caracteres de control y recorta el texto a sus límites. Descarta la información técnica si no tiene el formato esperado.
- **RF-CON-07.** El mensaje se guarda con el nombre y el email de la cuenta para poder responder. Al enviarlo, la app confirma «¡Gracias! Hemos recibido tu mensaje.». La persona administradora recibe como mucho un aviso por email cada 15 minutos: los mensajes que llegan antes van en un resumen («N mensajes nuevos»).
- **RF-CON-08.** Los mensajes de una cuenta se borran al eliminarla.

### 1.13 Textos legales (RF-LEG)

Origen: `src/Root.tsx`, `src/components/LegalPage.tsx`, `src/components/LegalTexts.tsx`, `src/services/legal.ts`.

- **RF-LEG-01.** La política de privacidad (`/privacidad`), las condiciones de uso (`/condiciones`) y el aviso legal (`/aviso-legal`) son páginas públicas. Se ven sin iniciar sesión y sin cargar Firebase.
- **RF-LEG-02.** Las rutas admiten barra final y mayúsculas. En inglés, cada texto es una traducción con el aviso de que vale la versión en español (RF-CUE-33). Cada página muestra su título, enlaces a las otras dos, la fecha de su última actualización y «Volver a CLAR».
- **RF-LEG-03.** Los textos legales se enlazan desde las pantallas de inicio de sesión, confirmación del email y solicitud de acceso, el pie, el menú de la cuenta y la Ayuda.
- **RF-LEG-04.** La pantalla de inicio de sesión indica que, al continuar, se confirma tener al menos 14 años (o la edad mínima del país de residencia, si es mayor) y se aceptan las condiciones de uso. La app no pide ni comprueba la edad.
- **RF-LEG-05.** La política de privacidad trata el responsable, los datos y sus fines, la base jurídica, los destinatarios, la ubicación y las transferencias, la conservación, los derechos, los menores, las decisiones automatizadas, la seguridad y los cambios.
- **RF-LEG-06.** Las condiciones de uso tratan el servicio, la edad mínima, la cuenta, el uso aceptable, el contenido (con la licencia técnica para alojarlo, procesarlo y mostrarlo), la disponibilidad, la baja, los cambios, el contacto y la ley aplicable. El aviso legal trata el titular, la propiedad intelectual, los enlaces y la ausencia de afiliación con el autor del libro que inspira el método.
- **RF-LEG-07.** Una prueba unitaria falla si los textos legales no tienen titular, domicilio a efectos de notificaciones o email de contacto.
- **RF-LEG-08.** El responsable se identifica con su nombre completo, un domicilio a efectos de notificaciones y un email (RGPD, art. 13.1.a), en la política de privacidad y en el aviso legal. La política explica el almacenamiento local del navegador (Local Storage e IndexedDB) y el service worker, todos técnicos (art. 22.2 de la LSSI).

### 1.14 Sincronización con Google Calendar (RF-GCA)

Origen: `src/services/googleCalendar.ts`, `src/components/CalendarConnection.tsx`, `public/oauth/google.html`, `public/oauth/google.js`, `functions/src/calendarSync.ts`, `functions/src/calendarLogic.ts`, `functions/src/calendarCleanup.ts`, `functions/src/calendarCrypto.ts`, `functions/src/googleCalendar.ts`.

- **RF-GCA-01.** Es la función extra «Sincronizar con Google Calendar». Con la función en uso (concedida por la persona administradora o, en su cuenta, encendida), «Funciones extra», en el menú de la cuenta, ofrece «Conectar Google Calendar». Si la compilación no tiene el id del cliente OAuth de Google, dice que no está disponible en esta instalación.
- **RF-GCA-02.** Conectar abre la autorización de Google en una ventana, solo con el permiso `calendar.app.created` (crear un calendario propio y sus eventos), sin conexión y pidiendo el consentimiento, con PKCE y un `state` propio. Google vuelve a `/oauth/google.html`, que pasa el código a la app y se cierra. Mientras tanto, la app dice que espera a Google y deja «Cancelar». Si se rechaza el permiso o se acaba el tiempo (5 minutos), lo dice.
- **RF-GCA-03.** El servidor canjea el código (con el secreto del cliente, en Secret Manager), comprueba que la cuenta puede usar la función, que Google dio el permiso del calendario y uno sin conexión, y que la dirección de vuelta es de la app. Crea el calendario «CLAR» (o vuelve a usar el de una conexión anterior, si sigue existiendo, y borra de él los eventos de CLAR de tareas que ya no van al calendario), guarda el permiso cifrado y sube todas las tareas que van al calendario. Cuando Google responde, la app dice que está subiendo las tareas (ya sin «Cancelar»), y al acabar, cuántas se subieron y cuántas no. Si algo falla después de dar permiso en Google, el permiso se retira.
- **RF-GCA-04.** Van al calendario las tareas con fecha límite de las dos listas, salvo las de «Algún día». El evento es el mismo que el de «Añadir al calendario» (RF-TAR), en la zona horaria del dispositivo al conectar: una hora a la hora de la alarma (o a las 09:00) con solo fecha, día completo en un intervalo de varios días sin horas, una hora con inicio y sin hora límite, la descripción con las notas, la serie y la alarma como recordatorio (Google lo cuenta desde el inicio: con solo fecha suena al empezar el evento; si la alarma cae después del inicio, no se pone). Con notas, la descripción va en HTML, con las notas en una lista con viñetas (las de casilla, con ☐ o ☑, y los enlaces http o https, pulsables) y todo el texto de la tarea escapado; si así no cabe, va en texto. Los eventos no ocupan tiempo en la agenda («disponible») y llevan una marca privada de CLAR. Si la descripción pasa de 8.000 caracteres, se recorta lo de la tarea y se conserva el enlace a CLAR.
- **RF-GCA-05.** Cada cambio de una tarea crea, actualiza o borra su evento al momento; los cambios que no afectan al evento no llaman a Google. Una tarea hecha o cancelada conserva su evento, a la misma hora, con «✓» o «✕» delante, sin la serie y sin recordatorio: la repetición siguiente lleva la serie. Borrar la tarea, quitarle la fecha o pasarla a «Algún día» borra su evento. Cada tarea tiene un evento con un identificador fijo, así que reintentar o volver a conectar no duplica nada.
- **RF-GCA-06.** La sincronización va en un solo sentido: lo que se cambia en Google no vuelve a CLAR, y el siguiente cambio de la tarea lo sustituye.
- **RF-GCA-07.** El servidor comprueba en cada cambio que la cuenta puede usar la función: con el acceso aprobado y la función concedida, o la persona administradora (con su marca vigente) con la función encendida en su perfil.
- **RF-GCA-08.** «Desconectar Google Calendar» retira el permiso en Google y lo borra; el calendario «CLAR» se queda en la cuenta de Google. Pasa lo mismo al perder la función (la persona administradora la quita o apaga la suya; también si la cuenta deja de ser la de administración), al perder el acceso y al eliminar la cuenta, que desconecta antes de borrar los datos: los eventos se quedan en Google.
- **RF-GCA-09.** Si el permiso de Google ya no vale (se retiró, caducó o no se puede leer) o Google confirma que no existe el calendario «CLAR», la sincronización se para y el menú lo explica y ofrece «Volver a conectar». Un fallo que llega tarde solo cuenta para la conexión que lo tuvo: no deshace una desconexión ni una conexión más nueva. Ante un límite de peticiones o un fallo pasajero, se reintenta hasta tres veces con una espera creciente; cualquier otro fallo queda en los registros, sin datos de la persona, y se arregla con el siguiente cambio de la tarea que afecte a su evento.

---

## 2. Requisitos no funcionales

### 2.1 Seguridad (RNF-SEG)

Origen: `firestore.rules`, `firebase.json`, `functions/src/access.ts`, `functions/src/calendarCrypto.ts`, `functions/src/calendarSync.ts`, `functions/src/features.ts`, `functions/src/featuresLogic.ts`, `functions/src/feedback.ts`, `functions/src/push.ts`, `tests/rules/firestore.rules.test.ts`.

- **RNF-SEG-01.** Las reglas de Firestore solo dejan a cada cuenta leer y escribir en `users/{uid}` y sus subcolecciones. Lo que no coincide con ninguna regla queda denegado.
- **RNF-SEG-02.** Crear y modificar datos exige el acceso aprobado. Leer y borrar los propios datos se permite siempre, para que una cuenta sin acceso pueda llevárselos o eliminarlos.
- **RNF-SEG-03.** Las subcolecciones permitidas son siete: tareas, borradores de tareas, evaluaciones, reuniones, correos, metas y proyectos. Las reuniones y los correos ya no los crea la app (1.7), pero se siguen admitiendo para que la importación los traiga. El perfil solo admite sus campos conocidos (datos de la cuenta, bienvenida, novedades vistas, áreas de la Rueda y funciones extra encendidas).
- **RNF-SEG-04.** Las solicitudes de acceso, las marcas de administración, la configuración, las funciones extra de cada cuenta, la lista negra y el contador de mensajes solo los escriben las Cloud Functions. Ningún cliente puede escribirlos, tampoco la persona administradora.
- **RNF-SEG-05.** Cada cuenta lee solo su propia solicitud de acceso y sus funciones extra, y la persona administradora, todas. Nadie lee desde la app la lista negra ni el contador de mensajes.
- **RNF-SEG-06.** Las reglas reconocen a la persona administradora solo si existe su marca y el email guardado en ella coincide con el del token de quien lee.
- **RNF-SEG-07.** La persona administradora solo puede leer los mensajes de contacto y cambiar su estado a nuevo, leído o cerrado. No puede escribir su contenido ni sus respuestas desde la app.
- **RNF-SEG-08.** Las funciones invocables exigen sesión iniciada. Las de administración comprueban además que el email verificado del token es el configurado.
- **RNF-SEG-09.** Las funciones validan y recortan lo que reciben: estados permitidos, longitudes, formato de los identificadores y caracteres de control. Los cambios de acceso van en transacciones: al entrar y al solicitar acceso se leen también el modo de aprobación y la lista negra; una decisión de la administración comprueba el estado actual.
- **RNF-SEG-10.** Hosting añade a todas las respuestas `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y una `Permissions-Policy` que deniega cámara, ubicación, pagos, USB y `browsing-topics`, y deja el micrófono solo a la propia app (para dictar). `X-Frame-Options: SAMEORIGIN` y `Content-Security-Policy: frame-ancestors 'self'` impiden incrustarla en otras webs.
- **RNF-SEG-11.** La política de seguridad de contenidos (CSP) y la `Cross-Origin-Opener-Policy` están en modo solo informar (`Report-Only`): avisan en la consola del navegador, pero no bloquean.
- **RNF-SEG-12.** Eliminar la cuenta exige volver a autenticarse, y cambiar la contraseña exige la actual.
- **RNF-SEG-13.** La app descarga su configuración de Firebase del propio Hosting al arrancar, así que el identificador del proyecto no está en el código. La contraseña del buzón de correo está en Secret Manager.
- **RNF-SEG-14.** Los correos salen por SMTP con TLS (puerto 465).
- **RNF-SEG-15.** El despliegue desde CI se autentica con Workload Identity Federation, sin claves de cuenta de servicio guardadas.
- **RNF-SEG-16.** Los dispositivos de las notificaciones push (`push_devices`, `push_tokens`) y las alarmas pendientes y enviadas (`alarm_queue`, `alarm_sent`) solo los usan las Cloud Functions: las reglas no dejan leerlos ni escribirlos desde la app, tampoco a su dueño. Registrar un dispositivo exige sesión iniciada y acceso aprobado, y valida el token y la zona horaria.
- **RNF-SEG-17.** La conexión con Google Calendar usa el permiso más pequeño (`calendar.app.created`), PKCE y un `state` propio. El permiso sin conexión se guarda cifrado con AES-256-GCM (la clave, `CALENDAR_TOKEN_KEY`, está en Secret Manager, y el uid va como dato asociado) en `calendar_tokens`, que ninguna cuenta puede leer ni escribir desde la app; `calendar_status` solo lo lee su dueño. El secreto del cliente OAuth está en Secret Manager (`GOOGLE_OAUTH_CLIENT_SECRET`).
- **RNF-SEG-18.** Contra abusos, con el registro abierto: las reglas acotan lo que se escribe en cada documento de la cuenta (como mucho 60 campos; título hasta 2.000 caracteres, descripción hasta 100.000, asunto de un correo hasta 5.000 y su cuerpo hasta 200.000, y listas de notas, puntos, destinatarios y adjuntos de hasta 1.000; nunca menos de lo que admite la importación); cada Cloud Function tiene como mucho 5 instancias; cada cuenta tiene como mucho 100 alarmas en la cola push y se envían como mucho 10 de cada cuenta por minuto; cada cuenta registra como mucho 20 dispositivos por hora y prueba la notificación como mucho 5 veces por hora.

### 2.2 Privacidad (RNF-PRI)

Origen: `functions/src/accessLogic.ts`, `functions/src/calendarCleanup.ts`, `functions/src/featuresCleanup.ts`, `functions/src/feedbackLogic.ts`, `functions/src/feedbackCleanup.ts`, `functions/src/push.ts`, `functions/src/pushCleanup.ts`, `src/services/feedback.ts`, `src/components/LegalTexts.tsx`.

- **RNF-PRI-01.** Los datos de cada cuenta solo son accesibles para ella (RNF-SEG-01). Para revisar una solicitud, la persona administradora solo ve el nombre, el email, la foto de perfil y el mensaje de la solicitud.
- **RNF-PRI-02.** Las Cloud Functions se ejecutan en la región `europe-west1` (Bélgica). La app informa de que los datos se guardan en Google Cloud en la Unión Europea (Bélgica).
- **RNF-PRI-03.** Los emails de aviso a la persona administradora no llevan datos de quien escribe ni el contenido: se leen en la app. Los emails que envían las Cloud Functions son de texto plano.
- **RNF-PRI-04.** Los registros (logs) de las funciones no incluyen datos personales ni el identificador de la cuenta.
- **RNF-PRI-05.** La información técnica de un mensaje de contacto es opcional, se ve antes de enviarla y no incluye el identificador completo del navegador (user-agent).
- **RNF-PRI-06.** De los adjuntos de los correos guardados antes de la 1.3.0 solo se guardaron el nombre y el tamaño: los archivos nunca salieron del dispositivo.
- **RNF-PRI-07.** Las descargas (JSON e .ics) se generan en el navegador, sin pasar por ningún servidor. Los enlaces al calendario no conectan ninguna cuenta; la sincronización con Google Calendar (RF-GCA) es aparte y opcional.
- **RNF-PRI-08.** El Top 10, las sugerencias, las estadísticas y las recomendaciones se calculan en el navegador.
- **RNF-PRI-09.** La app no carga fuentes externas: usa la tipografía del sistema. No incluye herramientas de analítica ni de seguimiento.
- **RNF-PRI-10.** Las fotos de perfil se cargan sin enviar la página de origen (`referrerPolicy="no-referrer"`).
- **RNF-PRI-11.** Al eliminar la cuenta se borran sus datos, su solicitud de acceso, sus funciones extra y sus mensajes. Solo se conservan el email, si estaba bloqueado (con el identificador interno de la cuenta y la fecha del bloqueo), y las horas de los envíos de la última hora, ligadas solo al identificador interno, para que el límite de mensajes siga aplicándose. Ese registro de envíos no se borra después.
- **RNF-PRI-12.** Al cerrar sesión se borra la copia local de los datos (RF-CUE-18).
- **RNF-PRI-13.** Cada cuenta puede descargar sus datos de la app en JSON en cualquier momento, también sin acceso aprobado (ver RF-CUE-15).
- **RNF-PRI-14.** Las alarmas con CLAR cerrada son opcionales en cada dispositivo (consentimiento). Se guardan el token de cada dispositivo, su zona horaria y si quiere ver el nombre de la tarea y, de cada alarma pendiente, su hora, el nombre de la tarea y cuándo vence; de las enviadas, cuál fue. Por FCM y el servicio push del navegador solo viaja la hora de la alarma y cuándo vence, y el nombre de la tarea solo si el dispositivo lo pide. Los registros del servidor no llevan datos de la persona, solo recuentos y códigos de error.
- **RNF-PRI-15.** La sincronización con Google Calendar es opcional (consentimiento al conectar). Envía a la cuenta de Google de la persona el título, la descripción, las notas, las fechas, la repetición y la alarma de sus tareas con fecha, y no lee nada de su cuenta de Google. Al desconectar, al perder la función o el acceso y al eliminar la cuenta se retira el permiso; el calendario y sus eventos se quedan en Google. La política de privacidad incluye la declaración de uso limitado de las API de Google.
- **RNF-PRI-16.** Dictar es opcional y lo hace el navegador: CLAR no recibe ni guarda el audio, solo el texto que resulta. El navegador envía el audio a su proveedor para pasarlo a texto (Google en Chrome, Apple en Safari, Microsoft en Edge); la política de privacidad lo dice.

### 2.3 Accesibilidad (RNF-ACC)

Origen: `tests/e2e/a11y.spec.ts`, `src/hooks/useModalFocus.ts`, `src/components/AccessibilityPanel.tsx`, `src/services/a11yPrefs.ts`, `src/index.css`.

- **RNF-ACC-01.** Una auditoría automática con axe-core comprueba las pautas WCAG 2.0 y 2.1, niveles A y AA, en cada pantalla, formulario y ventana. Se repite con alto contraste y texto muy grande, y con la disposición del móvil.
- **RNF-ACC-02.** Toda la app se usa con el teclado. Al principio de la página hay un enlace «Saltar al contenido».
- **RNF-ACC-03.** Las ventanas modales llevan el foco dentro, lo mantienen dentro con Tab, se cierran con Escape y devuelven el foco al elemento que las abrió. Mientras hay una abierta, el resto de la página queda inerte.
- **RNF-ACC-04.** El panel «Accesibilidad» ofrece tamaño del texto (Normal, Grande o Muy grande: 100 %, 112,5 % y 125 %), alto contraste, reducir animaciones, foco muy visible y celebraciones (RF-NAV-15). Los cambios se aplican al momento.
- **RNF-ACC-05.** Las preferencias se guardan en cada dispositivo y se aplican antes de dibujar la página. El panel está también en las pantallas de inicio de sesión, confirmación del email y solicitud de acceso.
- **RNF-ACC-06.** La app reduce las animaciones también cuando lo pide el sistema (`prefers-reduced-motion`). Con menos movimiento, las ventanas y los avisos aparecen sin animación y el confeti de las celebraciones no se ve.
- **RNF-ACC-07.** Los avisos se anuncian a los lectores de pantalla: los normales en una región viva educada y las alarmas en una asertiva.
- **RNF-ACC-08.** Los gráficos y las barras de progreso tienen alternativa en texto: el gráfico de 14 días tiene una tabla equivalente y las barras usan el rol `progressbar` con su valor descrito.
- **RNF-ACC-09.** Los botones de solo icono tienen nombre accesible. El documento declara su idioma (`lang="es"` o `lang="en"`, según el de la app) y el título de la pestaña va en ese idioma.
- **RNF-ACC-10.** La pregunta antes de descartar cambios pone el foco en «Seguir editando», la opción que no pierde nada.

### 2.4 Funcionamiento sin conexión y sincronización (RNF-OFF)

Origen: `src/services/firebase.ts`, `src/services/repository.ts`, `src/lazy.tsx`, `public/sw.js`, `vite-plugins/precache.ts`.

- **RNF-OFF-01.** Firestore usa una caché persistente en el dispositivo, compartida entre pestañas. Con la app abierta, se puede leer y escribir sin conexión.
- **RNF-OFF-02.** Las escrituras se aplican al momento en la copia local y se envían al servidor en segundo plano. Al volver la conexión, se sincronizan con el servidor y con los demás dispositivos y pestañas.
- **RNF-OFF-03.** Los datos llegan en tiempo real: un cambio hecho en otro dispositivo aparece sin recargar.
- **RNF-OFF-04.** Necesitan conexión: iniciar sesión, comprobar un acceso que aún no está en la caché, «Deshacer», las funciones del servidor (solicitar acceso, contacto y administración) eliminar la cuenta, importar datos (se comprueba en el servidor qué hay ya) y activar las alarmas con CLAR cerrada.
- **RNF-OFF-05.** La app se abre sin conexión, también la instalada en Android, una vez abierta con conexión en ese dispositivo. El service worker (`public/sw.js`), registrado al arrancar, guarda una copia de cada versión publicada: la app, todos sus trozos (también los de las secciones que no se han abierto), sus iconos y su configuración de Firebase. Las páginas se piden primero a la red (con 4 s de espera como mucho) y, sin conexión, sale la copia; los archivos de la app, de la copia. Al publicar una versión, la copia nueva sustituye a la anterior. En desarrollo no guarda nada. La configuración de Firebase también se guarda en el dispositivo; si no hay ninguna (la primera vez sin conexión), la app dice que necesita conexión. El service worker se sirve sin caché para que se actualice. Lo que pide la entrada con Google, otros sitios y las peticiones que no son de lectura van siempre a la red.
- **RNF-OFF-06.** Si sin conexión falla la descarga de una parte de la app, la app no se recarga: sigue en pie con los datos y ofrece «Reintentar».
- **RNF-OFF-07.** Los cambios simultáneos desde varios dispositivos no duplican ni pisan datos. La siguiente repetición tiene un identificador fijo, «Deshacer» comprueba en una transacción que nada cambió, y al eliminar una meta o un proyecto cada tarea se desvincula en su propia transacción, solo si sigue vinculada.

### 2.5 Rendimiento (RNF-REN)

Origen: `src/App.tsx`, `src/Root.tsx`, `src/lazy.tsx`, `vite.config.ts`, `firebase.json`.

- **RNF-REN-01.** Las secciones y ventanas que no se ven al arrancar se descargan la primera vez que se abren: Agenda, Rueda, Metas, Proyectos, Ayuda, Administración, la vista previa de la importación, los editores de metas, proyectos y áreas, la bienvenida, el recorrido y las novedades.
- **RNF-REN-02.** Las páginas legales se cargan sin Firebase ni el resto de la app.
- **RNF-REN-03.** Las librerías van en paquetes aparte (Firebase, React y el resto; las notificaciones push de Firebase, en otro que solo se descarga si se activan), que el navegador conserva entre versiones. Los archivos de `/assets/` se sirven con caché de un año, como inmutables.
- **RNF-REN-04.** Los cálculos (Top 10, estadísticas, sugerencias, agenda y alarmas) se hacen en el navegador sobre los datos ya cargados. Los estados que dependen de la hora se recalculan cada minuto.
- **RNF-REN-05.** Los mensajes cerrados de administración se cargan por páginas: se leen de 50 en 50 hasta reunir al menos 20 cerrados, así que una página trae entre 20 y 69 (o menos, al final). Solo los abiertos llegan en vivo.
- **RNF-REN-06.** Las escrituras masivas van en lotes: la importación de la descarga, de 100 en 100 para mostrar el avance; el borrado de la cuenta o de sus mensajes y la importación de los datos locales, de hasta 450. Las desvinculaciones y aprobaciones en bloque van de 10 en 10, y los emails en bloque comparten como mucho 3 conexiones.
- **RNF-REN-07.** La función HTTP `api` admite como mucho 10 instancias. El cambio del modo de aprobación puede tardar hasta 300 s. `sendDueAlarms` envía como mucho 200 alarmas por ejecución, 10 a la vez, con 120 s de límite.

### 2.6 Compatibilidad y plataformas (RNF-COM)

Origen: `index.html`, `public/manifest.json`, `functions/src/app.ts`, `src/services/authDomain.ts`, `tests/e2e/responsive.spec.ts`, `playwright.config.ts`.

- **RNF-COM-01.** La interfaz se adapta al ancho de la pantalla. Las pruebas comprueban que no hay desbordamiento horizontal a 360, 375, 768 y 1280 px, y que la cabecera cabe en una línea a 360 px con el texto ampliado.
- **RNF-COM-02.** La disposición del móvil se usa por debajo de 768 px. La app respeta las zonas seguras de la pantalla (muesca y barras del sistema).
- **RNF-COM-03.** La app tiene un manifiesto web (nombre, iconos, también adaptables, modo `standalone` y orientación vertical) y las etiquetas para añadirla a la pantalla de inicio en iOS.
- **RNF-COM-04.** La función HTTP `api` sirve `/.well-known/assetlinks.json` para verificar la app Android (APK de tipo Trusted Web Activity).
- **RNF-COM-05.** Las fechas y horas no dependen del idioma ni de la configuración del navegador: la semana empieza en lunes y las horas son de 24 h.
- **RNF-COM-06.** La interfaz está en español, y las fechas y los números usan el formato `es-ES`.
- **RNF-COM-07.** Servida desde su dominio propio, la app inicia sesión en ese mismo dominio, para que el navegador no bloquee la ventana de Google.
- **RNF-COM-08.** Las pruebas de extremo a extremo se ejecutan en Chromium, con el perfil de Chrome de escritorio.

### 2.7 Mantenibilidad y pruebas (RNF-MAN)

Origen: `package.json`, `tsconfig.json`, `.github/workflows/ci.yml`, `tests/`, `functions/test/`.

- **RNF-MAN-01.** El código es TypeScript en modo estricto. ESLint no admite avisos y Prettier fija el formato; un hook de pre-commit los aplica a los archivos del commit.
- **RNF-MAN-02.** La lógica pura está separada de la interfaz y de Firebase (`src/services/`, `functions/src/accessLogic.ts`, `functions/src/featuresLogic.ts`, `functions/src/calendarLogic.ts`, `functions/src/feedbackLogic.ts`, `functions/src/alarmLogic.ts`) y tiene pruebas unitarias con el test runner de Node.
- **RNF-MAN-03.** Hay pruebas de integración de la importación de datos locales, pruebas de las reglas de Firestore contra el emulador y pruebas contra el emulador de Firestore de la cola y el envío de las alarmas push, con un FCM simulado, de las funciones extra y de la sincronización con Google Calendar, con un Google simulado (`npm run test:push`). Una prueba unitaria comprueba que el evento de la sincronización coincide con el de «Añadir al calendario», también con TZ=Europe/Madrid y TZ=America/New_York.
- **RNF-MAN-04.** Las pruebas de extremo a extremo (Playwright), un archivo por función de la app, usan los emuladores de Auth, Firestore y Functions con un proyecto de demostración. Antes de todas, un paso de calentamiento (`tests/e2e/warm-up.setup.ts`) carga la app y despierta los emuladores, y en desarrollo Vite busca las dependencias de todo `src` al arrancar, así ninguna prueba paga el arranque en frío.
- **RNF-MAN-05.** En cada push y pull request, CI comprueba el formato, el linter, los tipos, la compilación de la app y de las funciones, y todas las pruebas. Solo despliega desde la rama principal, si todo pasa, y de un despliegue en uno.
- **RNF-MAN-06.** La app toma la versión de `package.json`; `public/manifest.json` la repite y se actualiza a mano. Se muestra en la cabecera, el inicio de sesión y el pie, y va en las descargas y en la información técnica del contacto.
- **RNF-MAN-07.** La app sigue leyendo los datos de versiones anteriores: tareas sin estado (con `completed`), repeticiones con fecha de inicio y repeticiones sin `from` (en fechas fijas), y borradores de tareas sin la elección de contar desde que se hace. La importación admite además correos sin estado y adjuntos sin bytes.
- **RNF-MAN-08.** Los textos de la app van junto a donde se usan, con `messages(es, en)` (`src/i18n/locale.ts`): el catálogo inglés tiene la misma forma que el español, así que si falta un texto, no compila. El idioma es fijo mientras la página está abierta. Las fechas y los números usan `LOCALE_TAG`. En el servidor, `functions/src/i18n.ts` hace lo mismo, y los mensajes de error van en el idioma de quien llama (`functions/src/callable.ts`). Hay pruebas unitarias en inglés (`tests/unit/*-en.test.ts`, `functions/test/english.test.ts`) y una e2e del cambio de idioma.

---

## 3. Fuera de alcance

Lo que el código no hace y un lector podría esperar:

- CLAR no redacta ni envía los correos de la persona ni planifica sus reuniones: desde la 1.3.0 solo da recomendaciones en la Ayuda.
- Solo se conecta con Google Calendar, y en un solo sentido (RF-GCA): con los demás calendarios, solo exporta con enlaces y archivos .ics.
- Las reuniones y los correos guardados antes de la 1.3.0 no se ven ni se editan desde la app: van en la descarga y se eliminan todos juntos desde el menú de la cuenta (RF-CUE-34) o con la cuenta.
- Las evaluaciones de la Rueda no se editan ni se borran una a una, y las áreas no se eliminan ni se reordenan.
- No hay listas compartidas ni colaboración: cada cuenta solo ve lo suyo.
