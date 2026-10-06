# CashTracker Backend

API REST construida con [NestJS](https://nestjs.org) para la gestión de presupuestos y gastos.

## Requisitos Previos

- Node.js 22.x o superior (la imagen Docker de producción está fijada a esta versión)
- pnpm (recomendado)
- PostgreSQL

## Instalación

1. Clona el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
cd cashtracker-backend
```

1. Instala las dependencias:

```bash
pnpm install
```

1. Configura las variables de entorno:
   - Crea un archivo `.env` en la raíz del proyecto (tomar como referencia el `.env.template`)
   - Agrega las variables necesarias

## Ejecutar el Proyecto

### Modo Desarrollo

Inicia el servidor de desarrollo con hot-reload:

```bash
pnpm run start:dev
```

El servidor estará disponible en [http://localhost:4000](http://localhost:4000)

### Modo Debug

Inicia el servidor en modo debug:

```bash
pnpm run start:debug
```

### Compilar para Producción

Genera la versión compilada:

```bash
pnpm run build
```

### Ejecutar en Producción

Después de compilar, inicia el servidor de producción:

```bash
pnpm run start:prod
```

## Testing

```bash
# Tests unitarios
pnpm run test

# Tests en modo watch
pnpm run test:watch

# Tests e2e
pnpm run test:e2e

# Cobertura de tests
pnpm run test:cov
```

## Linting y Formateo

```bash
# Ejecutar linter
pnpm run lint

# Formatear código
pnpm run format
```

## Estructura del Proyecto

El proyecto es domain-driven: cada dominio de negocio vive en su propio
módulo bajo `src/`, y todos siguen el mismo patrón interno (por eso no se
documenta un árbol completo, literal, que se desactualiza con cada feature
nueva):

```
src/<dominio>/
├── decorators/       # p. ej. @EnvelopeExists / @ExpenseExists
├── dto/              # DTOs de entrada (class-validator) y de respuesta
│                     # (factories estáticas fromEntity/fromEntities)
├── entities/         # Entidad TypeORM
├── guard(s)/         # <Dominio>ExistsGuard (el nombre de la carpeta,
│                     # singular o plural, varía según el módulo)
├── repositories/     # Repositorio (Data Mapper) sobre el repo de TypeORM
├── <dominio>.controller.ts
├── <dominio>.service.ts
└── <dominio>.module.ts
```

Dominios actuales bajo `src/`:

- **`auth/`** — Autenticación con Clerk y Passport (`ClerkAuthGuard`,
  `ClerkStrategy`, decoradores `@CurrentUser` y `@Public`). El guard es
  global: toda ruta requiere autenticación salvo que esté marcada `@Public()`.
- **`envelopes/`** — Gestión de presupuestos (sigue el patrón de arriba).
- **`expenses/`** — Gestión de gastos, anidado bajo cada envelope (sigue el
  patrón de arriba).
- **`dashboard/`** — Resumen agregado de sobres/gastos, de solo lectura (sin
  entidad ni guard propios).
- **`common/`** — DTOs compartidos (paginación), constantes de error
  centralizadas, pipes y utilidades.
- **`config/`** — Validación de variables de entorno con Zod.
- **`database/`** — Configuración de TypeORM y migraciones (`migrations/`,
  `data-source.ts`, `database.module.ts`).
- **`health-check/`** — Expone `/api/health-check` y corre un ping
  periódico (`@Cron`) para evitar que Render hiberne la instancia gratuita.

Fuera de `src/`, lo relevante: `scripts/` (gestor de migraciones), `test/`
(E2E) y `.env.template` (plantilla de variables de entorno).

## Base de Datos y Migraciones

Este proyecto utiliza TypeORM con un flujo basado en migraciones para gestionar el esquema de la base de datos.

```bash
# Generar una nueva migración basada en los cambios de las entidades
pnpm migration generate AddNewField

# Ejecutar todas las migraciones pendientes
pnpm migration run

# Revertir la última migración ejecutada
pnpm migration revert

# Ver el estado de las migraciones
pnpm migration show
```

## Backups

**Automático.** El workflow `.github/workflows/db-backup.yml` corre todos los días a las 08:00 UTC
(03:00 en Colombia), también se puede lanzar a mano (Actions → *DB backup* → *Run workflow*). Ejecuta
`scripts/backup-db-r2.sh`: hace `pg_dump -F c` de producción, lo verifica con `pg_restore --list`, lo sube
al bucket privado `cashtracker-db-backups` de Cloudflare R2 (carpeta `cashtracker/`, archivos
`cashtracker-prod-YYYYMMDD-HHMMSS.dump`) y borra los de más de 30 días. Si la base de Neon está suspendida,
espera hasta ~5 minutos a que despierte antes de fallar.

Secrets del repositorio: `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`
(`https://<account_id>.r2.cloudflarestorage.com`), `R2_BUCKET` y, opcional, `HEALTHCHECK_URL`. El token de R2
está limitado a ese bucket; si vence, los backups fallan hasta renovarlo (crear uno nuevo en Cloudflare →
R2 → *Manage API tokens* y volver a cargar los dos secrets `R2_*`).

**Backup extra a demanda.** Lanza el workflow a mano (Actions → *DB backup* → *Run workflow*) y baja el dump de R2. `backups/` (ignorada por git) es donde se dejan los dumps descargados para restaurar.

### Restaurar un backup

Nunca restaures encima de producción sin querer: `scripts/restore-db.sh` exige indicar la base de destino
y pide una confirmación extra (`SI`) si el destino es el host de producción del `.env`.

1. **Base de destino.** En Neon crea un proyecto o una base temporal y copia su connection string.
2. **Descargar el dump.** Opción A, sin comandos: Cloudflare → R2 → `cashtracker-db-backups` → carpeta
   `cashtracker/` → el archivo más reciente → *Download*, y déjalo en `backups/`. Opción B, por consola:
   ```bash
   export AWS_ACCESS_KEY_ID=<access key id> AWS_SECRET_ACCESS_KEY=<secret> AWS_DEFAULT_REGION=auto
   EP=https://<account_id>.r2.cloudflarestorage.com
   docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli:2.37.0 \
     --endpoint-url $EP s3 ls s3://cashtracker-db-backups/cashtracker/
   mkdir -p backups
   docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION -v "$PWD/backups:/b" \
     amazon/aws-cli:2.37.0 --endpoint-url $EP s3 cp s3://cashtracker-db-backups/cashtracker/<archivo>.dump /b/
   ```
3. **Restaurar.**
   ```bash
   pnpm restore "<connection string de destino>" <archivo>.dump
   ```
   Sin el segundo argumento usa el dump más reciente de `backups/`. El destino se pega a mano: nunca se
   lee del `.env`. Usa la conexión **directa** de Neon (host sin `-pooler`; en el diálogo *Connect* desmarca
   *Connection pooling*): el pooler no sirve para `pg_restore`. No pongas `--` después de `pnpm restore`:
   el script lo tomaría como la base de destino.
4. **Comprobar.** Conecta a la base restaurada y revisa los conteos (por ejemplo `select count(*)` en
   `envelope` y `expense`) contra los de producción antes de apuntar la app a ella.

## API Endpoints

### Health Check

- `GET /api/health-check` - Verificar estado del servidor

### Envelopes (Presupuestos)

- `POST /api/envelopes` - Crear un nuevo presupuesto
- `GET /api/envelopes` - Obtener los presupuestos del usuario (paginado:
  `page`, `limit`; filtrable con `search`)
- `GET /api/envelopes/:envelopeId` - Obtener un presupuesto específico
- `PATCH /api/envelopes/:envelopeId` - Actualizar un presupuesto
- `DELETE /api/envelopes/:envelopeId` - Eliminar un presupuesto

### Expenses (Gastos)

- `POST /api/envelopes/:envelopeId/expenses` - Crear un gasto en un presupuesto
- `GET /api/envelopes/:envelopeId/expenses` - Obtener los gastos de un
  presupuesto (paginado: `page`, `limit`; filtrable con `search`,
  `startDate`, `endDate`, `sort`)
- `GET /api/envelopes/:envelopeId/expenses/:expenseId` - Obtener un gasto específico
- `PATCH /api/envelopes/:envelopeId/expenses/:expenseId` - Actualizar un gasto
- `DELETE /api/envelopes/:envelopeId/expenses/:expenseId` - Eliminar un gasto

### Dashboard

- `GET /api/dashboard/summary` - Resumen agregado de presupuestos y gastos
  del usuario (opcionalmente filtrable por año con `year`)

## Tecnologías

- **Framework:** NestJS 11
- **Node.js:** Runtime JavaScript
- **TypeScript:** Lenguaje de programación
- **Autenticación:** Clerk (@clerk/backend), guard global con opt-out vía `@Public()`
- **Base de Datos:** PostgreSQL con TypeORM
- **Migraciones:** Gestión de esquema mediante TypeORM CLI
- **Validación:** class-validator, class-transformer, Zod
- **Testing:** Jest, Supertest
- **Seguridad y confiabilidad:** Helmet (cabeceras HTTP), `@nestjs/throttler`
  (rate limiting global) y `@nestjs/schedule` + `@nestjs/axios` (ping
  periódico de keep-alive para evitar la hibernación en free tiers)

## Características

- ✅ Autenticación con Clerk
- ✅ CRUD completo de presupuestos
- ✅ CRUD completo de gastos (Módulo independiente)
- ✅ Dashboard con resumen agregado por año
- ✅ Validación de datos con DTOs y Zod
- ✅ Guards personalizados para validación de recursos
- ✅ Gestión de base de datos mediante migraciones
- ✅ Health check y monitoreo
- ✅ Arquitectura modular limpia

## Recursos

- [Documentación de NestJS](https://docs.nestjs.com)
- [Documentación de TypeORM](https://typeorm.io)
- [Documentación de Clerk](https://clerk.com/docs)

## Deploy

Puedes desplegar este backend en plataformas como:

- [Railway](https://railway.app)
- [Render](https://render.com)
- [Heroku](https://heroku.com)
- [AWS](https://aws.amazon.com)
- [DigitalOcean](https://digitalocean.com)

Asegúrate de configurar las variables de entorno correctamente en tu plataforma de deployment.
