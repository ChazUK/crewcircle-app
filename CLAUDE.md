# Claude Code Instructions

## UI Components

**Always use HeroUI Native** as the default component library. Do not reach for bare React Native primitives (`View`, `Text`, `TextInput`, `Pressable`, etc.) when a HeroUI Native equivalent exists.

- Import from `heroui-native`, not `react-native`
- Use compound component patterns (e.g. `Card.Header`, `Select.Trigger`)
- Use semantic variants (`primary`, `secondary`, `danger`) — not raw colors
- Styling via Uniwind `className` prop (Tailwind v4 for React Native)
- Use `onPress`, not `onClick`

Refer to the `heroui-native` skill for component docs and patterns.

## Forms

**Always use TanStack React Form** (`@tanstack/react-form`) for all form state management. Do not use `useState` to track individual field values or manage form submission state manually.

- Use `useForm` with `defaultValues` and `onSubmit`
- Use `form.Field` render-prop pattern for each field — wire `field.state.value`, `field.handleChange`, and `field.handleBlur` to the HeroUI `Input`
- Use `form.Subscribe` to derive disabled/loading state for submit buttons
- Pair with HeroUI Native `TextField` / `Input` / `FieldError` for rendering

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

## Code Boundaries

The codebase has three distinct runtime zones. Never mix imports across these boundaries:

| Zone         | Directory | May import from                                               |
| ------------ | --------- | ------------------------------------------------------------- |
| Shared types | `types/`  | Nothing — pure TypeScript types only, no runtime dependencies |
| Server       | `convex/` | `@shared/*`, `@convex/_generated/*`, npm packages             |
| Client       | `src/`    | `@shared/*`, `@/*`, `@convex/_generated/*`, npm packages      |

**Rules:**

- `types/` files must contain only type definitions — no `import` of anything with a runtime (no React Native, no Convex functions, no Node built-ins). Use `import type` for any cross-references within `types/`.
- `convex/` must never import from `src/` — server code must not depend on client/device APIs.
- `src/` must never import from `convex/` directly — only via the generated client at `@convex/_generated/`.
- All new shared types (types used by both `convex/` and `src/`) go in `types/` and are imported via `@shared/*`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `ChazUK/crewcircle-app`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## GitHub issue detail standard

When creating implementation issues for autonomous agents, each issue must contain enough context for a simple LLM to implement the ticket
correctly without referring to other files or asking questions.

Include:

- The exact file path(s) to create or modify
- The exact names of functions, types, methods, and fields — as they will appear in code
- The names of indexes, tables, and Convex validators where relevant
- Behavioural descriptions of what each function does, in plain English, step by step
- Which existing files, types, or functions to import or reuse (by name and path)
- Explicit constraints — what must NOT be done and why (e.g. "do not filter here — the service layer does that")
- Cross-references to blocking tickets by number, with a one-line explanation of what the dependency provides
- Test case descriptions as a numbered list of scenarios in plain English — not code, just "given X, expect Y"
- Acceptance criteria as checkboxes

Do not include:

- Code blocks or implementation examples — describe the behaviour, not the syntax
- Architectural rationale that belongs in the PRD — keep issues focused on the task
- Vague instructions like "implement the sync logic" — be specific about every step
- Assumptions about what the agent already knows — state everything explicitly

The test for a good issue: a developer who has never seen this codebase should be able to implement the ticket correctly using only the
issue body and the files referenced within it.

Files that contain a single function/method should be named the same as the function/method name e.g. `sendEmail.ts` for a function called `sendEmail`.

## Stories and tests (default coverage)

When you create a new file, you must also create its companion story or test as part of the same change. Do not defer this; do not ask whether to do it. The rules below are the default — only skip if the user explicitly says so for that file.

### Stories — presentational components

Every new presentational component in `src/components/**` must ship with a sibling `*.stories.tsx`.

A component is "presentational" (story required) if it:

- Renders UI from props only, and
- Does NOT call `useAction` / `useMutation` / `useQuery` from Convex, router hooks, auth hooks, or other side-effectful hooks at the top level.

If a component is connected (uses Convex/router/auth/etc.), no story is required — but factor out a dumb sub-component where it makes sense, and write the story for that.

Story conventions:

- Use the existing harness pattern (see `DisconnectCalendarDialog.stories.tsx` and `ConnectCalendarErrorDialog.stories.tsx`): a `Meta` with `args`, a small harness component if local state is needed, and named exports per variant.
- Cover the meaningful states — default, empty, error, loading, edge values — one named export each.
- Wrap with `GestureHandlerRootView` + `BottomSheetModalProvider` when the component renders into a portal (Dialog, BottomSheet).

### Tests — `convex/` and `src/lib/`

Every new file in `convex/**` (queries, mutations, actions, internal helpers) and every new pure module in `src/lib/**` must ship with a sibling `*.test.ts`.

Skip only:

- Pure type-only files (`*.types.ts`, or files with no runtime exports)
- Generated code (`convex/_generated/**`)
- Barrel/re-export files with no logic

Test conventions:

- Co-locate the test next to the source (`foo.ts` → `foo.test.ts`).
- For Convex functions, follow the patterns in `convex/calendars/queries.test.ts`.
- For lib utilities, follow `src/lib/calendars/*.test.ts` and `src/lib/permissions/*.test.ts`.
- Cover happy path + each branch/error path.

### When in doubt

If you're unsure whether something counts as presentational or whether a `convex/` helper warrants a test, default to writing it. It is much cheaper to delete an unused story/test than to backfill coverage later.

Do not add comments unless they are absolutely necessary.
