# ADR-0001: Expo and React Native as the mobile platform

**Status:** Accepted

## Context

CrewCircle is a mobile-first application targeting iOS and Android. The team needed a cross-platform framework that allows sharing business logic and UI across both platforms from a single codebase.

## Decision

The application is built with **React Native** and **Expo**, using **Expo Router** (file-based routing on top of React Navigation) as the navigation layer.

Key platform choices that follow from this:

- **File-based routing** — screens live under `src/app/` and follow Expo Router conventions (layouts in `_layout.tsx`, dynamic segments as `[param].tsx`, etc.)
- **Native modules** — accessed via Expo SDK packages (`expo-calendar`, `expo-image-picker`, `expo-auth-session`, etc.) rather than bare React Native community modules where an Expo equivalent exists
- **Dev workflow** — Only uses native builds via `expo run:ios` / `expo run:android` and does not use Expo Go
- **Styling** — Uniwind (Tailwind v4 for React Native) via `className` props, not `StyleSheet`
- **Animations** — React Native Reanimated 4 and React Native Gesture Handler

## Consequences

- All UI must be React Native-compatible. Web-only APIs (`window`, `document`, DOM events) are not available.
- Use `onPress`, not `onClick`.
- Navigation is performed via Expo Router's `<Link>` component or the `router` imperative API — not `react-router` or `next/router`.
- Native capability gaps (e.g. background tasks, push notifications) are filled by Expo SDK packages first; bare `react-native-*` community modules are a fallback when no Expo equivalent exists.
- The app targets iOS and Android only — there is no web build.
