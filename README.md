# CashTracker Backend

API REST construida con [NestJS](https://nestjs.org) para la gestión de presupuestos y gastos.

## Requisitos Previos

- Node.js 20.x o superior
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

```
cashtracker-backend/
├── src/
│   ├── auth/                         # Autenticación con Clerk y Passport
│   │   ├── decorators/               # @CurrentUser, @Public
│   │   ├── guards/                   # ClerkAuthGuard
│   │   ├── providers/                # ClerkClientProvider
│   │   ├── strategies/               # ClerkStrategy
│   │   └── auth.module.ts
│   ├── envelopes/                      # Gestión de presupuestos
│   │   ├── decorators/               # @EnvelopeExists
│   │   ├── dto/                      # Create/Update/Response DTOs
│   │   ├── entities/                 # Entidad Envelope (TypeORM)
│   │   ├── guard/                    # EnvelopeExistsGuard
│   │   ├── repositories/             # EnvelopesRepository (Data Mapper)
│   │   ├── envelopes.controller.ts     # Rutas de presupuestos
│   │   ├── envelopes.service.ts        # Lógica de negocio
│   │   └── envelopes.module.ts
│   ├── expenses/                     # Gestión de gastos
│   │   ├── decorators/               # @ExpenseExists
│   │   ├── dto/                      # Create/Update/Response DTOs
│   │   ├── entities/                 # Entidad Expense (TypeORM)
│   │   ├── guards/                   # ExpenseExistsGuard
│   │   ├── repositories/             # ExpensesRepository (Data Mapper)
│   │   ├── expenses.controller.ts    # Rutas de gastos
│   │   ├── expenses.service.ts       # Lógica de negocio
│   │   └── expenses.module.ts
│   ├── common/                       # Componentes compartidos
│   │   ├── constants/                # Mensajes de error globales
│   │   ├── pipes/                    # Pipes de transformación/validación
│   │   └── utils/                    # Funciones de utilidad comunes
│   ├── config/                       # Configuración y validación (Zod)
│   │   └── env.validation.ts
│   ├── database/                     # Persistencia de datos
│   │   ├── migrations/               # Historial de migraciones
│   │   ├── data-source.ts            # Configuración para TypeORM CLI
│   │   └── database.module.ts
│   ├── health-check/                 # Monitoreo de disponibilidad
│   │   ├── health-check.controller.ts
│   │   ├── health-check.service.ts
│   │   └── health-check.module.ts
│   ├── app.module.ts                 # Ensamblaje de la aplicación
│   └── main.ts                       # Punto de entrada principal
├── scripts/                          # Herramientas de desarrollo
│   ├── migration-master.ts           # Gestor de migraciones
│   └── typeorm-generate.ts           # Generador de migraciones
├── test/                             # Pruebas End-to-End (E2E)
├── .env.template                     # Plantilla de variables de entorno
├── .gitignore                        # Archivos excluidos de Git
├── .prettierrc                       # Configuración de formateo (Prettier)
├── eslint.config.mjs                 # Reglas de linting (ESLint)
├── nest-cli.json                     # Configuración del CLI de NestJS
├── package.json                      # Scripts y dependencias
├── pnpm-lock.yaml                    # Versiones exactas de dependencias
├── tsconfig.build.json               # Configuración de compilación (dist)
└── tsconfig.json                     # Configuración base de TypeScript
```

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

## API Endpoints

### Health Check

- `GET /api/health` - Verificar estado del servidor

### Envelopes (Presupuestos)

- `POST /api/envelopes` - Crear un nuevo presupuesto
- `GET /api/envelopes` - Obtener todos los presupuestos del usuario
- `GET /api/envelopes/:envelopeId` - Obtener un presupuesto específico
- `PATCH /api/envelopes/:envelopeId` - Actualizar un presupuesto
- `DELETE /api/envelopes/:envelopeId` - Eliminar un presupuesto

### Expenses (Gastos)

- `POST /api/envelopes/:envelopeId/expenses` - Crear un gasto en un presupuesto
- `GET /api/envelopes/:envelopeId/expenses` - Obtener todos los gastos de un presupuesto
- `GET /api/envelopes/:envelopeId/expenses/:expenseId` - Obtener un gasto específico
- `PATCH /api/envelopes/:envelopeId/expenses/:expenseId` - Actualizar un gasto
- `DELETE /api/envelopes/:envelopeId/expenses/:expenseId` - Eliminar un gasto

## Tecnologías

- **Framework:** NestJS 11.0.1
- **Node.js:** Runtime JavaScript
- **TypeScript:** Lenguaje de programación
- **Autenticación:** Clerk (@clerk/backend)
- **Base de Datos:** PostgreSQL con TypeORM
- **Migraciones:** Gestión de esquema mediante TypeORM CLI
- **Validación:** class-validator, class-transformer, Zod
- **Testing:** Jest, Supertest

## Características

- ✅ Autenticación con Clerk
- ✅ CRUD completo de presupuestos
- ✅ CRUD completo de gastos (Módulo independiente)
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
