import "../global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { api } from "@convex/api";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useState } from "react";
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
  const upsertUser = useMutation(api.users.mutations.upsertUser);

  // True once the user record has been created/confirmed in the database.
  // Prevents routing to protected screens before the user doc exists.
  const [isUserReady, setIsUserReady] = useState(false);

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
  // the user record is confirmed to exist.
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || isUserReady)) {
      SplashScreen.hide();
    }
  }, [isLoading, isAuthenticated, isUserReady]);

  // Render nothing while loading or while the user record is being created,
  // so the splash screen remains visible rather than flashing a blank screen.
  if (isLoading || (isAuthenticated && !isUserReady)) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated && isUserReady}>
        <Stack.Screen name="(home)" />
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
