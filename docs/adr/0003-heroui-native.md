# ADR-0003: HeroUI Native as the UI component library

**Status:** Accepted

## Context

CrewCircle needed a React Native component library that provides accessible, consistently styled UI primitives without requiring the team to build and maintain them from scratch. The library needed to integrate with a Tailwind-based styling system and support compound component patterns suitable for complex mobile UIs.

## Decision

The application uses **HeroUI Native** (`heroui-native`) as its sole UI component library, paired with **Uniwind** for styling.

Key structural choices:

- **No bare primitives** — `View`, `Text`, `TextInput`, `Pressable`, and other bare React Native primitives are not used directly when a HeroUI Native equivalent exists. Import from `heroui-native`, not `react-native`.
- **Compound components** — HeroUI Native uses a compound component pattern (e.g. `Card.Header`, `Select.Trigger`, `Button.StartContent`). Use these sub-components rather than trying to replicate layout manually.
- **Semantic variants** — use semantic variant props (`primary`, `secondary`, `danger`, `success`) rather than raw color values. This keeps components consistent with the theme.
- **Styling via Uniwind** — all custom styling is applied via the `className` prop using Tailwind v4 utility classes (provided by Uniwind). `StyleSheet` is not used.
- **Provider setup** — `HeroUINativeProvider` wraps the root layout in `src/app/_layout.tsx`, configured via `HeroUINativeConfig`.
- **Global CSS** — `src/global.css` imports `tailwindcss`, `uniwind`, and `heroui-native/styles`, and adds `heroui-native/lib` as a Tailwind source so component class names are included in the generated stylesheet.
- **Events** — use `onPress`, not `onClick`.

## Consequences

- Always check HeroUI Native docs (via the `heroui-native` MCP or skill) before reaching for a bare primitive — the component likely already exists.
- Component APIs follow the HeroUI Native (Beta) spec, which may have breaking changes between versions.
- Theme customisation is done via HeroUI Native theme variables, not by overriding Tailwind base styles directly.
- The `heroui-native` skill provides component docs and usage patterns and should be consulted when implementing UI.
