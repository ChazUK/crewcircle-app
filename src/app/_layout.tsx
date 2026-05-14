import "../global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { api } from "@convex/_generated/api";
import * as Sentry from "@sentry/react-native";
import { ConvexReactClient, useAction, useConvexAuth } from "convex/react";
import { useMutation, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import { Stack, useNavigationContainerRef } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppErrorBoundary } from "@/components/ui/AppErrorBoundary";
import { useSentryUser } from "@/hooks/useSentryUser";
import { registerBackgroundSync } from "@/lib/calendars/backgroundSync";
import { syncNativeConnections } from "@/lib/calendars/syncNativeConnections";
import { getDeviceId } from "@/lib/devices/getDeviceId";
import { reportError } from "@/lib/observability/reportError";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN!;
if (!sentryDsn) throw new Error("Add EXPO_PUBLIC_SENTRY_DSN to the .env file");

const sentryEnvironment =
  (Constants.expoConfig?.extra as { sentry?: { environment?: string } } | undefined)?.sentry
    ?.environment ?? "development";

Sentry.init({
  dsn: sentryDsn,
  sendDefaultPii: true,
  enableLogs: true,
  environment: sentryEnvironment,
});

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

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

export default Sentry.wrap(RootLayout);

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <HeroUINativeProvider config={config}>
            <AppErrorBoundary>
              <RootNavigator />
            </AppErrorBoundary>
          </HeroUINativeProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const ref = useNavigationContainerRef();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isSignedIn, signOut } = useAuth();
  useSentryUser();
  const upsertUser = useMutation(api.users.mutations.upsertUser);
  const currentUser = useQuery(api.users.queries.getCurrentUser, isAuthenticated ? {} : "skip");
  const syncNativeOnOpenAction = useAction(api.calendars.actions.syncNativeOnOpen);
  const uploadNativeEventsAction = useAction(api.calendars.uploadNativeEvents.uploadNativeEvents);
  const [isUserReady, setIsUserReady] = useState(false);
  const initialDesyncCheckDone = useRef(false);

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  // Clerk persists its token in SecureStore across relaunches. If Clerk has a
  // session but Convex doesn't recognise it (e.g. the backend was reset), sign
  // out to re-sync both systems before the user interacts with anything.
  // Only check once - when isLoading first settles to false. Checking on every
  // change would incorrectly sign out a user mid-sign-up because isSignedIn
  // (Clerk) flips true before isAuthenticated (Convex) catches up.
  useEffect(() => {
    if (!isLoading && !initialDesyncCheckDone.current) {
      initialDesyncCheckDone.current = true;

      if (isSignedIn && !isAuthenticated)
        signOut().catch((err) => reportError(err, { tags: { area: "auth.signOut" } }));
    }
  }, [isLoading, isSignedIn, isAuthenticated, signOut]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsUserReady(false);
      return;
    }

    upsertUser()
      .then(() => setIsUserReady(true))
      .catch((err) => reportError(err, { tags: { area: "users.upsert" } }));
  }, [isAuthenticated]);

  // Keep the splash visible until auth has resolved AND (if authenticated)
  // both the user record exists and the onboarding status is known.
  useEffect(() => {
    const ready = !isAuthenticated || (isUserReady && currentUser != null);
    if (!isLoading && ready) {
      SplashScreen.hide();
    }
  }, [isLoading, isAuthenticated, isUserReady, currentUser]);

  // Refresh native (on-device) calendar connections on launch and whenever
  // the app returns to the foreground - picks up events the user added in
  // the device calendar app while we were backgrounded. The server-side
  // debounce in `syncNativeOnOpen` skips connections synced within the last
  // 60 seconds, so quick app re-opens don't hammer the device store.
  // When the app returns from background, the Convex WebSocket is still
  // reconnecting - the first action call races the reconnect and fails with
  // "Connection lost while action was in flight". Retry on that specific
  // error with backoff so the foreground sync survives the reconnect window.
  const runNativeOnOpenSync = useCallback(
    async (trigger: "launch" | "foreground") => {
      const isConnectionLost = (err: unknown) =>
        err instanceof Error && err.message.includes("Connection lost");
      const delays = [400, 800, 1600];
      const startedAt = Date.now();
      console.log(`[RootNavigator] native sync starting (trigger=${trigger})`);
      const device = await getDeviceId();
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          const connections = await syncNativeOnOpenAction(
            device ? { deviceId: device.deviceId } : {},
          );
          console.log(
            `[RootNavigator] native sync: server returned ${connections.length} connection(s) to sync (attempt=${attempt + 1})`,
          );
          let uploadedConnections = 0;
          let uploadedEvents = 0;
          await syncNativeConnections(connections, async (connectionId, events) => {
            console.log(
              `[RootNavigator] native sync: uploading ${events.length} event(s) for connection ${connectionId}`,
            );
            await uploadNativeEventsAction({ connectionId, events });
            uploadedConnections += 1;
            uploadedEvents += events.length;
          });
          console.log(
            `[RootNavigator] native sync complete (trigger=${trigger}, connections=${uploadedConnections}, events=${uploadedEvents}, durationMs=${Date.now() - startedAt})`,
          );
          return;
        } catch (err) {
          if (!isConnectionLost(err) || attempt === delays.length) {
            reportError(err, {
              tags: { area: "calendar.nativeSync" },
              extra: { trigger, attempt },
            });
            return;
          }
          console.warn(
            `[RootNavigator] native sync: connection lost, retrying in ${delays[attempt]}ms (attempt=${attempt + 1})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    },
    [syncNativeOnOpenAction, uploadNativeEventsAction],
  );

  useEffect(() => {
    if (!isUserReady) return;
    runNativeOnOpenSync("launch");

    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      console.log(`[RootNavigator] AppState change: ${previousState} -> ${nextState}`);
      if (previousState !== "active" && nextState === "active") runNativeOnOpenSync("foreground");
      previousState = nextState;
    });
    return () => subscription.remove();
  }, [isUserReady, runNativeOnOpenSync]);

  // The background-fetch cron is opt-in: opening the app already triggers a
  // sync, so the cron is only valuable when the app is killed for long
  // stretches. Gate it behind an env flag so it can be disabled per-build.
  useEffect(() => {
    if (!isUserReady) return;
    if (process.env.EXPO_PUBLIC_ENABLE_NATIVE_BACKGROUND_SYNC !== "true") return;
    registerBackgroundSync().catch((err) =>
      reportError(err, { tags: { area: "calendar.backgroundSync" } }),
    );
  }, [isUserReady]);

  if (isLoading || (isAuthenticated && (!isUserReady || currentUser == null))) return null;

  const hasCompletedOnboarding = currentUser?.hasCompletedOnboarding === true;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated && isUserReady && hasCompletedOnboarding}>
        <Stack.Screen name="(home)" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && isUserReady && !hasCompletedOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
