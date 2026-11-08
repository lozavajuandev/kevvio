---
name: "Raíz · Gestión de activos"
description: "Sistema visual del portafolio personal de finca raíz."
colors:
  background: "#f7f9f8"
  surface: "#fff"
  ink: "#23342f"
  muted: "#667770"
  line: "#dfe7e2"
  green: "#235f4d"
  green-dark: "#194936"
  green-soft: "#eaf3ed"
  red: "#ac3737"
  amber: "#866212"
  blue: "#305c7c"
  focus: "#79b393"
  control-border: "#cddad1"
  placeholder: "#718077"
  divider-soft: "#edf1ee"
  button-hover: "#edf2ef"
  badge-neutral-bg: "#eef1ef"
  badge-neutral-ink: "#5f6c65"
  badge-green-bg: "#eaf4ee"
  badge-green-ink: "#2b6a46"
  badge-blue-bg: "#eaf1f7"
  badge-amber-bg: "#fbf1db"
  badge-red-bg: "#fbece7"
  error-bg: "#fff0eb"
  error-ink: "#973f30"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "18px"
    fontWeight: 650
    letterSpacing: "-0.02em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  control:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 550
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 550
  metric:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "27px"
    fontWeight: 600
    letterSpacing: "-0.035em"
rounded:
  badge: "5px"
  field: "7px"
  control: "8px"
  inset: "10px"
  symbol: "12px"
  surface: "14px"
spacing:
  compact: "8px"
  related: "12px"
  standard: "16px"
  group: "20px"
  section: "24px"
  panel: "30px"
  canvas: "36px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.green-dark}"
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
    rounded: "{rounded.field}"
    width: "36px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  nav-active:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  badge:
    backgroundColor: "{colors.badge-neutral-bg}"
    textColor: "{colors.badge-neutral-ink}"
    rounded: "{rounded.badge}"
    padding: "5px 8px"
  property-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "21px 20px 0"
  panel:
    backgroundColor: "{colors.surface}"
    width: "min(600px, 100vw)"
---

# Design System: Raíz

## Overview

**Creative North Star: «Expediente técnico de administración».**

Raíz usa superficies claras, tinta verdosa y verde profundo para ordenar información patrimonial de uso cotidiano. Su carácter es sobrio y cercano: títulos breves, líneas suaves, cifras visibles y controles explícitos. La densidad aumenta en tablas; los formularios conservan espacio entre campos.

Este documento registra la implementación de `app/globals.css` y `components/workspace.tsx`, no una propuesta visual nueva. La estrategia del primer recorrido permanece en `.impeccable/surfaces/components-workspace-tsx.md`. Los tokens anteriores son los valores normativos; sombras, movimiento, puntos de quiebre y muestras autónomas viven en `.impeccable/design.json`.

**Key Characteristics:**

- Una familia tipográfica de sistema, sin fuentes remotas.
- Superficies blancas sobre un fondo suavemente verdoso; bordes antes que sombras.
- Navegación persistente en escritorio y expediente lateral para consultar o editar.
- Iconos lineales de Lucide; no hay imágenes raster de producto.
- Estados expresados con palabras, color y, cuando corresponde, iconos.

## Colors

La paleta combina neutrales verdes con un único acento principal profundo. Los colores de estado tienen una función informativa.

### Primary

`green` identifica acciones principales, navegación seleccionada, iconos y cifras de recaudo. `green-dark` es su respuesta de hover. `green-soft` acompaña selección y saldos sin competir con el texto.

### Neutral

`background` es el lienzo; `surface`, las tarjetas, campos, navegación y paneles. `ink` sostiene el contenido; `muted`, contexto y metadatos. `line` separa módulos y `divider-soft` separa filas. `control-border` delimita campos; `placeholder` conserva la distinción entre ejemplo y dato ingresado.

### Semantic states

Los pares `badge-*-bg` y `badge-*-ink` o sus colores semánticos forman etiquetas legibles con un punto del mismo color que el texto. Verde expresa registro, pago o vigencia; azul, disponibilidad, futuro o abono parcial; ámbar, pendiente o contrato vencido; rojo, cobro vencido o acción de anulación. Neutral señala historial archivado, finalizado o anulado. El error usa su propio fondo cálido y tinta, junto con texto e icono.

