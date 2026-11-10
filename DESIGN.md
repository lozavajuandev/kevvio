---
name: "Kevvio · Property studio"
description: "Sistema visual para gestionar y presentar inmuebles en arriendo."
colors:
  background: "#f3f7ff"
  surface: "#fff"
  ink: "#10284d"
  muted: "#526b8c"
  line: "#d9e4f3"
  green: "#175cda"
  green-dark: "#1047b4"
  green-soft: "#e7f0ff"
  accent: "#ff5a00"
  accent-hover: "#f25500"
  accent-ink: "#071c3b"
  focus: "#2563eb"
  control-border: "#c7d7ed"
  placeholder: "#5f7695"
  button-hover: "#eaf2ff"
  sidebar: "#0b2148"
  sidebar-ink: "#edf4ff"
  nav-ink: "#c2d5ef"
  nav-hover: "#163461"
  nav-active-bg: "#1b427e"
  nav-active-ink: "#ffffff"
  badge-neutral-bg: "#eaf0f8"
  badge-neutral-ink: "#526582"
  badge-success-bg: "#eaf5ef"
  badge-success-ink: "#286c4c"
  badge-available-ink: "#1754b6"
  badge-amber-bg: "#fbf1db"
  amber: "#866212"
  badge-red-bg: "#fbece7"
  red: "#ac3737"
  error-bg: "#fff0ed"
  error-ink: "#923e32"
typography:
  display:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "34px"
    fontWeight: 720
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "32px"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  property-title:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "31px"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  section-title:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  card-title:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  control:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 650
  label:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  price:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "29px"
    fontWeight: 750
    letterSpacing: "-0.025em"
  marketing-display:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "clamp(42px, 4.6vw, 66px)"
    fontWeight: 650
    lineHeight: 1.11
    letterSpacing: "-0.04em"
  wizard-headline:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "clamp(26px, 3vw, 40px)"
    fontWeight: 720
    lineHeight: 1.17
    letterSpacing: "-0.03em"
  marketing-body:
    fontFamily: "\"Manrope Variable\", Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  badge: "5px"
  thumbnail: "6px"
  chip: "7px"
  control: "9px"
  inset: "10px"
  photo: "12px"
  surface: "14px"
  gallery: "16px"
  role-filter: "20px"
spacing:
  compact: "8px"
  related: "12px"
  field: "18px"
  group: "24px"
  section: "28px"
  section-large: "32px"
  reading: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-secondary-hover:
    backgroundColor: "{colors.button-hover}"
  button-text:
    textColor: "{colors.green}"
    padding: "8px 0"
  button-icon:
    rounded: "{rounded.control}"
    width: "40px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  nav-active:
    backgroundColor: "{colors.nav-active-bg}"
    textColor: "{colors.nav-active-ink}"
    rounded: "{rounded.control}"
    padding: "12px 11px"
  badge-neutral:
    backgroundColor: "{colors.badge-neutral-bg}"
    textColor: "{colors.badge-neutral-ink}"
    rounded: "{rounded.badge}"
    padding: "5px 9px"
  property-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  contact-panel:
    backgroundColor: "#edf4ff"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "27px"
  button-marketing:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "15px 20px"
  wizard-step-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "50%"
    width: "30px"
    height: "30px"
  wizard-dropzone:
    backgroundColor: "{colors.button-hover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "46px 20px"
  crm-stage:
    backgroundColor: "#e7eef9"
    textColor: "{colors.ink}"
    rounded: "{rounded.photo}"
    padding: "14px"
    width: "235px"
  video-settings:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: Kevvio

## Overview

**Creative North Star: "Property studio"**

Kevvio presenta el portafolio como un estudio de inmuebles: fotografías reales, superficies blancas y azules pálidas, texto azul profundo y acciones principales en naranja intenso. La navegación y el acceso usan azul marino; el naranja solicitado por el usuario destaca también en los detalles de marca. Manrope aporta una voz contemporánea y cercana. La interfaz de gestión combina controles precisos con suficiente espacio para leer; el anuncio público concede más espacio a las imágenes y a la descripción. La portada comercial amplía la tipografía, combina una demostración interactiva con un video de tipografía cinética y conserva respuestas contenidas en sus controles; la creación guiada, Personas y Videos reutilizan los controles del estudio.

