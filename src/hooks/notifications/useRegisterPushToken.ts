import { useAuth } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

import { isNotificationsPermissionGranted } from "@/lib/permissions/isNotificationsPermissionGranted";

export const useRegisterPushToken = () => {
  const { isSignedIn } = useAuth();
  const registerPushToken = useMutation(api.users.mutations.registerPushToken);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    const run = async () => {
      try {
        const granted = await isNotificationsPermissionGranted();
        if (!granted) return;
        const { data: token } = await Notifications.getExpoPushTokenAsync();
        if (cancelled || !token) return;
        if (lastTokenRef.current === token) return;
        await registerPushToken({ token });
        lastTokenRef.current = token;
      } catch (err) {
        console.warn("Failed to register push token", err);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, registerPushToken]);
};
