# AGENTS.md

Guidance for AI coding agents working in this repository. Claude Code picks
it up through the `@AGENTS.md` import in `CLAUDE.md`; other agent tools read
this file directly.

## Development Commands

### General
- Build project: `pnpm run build`
- Format code: `pnpm run format` (write) / `pnpm run format:check` (verify)
- Lint code: `pnpm run lint` (with `--fix`) / `pnpm run lint:check` (verify)
- Typecheck: `pnpm run typecheck`
- Start in dev mode: `pnpm run start:dev`
- Start in debug mode: `pnpm run start:debug`
- Start in production mode: `pnpm run start:prod`

### CI and branch protection
- `.github/workflows/ci.yml` runs on every PR and push to `main`: `verify` (typecheck, lint:check, format:check, unit tests, build) and `e2e` (the e2e suites against a throwaway Postgres service container, no secrets).
- `main` is protected by the "protect main" ruleset: changes land through a PR, squash merge only, and both `verify` and `e2e` must pass. A merge to `main` deploys to Render, so this is the gate in front of production.
- Dependabot (`.github/dependabot.yml`) opens weekly PRs on Monday: one grouped PR for npm minor/patch bumps, one for GitHub Actions, and one PR per npm major. `.github/workflows/dependabot-auto-merge.yml` enables auto-merge on everything below a major, so those merge (and deploy) by themselves once `verify` and `e2e` pass; majors stay open for review. The Dockerfile's `NODE_VERSION` is not covered (Dependabot cannot resolve an ARG-built tag): bump it by hand.

### Testing
- Run all unit tests: `pnpm run test`
- Run tests in watch mode: `pnpm run test:watch`
- Run tests with coverage: `pnpm run test:cov`
- Run E2E tests: `pnpm run test:e2e` - against a throwaway Postgres on this machine only (`.env.test`, see `.env.template` > TESTS for the Docker command). `test/assert-safe-test-database.ts` aborts on any non-local host, because the suites delete every row between tests.
- Run a single test: `pnpm run test <path-to-file>`

### Database Migrations
- Generate migration: `pnpm migration generate <name>`
- Run pending migrations: `pnpm migration run`
- Revert last migration: `pnpm migration revert`
- Show migration status: `pnpm migration show`

### Database Backups
- Automated: `.github/workflows/db-backup.yml` runs daily at 08:00 UTC (and on demand) and calls `scripts/backup-db-r2.sh`: `pg_dump -F c` of production, verified with `pg_restore --list`, uploaded to the private R2 bucket `cashtracker-db-backups` under `cashtracker/` (`cashtracker-prod-YYYYMMDD-HHMMSS.dump`), remote rotation at 30 days. It retries the dump for ~5 minutes so a suspended Neon compute can wake up.
- Repo secrets: `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, optional `HEALTHCHECK_URL`. The R2 token is scoped to that bucket only; if it expires the job fails until it is renewed.
- Extra backup on demand: run the workflow (Actions → DB backup → Run workflow). Restore: `pnpm restore "<target_url>" [dump]` (no `--` after `restore`; use Neon's direct connection, not the `-pooler` host). Steps and a row-count check are in the README ("Backups").
- Do not put production `DATABASE_URL` values in local files or logs; the scheduled job is how production data is read.

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
- `src/dashboard`: Aggregates envelope/expense data into a summary view (`GET /api/dashboard/summary`). It must read the same however a user organises envelopes (one per month, or one long-lived envelope per purpose): anything over time (monthly chart, `year`, available years, breakdowns) follows each **expense's date**, never the envelope's `createdAt`; the envelope totals (assigned, spent, available, exceeded) are the envelopes' current state and are not date-filtered. Available and exceeded are reported separately, never netted.
- `src/payment-methods`: Per-user payment methods (card, cash, transfer) with an optional statement `cutDay` for credit cards. Optional on every expense (`expense.paymentMethodId`, `ON DELETE SET NULL`): a user who never creates one sees no change. Generic on purpose - it is "what was this paid with", independent of how envelopes are organised.
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
- **Rate Limiting**: none in the app, deliberately (owner's decision, 2026-11-16). `@nestjs/throttler` used to be configured but its guard was never registered, so it limited nothing while the docs claimed 60 req/min; it was removed rather than switched on. Why that is safe today: sign-in, sign-up and password reset are Clerk's endpoints and rate-limited by Clerk; the only public route here is `/health-check`, which touches no database; unauthenticated requests are rejected by `ClerkAuthGuard` before any query; and the app has a single user. **Add it when the app gets more users**: a generous per-user limit (tracker keyed on `req.user.id`, not IP - every request arrives from the Next.js server), registered as an `APP_GUARD` after `ClerkAuthGuard` so `req.user` is set.
- **Outbound HTTP**: Node's built-in `fetch` (no HTTP client dependency), used only by the health-check self-ping.
- **Security Headers**: `helmet`, applied globally in `main.ts`.

### Key Patterns
- **Data Mapper**: Repositories are used to decouple business logic from the data access layer.
- **DTOs**: Every request and response is typed using Data Transfer Objects (DTOs) with `class-validator`. Response DTOs expose static `fromEntity`/`fromEntities` factory methods rather than being constructed ad hoc in services.
- **Custom Guards**: Resources are protected using custom guards (e.g., `EnvelopeExistsGuard`, `ExpenseExistsGuard`) to ensure ownership and existence before processing requests. These guards attach the loaded resource to the request (`req.envelope` / `req.expense`) so downstream handlers don't re-fetch it.
- **Envelope `spent` integrity**: `spent` is a stored total, never adjusted by increments. Every expense write (create/update/delete) runs in one transaction that first locks the envelope row (`EnvelopesRepository.findByIdForUpdate`, `SELECT ... FOR UPDATE`), re-reads the expense inside the lock, writes, and then sets `spent = SUM(expense.amount)` (`recalculateSpent`). Concurrent writes on one envelope therefore take turns, and any earlier drift is repaired on the next write.
- **One currency per envelope**: an expense must use its envelope's currency (400 otherwise), and an envelope's currency cannot change once it has expenses (409). `spent` is a sum in that currency.
- **No-Enumeration Errors**: A resource that doesn't exist and one that exists but belongs to another user both resolve to the same `404 NotFoundException` (via `ERROR_MESSAGES`) - never a distinct "unauthorized" response - so IDs can't be enumerated by probing for a different status code.
- **Centralized Error Messages**: User-facing error strings live in `src/common/constants/error-messages.ts` (`ERROR_MESSAGES`) instead of being inlined at each throw site.
- **Pagination**: List endpoints compose the shared `PaginationQueryDto` (`page`/`limit`, `IntersectionType`-style extension) and return a `PaginatedResponseDto`, instead of each module reimplementing offset/limit handling.
- **Auth by Default**: `ClerkAuthGuard` is bound as a global `APP_GUARD`; routes are private unless explicitly marked `@Public()`.
- **Environment Validation**: Config is validated at startup using Zod to ensure all required variables are present.

## Development Guidelines
- **Test Alignment**: When adding new features or modifying existing ones, always review and update the corresponding unit and E2E tests to ensure they match the new implementation and requirements of the module.