La gama azul y el naranja de alto impacto responden a la preferencia explícita del usuario y conservan la estructura y la tipografía del estudio. Este registro describe la cascada implementada: `app/layout.tsx` carga Manrope local y luego `globals.css`, `inventory.css`, `studio.css`, `growth.css` y `landing-motion.css`, en ese orden. Los tokens del frontmatter son normativos; la estrategia de cada superficie permanece en `.impeccable/surfaces/`. La landing con el nuevo video se inspeccionó con Playwright autorizado por el usuario en escritorio de 1440px y móvil de 390px; `.impeccable/review/landing/qa.json` registra las comprobaciones funcionales. El veredicto anterior «ship» resolvió la navegación fija de capacidades. La revisión final del nuevo video también concluyó «ship»: quedaron resueltas la legibilidad móvil con zonas libres para subtítulos y controles, y la documentación del relato de seis escenas. No se observaron regresiones de esas correcciones en las nuevas capturas; el veredicto cubre solo esas dos correcciones. Las superficies privadas siguen pendientes de revisión visual.

**Key Characteristics:**

- Una familia Manrope variable, alojada por la propia aplicación.
- Gama azul con navegación marina y acciones principales naranja; colores semánticos reservados para estados.
- Fotografías del usuario en la gestión; fotografía de catálogo identificada como ejemplo en la portada comercial.
- Controles suavemente redondeados, divisores finos y tarjetas operativas planas.
- Un inmueble como contexto continuo de configuración, fotos, inventario, anuncio y videos; Personas reúne la relación comercial.

## Colors

La gama azul va de superficies casi blancas a navegación marina; el naranja intenso concentra la atención en acciones principales y detalles de marca.

Las tiras tonales del sidecar son muestras OKLCH sintetizadas para el panel de documentación; no añaden colores normativos a la aplicación.

### Primary

`green`, `green-dark` y `green-soft` son los nombres heredados de las variables CSS, pero sus valores actuales son azul principal, azul profundo y velo azul. Sostienen enlaces, foco de campos y selección; no describen una identidad verde. `button-hover` ofrece la respuesta azul suave del botón secundario y `focus` identifica el contorno de teclado.

### Secondary

`accent` es el naranja intenso de los botones principales, el punto de marca, los iconos activos de navegación, el paso actual del asistente y los detalles de marca sobre azul marino. `accent-hover` ajusta su hover; `accent-ink` aporta texto azul casi negro dentro del botón para conservar legibilidad. El icono de aplicación mantiene su geometría de edificio y combina fondo marino con trazo naranja.

`sidebar` y `sidebar-ink` forman la superficie marina y su texto claro, compartidos con el acceso. `nav-ink` y `nav-hover` corresponden a navegación sin seleccionar; `nav-active-bg` y `nav-active-ink` componen la selección azul con texto blanco. Su icono usa el acento naranja.

### Neutral

`background` es el lienzo azul muy pálido de gestión y `surface`, el blanco de tarjetas y campos. `ink` sostiene títulos y contenido en azul profundo, `muted` aporta contexto y `line` divide regiones. `control-border` conserva el límite del campo y `placeholder` distingue ejemplos del dato escrito. El anuncio público se apoya en blanco y una superficie azul tenue para precio y contacto.

Los pares `badge-neutral-*`, `badge-success-*`, `badge-amber-bg`/`amber` y `badge-red-bg`/`red` pertenecen a estados, no a acentos secundarios de marca. La disponibilidad y los estados informativos pueden usar el velo azul con `badge-available-ink`. `error-bg` y `error-ink` componen mensajes de error. Los tokens ámbar y rojo continúan desde la hoja global porque siguen activos en cobros y contratos.

**The Action and State Rule.** El naranja destaca acciones principales, el paso actual del asistente y detalles de marca; el azul sostiene enlaces y selección general. El verde semántico identifica vigencia o éxito. El estado conserva siempre su rótulo textual.

## Typography

**Display and Body Font:** Manrope Variable, con Manrope y sans-serif como alternativas. Se importa desde `@fontsource-variable/manrope`; no requiere una fuente remota en tiempo de uso. No existe una segunda familia para títulos ni una familia monoespaciada de interfaz.

