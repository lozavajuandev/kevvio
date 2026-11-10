# Anuncios de arriendo y siguiente despliegue

## Flujo implementado

1. En **Inmuebles**, abre el inmueble. Sus pestañas son **Configuración**, **Fotos**, **Inventario** y **Anuncio público**.
2. Agrega fotos generales y configura los datos del inmueble.
3. En **Anuncio público**, escribe título, descripción, canon, administración y contacto. Elige expresamente las fotos del anuncio; la primera seleccionada es su portada. El botón de estrella permite cambiarla sin cambiar la portada privada del portafolio.
4. **Guardar borrador** conserva el trabajo sin cambiar lo que ya está publicado. **Publicar anuncio / Actualizar anuncio** publica la versión actual de los datos generales y del anuncio.
5. Abre la vista, copia su enlace, desactívalo o reemplázalo. Reemplazarlo invalida el enlace anterior. Se puede definir una fecha de vencimiento; el anuncio permanece disponible hasta terminar ese día en Colombia.

La dirección exacta está oculta por defecto. Solo se publican las fotos generales elegidas y los campos expresos del anuncio. Inventario, notas internas, valor de compra, contratos, arrendatarios, cobros, pagos y documentos permanecen privados. El teléfono y correo ingresados en el anuncio sí se hacen visibles. WhatsApp y correo abren la aplicación correspondiente; Kevvio no envía mensajes automáticamente.

El enlace `/p/<token>` se abre sin cuenta. Cualquier persona que lo tenga puede consultarlo mientras esté activo; no identifica destinatarios. Está marcado para no indexación, pero esto no sustituye el control de acceso. La aplicación verifica el estado del enlace en cada consulta, página e imagen; no utiliza caché pública. No puede retirar copias que alguien ya haya descargado. Archivar una foto la retira inmediatamente del anuncio; archivar el inmueble retira todo el anuncio.

## Implementación

- `migrations/003_public_listings.sql`: un borrador y una versión publicada por inmueble, con token aleatorio de 256 bits, estado, vencimiento y fecha de publicación.
- `lib/listing-domain.ts`: validación de campos y tipos públicos.
- `lib/listings.ts`: acciones privadas autenticadas, instantánea pública explícita y comprobación de acceso a cada imagen.
- `app/p/[token]`: anuncio renderizado en servidor, galería, precio y contacto; estado no disponible para enlaces revocados o vencidos.
- `components/listing-editor.tsx`: borrador, selector de fotos, vista previa y administración del enlace.
- La publicación se hace bajo el mismo bloqueo del inmueble que utilizan las actualizaciones y el archivo de fotos. No modifica contratos ni cartera.
- Las pruebas de integración usan otra base y verifican selección de fotos, confidencialidad, borrador vs. publicación, revocación, vencimiento y persistencia tras reiniciar.

## Recomendación de hosting

Para la primera versión de un gestor recomiendo un servicio Node en **Render**, PostgreSQL administrado y un disco persistente para los archivos. Es compatible con el servidor Next.js actual y evita migrar inmediatamente la capa de archivos. Un servicio con disco debe mantenerse en una sola instancia; la siguiente fase de SaaS debe pasar fotos y documentos a almacenamiento de objetos.

Referencias oficiales: [Next.js en Render](https://render.com/docs/deploy-nextjs-app), [discos persistentes](https://render.com/docs/disks), [servicios web y puerto](https://render.com/docs/web-services). Los servicios con disco persistente requieren una modalidad de pago; revisar el precio vigente antes de contratar.

Preparación propuesta, **sin desplegar todavía**:

| Configuración | Valor propuesto |
| --- | --- |
| Runtime | Node 22 o superior |
| Build | `npm ci && npm run build` |
| Migración previa | `node scripts/migrate.mjs` |
| Inicio | `./node_modules/.bin/next start --hostname 0.0.0.0 --port "$PORT"` |
| `DATABASE_URL` | URL privada de PostgreSQL administrado |
| Disco persistente | Montar en `/var/data` |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `PUBLIC_APP_URL` | URL HTTPS definitiva, por ejemplo `https://inmuebles.tudominio.com` |

El dominio es un ejemplo, no uno registrado. `PUBLIC_APP_URL` configura enlaces y metadatos de vista previa; no publica el servidor ni abre puertos por sí solo. Las copias actuales usan localhost y solo funcionan en este Mac.

Antes de poner el servicio en internet: restaurar una copia de base y uploads juntos, configurar el propietario mientras el servicio esté restringido, probar autenticación y cookie Secure tras el proxy HTTPS, comprobar que las APIs privadas rechazan accesos anónimos y configurar respaldos externos de base y archivos. Probar una imagen después de reiniciar y de desplegar de nuevo. No cambiar el comando local `npm start`: sigue limitado a `127.0.0.1:3045`.

## Evolución a SaaS

Esta entrega prepara la presentación y captación del inmueble; conserva la cuenta individual existente. Para vender cuentas a gestores independientes, la próxima fase técnica es organizaciones, usuarios y roles, separación de todos los registros y archivos por organización, recuperación de acceso, cuotas y almacenamiento de objetos. Después: solicitudes de visita y seguimiento de interesados por inmueble. Esa fase aún no está implementada.
