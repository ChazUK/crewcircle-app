import { getClerkInstance } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

import { syncNativeConnections } from "./syncNativeConnections";

export const CALENDAR_BACKGROUND_SYNC_TASK = "CALENDAR_BACKGROUND_SYNC";

// 15 minutes. iOS throttles expo-background-fetch at the OS level — the actual
// invocation cadence is decided by the system based on usage signals, so this
// is a hint, not a guarantee.
const MINIMUM_INTERVAL_SECONDS = 15 * 60;

TaskManager.defineTask(CALENDAR_BACKGROUND_SYNC_TASK, async () => {
  try {
    const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
    const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!convexUrl || !publishableKey) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const clerkInstance = getClerkInstance({ publishableKey });
    const token = await clerkInstance.session?.getToken({ template: "convex" });
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(token);

    const connections = await convex.action(api.calendars.actions.syncNativeOnOpen, {});
    if (connections.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await syncNativeConnections(connections, async (connectionId, events) => {
      await convex.action(api.calendars.uploadNativeEvents.uploadNativeEvents, {
        connectionId,
        events,
      });
    });

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    // Background tasks cannot show UI — swallow errors to keep the OS from
    // back-pressuring the schedule after repeated visible failures.
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(CALENDAR_BACKGROUND_SYNC_TASK);
  if (isRegistered) return;
  await BackgroundFetch.registerTaskAsync(CALENDAR_BACKGROUND_SYNC_TASK, {
    minimumInterval: MINIMUM_INTERVAL_SECONDS,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
