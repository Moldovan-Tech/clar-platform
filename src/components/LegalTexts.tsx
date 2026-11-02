import React, { useState } from 'react';
import { EMAIL_PROVIDER, MIN_AGE, OWNER, legalPath } from '../services/legal';
import { LOCALE, messages } from '../i18n/locale';

// Contenido de los textos legales. Si cambia, cambia también LEGAL_UPDATED y LEGAL_UPDATED_LABEL
// (src/services/legal.ts). Cada texto está en español, el que vale, y en inglés, una traducción para facilitar la
// lectura: cambia los dos a la vez.

const m = messages(
  { owner: '[nombre del titular]', email: '[email de contacto]' },
  { owner: "[owner's name]", email: '[contact email]' }
);

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section aria-labelledby={id} className="space-y-2">
    <h2 id={id} className="pt-4 text-base font-bold text-slate-900">
      {title}
    </h2>
    {children}
  </section>
);

const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
);

const ownerName = () => OWNER.name || m.owner;

const Contact: React.FC = () =>
  OWNER.email ? (
    <a href={`mailto:${OWNER.email}`} className="font-semibold text-indigo-700 underline hover:text-indigo-900">
      {OWNER.email}
    </a>
  ) : (
    <span>{m.email}</span>
  );

const PageLink: React.FC<{ to: Parameters<typeof legalPath>[0]; children: React.ReactNode }> = ({ to, children }) => (
  <a href={legalPath(to)} className="font-semibold text-indigo-700 underline hover:text-indigo-900">
    {children}
  </a>
);

