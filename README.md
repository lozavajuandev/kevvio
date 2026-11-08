# Raíz · Gestión de inmuebles

Aplicación fullstack de uso personal: Next.js 16, React 19 y PostgreSQL 17 en Docker. El portafolio inicia vacío. Base y aplicación escuchan únicamente en `127.0.0.1`.

## Puesta en marcha

Requisitos: Node.js 22 o superior, npm y Docker Desktop iniciado.

```sh
npm install
cp .env.example .env
# Editar .env: definir una contraseña aleatoria y usarla también en DATABASE_URL.
npm run db:up
npm run db:migrate
npm run build
npm start
```

Abrir <http://localhost:3045>. En el primer acceso se crea el nombre y contraseña personal (mínimo 10 caracteres). En desarrollo: `npm run dev`.

En este equipo ya se generó `.env` con credenciales aleatorias y se aplicaron las migraciones. No reemplazar ese archivo al reiniciar. No está versionado.

## Funcionalidades

- Crear, editar y archivar inmuebles; consultar su expediente.
- Crear y editar arrendatarios y sus datos de contacto.
- Contratos con canon, administración, día de pago y vigencia. PostgreSQL impide contratos activos superpuestos para el mismo inmueble.
- Cobros mensuales únicos por contrato. Se generan al crear un contrato y mediante **Generar cobros del mes**. Esta acción completa meses faltantes hasta el actual.
- Abonos parciales, validación de saldo, protección frente a concurrencia y reintentos. Las anulaciones requieren motivo y conservan el movimiento original.
- Documentos PDF, JPG y PNG de hasta 10 MB, asociados al inmueble y opcionalmente al contrato, con vencimiento y descarga autenticada.
- Resumen de cartera, ocupación y vencimientos; exportación de cartera en CSV.
- Contraseña con scrypt y sesiones con token aleatorio almacenado como hash, cookie HttpOnly y validación de origen en mutaciones.

## PostgreSQL y migraciones

- Contenedor: `raiz-activos-postgres`.
- Host / puerto: `127.0.0.1:55432`.
- Base / usuario: `raiz` / `raiz`; contraseña en `.env`.
- Volumen: `raiz-activos_postgres_data`.
- Esquema inicial: `migrations/001_initial.sql`.
- Tablas: `users`, `sessions`, `properties`, `tenants`, `leases`, `charges`, `payments`, `documents` y `schema_migrations`.

El ejecutor toma un bloqueo de PostgreSQL, verifica SHA-256 de migraciones ya aplicadas y ejecuta cada archivo nuevo en una transacción. Se puede ejecutar repetidamente sin duplicar datos. Para cambios futuros, agregar `002_descripcion.sql`, sin modificar migraciones aplicadas, y ejecutar `npm run db:migrate`.

```sh
docker compose ps
docker compose logs postgres
docker compose exec postgres psql -U raiz -d raiz
docker compose stop postgres
docker compose up -d --wait postgres
```

No usar `docker compose down -v`: eliminaría el volumen de datos. Cambiar POSTGRES_PASSWORD en `.env` después de crear el volumen no modifica la contraseña del rol de PostgreSQL; cualquier rotación debe hacerse también dentro de la base.

## Documentos y respaldos

Los archivos se guardan en `.data/uploads` con nombres aleatorios, sin acceso estático público. La base almacena sus metadatos. Ambos deben conservarse juntos.

Con la aplicación detenida (sin escrituras en curso), ejecutar:

```sh
npm run db:backup
```

Se crea `backups/<fecha>/database.dump`, una copia de `uploads/` si existe y un manifiesto. Copiar el respaldo a otro disco para protegerse ante fallas del equipo. El comando no publica ni envía datos.

Restaurar preferentemente en una base nueva. Ejemplo, con la aplicación detenida:

```sh
docker compose exec postgres createdb -U raiz raiz_restaurada
docker compose exec -T postgres pg_restore -U raiz -d raiz_restaurada --no-owner < backups/FECHA/database.dump
```

Copiar el directorio `uploads/` del mismo respaldo a un nuevo directorio local. Actualizar `DATABASE_URL` a `raiz_restaurada` y `UPLOAD_DIR` a ese directorio. Ejecutar migraciones pendientes y arrancar la aplicación. Verificar saldos y descargar un documento antes de sustituir el entorno anterior.

## Validación

```sh
npm run typecheck
npm run build
npm test
```

Las pruebas crean una base temporal `raiz_test_<uuid>` y una aplicación en el puerto 3046, prueban los flujos contra PostgreSQL real, y eliminan únicamente esa base temporal al terminar. Los archivos de prueba se guardan separados en `.data/test-uploads`. El portafolio principal nunca se llena con datos de prueba.

## Alcance de esta versión

Importes en pesos colombianos enteros. Fechas operativas en America/Bogota. El canon y la administración se cobran completos por mes, incluso si la vigencia inicia o termina a mitad de mes; no hay prorrateo ni incremento anual automático. Los cobros futuros no se anticipan. Finalizar un contrato conserva la cartera ya generada.

Es una aplicación local personal, sin integración bancaria, facturación electrónica, correo automático, sincronización en la nube ni acceso multiusuario. Los documentos descargados no se firman ni se someten a OCR. Para exponerla fuera del Mac se debe configurar HTTPS, un acceso privado y respaldos externos. No hay recuperación automática de contraseña; guarda tu contraseña en un gestor.

Referencias de implementación: [imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres), [transacciones de node-postgres](https://node-postgres.com/features/transactions).
