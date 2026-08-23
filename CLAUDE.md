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
The project is a REST API built with NestJS, using PostgreSQL for persistence and Clerk for authentication. It follows a modular architecture where each domain (Envelopes, Expenses, Dashboard, Auth) is encapsulated in its own module.

### Project Structure
```text
src/
├── auth/               # Clerk & Passport authentication (guards, strategies, providers)
├── envelopes/          # Envelope domain: entities, repositories, controllers, and services
├── expenses/           # Expense domain: entities, repositories, controllers, and services
├── dashboard/          # Read-only aggregated summary over envelopes/expenses
├── common/             # Shared constants, DTOs, and utility functions
├── config/             # Environment configuration and Zod validation
├── database/           # TypeORM data source and migration files
├── health-check/       # System health monitoring (/api/health-check)
├── app.module.ts       # Root application module
└── main.ts             # Entry point
```

Each domain module (`envelopes`, `expenses`, `dashboard`) follows the same
internal shape, so this doesn't need to be re-documented per feature as new
ones are added:
```text
<domain>/
├── decorators/         # e.g. @EnvelopeExists / @ExpenseExists
├── dto/                # Request DTOs (class-validator) and response DTOs
│                       # (static `fromEntity`/`fromEntities` factories)
├── entities/           # TypeORM entity
├── guard(s)/           # <Domain>ExistsGuard (naming - singular/plural -
│                       # varies per module, check the actual folder)
├── repositories/        # Data Mapper repository wrapping the TypeORM repo
├── <domain>.controller.ts
├── <domain>.service.ts
└── <domain>.module.ts
```
`dashboard` is read-only (no entity/guard of its own - it queries across
envelopes and expenses) so it's a lighter version of this shape.

### Core Modules Detail
- `src/auth`: Handles authentication using Clerk and Passport. Contains guards (`ClerkAuthGuard`) and decorators (`@CurrentUser`, `@Public`). `ClerkAuthGuard` is registered globally via `APP_GUARD`, so every route requires auth by default - use `@Public()` to opt a route out (e.g. health check).
- `src/envelopes`: Manages envelope lifecycle. Uses a Data Mapper pattern with `EnvelopesRepository` and `Envelope` entity.
- `src/expenses`: Manages expense lifecycle. Similar structure to envelopes, with `ExpensesRepository` and `Expense` entity. Nested under `/api/envelopes/:envelopeId/expenses`.
- `src/dashboard`: Aggregates envelope/expense data into a summary view (`GET /api/dashboard/summary`), optionally scoped to a calendar year.
- `src/database`: Centralized TypeORM configuration and migration management.
- `src/common`: Shared utilities, pipes, shared DTOs (`PaginationQueryDto`, `PaginatedResponseDto`), and global constants (`ERROR_MESSAGES`).
- `src/config`: Environment variable validation using Zod.
- `src/health-check`: Provides `/api/health-check` for system monitoring. Also runs a `@Cron` keep-alive ping (see Key Patterns) to stop Render's free tier from hibernating the instance.

### Key Technical Choices
- **Framework**: NestJS 11 (Core framework for building the REST API).
- **Authentication**: Clerk (@clerk/backend 3) (User management and session control).
- **Database ORM**: TypeORM 0.3 (Object-relational mapping and schema management via migrations).
- **Database**: PostgreSQL (via `pg` 8) (Primary persistent data store).
- **Validation**: Zod 4 (Environment variable validation) and `class-validator` (DTO-level request validation).
- **Testing**: Jest 30 and Supertest 7 (Unit and end-to-end testing).
- **Scheduling**: `@nestjs/schedule` (`@Cron`) drives the health-check keep-alive ping.
- **Rate Limiting**: `@nestjs/throttler`, configured globally (60 requests/60s) in `AppModule`.
- **Outbound HTTP**: `@nestjs/axios` (wraps `axios`), used by the health-check self-ping.
- **Security Headers**: `helmet`, applied globally in `main.ts`.

### Key Patterns
- **Data Mapper**: Repositories are used to decouple business logic from the data access layer.
- **DTOs**: Every request and response is typed using Data Transfer Objects (DTOs) with `class-validator`. Response DTOs expose static `fromEntity`/`fromEntities` factory methods rather than being constructed ad hoc in services.
- **Custom Guards**: Resources are protected using custom guards (e.g., `EnvelopeExistsGuard`, `ExpenseExistsGuard`) to ensure ownership and existence before processing requests. These guards attach the loaded resource to the request (`req.envelope` / `req.expense`) so downstream handlers don't re-fetch it.
- **No-Enumeration Errors**: A resource that doesn't exist and one that exists but belongs to another user both resolve to the same `404 NotFoundException` (via `ERROR_MESSAGES`) - never a distinct "unauthorized" response - so IDs can't be enumerated by probing for a different status code.
- **Centralized Error Messages**: User-facing error strings live in `src/common/constants/error-messages.ts` (`ERROR_MESSAGES`) instead of being inlined at each throw site.
- **Pagination**: List endpoints compose the shared `PaginationQueryDto` (`page`/`limit`, `IntersectionType`-style extension) and return a `PaginatedResponseDto`, instead of each module reimplementing offset/limit handling.
- **Auth by Default**: `ClerkAuthGuard` is bound as a global `APP_GUARD`; routes are private unless explicitly marked `@Public()`.
- **Environment Validation**: Config is validated at startup using Zod to ensure all required variables are present.

## Development Guidelines
- **Test Alignment**: When adding new features or modifying existing ones, always review and update the corresponding unit and E2E tests to ensure they match the new implementation and requirements of the module.