const PrivacyPolicyEs: React.FC = () => (
  <>
    <p>
      CLAR es una app gratuita, sin publicidad, para organizar tu tiempo. Aquí se explica qué datos tuyos trata, para
      qué, quién los ve, cuánto tiempo se guardan y cómo ejercer tus derechos, según el Reglamento General de Protección
      de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
    </p>

    <Section id="privacy-owner" title="Quién es el responsable">
      <p>
        {ownerName()}, persona física y titular de CLAR, con domicilio a efectos de notificaciones en {OWNER.address}.
        Proyecto sin actividad económica. Para cualquier cuestión sobre tus datos: <Contact />.
      </p>
    </Section>

    <Section id="privacy-data" title="Qué datos tratamos y para qué">
      <List>
        <li>
          <strong>Tu cuenta:</strong> nombre, email, foto de perfil (si entras con Google), fecha de alta y del último
          acceso, cuándo aceptaste estas condiciones (y su versión) y el idioma de la app que eliges. Si entras con
          email, la contraseña la guarda Firebase Authentication de forma que nadie, tampoco CLAR, puede leerla. Sirven
          para crear tu cuenta y dejarte entrar.
        </li>
        <li>
          <strong>Lo que escribes en CLAR:</strong> tareas (títulos, descripciones, notas, enlaces, fechas, alarmas y de
          qué otra tarea dependen) y sus borradores (las tareas nuevas que cierras sin guardar, hasta que las guardas o
          las eliminas), metas, proyectos (nombre, meta, fecha de fin y descripción), evaluaciones de la Rueda de la
          Vida (tu puntuación de 0 a 10 en cada área, y los nombres de tus áreas si las cambias o añades). Sirven para
          que la app funcione. Si guardaste reuniones o correos en «Tiempo protegido» con una versión anterior (asunto,
          texto, destinatarios y el nombre y el tamaño de los adjuntos: los archivos no salieron de tu dispositivo), se
          conservan en tu cuenta aunque la app ya no los muestre: van en «Descargar mis datos» y puedes eliminarlos
          desde el menú de tu cuenta (si no, se eliminan con tu cuenta). Pueden incluir el nombre y el email de otras
          personas.
        </li>
        <li>
          <strong>Registro de acceso:</strong> tu nombre, email y foto, el estado de tu acceso y sus fechas y, si pides
          acceso, el mensaje que escribas y el idioma de la app (para escribirte en él). Sirven para gestionar el acceso
          (aprobarlo cuando se revisan las cuentas, retirarlo o bloquearlo) y evitar abusos.
        </li>
        <li>
          <strong>Mensajes de «Escríbenos»:</strong> el tipo, el asunto y el texto, con tu nombre, tu email y el idioma
          de tu cuenta, y las respuestas de la administración. Si lo marcas, también la información técnica que ves
          antes de enviarlo (versión de CLAR, sistema, navegador, tipo de dispositivo, idioma y conexión). Para limitar
          los envíos a cinco por hora se guardan las horas de los de la última hora. Sirven para atenderte y responderte
          por email.
        </li>
        <li>
          <strong>Funciones extra:</strong> cuáles te ha activado la administración y cuándo; en la cuenta de
          administración, cuáles tiene encendidas. Sirven para que puedas usarlas.
        </li>
        <li>
          <strong>Sincronización con Google Calendar:</strong> si tienes esta función y conectas tu cuenta de Google,
          CLAR guarda el permiso que le das (cifrado), el identificador de su calendario «CLAR» y tu zona horaria, y
          envía a ese calendario el título, la descripción, las notas, las fechas, la repetición y la alarma de tus
          tareas con fecha (las hechas y canceladas, marcadas con «✓» o «✕»). Sirve para que veas tus tareas en Google
          Calendar. CLAR solo pide permiso para crear y usar su propio calendario: no ve ni cambia tus otros calendarios
          ni sus eventos, y no lee nada de tu cuenta de Google. El uso y la transferencia a cualquier otra aplicación de
          la información recibida de las API de Google se ajustan a la{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-700 underline hover:text-indigo-900"
          >
            Política de datos de usuario de los servicios de las API de Google
          </a>
          , incluidos sus requisitos de uso limitado.
        </li>
        <li>
          <strong>Cuentas bloqueadas:</strong> el email de una cuenta bloqueada por abuso, para que no pueda volver a
          registrarse.
        </li>
        <li>
          <strong>Alarmas con CLAR cerrada:</strong> si activas «Avisarme también con CLAR cerrada» en un dispositivo,
          su identificador de notificaciones (de Firebase Cloud Messaging), su zona horaria, su idioma y si quieres ver
          el nombre de la tarea y, de cada alarma pendiente, su hora, el nombre de la tarea y cuándo vence. Sirven para
          avisarte a la hora de la alarma aunque CLAR esté cerrada. La notificación lleva solo la hora de la alarma y
          cuándo vence, salvo que elijas ver también el nombre de la tarea (se vería con el móvil bloqueado). Llega a tu
          dispositivo por Firebase Cloud Messaging y por el servicio push de tu navegador (el de Google en Chrome y
          Android; el de Mozilla, Apple o Microsoft en sus navegadores), que la recibe cifrada.
        </li>
        <li>
          <strong>Registros técnicos:</strong> al usar CLAR, los servicios de Google que la sirven (Firebase Hosting,
          Authentication y Cloud Functions) registran datos técnicos de cada acceso, como la dirección IP, el navegador
          y la hora. Los registros propios de CLAR solo llevan recuentos y códigos de error, sin tus datos. Sirven para
          la seguridad y para detectar y corregir fallos.
        </li>
        <li>
          <strong>En tu dispositivo:</strong> CLAR usa el almacenamiento local de tu navegador (Local Storage e
          IndexedDB) y la sesión de Firebase exclusivamente por motivos técnicos. Guarda la sesión, una copia de tus
          datos para usar la app sin conexión (se borra al cerrar sesión; ver «Cuánto tiempo se guardan») y algunas
          preferencias: el idioma de la app, accesibilidad (también si quieres ver las celebraciones), orden y filtros
          de las listas, alarmas ya avisadas, si viste la bienvenida y las novedades de la versión, si activaste las
          alarmas con CLAR cerrada en ese dispositivo (y si muestran el nombre de la tarea), la configuración de la app
          y, en la cuenta de administración, cuándo miró las solicitudes por última vez. También registra un service
          worker, que guarda una copia de la app (sus archivos, sin tus datos) para abrirla sin conexión y muestra las
          notificaciones de las alarmas (y apunta durante dos días cuáles llegaron con CLAR cerrada, para no repetirlas
          al abrirla). Todo es necesario para que la app funcione (art. 22.2 de la LSSI), por eso no se pide
          consentimiento: CLAR no usa cookies de seguimiento, analítica ni publicidad.
        </li>
      </List>
      <p>
        CLAR no te pide datos de salud, creencias ni otros especialmente protegidos. Las áreas de la Rueda (por ejemplo,
        «Salud» o «Espiritualidad») recogen tu valoración personal de cada área. Si escribes datos de ese tipo en tus
        textos, solo se usan para mostrártelos a ti.
      </p>
    </Section>

    <Section id="privacy-basis" title="Base jurídica">
      <List>
        <li>
          <strong>Ejecución del contrato</strong> (art. 6.1.b RGPD), al aceptar las{' '}
          <PageLink to="terms">condiciones de uso</PageLink>: tu cuenta, lo que escribes en CLAR, los emails sobre tu
          acceso y las respuestas a tus mensajes.
        </li>
        <li>
          <strong>Interés legítimo</strong> (art. 6.1.f RGPD) en mantener CLAR segura y sin abusos: la aprobación y el
          bloqueo de cuentas, el límite de mensajes y los registros técnicos.
        </li>
        <li>
          <strong>Consentimiento</strong> (art. 6.1.a RGPD): la información técnica opcional de tus mensajes. Puedes
          retirarlo escribiendo a <Contact />.
        </li>
        <li>
          <strong>Consentimiento</strong> (art. 6.1.a RGPD): las alarmas con CLAR cerrada, que activas en cada
          dispositivo. Lo retiras desactivándolas en el menú de tu cuenta.
        </li>
        <li>
          <strong>Consentimiento</strong> (art. 6.1.a RGPD): la sincronización con Google Calendar, al conectar tu
          cuenta de Google. Lo retiras con «Desconectar Google Calendar», en el menú de tu cuenta, o quitando el permiso
          de CLAR en tu cuenta de Google.
        </li>
      </List>
    </Section>

    <Section id="privacy-recipients" title="Quién ve tus datos">
      <List>
        <li>Tú, desde cualquier dispositivo con tu cuenta.</li>
        <li>
          Desde la app, la administración de CLAR (su titular) ve solo la lista de cuentas (nombre, email, foto y estado
          de acceso), las funciones extra de cada cuenta y los mensajes de «Escríbenos»: las reglas de la base de datos
          no le dejan leer tus tareas, metas, proyectos, evaluaciones, reuniones, correos ni borradores. Como
          responsable del proyecto en Google Cloud, el titular podría acceder técnicamente a todos los datos desde la
          consola; solo lo hará cuando sea imprescindible para mantener el servicio, resolver una incidencia o atender
          una petición tuya.
        </li>
        <li>
          Encargados del tratamiento, que tratan los datos solo para prestar su servicio: Google, con Firebase
          (Authentication, Firestore, Cloud Functions, Cloud Messaging y Hosting), y {EMAIL_PROVIDER}, en la UE, para
          los emails de CLAR.
        </li>
        <li>
          Otros servicios, solo cuando tú lo decides: al usar «Añadir al calendario» con Google Calendar u Outlook, el
          título, la descripción y las notas de la tarea van en el enlace; si conectas Google Calendar, los datos de tus
          tareas con fecha van al calendario «CLAR» de tu propia cuenta de Google, donde Google los trata según sus
          condiciones y su política de privacidad; si dictas una tarea o una nota con el micrófono, tu navegador pasa tu
          voz a texto enviando el audio a su proveedor (Google en Chrome, Apple en Safari, Microsoft en Edge), que lo
          trata según sus condiciones. CLAR no recibe ni guarda el audio: solo el texto, como si lo hubieras escrito.
        </li>
      </List>
      <p>CLAR no vende ni cede tus datos a nadie.</p>
    </Section>

    <Section id="privacy-location" title="Dónde se guardan y transferencias internacionales">
      <p>
        Lo que escribes en CLAR se guarda en servidores de Google Cloud en la Unión Europea (Bélgica), y los emails
        salen de {EMAIL_PROVIDER}, también en la UE. Firebase Authentication (tu cuenta: nombre, email y foto) y
        Firebase Cloud Messaging (las notificaciones de las alarmas, si las activas) pueden tratar datos fuera de la UE,
        en Estados Unidos, con las garantías del Marco de Privacidad de Datos UE-EE. UU. (decisión de adecuación de la
        Comisión Europea de 10 de julio de 2023) y de las cláusulas contractuales tipo de la Comisión. Si conectas
        Google Calendar, lo que se envía a tu cuenta de Google queda sujeto a sus condiciones, y Google puede tratarlo
        fuera de la UE.
      </p>
    </Section>

    <Section id="privacy-retention" title="Cuánto tiempo se guardan">
      <List>
        <li>Tu cuenta y lo que escribes: hasta que lo borres o elimines la cuenta.</li>
        <li>
          Reuniones y correos de versiones anteriores: hasta que los elimines desde el menú de tu cuenta o elimines la
          cuenta.
        </li>
        <li>Registro de acceso y mensajes de «Escríbenos»: hasta que elimines la cuenta.</li>
        <li>
          Registros técnicos: los de CLAR (Cloud Logging), 30 días. Los que guardan los servicios de Google para
          funcionar siguen sus propios plazos (Hosting, unos meses; Authentication, unas semanas).
        </li>
        <li>
          Funciones extra: hasta que la administración te las quite o te retire o bloquee el acceso, o elimines la
          cuenta.
        </li>
        <li>
          Conexión con Google Calendar: el permiso se borra (y se retira en Google) al desconectar, si la administración
          te quita la función, si pierdes el acceso y al eliminar la cuenta. El identificador del calendario se guarda,
          para volver a usarlo si conectas otra vez, hasta que elimines la cuenta. Si retiras el permiso desde tu cuenta
          de Google, CLAR lo borra en cuanto lo detecta (en la siguiente sincronización). El calendario «CLAR» y sus
          eventos se quedan en tu cuenta de Google hasta que los borres tú.
        </li>
        <li>
          Horas de envío de los mensajes: cuentan una hora para el límite de cinco, pero no se borran solas. Se
          descartan cuando envías otro mensaje pasada esa hora; si no envías ninguno más, o eliminas la cuenta justo
          después de escribir, se conservan, ligadas solo al identificador interno de tu cuenta y sin ningún otro dato
          tuyo, para que el límite se siga aplicando.
        </li>
        <li>Email de una cuenta bloqueada: mientras dure el bloqueo, también si la cuenta se elimina.</li>
        <li>
          Alarmas con CLAR cerrada: al desactivarlas o cerrar sesión en un dispositivo, deja de recibirlas al momento,
          también sin conexión; su identificador y su zona horaria se borran del servidor entonces o, si no hay
          conexión, al intentar el siguiente envío. También se borran al cerrar la sesión en todos los dispositivos, si
          la administración rechaza, retira o bloquea la cuenta, al eliminar la cuenta y, en cualquier caso, cuando el
          dispositivo lleva 30 días sin abrir CLAR. Cada alarma pendiente se borra cuando se envía, cuando cambia o se
          borra su tarea, o cuando vence; de las enviadas solo se guarda cuál fue, para no repetirla, hasta que se borre
          la tarea o la cuenta.
        </li>
        <li>
          Lo que contestes por email a nuestras respuestas: llega al buzón de <Contact /> y se guarda el tiempo
          necesario para atenderte.
        </li>
        <li>
          Copia en tu dispositivo: hasta que cierres sesión. Si en ese momento CLAR está abierta en otras pestañas, el
          navegador no deja borrarla y se queda hasta que vuelvas a cerrar sesión con una sola pestaña abierta.
        </li>
      </List>
    </Section>

    <Section id="privacy-rights" title="Tus derechos">
      <p>
        Tienes derecho a acceder a tus datos, rectificarlos, suprimirlos, oponerte a su tratamiento, limitarlo y
        llevártelos (portabilidad). Casi todo lo puedes hacer tú desde la app:
      </p>
      <List>
        <li>Cambiar o borrar cualquier tarea, meta o proyecto.</li>
        <li>«Descargar mis datos», en el menú de tu cuenta: un archivo JSON con lo que has escrito.</li>
        <li>
          «Importar datos», en el mismo menú: vuelve a añadir a tu cuenta lo de una descarga anterior. El archivo se lee
          en tu dispositivo y solo se guarda lo que falta en tu cuenta.
        </li>
        <li>«Eliminar la cuenta», en el mismo menú: borra tu cuenta y todo su contenido.</li>
      </List>
      <p>
        Para lo demás, escribe a <Contact />. Te responderemos en un mes como máximo. Si no estás de acuerdo con la
        respuesta, puedes reclamar ante la Agencia Española de Protección de Datos (
        <a
          href="https://www.aepd.es"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-indigo-700 underline hover:text-indigo-900"
        >
          aepd.es
        </a>
        ).
      </p>
    </Section>

    <Section id="privacy-minors" title="Menores">
      <p>
        CLAR es para personas de {MIN_AGE} años o más (o de la edad mínima legal para dar tu consentimiento en tu país
        de residencia, si es mayor). Si tienes menos, no la uses. Si sabemos que una cuenta es de alguien por debajo de
        esa edad, la eliminaremos.
      </p>
    </Section>

    <Section id="privacy-automated" title="Decisiones automatizadas">
      <p>
        Las sugerencias de CLAR (el Top 10, las recomendaciones de Inicio o el área que propone para una tarea) se
        calculan en tu navegador y solo te orientan: no hay decisiones automatizadas con efectos jurídicos ni que te
        afecten de forma significativa.
      </p>
    </Section>

    <Section id="privacy-security" title="Seguridad">
      <p>
        Las conexiones van cifradas (HTTPS) y Google cifra los datos guardados. Las reglas de la base de datos solo
        dejan a cada cuenta acceder a lo suyo, y la app le pide al navegador que no le dé acceso a la cámara ni a la
        ubicación, que no usa; el micrófono, solo a la propia app y solo cuando pulsas el de dictar. Si hubiera una
        brecha de seguridad que afecte a tus datos, se notificará a la AEPD y, si supone un riesgo alto para ti, también
        a ti.
      </p>
    </Section>

    <Section id="privacy-changes" title="Cambios">
      <p>
        Si esta política cambia, la nueva versión se publicará aquí con su fecha. Si el cambio es importante, te
        avisaremos en la app o por email.
      </p>
    </Section>
  </>
);

const TermsOfUseEs: React.FC = () => (
  <>
    <p>
      Estas condiciones regulan el uso de CLAR. Al crear tu cuenta o seguir usándola, las aceptas. Cómo se tratan tus
      datos se explica en la <PageLink to="privacy">política de privacidad</PageLink>.
    </p>

    <Section id="terms-service" title="El servicio">
      <p>
        CLAR es una app gratuita para organizar el tiempo: Rueda de la Vida, metas, proyectos, tareas, agenda, alarmas y
        recomendaciones para proteger tu tiempo. La ofrece {ownerName()}, como proyecto personal. CLAR no envía correos
        en tu nombre.
      </p>
    </Section>

    <Section id="terms-age" title="Quién puede usarla">
      <p>
        Personas de {MIN_AGE} años o más (o de la edad mínima legal para dar tu consentimiento en tu país de residencia,
        si es mayor). Si tienes menos, no la uses. Si la administración aprueba las cuentas una a una, necesitas su
        aprobación para empezar a usarla.
      </p>
    </Section>

    <Section id="terms-account" title="Tu cuenta">
      <List>
        <li>Usa datos verdaderos y guarda tu contraseña: lo que se haga con tu cuenta es responsabilidad tuya.</li>
        <li>
          Si crees que alguien ha entrado en tu cuenta, cambia la contraseña y cierra la sesión en todos los
          dispositivos.
        </li>
      </List>
    </Section>

    <Section id="terms-use" title="Uso aceptable">
      <p>No está permitido:</p>
      <List>
        <li>usar CLAR para actividades ilegales o para guardar contenido ilícito;</li>
        <li>añadir datos de otras personas sin motivo legítimo;</li>
        <li>intentar acceder a datos de otras cuentas, saltarse los límites o atacar el servicio;</li>
        <li>enviar mensajes abusivos o publicidad por «Escríbenos».</li>
      </List>
      <p>
        Si se incumplen estas condiciones, la administración puede retirar o bloquear el acceso. Aun así, podrás
        descargar o eliminar tus datos.
      </p>
    </Section>

    <Section id="terms-content" title="Tu contenido">
      <p>
        Lo que escribes en CLAR es tuyo. Al guardarlo en la app, nos concedes una licencia mundial, gratuita y
        estrictamente técnica para alojar, procesar y mostrar esos datos en tus dispositivos con el único fin de hacer
        funcionar el servicio.
      </p>
    </Section>

    <Section id="terms-availability" title="Disponibilidad y responsabilidad">
      <p>
        CLAR se ofrece gratis y tal como está. Se intenta que funcione siempre y sin errores, pero no se puede
        garantizar. Descarga tus datos de vez en cuando desde el menú de tu cuenta. Si CLAR deja de ofrecerse, se
        avisará con tiempo suficiente para que puedas descargarlos. Nada de esto limita los derechos que te reconoce la
        ley como consumidor.
      </p>
    </Section>

    <Section id="terms-end" title="Darte de baja">
      <p>Puedes eliminar tu cuenta cuando quieras, desde el menú de tu cuenta.</p>
    </Section>

    <Section id="terms-changes" title="Cambios en las condiciones">
      <p>
        Si cambian, la nueva versión se publicará aquí con su fecha. Si el cambio es importante, te avisaremos en la app
        o por email antes de que se aplique.
      </p>
    </Section>

    <Section id="terms-contact" title="Contacto y avisos de contenido ilícito">
      <p>
        Para cualquier duda, o para avisar de contenido ilícito, escribe a <Contact />, en español o en inglés. Es
        también el punto de contacto del Reglamento de Servicios Digitales (Reglamento (UE) 2022/2065).
      </p>
    </Section>

    <Section id="terms-law" title="Ley aplicable">
      <p>
        Estas condiciones se rigen por la ley española. Si eres consumidor, puedes acudir a los tribunales de tu
        domicilio.
      </p>
    </Section>
  </>
);

const LegalNoticeEs: React.FC = () => (
  <>
    <Section id="notice-owner" title="Titular">
      <p>
        CLAR (clar.life) es un proyecto personal de {ownerName()}, persona física, con domicilio a efectos de
        notificaciones en {OWNER.address}. Es gratuito, sin publicidad y sin actividad económica. Contacto: <Contact />.
      </p>
    </Section>

    <Section id="notice-ip" title="Propiedad intelectual">
      <p>
        El código de CLAR es software libre con licencia MIT. El nombre y el logotipo de CLAR pertenecen a su titular.
        Lo que escribes en la app es tuyo.
      </p>
    </Section>

    <Section id="notice-links" title="Enlaces">
      <p>
        CLAR enlaza con servicios de otros, como Google Calendar u Outlook. No es responsable de su contenido ni de sus
        condiciones.
      </p>
    </Section>

    <Section id="notice-more" title="Más información">
      <p>
        Cómo se tratan tus datos: <PageLink to="privacy">política de privacidad</PageLink>. Normas de uso:{' '}
        <PageLink to="terms">condiciones de uso</PageLink>.
      </p>
    </Section>

    <Section id="notice-affiliation" title="Inspiración y ausencia de afiliación">
      <p>
        CLAR es una herramienta independiente inspirada en metodologías de gestión del tiempo de dominio público y en
        obras literarias como <cite>Gestiona tu tiempo, disfruta de la vida</cite>, de Jonathan Benito Sipos. CLAR no
        tiene ninguna afiliación, patrocinio ni vinculación comercial u oficial con el autor.
      </p>
    </Section>
  </>
);

// TRADUCCIÓN AL INGLÉS: el mismo contenido, con el aviso de que vale la versión española y un botón para leerla aquí
// (solo esta página: el idioma de la app no cambia)

interface EnglishTextProps {
  onShowSpanish: () => void;
}

const TranslationNotice: React.FC<EnglishTextProps> = ({ onShowSpanish }) => (
  <div role="note" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
    <p>
      This is a translation for your convenience. The Spanish version is the one that applies, and it prevails in case
      of any discrepancy.
    </p>
    <button
      type="button"
      onClick={onShowSpanish}
      className="inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-amber-100"
    >
      Read the Spanish version
    </button>
  </div>
);

const PrivacyPolicyEn: React.FC<EnglishTextProps> = ({ onShowSpanish }) => (
  <>
    <TranslationNotice onShowSpanish={onShowSpanish} />
    <p>
      CLAR is a free, ad-free app for organizing your time. This page explains what data of yours it processes, why, who
      sees it, how long it is kept and how to exercise your rights, under the General Data Protection Regulation (GDPR,
      or RGPD in Spanish) and Spanish Organic Law 3/2018 on the Protection of Personal Data and Guarantee of Digital
      Rights (LOPDGDD).
    </p>

    <Section id="privacy-owner" title="Who is responsible (data controller)">
      <p>
        {ownerName()}, a private individual and the owner of CLAR, with an address for notices at {OWNER.address}. The
        project has no economic activity. For any question about your data: <Contact />.
      </p>
    </Section>

    <Section id="privacy-data" title="What data we process and why">
      <List>
        <li>
          <strong>Your account:</strong> name, email, profile photo (if you sign in with Google), the date you signed up
          and your last sign-in, when you accepted these terms (and which version) and the app language you choose. If
          you sign in with email, your password is stored by Firebase Authentication in a way that nobody, CLAR
          included, can read it. This data is used to create your account and let you sign in.
        </li>
        <li>
          <strong>What you write in CLAR:</strong> tasks (titles, descriptions, notes, links, dates, alarms and which
          other task they depend on) and their drafts (new tasks you close without saving, until you save or delete
          them), goals, projects (name, goal, end date and description), Wheel of Life assessments (your score from 0 to
          10 in each area, and the names of your areas if you change them or add your own). This data is used to make
          the app work. If you saved meetings or emails in “Protected time” with an earlier version (subject, text,
          recipients and the name and size of attachments: the files never left your device), they are kept in your
          account even though the app no longer shows them: they are included in “Download my data” and you can delete
          them from your account menu (otherwise they are deleted with your account). They may include other people's
          names and email addresses.
        </li>
        <li>
          <strong>Access record:</strong> your name, email and photo, the status of your access and its dates and, if
          you request access, the message you write and the app language (to write to you in it). This data is used to
          manage access (approving it when accounts are reviewed, withdrawing or blocking it) and to prevent abuse.
        </li>
        <li>
          <strong>“Contact us” messages:</strong> the type, subject and text, with your name, your email and your
          account's language, and the administrator's replies. If you tick the box, also the technical information you
          see before sending (CLAR version, system, browser, device type, language and connection). To limit messages to
          five per hour, the times of those sent in the last hour are stored. This data is used to help you and reply to
          you by email.
        </li>
        <li>
          <strong>Extra features:</strong> which ones the administrator has turned on for you and when; on the
          administrator account, which ones are switched on. This data is used so you can use them.
        </li>
        <li>
          <strong>Google Calendar sync:</strong> if you have this feature and connect your Google account, CLAR stores
          the permission you give it (encrypted), the ID of its “CLAR” calendar and your time zone, and sends to that
          calendar the title, description, notes, dates, repeat and alarm of your tasks with a date (done and canceled
          ones are marked with “✓” or “✕”). This is used so you can see your tasks in Google Calendar. CLAR only asks
          for permission to create and use its own calendar: it does not see or change your other calendars or their
          events, and it does not read anything from your Google account. CLAR's use and transfer to any other app of
          information received from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-700 underline hover:text-indigo-900"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </li>
        <li>
          <strong>Blocked accounts:</strong> the email of an account blocked for abuse, so that it cannot sign up again.
        </li>
        <li>
          <strong>Alarms when CLAR is closed:</strong> if you turn on “Also notify me when CLAR is closed” on a device,
          its notification ID (from Firebase Cloud Messaging), its time zone, its language and whether you want to see
          the task name and, for each pending alarm, its time, the task name and when the task is due. This data is used
          to notify you at the alarm time even when CLAR is closed. The notification only shows the alarm time and when
          the task is due, unless you choose to also see the task name (it would be visible with your phone locked). It
          reaches your device through Firebase Cloud Messaging and your browser's push service (Google's in Chrome and
          Android; Mozilla's, Apple's or Microsoft's in their browsers), which receives it encrypted.
        </li>
        <li>
          <strong>Technical logs:</strong> when you use CLAR, the Google services that run it (Firebase Hosting,
          Authentication and Cloud Functions) log technical data about each request, such as the IP address, the browser
          and the time. CLAR's own logs only contain counts and error codes, none of your data. They are used for
          security and to detect and fix problems.
        </li>
        <li>
          <strong>On your device:</strong> CLAR uses your browser's local storage (Local Storage and IndexedDB) and the
          Firebase session for technical purposes only. It stores the session, a copy of your data to use the app
          offline (deleted when you sign out; see “How long we keep it”) and some preferences: the app language,
          accessibility (including whether you want to see celebrations), sorting and filters of the lists, alarms
          already notified, whether you have seen the welcome and what's new in the current version, whether you turned
          on alarms when CLAR is closed on that device (and whether they show the task name), the app settings and, on
          the administrator account, when it last checked the access requests. It also registers a service worker, which
          stores a copy of the app (its files, without your data) to open it offline and shows alarm notifications (and
          keeps a note for two days of which ones arrived while CLAR was closed, so they are not repeated when you open
          it). All of this is necessary for the app to work (Art. 22(2) of the Spanish Information Society Services and
          Electronic Commerce Act, LSSI), so no consent is requested: CLAR does not use tracking, analytics or
          advertising cookies.
        </li>
      </List>
      <p>
        CLAR does not ask you for health data, beliefs or other specially protected data. The Wheel areas (for example,
        “Health” or “Spirituality”) record your personal assessment of each area. If you write data of that kind in your
        texts, it is only used to show it to you.
      </p>
    </Section>

    <Section id="privacy-basis" title="Legal basis">
      <List>
        <li>
          <strong>Performance of a contract</strong> (Art. 6(1)(b) GDPR), when you accept the{' '}
          <PageLink to="terms">terms of use</PageLink>: your account, what you write in CLAR, the emails about your
          access and the replies to your messages.
        </li>
        <li>
          <strong>Legitimate interest</strong> (Art. 6(1)(f) GDPR) in keeping CLAR secure and free of abuse: approving
          and blocking accounts, the message limit and technical logs.
        </li>
        <li>
          <strong>Consent</strong> (Art. 6(1)(a) GDPR): the optional technical information in your messages. You can
          withdraw it by writing to <Contact />.
        </li>
        <li>
          <strong>Consent</strong> (Art. 6(1)(a) GDPR): alarms when CLAR is closed, which you turn on for each device.
          You withdraw it by turning them off in your account menu.
        </li>
        <li>
          <strong>Consent</strong> (Art. 6(1)(a) GDPR): Google Calendar sync, when you connect your Google account. You
          withdraw it with “Disconnect Google Calendar”, in your account menu, or by removing CLAR's access in your
          Google account.
        </li>
      </List>
    </Section>

    <Section id="privacy-recipients" title="Who sees your data">
      <List>
        <li>You, from any device with your account.</li>
        <li>
          From the app, CLAR's administrator (its owner) only sees the list of accounts (name, email, photo and access
          status), each account's extra features and the “Contact us” messages: the database rules do not let the
          administrator read your tasks, goals, projects, assessments, meetings, emails or drafts. As the person
          responsible for the project in Google Cloud, the owner could technically access all data from the console;
          they will only do so when strictly necessary to maintain the service, resolve an incident or handle a request
          from you.
        </li>
        <li>
          Processors, which process the data only to provide their service: Google, with Firebase (Authentication,
          Firestore, Cloud Functions, Cloud Messaging and Hosting), and {EMAIL_PROVIDER}, in the EU, for CLAR's emails.
        </li>
        <li>
          Other services, only when you decide: when you use “Add to calendar” with Google Calendar or Outlook, the
          task's title, description and notes go in the link; if you connect Google Calendar, the data of your tasks
          with a date goes to the “CLAR” calendar in your own Google account, where Google processes it under its terms
          and its privacy policy; if you dictate a task or a note with the microphone, your browser turns your voice
          into text by sending the audio to its provider (Google in Chrome, Apple in Safari, Microsoft in Edge), which
          processes it under its own terms. CLAR does not receive or store the audio: only the text, as if you had typed
          it.
        </li>
      </List>
      <p>CLAR does not sell or hand over your data to anyone.</p>
    </Section>

    <Section id="privacy-location" title="Where it is stored and international transfers">
      <p>
        What you write in CLAR is stored on Google Cloud servers in the European Union (Belgium), and emails are sent
        from {EMAIL_PROVIDER}, also in the EU. Firebase Authentication (your account: name, email and photo) and
        Firebase Cloud Messaging (alarm notifications, if you turn them on) may process data outside the EU, in the
        United States, with the safeguards of the EU-U.S. Data Privacy Framework (European Commission adequacy decision
        of 10 July 2023) and the Commission's standard contractual clauses. If you connect Google Calendar, what is sent
        to your Google account is subject to its terms, and Google may process it outside the EU.
      </p>
    </Section>

    <Section id="privacy-retention" title="How long we keep it">
      <List>
        <li>Your account and what you write: until you delete it or delete your account.</li>
        <li>
          Meetings and emails from earlier versions: until you delete them from your account menu or delete your
          account.
        </li>
        <li>Access record and “Contact us” messages: until you delete your account.</li>
        <li>
          Technical logs: CLAR's own (Cloud Logging), 30 days. Those that Google's services keep to work follow their
          own periods (Hosting, a few months; Authentication, a few weeks).
        </li>
        <li>
          Extra features: until the administrator removes them from you or withdraws or blocks your access, or you
          delete your account.
        </li>
        <li>
          Google Calendar connection: the permission is deleted (and revoked at Google) when you disconnect, if the
          administrator removes the feature from you, if you lose access and when you delete your account. The calendar
          ID is kept, to reuse it if you connect again, until you delete your account. If you remove the permission from
          your Google account, CLAR deletes it as soon as it detects it (at the next sync). The “CLAR” calendar and its
          events stay in your Google account until you delete them yourself.
        </li>
        <li>
          Message send times: they count for one hour towards the limit of five, but they are not deleted on their own.
          They are discarded when you send another message after that hour; if you do not send any more, or you delete
          your account right after writing, they are kept, linked only to your account's internal ID and without any
          other data of yours, so that the limit keeps applying.
        </li>
        <li>Email of a blocked account: for as long as the block lasts, even if the account is deleted.</li>
        <li>
          Alarms when CLAR is closed: when you turn them off or sign out on a device, it stops receiving them right
          away, even offline; its ID and time zone are deleted from the server then or, if there is no connection, at
          the next delivery attempt. They are also deleted when you sign out on all devices, if the administrator
          rejects, withdraws or blocks the account, when the account is deleted and, in any case, when the device has
          not opened CLAR for 30 days. Each pending alarm is deleted when it is sent, when its task changes or is
          deleted, or when it is due; of those sent, only which one it was is kept, so it is not repeated, until the
          task or the account is deleted.
        </li>
        <li>
          What you reply by email to our answers: it reaches the <Contact /> inbox and is kept for as long as needed to
          help you.
        </li>
        <li>
          Copy on your device: until you sign out. If CLAR is open in other tabs at that moment, the browser does not
          allow deleting it, and it stays until you sign out again with only one tab open.
        </li>
      </List>
    </Section>

    <Section id="privacy-rights" title="Your rights">
      <p>
        You have the right to access your data, rectify it, erase it, object to its processing, restrict it and take it
        with you (portability). You can do almost all of it yourself from the app:
      </p>
      <List>
        <li>Change or delete any task, goal or project.</li>
        <li>“Download my data”, in your account menu: a JSON file with what you have written.</li>
        <li>
          “Import data”, in the same menu: adds back to your account what was in a previous download. The file is read
          on your device and only what is missing from your account is saved.
        </li>
        <li>“Delete account”, in the same menu: deletes your account and all its content.</li>
      </List>
      <p>
        For anything else, write to <Contact />. We will reply within one month at most. If you disagree with the reply,
        you can file a complaint with the Spanish Data Protection Agency (AEPD,{' '}
        <a
          href="https://www.aepd.es"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-indigo-700 underline hover:text-indigo-900"
        >
          aepd.es
        </a>
        ).
      </p>
    </Section>

    <Section id="privacy-minors" title="Minors">
      <p>
        CLAR is for people aged {MIN_AGE} or over (or the minimum legal age to give your consent in your country of
        residence, if higher). If you are younger, do not use it. If we learn that an account belongs to someone under
        that age, we will delete it.
      </p>
    </Section>

    <Section id="privacy-automated" title="Automated decisions">
      <p>
        CLAR's suggestions (the Top 10, the recommendations on Home or the area it suggests for a task) are worked out
        in your browser and are only guidance: there are no automated decisions with legal effects or that affect you
        significantly.
      </p>
    </Section>

    <Section id="privacy-security" title="Security">
      <p>
        Connections are encrypted (HTTPS) and Google encrypts stored data. The database rules only let each account
        access its own data, and the app asks the browser not to give it access to the camera or location, which it does
        not use; the microphone, only to the app itself and only when you press the dictation button. If there were a
        security breach affecting your data, the AEPD would be notified and, if it posed a high risk to you, so would
        you.
      </p>
    </Section>

    <Section id="privacy-changes" title="Changes">
      <p>
        If this policy changes, the new version will be published here with its date. If the change is important, we
        will let you know in the app or by email.
      </p>
    </Section>
  </>
);