La jerarquía usa pesos variables definidos y espaciado negativo en títulos. Los importes relevantes usan cifras tabulares; la descripción pública tiene un ancho de lectura máximo de 70ch y un interlineado de 1.9.

- **Display:** título del anuncio público; baja a 30px hasta 850px y a 27px con interlineado 1.35 hasta 600px.
- **Headline:** título de portafolio; baja a 29px hasta 1250px y a 27px hasta 1050px. El título del inmueble usa la variante `property-title` y baja a 27px hasta 1050px.
- **Section / card title:** títulos de secciones y tarjetas. Los encabezados de formulario compactos usan 15px y el editor del anuncio, 22px. No extender la escala pública a tablas.
- **Body:** base de lectura de 14px. Formularios, navegación y tablas de gestión combinan 12–14px según la función; las ayudas y los metadatos secundarios son menores.
- **Control / label:** botones y etiquetas de campo de 13px. Hasta 600px, los campos de formularios suben a 16px y sus etiquetas pasan a 12px.
- **Price:** cifra del panel de contacto; baja a 25px hasta 1050px. La vista previa reduce la jerarquía para su columna estrecha.

- **Marketing display / body:** el título principal de la portada comercial usa la variante `marketing-display`, con saltos de línea explícitos y sin máximo en caracteres; su párrafo usa `marketing-body` con máximo de 43ch. Hasta 1100px el título pasa a 48px; hasta 800px usa `clamp(41px, 7.8vw, 58px)` con interlineado 1.12 y hasta 390px, 39px. El título del video usa `clamp(27px, 3vw, 42px)`, peso 600 e interlineado 1.22; las capacidades usan 39px para la sección y 31px para el panel, con reducciones móviles. No trasladar esta escala al CRM.
- **Wizard headline:** título de cada paso, con máximo de 21ch y enfoque programático al avanzar. Personas usa `clamp(26px, 3vw, 38px)` y 28px hasta 760px; Videos usa un encabezado de 30px y 25px hasta 760px.

**The Shared Family Rule.** Usar Manrope en portada comercial, gestión, formularios y anuncio público; cambiar escala y densidad según el contexto, sin introducir otra familia de títulos.

**The Film Safe Area Rule.** En el video comercial, los nombres esenciales de categorías usan 54px en el lienzo de 1280px, equivalentes a unos 14px al mostrarse a 342px de ancho. El contenido principal ocupa la mitad superior; la zona inferior reservada a subtítulos y controles nativos queda libre de texto esencial y de pies incrustados que compitan con ellos.

## Layout

El escritorio de gestión combina una barra lateral de 208px, una barra superior de 72px y un área principal con máximo de 1536px y relleno de 29px 38px 46px. El portafolio muestra tres columnas de tarjetas con separación de 22px. La ficha del inmueble sustituye al portafolio y conserva orientación mediante regreso y pestañas; las pestañas quedan fijas arriba mientras se desplaza la ficha.

La configuración usa una columna de formulario y otra de relaciones de 280px, separadas por 52px, con máximo de 1100px. El anuncio usa editor y vista previa: columnas `minmax(0, 1fr)` y `minmax(300px, 0.85fr)`, separación de 44px. La vista previa es fija a 80px de la parte superior; el guardado se mantiene al pie visible del editor.

El anuncio público tiene máximo de 1200px y relleno lateral de 40px. La galería abre la lectura con altura de 520px; después, detalles y contacto forman dos columnas, con contacto de 340px y separación de 65px. El contacto se mantiene a 30px del borde superior. La descripción conserva su ancho legible sin expandirse para llenar el contenedor.

| Umbral implementado | Adaptación |
| --- | --- |
| Desde 1600px | Portadas del portafolio de 245px de alto. |
| Hasta 1250px | Portafolio en dos columnas; herramientas pueden ocupar otra fila; editor y relaciones se estrechan. |
| Hasta 1050px | Barra lateral de 190px; configuración y editor pasan a una columna; botón explícito alterna formulario y vista previa. |
| Hasta 850px | Navegación en cajón de 224px; desaparece el margen izquierdo del contenido; anuncio público en una columna, contacto sin posición fija. |
| Hasta 600px | Portafolio en una columna; formulario principal en una columna; galerías de fotos en dos columnas; controles y pestañas se adaptan o desplazan horizontalmente. |

