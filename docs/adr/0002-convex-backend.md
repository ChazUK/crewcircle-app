# ADR-0002: Convex as the application backend

**Status:** Accepted

## Context

CrewCircle needed a backend that could handle real-time data sync across devices, scheduled jobs, webhook ingestion, and file storage — without requiring the team to operate separate infrastructure for each concern.

## Decision

The application uses **Convex** as its sole backend. All server-side logic, data storage, scheduled jobs, and HTTP endpoints are defined in the `convex/` directory and deployed to Convex's managed cloud.

Key structural choices:

- **Schema** — defined in `convex/schema.ts`, composed from per-module schemas (e.g. `users`, `calendars`, `kit`). All tables are declared here; Convex enforces the schema at runtime.
- **Module layout** — backend code is organised by domain under `convex/` (e.g. `convex/users/`, `convex/calendars/`). Each module owns its schema, queries, mutations, actions, and domain logic.
- **Functions** — queries (read, reactive), mutations (write, transactional), and actions (side-effects, external API calls) are the three function types. The distinction matters: queries run in a reactive context; actions do not and must call mutations to write data.
- **Authentication** — Clerk JWTs are validated by Convex via `convex/auth.config.ts`. The Clerk JWT issuer domain is injected via `CLERK_JWT_ISSUER_DOMAIN`.
- **Webhooks** — Clerk user lifecycle events are received at `POST /webhooks/clerk` (defined in `convex/http.ts`) and processed to keep the `users` table in sync.
- **Scheduled jobs** — `convex/crons.ts` hosts interval-based cron jobs that run on a fixed schedule.
- **File storage** — Convex file storage is used for any binary assets; no separate S3 bucket.
- **Testing** — `convex-test` is used for unit-testing Convex functions in isolation.

## Consequences

- There is no separate REST API, GraphQL layer, or traditional database. All data access goes through Convex functions.
- Client code imports generated types and function references from `convex/_generated/` — never raw strings.
- Before writing any Convex code, read `convex/_generated/ai/guidelines.md` — it contains rules that override general Convex training data.
- Actions cannot directly read or write the database; they must call queries/mutations or use the internal API.
- Real-time reactivity is automatic for queries subscribed to from the client — no websocket plumbing needed.
- Convex environment variables are set on the Convex dashboard, not in `.env` files.