const TermsOfUseEn: React.FC<EnglishTextProps> = ({ onShowSpanish }) => (
  <>
    <TranslationNotice onShowSpanish={onShowSpanish} />
    <p>
      These terms govern the use of CLAR. By creating your account or continuing to use it, you accept them. How your
      data is processed is explained in the <PageLink to="privacy">privacy policy</PageLink>.
    </p>

    <Section id="terms-service" title="The service">
      <p>
        CLAR is a free app for organizing your time: Wheel of Life, goals, projects, tasks, agenda, alarms and tips to
        protect your time. It is offered by {ownerName()}, as a personal project. CLAR does not send emails on your
        behalf.
      </p>
    </Section>

    <Section id="terms-age" title="Who can use it">
      <p>
        People aged {MIN_AGE} or over (or the minimum legal age to give your consent in your country of residence, if
        higher). If you are younger, do not use it. If the administrator approves accounts one by one, you need their
        approval to start using it.
      </p>
    </Section>

    <Section id="terms-account" title="Your account">
      <List>
        <li>
          Use true information and keep your password safe: what is done with your account is your responsibility.
        </li>
        <li>If you think someone has got into your account, change your password and sign out on all devices.</li>
      </List>
    </Section>

    <Section id="terms-use" title="Acceptable use">
      <p>You may not:</p>
      <List>
        <li>use CLAR for illegal activities or to store unlawful content;</li>
        <li>add other people's data without a legitimate reason;</li>
        <li>try to access other accounts' data, get around the limits or attack the service;</li>
        <li>send abusive messages or advertising through “Contact us”.</li>
      </List>
      <p>
        If these terms are breached, the administrator may withdraw or block access. Even so, you will be able to
        download or delete your data.
      </p>
    </Section>

    <Section id="terms-content" title="Your content">
      <p>
        What you write in CLAR is yours. By saving it in the app, you grant us a worldwide, royalty-free and strictly
        technical license to host, process and display that data on your devices for the sole purpose of operating the
        service.
      </p>
    </Section>

    <Section id="terms-availability" title="Availability and liability">
      <p>
        CLAR is offered free of charge and as is. We try to keep it always working and free of errors, but this cannot
        be guaranteed. Download your data from time to time from your account menu. If CLAR stops being offered, you
        will be told far enough in advance to download it. Nothing in these terms limits the rights the law gives you as
        a consumer.
      </p>
    </Section>

    <Section id="terms-end" title="Closing your account">
      <p>You can delete your account whenever you want, from your account menu.</p>
    </Section>

    <Section id="terms-changes" title="Changes to the terms">
      <p>
        If they change, the new version will be published here with its date. If the change is important, we will let
        you know in the app or by email before it applies.
      </p>
    </Section>

    <Section id="terms-contact" title="Contact and notices of illegal content">
      <p>
        For any question, or to report illegal content, write to <Contact />, in Spanish or English. This is also the
        point of contact under the Digital Services Act (Regulation (EU) 2022/2065).
      </p>
    </Section>

    <Section id="terms-law" title="Governing law">
      <p>
        These terms are governed by Spanish law. If you are a consumer, you can go to the courts of the place where you
        live.
      </p>
    </Section>
  </>
);