La vista de lista mantiene una miniatura y datos alineados; en móvil, las acciones bajan a su propio pie. Las tablas de gestión conservan desplazamiento horizontal. Las hojas de base todavía aportan puntos de quiebre de 1450px, 1150px, 1100px y 680px para superficies operativas no sustituidas: no asumir que todo el producto usa una única cuadrícula.

Hasta 850px, el cajón cerrado usa `visibility: hidden` además de su transformación fuera de pantalla; abierto recupera visibilidad y se acompaña de un fondo modal. El botón comunica expansión y relación con la navegación. Escape cierra el cajón y devuelve el foco al botón que lo abrió.

### Portada comercial y rutas

La portada vive en `/` y el espacio de trabajo en `/app`. La composición comercial no hereda la barra lateral: navegación y secciones principales tienen máximo de 1440px y relleno lateral de 64px. El hero combina columnas 0.9:1.1 con separación de 58px. El video comercial aparece inmediatamente después, en un marco 16:9 con seis capítulos distribuidos en seis columnas; lo siguen el mensaje sobre relaciones y las cuatro pestañas de capacidades. Cada capacidad combina texto y ejemplo en columnas 0.9:1.1, separadas por 72px. La franja marina explica Studio. La comparación de planes usa tres columnas continuas, separadas por bordes, con altura mínima de 500px por plan. Las preguntas frecuentes usan dos columnas y elementos `details` nativos.

Hasta 1100px, el relleno lateral baja a 36px; hasta 800px, a 24px y las secciones principales se apilan. Los capítulos pasan a una fila desplazable y las pestañas de capacidades, a una cuadrícula de dos columnas; el ejemplo aparece debajo del texto. La cabecera comercial permanece fija arriba durante el desplazamiento y la navegación móvil se despliega bajo ella. Las pestañas de capacidades permanecen fijas bajo esa cabecera mientras su sección ocupa la pantalla; un ResizeObserver mide la altura real del encabezado y actualiza el desplazamiento superior, con respaldo de 92px. Su fondo opaco evita superponer texto al contenido que se desplaza. Los destinos de navegación reservan 108px arriba, o 90px hasta 800px, para mantener sus títulos visibles.

### Creación guiada y Personas

El asistente y Personas usan un máximo de 1400px. El asistente dispone pasos horizontales y dos columnas: formulario flexible y vista previa de 270–350px, con separación de 56px. Desde 1500px, la vista previa pasa a 380px y la separación a 80px. Hasta 1100px, la vista previa mide 280px; hasta 760px se oculta y las acciones se mantienen al pie visible. Las miniaturas conservan tres columnas y relación 4:3.

La ficha de persona separa contacto y contratos en una columna de 285px e historial en otra flexible, con separación de 48px. Hasta 1100px, la columna mide 235px y la separación es de 24px; hasta 760px se apilan. El tablero de oportunidades conserva seis columnas de 235px, separación de 16px y desplazamiento horizontal. La tabla de personas mantiene un ancho mínimo de 700px dentro de su contenedor desplazable. La cronología usa una columna de puntos azules y contenido con fecha.

### Videos dentro del inmueble

Fotos y secuencia comparten una columna flexible junto a ajustes de 320px, separados por 40px. Hasta 1000px, los ajustes bajan a 280px y la separación a 24px; hasta 760px se apilan. La selección de fotos usa tres columnas y recortes 4:3. El historial de clips usa tres columnas, dos hasta 1000px y una hasta 760px. Los clips se muestran con `contain` en 16:9 sobre marino; el video final admite hasta 760px de ancho y 500px de alto.

## Elevation & Depth

La profundidad nace principalmente de superficies, separación y divisores. Las tarjetas operativas no tienen sombra permanente ni desplazamiento al pasar el cursor. El hover de portada amplía ligeramente la fotografía dentro de su recorte; no eleva la tarjeta.

**The Flat Surface Rule.** Las tarjetas operativas y los formularios permanecen planos. Las sombras separan capas superpuestas; la demostración y el video de la portada comercial usan sombras ambientales propias.

