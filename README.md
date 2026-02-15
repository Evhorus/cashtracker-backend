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
│   ├── auth/                         # Módulo de autenticación
│   │   ├── decorators/               # Decoradores personalizados
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/                   # Guards de autenticación
│   │   │   └── clerk-auth.guard.ts
│   │   ├── providers/                # Proveedores de servicios
│   │   │   └── clerk-client.provider.ts
│   │   ├── strategies/               # Estrategias de autenticación
│   │   │   └── clerk.strategy.ts
│   │   ├── types/                    # Tipos de TypeScript
│   │   │   └── express.d.ts
│   │   └── auth.module.ts
│   ├── budgets/                      # Módulo de presupuestos
│   │   ├── decorators/               # Decoradores de validación
│   │   │   ├── budget-exists.ts
│   │   │   └── expense-exists.ts
│   │   ├── dto/                      # Data Transfer Objects
│   │   │   ├── create-budget.dto.ts
│   │   │   ├── create-expense.dto.ts
│   │   │   ├── update-budget.dto.ts
│   │   │   └── update-expense.dto.ts
│   │   ├── entities/                 # Entidades de base de datos
│   │   │   ├── budget.entity.ts
│   │   │   └── expense.entity.ts
│   │   ├── guard/                    # Guards de validación
│   │   │   ├── budget-exists.guard.ts
│   │   │   └── expense-exists.guard.ts
│   │   ├── services/                 # Lógica de negocio
│   │   │   ├── budgets.service.ts
│   │   │   └── expenses.service.ts
│   │   ├── budgets.controller.ts     # Controlador REST
│   │   └── budgets.module.ts
│   ├── health-check/                 # Módulo de health check
│   │   ├── health-check.controller.ts
│   │   ├── health-check.module.ts
│   │   └── health-check.service.ts
│   ├── app.module.ts                 # Módulo principal
│   ├── main.ts                       # Punto de entrada
│   └── middleware.ts                 # Middlewares globales
├── test/                             # Tests e2e
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env.template                     # Plantilla de variables de entorno
├── .prettierrc                       # Configuración de Prettier
├── eslint.config.mjs                 # Configuración de ESLint
├── nest-cli.json                     # Configuración del CLI de NestJS
├── package.json
├── tsconfig.json                     # Configuración de TypeScript
└── tsconfig.build.json
```

## API Endpoints

### Health Check

- `GET /api/health` - Verificar estado del servidor

### Budgets (Presupuestos)

- `POST /api/budgets` - Crear un nuevo presupuesto
- `GET /api/budgets` - Obtener todos los presupuestos del usuario
- `GET /api/budgets/:budgetId` - Obtener un presupuesto específico
- `PATCH /api/budgets/:id` - Actualizar un presupuesto
- `DELETE /api/budgets/:id` - Eliminar un presupuesto

### Expenses (Gastos)

- `POST /api/budgets/:budgetId/expenses` - Crear un gasto en un presupuesto
- `GET /api/budgets/:budgetId/expenses/:expenseId` - Obtener un gasto específico
- `PATCH /api/budgets/:budgetId/expenses/:expenseId` - Actualizar un gasto
- `DELETE /api/budgets/:budgetId/expenses/:expenseId` - Eliminar un gasto

## Tecnologías

- **Framework:** NestJS 11.0.1
- **Node.js:** Runtime JavaScript
- **TypeScript:** Lenguaje de programación
- **Autenticación:** Clerk (@clerk/backend)
- **Base de datos:** PostgreSQL con TypeORM
- **Validación:** class-validator, class-transformer, Zod
- **Autenticación:** Passport.js
- **Programación de tareas:** @nestjs/schedule
- **Testing:** Jest, Supertest

## Características

- ✅ Autenticación con Clerk
- ✅ CRUD completo de presupuestos
- ✅ CRUD completo de gastos asociados a presupuestos
- ✅ Validación de datos con DTOs
- ✅ Guards personalizados para validar existencia de recursos
- ✅ ORM con TypeORM y PostgreSQL
- ✅ Variables de entorno validadas con Zod
- ✅ Health check endpoint
- ✅ Arquitectura modular

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
