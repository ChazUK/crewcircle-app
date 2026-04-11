# Claude Code Instructions

## UI Components

**Always use HeroUI Native** as the default component library. Do not reach for bare React Native primitives (`View`, `Text`, `TextInput`, `Pressable`, etc.) when a HeroUI Native equivalent exists.

- Import from `heroui-native`, not `react-native`
- Use compound component patterns (e.g. `Card.Header`, `Select.Trigger`)
- Use semantic variants (`primary`, `secondary`, `danger`) — not raw colors
- Styling via Uniwind `className` prop (Tailwind v4 for React Native)
- Use `onPress`, not `onClick`

Refer to the `heroui-native` skill for component docs and patterns.
