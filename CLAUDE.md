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
