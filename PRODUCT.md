# Kevvio · Gestión de activos

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Gestores inmobiliarios que organizan su portafolio y presentan inmuebles para arrendar. La versión local conserva un acceso individual. Interfaz en español.

## Product Purpose

Centralizar los inmuebles, contratos de arriendo, cobros, pagos y documentación de finca raíz.

## Operating Context

Aplicación local en el Mac del usuario. Portafolio vacío, sin datos ficticios.

## Stack

Confirmado: PostgreSQL en Docker en este Mac, con migraciones versionadas. Next.js confirmado por el usuario. Construcción directa de la interfaz, sin propuestas visuales previas.

## Capabilities and Constraints

Datos persistentes. Inmuebles, arrendatarios, contratos, cobros mensuales, abonos y documentos. Fotos del inmueble y de cada elemento. Inventario completo organizado por espacios, con cantidades, estados, atributos libres, captura rápida, historial y exportación. Supuesto de trabajo: Colombia y COP. Anuncios mediante enlace con fotos seleccionadas, borrador y publicación independientes, contacto, vencimiento y revocación. No integración bancaria ni envío automático de mensajes solicitado.

## Evidence on Hand

El usuario eligió Kevvio como marca el 10 de noviembre de 2026. El logotipo se escribe `kevvio` en minúsculas, con un monograma K, azul profundo y naranja eléctrico. Lema: «Más negocio. Menos pendientes.». No se han entregado inmuebles, contratos ni documentos; el dominio aún no está conectado a esta instalación.

## Product Principles

- Empezar vacío y permitir ingresar datos propios.
- Conservar historial de pagos y saldos verificables.
- Mantener los datos en el equipo del usuario por ahora; preparar una futura publicación con hosting.
- Toda la configuración, las fotos y el inventario viven dentro del inmueble.
- El anuncio público expone únicamente la información seleccionada, nunca la gestión privada.

## Evolución solicitada: agente independiente y Studio

La entrada pública es una landing dirigida a agentes inmobiliarios independientes. Los planes Esencial, Profesional y Studio son una propuesta de empaquetado pendiente de precios y suscripciones; no hay multiusuario ni cobros SaaS implementados. La aplicación personal permanece en `/app`.

Crear un inmueble es un asistente de página completa que comienza por las fotos, continúa con datos y descripción (manual o sugerencia de OpenAI) y termina con revisión. Se guardan inmueble, fotos, portada y anuncio privado juntos. Fotos, inventario y videos pertenecen a la ficha del inmueble.

Personas reemplaza el alcance exclusivo de Arrendatarios: una ficha reúne interesados en comprar/arrendar, compradores y arrendatarios actuales o anteriores. Las oportunidades mantienen etapas, inmueble de interés, presupuesto y próximo contacto; las actividades mantienen el contexto. La misma identidad se vincula con contratos existentes. Cierre comercial y registro contractual son acciones explícitas distintas.

Studio permite convertir fotos generales del inmueble en escenas de video mediante Kie.ai, comparando un catálogo inicial de Seedance, Grok y Kling con estimaciones visibles. El propietario revisa los resultados, los une en MP4 y los descarga. Requiere una credencial de video aparte de OpenAI. No promete fidelidad perfecta ni acceso a todos los modelos existentes, y no ofrece generación ilimitada.
