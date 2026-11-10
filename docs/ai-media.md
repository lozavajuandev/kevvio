# Descripciones y videos de inmuebles

## Decisión de proveedor (10 de noviembre de 2026)

Kie.ai ofrece un catálogo multimodelo y pago por consumo. Se eligió como integración inicial por el precio publicado de Seedance Pro Fast y la posibilidad de usar varias familias con una credencial. No se afirma que sea siempre el proveedor más barato ni que reúna todos los modelos. Fal y Higgsfield también tienen catálogos amplios y tarifas que varían por versión, resolución, duración y descuentos. La calidad sobre fotos de inmuebles reales no ha sido comparada todavía.

Catálogo inicial implementado, precios estimados del proveedor en USD:

| Opción | Configuración | Precio por escena | Fuente |
| --- | --- | --- | --- |
| Seedance 1.0 Pro Fast | 5 s, 720p | 0,080 | https://kie.ai/seedance-1-0-pro-fast |
| Grok Imagine | 6 s, 480p | 0,072 | https://kie.ai/grok-imagine |
| Grok Imagine HD | 6 s, 720p | 0,135 | https://kie.ai/grok-imagine |
| Kling 2.6 | 5 s, sin audio | 0,315 | https://kie.ai/kling-2-6 |

Por ejemplo, seis escenas Seedance suman aproximadamente US$0,48 en generación. No incluye reintentos, almacenamiento, infraestructura, impuestos o el margen del SaaS. Los precios se muestran como estimaciones y tienen fecha/fuente. No hay cambio automático a un modelo más costoso. Para ampliar el catálogo, hay que agregar la ficha en `lib/video-models.ts`, un adaptador de parámetros verificado y sus pruebas; el cliente no puede enviar identificadores de modelo arbitrarios.

Comparación consultada: https://fal.ai/pricing y https://open.higgsfield.ai/pricing. Sus descuentos y unidades no son equivalentes entre todos los modelos; una cifra mínima aislada no demuestra menor costo para cualquier trabajo.

## Flujo y almacenamiento

1. El propietario selecciona hasta seis fotos generales del mismo inmueble; las fotos de inventario no se envían por este flujo.
2. El servidor valida el plan local, fotos activas, estimación aceptada, presupuesto diario y clave de idempotencia. Reserva el proyecto en PostgreSQL.
3. Cada foto se convierte en JPEG sin metadatos personales y se carga al servicio temporal de Kie. El prompt pide conservar arquitectura y objetos, con movimiento mínimo. Esta instrucción no garantiza fidelidad: el producto pide revisar el resultado.
4. Se envía cada escena una sola vez. Si se pierde la confirmación del proveedor, queda `unknown`; hay que revisar su historial antes de crear otra generación. No se cobra ni se reenvía desde un sondeo de estado.
5. La pantalla consulta el resultado autenticada y guarda los MP4 en almacenamiento privado. Solo se aceptan orígenes HTTPS del proveedor permitidos, con redirecciones validadas y límite de 100 MB. Un CDN nuevo requiere revisar y ampliar la lista, no relajar las restricciones globalmente.
6. FFmpeg une las escenas localmente, sin audio ni recorte del encuadre. Se exporta a 720p horizontal o vertical con márgenes si son necesarios. No se modifica ni se publica el anuncio público.

La preparación interrumpida se marca como incierta después de tres minutos. Los archivos en Kie son temporales; el despliegue SaaS necesitará una cola de trabajo duradera que descargue los resultados sin depender de una pestaña abierta. La implementación actual es para el servidor Node local, no una función serverless de corta duración.

`VIDEO_TEST_MODE` y `KIE_TEST_BASE_URL` son accesos de prueba exclusivos del entorno de integración. No configurarlos en despliegues reales. Las pruebas usan un servidor simulado ligado a loopback y una base de datos desechable; nunca usan las claves del propietario.

## OpenAI

`POST /api/ai/description` utiliza Responses, fotos reducidas, salida estructurada y `store:false`. Solo envía los hechos seleccionados por el asistente y hasta seis fotos; excluye la dirección exacta, costos de compra, documentos y notas privadas del portafolio. No puede impedir que una foto contenga información sensible: las fotos deben revisarse antes de enviarlas. Las sugerencias no se aplican ni publican automáticamente.

Documentación oficial: https://developers.openai.com/api/docs/guides/images-vision, https://developers.openai.com/api/docs/guides/structured-outputs, https://developers.openai.com/api/docs/models/gpt-5.4-mini.

## Antes de comercializar los planes

- Definir precios en COP, límites de inmuebles y presupuesto de generación incluido; traducir consumo real del proveedor a créditos comerciales propios. No prometer videos ilimitados.
- Añadir cuentas/espacios aislados, suscripciones, verificación de pago y permisos por plan en servidor. `RAIZ_PLAN` es configuración de esta instalación y no un sistema de facturación.
- Añadir cola de generación, recuperación de tareas, conciliación de cargos y almacenamiento duradero.
- Validar calidad y costos con fotos autorizadas de inmuebles reales, empezando por un presupuesto pequeño y explícito.
- Hacer la revisión visual en escritorio y móvil pendiente por indisponibilidad del navegador en esta sesión.

Referencia de API: https://docs.kie.ai/market/common/get-task-detail, https://docs.kie.ai/file-upload-api/quickstart, https://docs.kie.ai/market/bytedance/v1-pro-fast-image-to-video, https://docs.kie.ai/market/grok-imagine/image-to-video y https://docs.kie.ai/market/kling/image-to-video.