const LegalNoticeEn: React.FC<EnglishTextProps> = ({ onShowSpanish }) => (
  <>
    <TranslationNotice onShowSpanish={onShowSpanish} />
    <Section id="notice-owner" title="Owner">
      <p>
        CLAR (clar.life) is a personal project of {ownerName()}, a private individual, with an address for notices at{' '}
        {OWNER.address}. It is free, ad-free and has no economic activity. Contact: <Contact />.
      </p>
    </Section>

    <Section id="notice-ip" title="Intellectual property">
      <p>
        CLAR's code is free software under the MIT license. The CLAR name and logo belong to its owner. What you write
        in the app is yours.
      </p>
    </Section>

    <Section id="notice-links" title="Links">
      <p>
        CLAR links to third-party services, such as Google Calendar or Outlook. It is not responsible for their content
        or their terms.
      </p>
    </Section>

    <Section id="notice-more" title="More information">
      <p>
        How your data is processed: <PageLink to="privacy">privacy policy</PageLink>. Rules of use:{' '}
        <PageLink to="terms">terms of use</PageLink>.
      </p>
    </Section>

    <Section id="notice-affiliation" title="Inspiration and no affiliation">
      <p>
        CLAR is an independent tool inspired by public-domain time management methods and by books such as{' '}
        <cite lang="es">Gestiona tu tiempo, disfruta de la vida</cite>, by Jonathan Benito Sipos. CLAR has no
        affiliation, sponsorship or commercial or official connection with the author.
      </p>
    </Section>
  </>
);

// Cada texto, en el idioma de la app. En inglés, «Read the Spanish version» muestra aquí la española (con lang="es")
const Bilingual: React.FC<{ Es: React.FC; En: React.FC<EnglishTextProps> }> = ({ Es, En }) => {
  const [spanish, setSpanish] = useState(false);
  if (LOCALE !== 'en') return <Es />;
  if (!spanish) return <En onShowSpanish={() => setSpanish(true)} />;
  return (
    <div lang="es" className="space-y-3">
      <Es />
    </div>
  );
};

export const PrivacyPolicy: React.FC = () => <Bilingual Es={PrivacyPolicyEs} En={PrivacyPolicyEn} />;
export const TermsOfUse: React.FC = () => <Bilingual Es={TermsOfUseEs} En={TermsOfUseEn} />;
export const LegalNotice: React.FC = () => <Bilingual Es={LegalNoticeEs} En={LegalNoticeEn} />;