**La regla del estado explícito.** Conservar el rótulo del estado; el color no sustituye palabras como «Pagado», «Vencido» o «Anulado».

## Typography

**Display and Body Font:** la misma pila de sistema del frontmatter. No hay una fuente monoespaciada independiente. Se usan cifras tabulares en importes y métricas, y alineación a la derecha para celdas numéricas.

La jerarquía depende del tamaño y peso, sin mayúsculas ornamentales. Los encabezados equilibran sus líneas; los nombres largos del inmueble y del panel pueden partirse para evitar desbordes.

- **Headline:** título principal de página; se reduce a 26px hasta 1150px y a 25px hasta 680px.
- **Title:** título general de módulo. Los títulos de sección compacta varían entre 13 y 15px; el panel usa 23px, o 21px en móvil.
- **Body:** la base es 14px; texto de trabajo y tablas usa principalmente 12–13px. Los párrafos tienen interlineado 1.65; ayudas y metadatos, 10–11px.
- **Control / Label:** controles de 13px y etiquetas de formulario de 12px. En móvil, campos dentro de formularios usan 16px y sus etiquetas 11px.
- **Metric:** cifras del resumen de 27px; 31px desde 1450px, 23px hasta 1150px y 24px hasta 680px. No se recortan cifras con puntos suspensivos.
- **Access display:** la pantalla de acceso usa `clamp(38px, 4.6vw, 69px)`, peso 500, interlineado 1.12 y espaciado −0.04em; pasa a 43px hasta 850px y 33px hasta 680px. Esta escala pertenece al acceso, no a las tablas.

Los importes usan `es-CO`, COP y cero decimales; las fechas visibles usan formato colombiano. Mantener la unidad junto a la cifra o en el contexto inmediato.

## Layout

El escritorio combina una barra lateral fija (224px), una barra superior (70px) y un área principal de hasta 1600px con relleno de 37px 36px 18px. El contenido empieza después de la barra lateral. Desde 1450px, el área principal usa 44px 48px 24px y la barra superior 48px laterales.

La franja de métricas tiene cuatro columnas; el conjunto de tarjetas de inmuebles, tres. Los módulos inferiores del resumen usan proporción 1.25:1 y separación de 24px. Las tablas mantienen sus columnas dentro de un contenedor con desplazamiento horizontal.

| Umbral | Comportamiento implementado |
| --- | --- |
| Hasta 1150px | Barra lateral de 202px y desplazamiento del contenido igual; relleno lateral de 26px; tarjetas de inmuebles en dos columnas. |
| Hasta 850px | Métricas en dos columnas con separadores; módulos del resumen e introducción inicial en una columna. |
| Hasta 680px | La barra lateral se convierte en un cajón de 240px; desaparece el margen izquierdo del contenido; barra superior de 58px; relleno principal de 26px 18px 18px; tarjetas en una columna. |

En móvil, el cajón cerrado tiene **`visibility: hidden` y `transform: translateX(-100%)`**: no debe permanecer como contenido enfocable fuera de pantalla. Abierto usa `visibility: visible` y transformación cero, encima de un fondo oscurecido. El botón del menú abre; el fondo y la selección de una sección cierran. Esta navegación no implementa el bloqueo de foco del panel de formulario.

Los encabezados y herramientas pueden envolver sus controles; la búsqueda ocupa una fila completa en móvil. El pie de página pasa a columna. El formulario conserva dos columnas con `minmax(0, 1fr)` incluso en móvil; los campos marcados amplios ocupan ambas. El panel tiene ancho máximo de 600px y nunca supera el viewport.

## Elevation & Depth

Las tarjetas permanecen planas. El fondo, los bordes finos y los separadores construyen la jerarquía. Las sombras se reservan para superficies superpuestas.

