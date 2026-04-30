import { useAuth } from "@clerk/expo";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL!;

export function useIcalDownload() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const download = useCallback(
    async (jobId: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken({ template: "convex" });
        if (!token) throw new Error("Not authenticated");

        const url = `${CONVEX_URL}/calendar/event/${jobId}.ics`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) throw new Error("Not authenticated");
        if (response.status === 403) throw new Error("Access denied");
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);

        const icsContent = await response.text();
        const fileUri = `${FileSystem.cacheDirectory}event-${jobId}.ics`;
        await FileSystem.writeAsStringAsync(fileUri, icsContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        await Sharing.shareAsync(fileUri, {
          mimeType: "text/calendar",
          dialogTitle: "Open with...",
        });
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  return { download, loading, error };
}
