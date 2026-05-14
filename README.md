# CashTracker Backend

API REST construida con [NestJS](https://nestjs.org) para la gestión de presupuestos y gastos.

## Requisitos Previos

- Node.js 18.x o superior
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
│   ├── auth/                         # Módulo de autenticación (Clerk)
│   │   ├── decorators/               # Decoradores personalizados
│   │   ├── guards/                   # Guards de autenticación
│   │   ├── providers/                # Proveedores de servicios
│   │   ├── strategies/               # Estrategias de autenticación
│   │   └── auth.module.ts
│   ├── budgets/                      # Módulo de presupuestos
│   │   ├── decorators/               # Decoradores de validación
│   │   ├── dto/                      # Data Transfer Objects
│   │   ├── entities/                 # Entidades de base de datos
│   │   ├── guard/                    # Guards de validación
│   │   ├── repositories/             # Capa de acceso a datos
│   │   ├── budgets.controller.ts
│   │   └── budgets.module.ts
│   ├── expenses/                     # Módulo de gastos
│   │   ├── decorators/               # Decoradores de validación
│   │   ├── dto/                      # Data Transfer Objects
│   │   ├── entities/                 # Entidades de base de datos
│   │   ├── guards/                   # Guards de validación
│   │   ├── repositories/             # Capa de acceso a datos
│   │   ├── expenses.controller.ts
│   │   └── expenses.module.ts
│   ├── common/                       # Utilidades y componentes compartidos
│   │   ├── constants/                # Constantes globales
│   │   ├── pipes/                    # Pipes de transformación/validación
│   │   └── utils/                    # Funciones de utilidad
│   ├── config/                       # Configuración y validación de variables de entorno
│   ├── database/                     # Configuración de base de datos y migraciones
│   │   ├── migrations/               # Archivos de migración de TypeORM
│   │   └── database.module.ts
│   ├── health-check/                 # Módulo de monitoreo (Health Check)
│   ├── app.module.ts                 # Módulo principal
│   └── main.ts                       # Punto de entrada
├── test/                             # Tests e2e
├── .env.template                     # Plantilla de variables de entorno
├── .prettierrc                       # Configuración de Prettier
├── eslint.config.mjs                 # Configuración de ESLint
├── nest-cli.json                     # Configuración del CLI de NestJS
├── package.json
└── tsconfig.json                     # Configuración de TypeScript
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

### Budgets (Presupuestos)

- `POST /api/budgets` - Crear un nuevo presupuesto
- `GET /api/budgets` - Obtener todos los presupuestos del usuario
- `GET /api/budgets/:budgetId` - Obtener un presupuesto específico
- `PATCH /api/budgets/:budgetId` - Actualizar un presupuesto
- `DELETE /api/budgets/:budgetId` - Eliminar un presupuesto

### Expenses (Gastos)

- `POST /api/budgets/:budgetId/expenses` - Crear un gasto en un presupuesto
- `GET /api/budgets/:budgetId/expenses` - Obtener todos los gastos de un presupuesto
- `GET /api/budgets/:budgetId/expenses/:expenseId` - Obtener un gasto específico
- `PATCH /api/budgets/:budgetId/expenses/:expenseId` - Actualizar un gasto
- `DELETE /api/budgets/:budgetId/expenses/:expenseId` - Eliminar un gasto

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