El token de sombra global se aplica a paneles, diálogos de inventario y confirmaciones flotantes. El buscador de comandos tiene una sombra más amplia; su entrada dura 0.2s y combina un desplazamiento corto con desenfoque. Botones cambian fondo y color en 0.18s, tarjetas cambian borde en 0.2s y las portadas escalan a 1.035 en 0.5s. Los valores completos viven en el sidecar. La preferencia de movimiento reducido desactiva animaciones y transiciones; la portada comercial conserva únicamente respuestas de fondo y color de 100ms en sus botones, enlaces y modos de demostración.

La demostración comercial usa `0 24px 60px rgba(13, 52, 112, 0.13)` y el menú comercial móvil, `0 15px 40px rgba(13, 52, 112, 0.15)`. Su simulación de movimiento escala la fotografía a 1.12 durante 5s solo después de una acción del visitante; es una vista ilustrativa, no un clip generado. El icono de las preguntas frecuentes gira 45° en 0.2s al abrirse. Ambos movimientos respetan la preferencia de movimiento reducido.

El marco del video usa `0 24px 65px rgba(13, 52, 112, 0.13)`, reducido a `0 16px 40px rgba(13, 52, 112, 0.1)` hasta 800px. Los enlaces desplazan su flecha 3px en diagonal durante 240ms, la fotografía del hero aumenta a 1.025 en 700ms al pasar el cursor y el panel de capacidades entra en 350ms desde opacidad 0.6 y desenfoque de 2px. La curva compartida de estas respuestas es `cubic-bezier(0.16, 1, 0.3, 1)`. Solo cuando el navegador admite animaciones vinculadas al desplazamiento y no se solicita movimiento reducido, el marco del video pasa de escala 0.985 a 1 al entrar y una línea azul se extiende sobre el mensaje de relaciones. El contenido es visible por defecto; no existe una secuencia general que oculte secciones hasta desplazarse.

Los fondos modales usan transparencia oscura. La ampliación de fotos tiene lienzo casi negro, con imagen ajustada mediante `contain`; la galería normal usa `cover`. Este contraste responde a la inspección de la foto y no establece un tema oscuro general.

## Shapes

Campos, navegación y botones comparten la curva `control`. Las tarjetas y la vista previa usan `surface`; la galería pública y el buscador, `gallery`. Miniaturas, etiquetas y piezas internas usan curvas menores. Los bordes finos contienen elementos interactivos; los divisores separan contenido sin convertir cada sección en una tarjeta.

Las flechas sobre fotografías, controles de ampliación y avatares son circulares. Los marcadores de estado son pequeños puntos junto a texto. Los pasos del asistente usan círculos numerados de 30px y los filtros de roles de Personas usan la curva `role-filter`; los monogramas son cuadrados redondeados. Los vacíos de portafolio y las zonas de carga emplean bordes discontinuos. Los iconos de interfaz son SVG lineales de Lucide. La marca Kevvio usa una palabra en minúsculas y un monograma K geométrico compartido por la landing, el acceso, la navegación y los anuncios. El icono de aplicación repite la K naranja sobre marino; los edificios se reservan para representar inmuebles. El lema es «Más negocio. Menos pendientes.». La portada comercial incorpora `public/marketing/interior.webp`, fotografía ilustrativa de Alex Tyson obtenida de Unsplash, con atribución visible y procedencia en `public/marketing/interior.webp.json`. La ficha de procedencia declara licencia Unsplash, ancho de 1400px y conversión a WebP; no representa un inmueble del usuario. El marco del video conserva la curva `gallery`, reducida a `photo` hasta 800px, y una portada WebP de cierre naranja y marino con procedencia propia; el MP4 documenta sus fuentes en `public/marketing/kevvio-journey.provenance.json`. La gestión sigue usando archivos del usuario. La imagen plana de QA permanece como fixture descartable, no como activo del producto.

## Components

### Buttons

Controles directos y compactos. El principal usa naranja intenso y texto azul casi negro, el secundario blanco con borde y el de texto azul sin caja. La altura mínima general es de 42px; los iconos se separan 8px del texto. Los botones de icono miden 40px. Publicación, tarjetas y vistas estrechas tienen variantes compactas específicas; no convierten esas excepciones en el tamaño de todos los controles.

