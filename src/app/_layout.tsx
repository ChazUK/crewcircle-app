import "../global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { api } from "@convex/_generated/api";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { useMutation, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!publishableKey) throw new Error("Add your Clerk Publishable Key to the .env file");

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;
if (!convexUrl) throw new Error("Add your Convex URL to the .env file");

const convex = new ConvexReactClient(convexUrl);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <RootNavigator />
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isSignedIn, signOut } = useAuth();
  const upsertUser = useMutation(api.users.mutations.upsertUser);
  const currentUser = useQuery(api.users.queries.getCurrentUser, isAuthenticated ? {} : "skip");

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

      if (isSignedIn && !isAuthenticated) signOut();
    }
  }, [isLoading, isSignedIn, isAuthenticated]);

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
    const ready = !isAuthenticated || (isUserReady && currentUser !== undefined);
    if (!isLoading && ready) {
      SplashScreen.hide();
    }
  }, [isLoading, isAuthenticated, isUserReady, currentUser]);

  if (isLoading || (isAuthenticated && (!isUserReady || currentUser === undefined))) return null;

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
