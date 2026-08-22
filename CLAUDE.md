# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### General
- Build project: `pnpm run build`
- Format code: `pnpm run format`
- Lint code: `pnpm run lint`
- Start in dev mode: `pnpm run start:dev`
- Start in debug mode: `pnpm run start:debug`
- Start in production mode: `pnpm run start:prod`

### Testing
- Run all unit tests: `pnpm run test`
- Run tests in watch mode: `pnpm run test:watch`
- Run tests with coverage: `pnpm run test:cov`
- Run E2E tests: `pnpm run test:e2e`
- Run a single test: `pnpm run test <path-to-file>`

### Database Migrations
- Generate migration: `pnpm migration generate <name>`
- Run pending migrations: `pnpm migration run`
- Revert last migration: `pnpm migration revert`
- Show migration status: `pnpm migration show`

## Architecture & Structure

### High-Level Overview
The project is a REST API built with NestJS, using PostgreSQL for persistence and Clerk for authentication. It follows a modular architecture where each domain (Envelopes, Expenses, Auth) is encapsulated in its own module.

### Project Structure
```text
src/
├── auth/               # Clerk & Passport authentication (guards, strategies, providers)
├── envelopes/           # Envelope domain: entities, repositories, controllers, and services
├── expenses/           # Expense domain: entities, repositories, controllers, and services
├── common/            # Shared constants and utility functions
├── config/            # Environment configuration and Zod validation
├── database/          # TypeORM data source and migration files
├── health-check/      # System health monitoring (/api/health)
├── app.module.ts      # Root application module
└── main.ts            # Entry point
```

### Core Modules Detail
- `src/auth`: Handles authentication using Clerk and Passport. Contains guards (`ClerkAuthGuard`) and decorators (`@CurrentUser`, `@Public`).
- `src/envelopes`: Manages envelope lifecycle. Uses a Data Mapper pattern with `EnvelopesRepository` and `Envelope` entity.
- `src/expenses`: Manages expense lifecycle. Similar structure to envelopes, with `ExpensesRepository` and `Expense` entity.
- `src/database`: Centralized TypeORM configuration and migration management.
- `src/common`: Shared utilities, pipes, and global constants.
- `src/config`: Environment variable validation using Zod.
- `src/health-check`: Provides `/api/health` for system monitoring.

### Key Technical Choices
- **Framework**: NestJS 11 (Core framework for building the REST API).
- **Authentication**: Clerk (@clerk/backend 3) (User management and session control).
- **Database ORM**: TypeORM 0.3 (Object-relational mapping and schema management via migrations).
- **Database**: PostgreSQL (via `pg` 8) (Primary persistent data store).
- **Validation**: Zod 4 (Environment variable validation) and `class-validator` (DTO-level request validation).
- **Testing**: Jest 30 and Supertest 7 (Unit and end-to-end testing).

### Key Patterns
- **Data Mapper**: Repositories are used to decouple business logic from the data access layer.
- **DTOs**: Every request and response is typed using Data Transfer Objects (DTOs) with `class-validator`.
- **Custom Guards**: Resources are protected using custom guards (e.g., `EnvelopeExistsGuard`, `ExpenseExistsGuard`) to ensure ownership and existence before processing requests.
- **Environment Validation**: Config is validated at startup using Zod to ensure all required variables are present.

## Development Guidelines
- **Test Alignment**: When adding new features or modifying existing ones, always review and update the corresponding unit and E2E tests to ensure they match the new implementation and requirements of the module.

