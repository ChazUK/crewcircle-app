# ADR-0005: Zod for schema validation

**Status:** Accepted

## Context

Convex's built-in `v` validators enforce types at the function boundary but cannot express richer constraints such as string length limits, URL format, or cross-field rules. A schema validation library was needed to fill this gap without duplicating constraint logic across mutation handlers.

## Decision

**Zod v4** (`zod`) is used for schema validation in Convex mutation and action handlers. It is not used for client-side form validation — form errors on the client come from Clerk (auth flows) or from `ConvexError` thrown by the backend.

Refer to the `zod` skill for usage patterns and examples.

`convex/lib/parseOrConvexError.ts` wraps `schema.safeParse` and throws a `ConvexError` with the first issue's message on failure, so validation errors surface cleanly to the client.

Key conventions:

- **Convex args use `v` validators** for basic type declarations (required for Convex's type generation). Zod is layered on top inside the handler for richer constraints.
- **`parseOrConvexError`** is the standard utility — always use it rather than calling `.parse()` or `.safeParse()` directly in handlers.
- **Zod is server-only** — do not add Zod schemas to client code or form validation; keep the dependency boundary clear.

## Consequences

- Validation errors from Convex functions are `ConvexError` instances, not generic `Error` — clients can distinguish them and surface user-facing messages.
- Zod schemas for a module live alongside its mutations/actions, not in a shared `schemas/` directory.
- Convex's own `v` type system and Zod serve different purposes and are both present; they are not interchangeable.
