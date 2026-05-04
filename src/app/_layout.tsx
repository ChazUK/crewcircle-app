import "../global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { api } from "@convex/_generated/api";
import { ConvexReactClient, useAction, useConvexAuth } from "convex/react";
import { useMutation, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppErrorBoundary } from "@/components/ui/AppErrorBoundary";
import { registerBackgroundSync } from "@/lib/calendars/backgroundSync";
import { syncNativeConnections } from "@/lib/calendars/syncNativeConnections";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!publishableKey) throw new Error("Add your Clerk Publishable Key to the .env file");

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;
if (!convexUrl) throw new Error("Add your Convex URL to the .env file");

const convex = new ConvexReactClient(convexUrl);

const config: HeroUINativeConfig = {
  devInfo: {
    stylingPrinciples: false,
  },
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={config}>
        <AppErrorBoundary>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <RootNavigator />
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </AppErrorBoundary>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isSignedIn, signOut } = useAuth();
  const upsertUser = useMutation(api.users.mutations.upsertUser);
  const currentUser = useQuery(api.users.queries.getCurrentUser, isAuthenticated ? {} : "skip");
  const syncNativeOnOpenAction = useAction(api.calendars.actions.syncNativeOnOpen);
  const uploadNativeEventsAction = useAction(api.calendars.uploadNativeEvents);

  const [isUserReady, setIsUserReady] = useState(false);

  // Clerk persists its token in SecureStore across relaunches. If Clerk has a
  // session but Convex doesn't recognise it (e.g. the backend was reset), sign
  // out to re-sync both systems before the user interacts with anything.
  // Only check once — when isLoading first settles to false. Checking on every
  // change would incorrectly sign out a user mid-sign-up because isSignedIn
  // (Clerk) flips true before isAuthenticated (Convex) catches up.
  const initialDesyncCheckDone = useRef(false);
  useEffect(() => {
    if (!isLoading && !initialDesyncCheckDone.current) {
      initialDesyncCheckDone.current = true;

      if (isSignedIn && !isAuthenticated)
        signOut().catch((err) => console.error("Failed to sign out stale Clerk session:", err));
    }
  }, [isLoading, isSignedIn, isAuthenticated, signOut]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsUserReady(false);
      return;
    }

    upsertUser()
      .then(() => setIsUserReady(true))
      .catch((err) => console.error("Failed to upsert user:", err));
  }, [isAuthenticated]);

  // Keep the splash visible until auth has resolved AND (if authenticated)
  // both the user record exists and the onboarding status is known.
  useEffect(() => {
    const ready = !isAuthenticated || (isUserReady && currentUser != null);
    if (!isLoading && ready) {
      SplashScreen.hide();
    }
  }, [isLoading, isAuthenticated, isUserReady, currentUser]);

  // Refresh native (on-device) calendar connections whenever the app comes
  // back to the foreground. The server-side debounce in `syncNativeOnOpen`
  // skips connections synced within the last 60 seconds, so quick app
  // re-opens don't hammer the device store.
  useEffect(() => {
    if (!isUserReady) return;
    syncNativeOnOpenAction({})
      .then((connections) =>
        syncNativeConnections(connections, async (connectionId, events) => {
          await uploadNativeEventsAction({ connectionId, events });
        }),
      )
      .catch((err) => console.error("[RootNavigator] native on-open sync failed", err));
  }, [isUserReady, syncNativeOnOpenAction, uploadNativeEventsAction]);

  // The background-fetch cron is opt-in: opening the app already triggers a
  // sync, so the cron is only valuable when the app is killed for long
  // stretches. Gate it behind an env flag so it can be disabled per-build.
  useEffect(() => {
    if (!isUserReady) return;
    if (process.env.EXPO_PUBLIC_ENABLE_NATIVE_BACKGROUND_SYNC !== "true") return;
    registerBackgroundSync().catch((err) =>
      console.error("[RootNavigator] failed to register background sync", err),
    );
  }, [isUserReady]);

  if (isLoading || (isAuthenticated && (!isUserReady || currentUser == null))) return null;

  const hasCompletedOnboarding = currentUser?.hasCompletedOnboarding === true;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated && isUserReady && hasCompletedOnboarding}>
        <Stack.Screen name="(home)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && isUserReady && !hasCompletedOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="storybook" />
      </Stack.Protected>
    </Stack>
  );
}
