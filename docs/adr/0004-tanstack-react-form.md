# ADR-0004: TanStack React Form for form state management

**Status:** Accepted

## Context

Forms in the app need to track field values, submission state, and loading/disabled conditions. Using `useState` for each field leads to scattered state, error-prone wiring, and boilerplate submit handlers. A dedicated form library was chosen to standardise this across all screens.

## Decision

All form state is managed with **TanStack React Form** (`@tanstack/react-form`). `useState` must not be used to track individual field values or submission state.

Refer to the `tanstack-form` skill for usage patterns and examples.

Key conventions:

- **`useForm`** — always provide `defaultValues` and `onSubmit`
- **`form.Field`** render-prop — wire `field.state.value`, `field.handleChange`, and `field.handleBlur` to the HeroUI Native `Input`
- **`form.Subscribe`** — derive disabled/loading state for submit buttons; never read `form.state` directly in the component body as it won't re-render correctly
- **HeroUI Native pairing** — use `TextField`, `Input`, `Label`, and `FieldError` as the rendering layer for each field

## Consequences

- No `useState` for field values or submit loading flags anywhere in the codebase.
- External validation errors (e.g. from Clerk or Convex) are surfaced alongside field state but managed separately — TanStack Form does not own them.
- `form.reset()` should be called on screen unmount.