El principal oscurece en hover; el secundario usa el fondo suave definido en tokens. El foco global es un contorno de 3px separado 3px. Los controles deshabilitados reducen opacidad a 0.55 y muestran cursor no permitido. No se define un desplazamiento general al presionar. El CTA principal del hero comercial conserva los colores y la curva generales, pero usa 13px, relleno de 15px 20px y altura mínima de 52px; hasta 390px usa 12px y relleno de 13px 15px.

### Inputs and validation

Campos blancos con borde visible, relleno del frontmatter y altura mínima de 43px. El borde cambia a azul al enfocar. Los textarea permiten ajustar la altura; ayudas y mensajes acompañan la etiqueta. Las búsquedas agrupan icono y campo; el buscador global abre un diálogo con resultados y nombres de sección. Los errores tienen fondo cálido y texto explícito, los guardados confirmados emplean el par de éxito. No inventar validación roja por campo donde solo existe un mensaje general.

### Navigation and tabs

La navegación lateral usa fondo marino y texto azul claro; la sección activa tiene superficie azul más clara, texto blanco e icono naranja. La ficha del inmueble añade pestañas de texto e icono: selección mediante subrayado azul, peso mayor y color. Las pestañas pueden desplazarse horizontalmente. Los filtros del portafolio son un grupo segmentado con selección blanca; el cambio entre tarjetas y lista usa un contenedor de borde fino.

### Status and selection

Las etiquetas informativas son pequeñas, redondeadas y siempre incluyen palabras; algunas suman un punto. La portada de inmueble usa una etiqueta blanca superpuesta, con texto semántico. La selección de fotos conserva un borde azul alrededor de la miniatura y un control separado para elegir portada. Las comodidades son controles de selección explícitos con fondo azul suave al marcarse.

### Property cards and photos

La portada real y el nombre son la entrada visual al inmueble. La tarjeta tiene borde fino, recorte redondeado y pie de acciones; el hover cambia el borde. El botón principal abre la ficha y las acciones del pie llevan directamente a fotos o anuncio. Las fotografías ocupan un alto constante por contexto y usan `cover`. Sin foto, aparece un fondo neutro, icono lineal y mensaje; no se sustituye por fotografía de inventario o de catálogo.

### Editor and public presentation

El editor separa secciones mediante espacio y divisores; el resultado se muestra en una vista previa del mismo componente público. El guardado de borrador y la publicación permanecen como acciones explícitas. La página pública amplía la galería, conserva datos legibles y concentra precio y contacto en una superficie azul tenue. Las flechas, el contador y el diálogo de ampliación permiten inspeccionar fotos sin perder el contexto. El estado de enlace no disponible mantiene una composición simple con explicación y marca.

### Asistente de creación

Cuatro pasos —Fotos, Datos, Descripción y Revisión— conservan orientación con número y nombre. El paso activo usa círculo naranja; los pasos completados muestran un check. La carga admite selección y arrastre, con borde discontinuo azul, respuesta de hover y foco explícito. Las fotos se numeran y se pueden reordenar o retirar; la primera alimenta la portada de la vista previa.

La asistencia de texto ocupa una superficie azul suave y conserva la escritura manual. Una propuesta se muestra por separado antes de incorporarla al formulario. La revisión usa pares de etiquetas y valores con divisores. El guardado crea el inmueble y un borrador privado: no se representa como publicación automática.

### Personas y oportunidades

La navegación segmentada separa Personas, Oportunidades y Seguimientos. Los filtros de rol son pastillas suaves y los registros combinan monograma, nombre y etiquetas. La ficha reúne contacto, contratos existentes, oportunidades y una cronología de conversaciones; no usa una tarjeta distinta para cada párrafo. Las oportunidades pasan por columnas con nombre y cantidad; el cambio de etapa usa un selector explícito, sin asumir arrastre. Los seguimientos vencidos se identifican con texto y tono cálido, preservando el naranja de marca para la jerarquía de acciones.

### Estudio de video

La selección numerada de fotos forma una secuencia visible con controles para mover o quitar escenas. El panel de ajustes reúne modelo, movimiento, formato y estimación, seguido por un CTA que muestra el importe aproximado. Los estados de clip aparecen como texto —preparando, en cola, generando, listo o fallo— junto a su medio. El historial y los resultados permanecen privados. El video final muestra controles nativos y descarga; el montaje conserva el encuadre completo con márgenes y no lleva audio.

