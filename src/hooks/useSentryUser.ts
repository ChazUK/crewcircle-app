import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { useEffect } from "react";

export function useSentryUser(): void {
  const { userId } = useAuth();

  useEffect(() => {
    if (userId != null) {
      Sentry.setUser({ id: userId });
    } else {
      Sentry.setUser(null);
    }
  }, [userId]);
}