- **Confirmación flotante:** `0 16px 55px rgba(21, 47, 36, 0.12)`; es la variable de sombra global y se usa en el toast.
- **Expediente lateral:** `-12px 0 45px rgba(17, 45, 30, 0.12)`; separa el panel de su contexto.
- **Fondo modal:** `rgba(22, 39, 29, 0.3)`; el fondo de navegación móvil usa alfa 0.35.

La barra lateral está en nivel 30, su fondo móvil en 29, el panel en 60, la confirmación en 80 y el enlace de salto en 100. El encabezado del panel se desplaza con su contenido; no es fijo.

## Shapes

Los módulos amplios usan la curva `surface`; campos y navegación, `field`; botones, `control`; etiquetas, `badge`. Los bloques de saldo y resumen interior usan `inset`. Las tarjetas se recortan en el borde redondeado para contener sus pies y divisores.

Los avatares y puntos de estado son circulares. El formulario de archivo usa un borde discontinuo y un selector de archivo nativo visible. El panel lateral llena la altura y tiene esquinas rectas. No hay fotografías de inmuebles ni texturas decorativas en la implementación.

## Components

### Buttons

El botón principal usa verde y texto blanco; el secundario, superficie blanca con borde. Ambos tienen altura mínima de 40px y separación de icono de 8px. El botón de texto usa 12px, peso 600 y subrayado al pasar el cursor. El botón de icono mide 36px y adquiere fondo verde suave en hover.

El foco global es un contorno de 3px en `focus`, separado 3px del elemento. Los botones deshabilitados bajan a opacidad 0.55 y usan cursor de espera. El envío muestra «Guardando…» y un indicador giratorio mientras está ocupado. No existe una variante visual específica de pulsación `:active`.

### Chips and status

Las etiquetas usan texto de 10px, peso 500, interlineado 1.25 y punto de 4px. Son informativas, sin interacción de filtro.

| Registro | Estados y tonos |
| --- | --- |
| Inmueble | Arrendado: verde; Disponible: azul; Archivado: neutral. |
| Contrato | Vigente: verde; Próximo: azul; Vencido: ámbar; Finalizado: neutral. |
| Cobro | Pagado: verde; Vencido: rojo; Abono parcial: azul; Pendiente: ámbar. Un cobro con saldo cero es pagado; con saldo y vencimiento pasado es vencido, incluso si tiene abonos. |
| Pago | Registrado: verde; Anulado: neutral, con importe tachado y motivo visible cuando existe. |

### Cards and tables

Las tarjetas de inmueble son botones completos: tipo y estado arriba, nombre y dirección, características y pie separado. El hover modifica el borde, sin elevar la tarjeta. Abren el expediente asociado. Los nombres pueden envolver; el texto del pie puede truncarse.

Las tablas usan encabezados de 10px sobre fondo tenue, celdas de 12px, relleno de 15px 19px en encabezados y 17px 19px en celdas. Una fila gana un fondo tenue en hover; no cambia de escala. Conservar etiquetas de columna y el desplazamiento horizontal.

### Inputs and validation

Los campos tienen borde visible, fondo blanco y relleno del frontmatter. Las etiquetas envuelven su control y muestran `*` en los campos requeridos. La búsqueda compone icono y campo dentro de un borde común; su foco es un contorno de 2px separado 2px. Los textarea permiten cambio de altura, con mínimo de 90px e interlineado 1.6.

La implementación usa restricciones HTML nativas y mensajes de error generales con `role="alert"`; no dibuja un borde rojo por campo ni un sistema de validación en línea. Los errores del panel aparecen debajo de su encabezado y conservan el formulario abierto. Los éxitos usan `role="status"` durante 4.5 segundos.

Límites visibles en los formularios actuales:

- Nombres, dirección, ciudad, documento de identidad y referencia: hasta 200 caracteres; nombre del acceso: 100; teléfono: 50; notas: 5000. La anulación exige motivo de 5 a 1000 caracteres.
- Creación de contraseña: mínimo 10 y máximo 200 caracteres.
- Importes: pesos enteros; máximo general 9.999.999.999.999. Abonos positivos hasta el saldo seleccionado y fecha de pago no posterior a hoy. Área: 0–99.999.999, paso 0.01; habitaciones y baños: 0–999.
- Fechas de contrato: 1900–2200; día de pago: 1–28. La finalización se limita al inicio del contrato y a la menor fecha entre hoy y su fin vigente.
- Documentos: PDF, JPG o PNG, hasta 10 MB. El selector muestra el nombre elegido y usa validación nativa para exceso de tamaño.