### Demostración y planes comerciales

La demostración permite cambiar entre Presenta, Conecta y Crea mediante botones con selección azul. Reutiliza un mismo inmueble ilustrativo y lo etiqueta como ejemplo; la simulación de movimiento es iniciada por el visitante. Las tres propuestas comerciales se distinguen por nombre y contenido, con Studio sobre azul suave y un pequeño punto naranja. Las acciones llevan al espacio de trabajo. Los avisos de disponibilidad y precios por definir permanecen visibles y no se sustituyen por precios, testimonios o resultados inventados.

### Video comercial y capacidades

El video comercial de 28 segundos usa Manrope cinética, fragmentos de conversaciones, fotos y pendientes que convergen, barridos direccionales y un corte fotográfico para expresar el paso de la dispersión a un trabajo conectado. La portada de cierre conserva naranja y texto marino. La narración sintética en español se acompaña de pulsos y transiciones originales sintetizados localmente, atenuados durante la voz. Esta composición conceptual responde al problema del agente; no presenta un tutorial de la interfaz. La narración conserva el relato centrado en el agente; los fotogramas y la portada identifican Kevvio.

Los nombres de capacidades en la escena de presentación alternan a 56px; las categorías operativas se disponen en dos filas de dos elementos a 54px. Esta composición conserva el tamaño de lectura móvil y la zona libre para subtítulos y controles. La revisión final confirmó resuelta esta corrección de legibilidad y zonas libres para subtítulos y controles en las nuevas capturas de escritorio y móvil.

Su marco 16:9 ofrece controles nativos, subtítulos, seis capítulos con progreso visible, transcripción y descarga. El capítulo actual se identifica con texto más oscuro y progreso naranja; los anteriores usan azul. La vista previa muda se intenta una sola vez al entrar al menos un 35% del marco en pantalla. Se pausa al salir o al ocultar la pestaña. Movimiento reducido y ahorro de datos conservan la portada hasta una acción explícita; la narración vuelve al inicio y activa el sonido únicamente por acción del visitante. La etiqueta «Escenas ilustrativas · voz sintética en español» acompaña el medio.

Las capacidades —inmuebles, personas, arriendos e inventario/documentos— usan pestañas con subrayado azul y una sola área de contenido. Flechas, Inicio y Fin cambian selección y foco; el panel tiene nombre accesible y puede recibir foco. Las vistas de ejemplo conservan la forma del producto y una leyenda ilustrativa. El video promocional y estos ejemplos no insertan registros en la aplicación ni representan una sesión privada.

## Do's and Don'ts

### Do:

- **Do** mantener Manrope, la gama azul, la navegación marina y el naranja intenso de las acciones principales en nuevas superficies.
- **Do** conservar nombres y estados explícitos junto a sus iconos o colores.
- **Do** usar fotos reales del inmueble en gestión y marcar como ilustrativas las fotografías comerciales; presentar un vacío honesto cuando falten datos propios.
- **Do** mantener el foco visible, los nombres accesibles de los controles de icono y la alternativa de movimiento reducido.
- **Do** permitir que títulos, importes y controles se adapten al ancho disponible.
- **Do** mostrar estimaciones, estados de generación y límites de disponibilidad junto a la acción correspondiente.

### Don't:

- **Don't** recuperar el verde como color principal de marca ni la tipografía de sistema como familia de títulos.
- **Don't** introducir fotografías inventadas, texturas decorativas o datos ficticios en el portafolio real.
- **Don't** aplicar sombras permanentes a tarjetas que en el sistema son planas.
- **Don't** convertir metadatos pequeños o colores heredados aislados en nuevos tokens globales.

## Actualización de marca: Kevvio

El usuario aprobó Kevvio el 10 de noviembre de 2026. El producto, la landing, los anuncios, el favicon, los metadatos, las descargas y los fotogramas del video usan esta marca. Se mantiene la identidad azul/naranja. La comprobación de esta actualización está registrada en `.impeccable/review/kevvio/verdict.md`; las capturas del portafolio utilizan respuestas simuladas solo en el navegador. Los datos y las sesiones existentes se conservan.