Estos son los límites expuestos por la interfaz, no una especificación completa de validación del servidor.

### Navigation

Siete destinos estables usan iconos de 18px, rótulos de 13px y filas de al menos 43px. La selección suma fondo verde suave, texto verde, peso 650 y `aria-current="page"`. Cobros muestra un contador rojo solo cuando existen saldos vencidos. La navegación se distingue del estado seleccionado por texto y posición, además del color. Hay un enlace «Saltar al contenido» que aparece al recibir foco.

### Property dossier and form panel

El expediente es la interacción característica: mantiene visible el contexto del portafolio detrás de un panel derecho. Agrupa dirección, características, valor de adquisición, contratos y documentos; sus acciones relacionadas abren los formularios correspondientes en el mismo espacio.

El panel lleva título accesible, `role="dialog"` y `aria-modal="true"`; bloquea el desplazamiento del cuerpo, contiene el recorrido de Tab y devuelve el foco al cerrar. Escape, el botón de cierre y el fondo cierran cuando no hay una operación en curso. Durante el guardado se deshabilitan cierre y envío. El formulario usa separación de 22px por 18px, o 19px por 14px en móvil, y pie con explicación y acción de envío.

Los formularios de contrato y documento ofrecen el siguiente paso cuando falta un inmueble o arrendatario. Registrar pago sin cobros abiertos muestra «Sin saldos pendientes». El saldo del cobro seleccionado aparece en un bloque verde suave antes del importe. Las confirmaciones de archivo, finalización y anulación explican qué historial se conserva.

### Empty, loading, and access states

El portafolio empieza vacío y las cifras se mantienen en cero. Los vacíos usan icono lineal en un cuadrado de 62px con curva de 15px, título de 18px, texto de hasta 45ch y acción contextual. La introducción inicial presenta los pasos inmueble, arrendatario y contrato. No se utilizan datos de demostración para llenar tablas.

La carga usa un icono de giro y texto; al fallar aparece una acción de reintento. El acceso combina una mitad verde con mensaje y una mitad blanca con formulario de hasta 370px. En móvil se apila, se reduce la introducción y se ocultan su descripción auxiliar y pie.

### Motion

Las respuestas de botón y borde de tarjeta duran 0.18s. El menú móvil traslada su posición en 0.22s con `ease`. El panel entra en 0.28s con `cubic-bezier(0.16, 1, 0.3, 1)`, desde un desplazamiento de 36px y un recorte izquierdo de 10%; no hay animación de salida. El indicador de carga gira una vez por segundo de manera lineal. `prefers-reduced-motion: reduce` elimina animaciones y transiciones y restablece el desplazamiento automático.

## Do's and Don'ts

### Do

- **Do** usar los tokens existentes y el mismo vocabulario de estados en nuevas vistas.
- **Do** mantener unidades, saldo y rótulos junto a las cifras; usar cifras tabulares cuando se comparan importes.
- **Do** conservar los vacíos reales, el siguiente paso concreto y el historial visible de registros anulados o archivados.
- **Do** preservar foco visible, control de teclado del panel y ocultamiento efectivo del menú móvil cerrado.
- **Do** comprobar móvil en un viewport real después de cambios de layout. Esta documentación procede de revisión de código; no certifica por sí sola el comportamiento móvil renderizado.

### Don't

- **Don't** introducir fuentes remotas, fotos de ejemplo o texturas para completar espacios vacíos.
- **Don't** hacer que una tarjeta plana parezca elevada en reposo ni usar sombras como separación de filas.
- **Don't** reemplazar estados textuales por color o iconos solos.
- **Don't** reducir los controles móviles del formulario por debajo de la tipografía de 16px implementada.
- **Don't** documentar un componente, límite o interacción futura como si ya estuviera implementado.
