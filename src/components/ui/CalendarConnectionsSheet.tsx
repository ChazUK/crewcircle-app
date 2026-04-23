import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useAction, useQuery } from "convex/react";
import * as Google from "expo-auth-session/providers/google";
import * as Calendar from "expo-calendar";
import * as WebBrowser from "expo-web-browser";
import {
  BottomSheet,
  Button,
  Chip,
  Description,
  Input,
  Label,
  ListGroup,
  Separator,
  Spinner,
  TextField,
} from "heroui-native";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";

import {
  AppleCalendarIcon,
  GoogleCalendarIcon,
  LinkCalendarIcon,
  OutlookCalendarIcon,
} from "./icons/CalendarProviderIcons";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"];
const APPLE_WINDOW_PAST_DAYS = 30;
const APPLE_WINDOW_FUTURE_DAYS = 180;

type Provider = Doc<"calendarConnections">["provider"];

type SafeConnection = {
  _id: Id<"calendarConnections">;
  provider: Provider;
  label: string;
  lastSyncedAt?: number;
  lastSyncError?: string;
};

type EventInput = {
  externalId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
};

type AddProvider = "ical" | "apple";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const PROVIDER_META: Record<
  Provider,
  { title: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  google: { title: "Google Calendar", Icon: GoogleCalendarIcon },
  apple: { title: "Apple Calendar", Icon: AppleCalendarIcon },
  outlook: { title: "Outlook", Icon: OutlookCalendarIcon },
  ical: { title: "iCal URL", Icon: LinkCalendarIcon },
};

function readEnv(key: string): string | undefined {
  // Env vars that start with EXPO_PUBLIC_ are inlined at build time.
  return (process.env as Record<string, string | undefined>)[key];
}

function formatLastSync(ts?: number): string | undefined {
  if (!ts) return undefined;
  const delta = Date.now() - ts;
  if (delta < 60_000) return "Synced just now";
  if (delta < 3_600_000) return `Synced ${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `Synced ${Math.floor(delta / 3_600_000)}h ago`;
  return `Synced ${new Date(ts).toLocaleDateString()}`;
}

export function CalendarConnectionsSheet({ isOpen, onOpenChange }: Props) {
  const connections = useQuery(api.calendars.queries.listConnections) ?? [];
  const connectIcal = useAction(api.calendars.actions.connectIcal);
  const connectApple = useAction(api.calendars.actions.connectApple);
  const connectGoogleAction = useAction(api.calendars.google.connectGoogle);
  const syncConnection = useAction(api.calendars.actions.syncConnection);
  const disconnect = useAction(api.calendars.actions.disconnect);
  const uploadAppleEvents = useAction(api.calendars.actions.uploadAppleEvents);

  // Reuses the Google OAuth clients configured for Clerk sign-in; requesting the
  // calendar scope here triggers a second consent only for the calendar permission.
  const googleIosClientId = readEnv("EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID");
  const googleAndroidClientId = readEnv("EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID");
  const googleWebClientId = readEnv("EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID");

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    scopes: GOOGLE_SCOPES,
    responseType: "code",
  });

  const [adding, setAdding] = useState<AddProvider | null>(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalLabel, setIcalLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleCalendars, setAppleCalendars] = useState<Calendar.Calendar[]>([]);
  const [applePickerOpen, setApplePickerOpen] = useState(false);

  const resetAddState = useCallback(() => {
    setAdding(null);
    setIcalUrl("");
    setIcalLabel("");
    setApplePickerOpen(false);
    setAppleCalendars([]);
  }, []);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      onOpenChange(value);
      if (!value) {
        resetAddState();
        setError(null);
      }
    },
    [onOpenChange, resetAddState],
  );

  useEffect(() => {
    if (googleResponse?.type !== "success") return;
    const { code } = googleResponse.params;
    const verifier = googleRequest?.codeVerifier;
    const redirectUri = googleRequest?.redirectUri;
    const resolvedClientId =
      Platform.OS === "ios"
        ? googleIosClientId
        : Platform.OS === "android"
          ? googleAndroidClientId
          : googleWebClientId;
    if (!code || !verifier || !redirectUri || !resolvedClientId) return;

    setBusy("google");
    setError(null);
    connectGoogleAction({
      code,
      codeVerifier: verifier,
      clientId: resolvedClientId,
      redirectUri,
    })
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusy(null));
  }, [
    googleResponse,
    googleRequest,
    googleIosClientId,
    googleAndroidClientId,
    googleWebClientId,
    connectGoogleAction,
  ]);

  const handleConnectGoogle = useCallback(async () => {
    setError(null);
    const resolvedClientId =
      Platform.OS === "ios"
        ? googleIosClientId
        : Platform.OS === "android"
          ? googleAndroidClientId
          : googleWebClientId;
    if (!resolvedClientId) {
      setError(
        "Google OAuth client IDs are missing. Set EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID / _ANDROID_CLIENT_ID / _WEB_CLIENT_ID in your env.",
      );
      return;
    }
    if (!googleRequest) return;
    try {
      await promptGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch Google sign-in");
    }
  }, [googleIosClientId, googleAndroidClientId, googleWebClientId, googleRequest, promptGoogle]);

  const handleConnectIcal = useCallback(async () => {
    const trimmed = icalUrl.trim();
    if (!trimmed) return;
    setBusy("ical");
    setError(null);
    try {
      await connectIcal({ url: trimmed, label: icalLabel.trim() || undefined });
      resetAddState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe to calendar");
    } finally {
      setBusy(null);
    }
  }, [icalUrl, icalLabel, connectIcal, resetAddState]);

  const handleStartApple = useCallback(async () => {
    setError(null);
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (permission.status !== "granted") {
      setError("Calendar permission is required to connect Apple Calendar.");
      return;
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (calendars.length === 0) {
      setError("No calendars found on this device.");
      return;
    }
    setAppleCalendars(calendars);
    setAdding("apple");
    setApplePickerOpen(true);
  }, []);

  const handlePickAppleCalendar = useCallback(
    async (calendar: Calendar.Calendar) => {
      setBusy("apple");
      setError(null);
      try {
        const now = Date.now();
        const start = new Date(now - APPLE_WINDOW_PAST_DAYS * 86400_000);
        const end = new Date(now + APPLE_WINDOW_FUTURE_DAYS * 86400_000);
        const nativeEvents = await Calendar.getEventsAsync([calendar.id], start, end);
        const events: EventInput[] = nativeEvents.map((event) => ({
          externalId: event.id,
          title: event.title || "(No title)",
          description: event.notes || undefined,
          location: event.location || undefined,
          startsAt: new Date(event.startDate).getTime(),
          endsAt: new Date(event.endDate).getTime(),
          isAllDay: Boolean(event.allDay),
        }));
        await connectApple({
          label: calendar.title,
          localCalendarId: calendar.id,
          events,
        });
        resetAddState();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect Apple Calendar");
      } finally {
        setBusy(null);
      }
    },
    [connectApple, resetAddState],
  );

  const handleDisconnect = useCallback(
    (connection: SafeConnection) => {
      Alert.alert(
        "Disconnect calendar",
        `Remove "${connection.label}" and its events from your diary?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: async () => {
              setBusy(connection._id);
              try {
                await disconnect({ connectionId: connection._id });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to disconnect");
              } finally {
                setBusy(null);
              }
            },
          },
        ],
      );
    },
    [disconnect],
  );

  const handleRefresh = useCallback(
    async (connection: SafeConnection) => {
      setBusy(connection._id);
      setError(null);
      try {
        if (connection.provider === "apple" && connection.lastSyncedAt != null) {
          // Re-read from the device and push to Convex
          const permission = await Calendar.requestCalendarPermissionsAsync();
          if (permission.status !== "granted") {
            throw new Error("Calendar permission is required");
          }
          const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
          const pick = calendars.find((c) => {
            // We don't know localCalendarId here without re-querying; fall back to label match
            return c.title === connection.label;
          });
          if (!pick) throw new Error("Original calendar no longer exists on this device");
          const now = Date.now();
          const start = new Date(now - APPLE_WINDOW_PAST_DAYS * 86400_000);
          const end = new Date(now + APPLE_WINDOW_FUTURE_DAYS * 86400_000);
          const nativeEvents = await Calendar.getEventsAsync([pick.id], start, end);
          const events: EventInput[] = nativeEvents.map((event) => ({
            externalId: event.id,
            title: event.title || "(No title)",
            description: event.notes || undefined,
            location: event.location || undefined,
            startsAt: new Date(event.startDate).getTime(),
            endsAt: new Date(event.endDate).getTime(),
            isAllDay: Boolean(event.allDay),
          }));
          await uploadAppleEvents({ connectionId: connection._id, events });
        } else {
          await syncConnection({ connectionId: connection._id });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refresh failed");
      } finally {
        setBusy(null);
      }
    },
    [syncConnection, uploadAppleEvents],
  );

  const handleOutlook = useCallback(() => {
    Alert.alert(
      "Outlook coming soon",
      "Microsoft calendar support isn't wired up yet. Use an iCal subscription URL in the meantime.",
    );
  }, []);

  const addTiles = useMemo(
    () => [
      {
        key: "google" as const,
        title: "Google Calendar",
        Icon: GoogleCalendarIcon,
        onPress: handleConnectGoogle,
      },
      {
        key: "apple" as const,
        title: "Apple Calendar",
        Icon: AppleCalendarIcon,
        onPress: handleStartApple,
      },
      {
        key: "outlook" as const,
        title: "Outlook",
        Icon: OutlookCalendarIcon,
        onPress: handleOutlook,
      },
      {
        key: "ical" as const,
        title: "iCal / .ics URL",
        Icon: LinkCalendarIcon,
        onPress: () => setAdding("ical"),
      },
    ],
    [handleConnectGoogle, handleStartApple, handleOutlook],
  );

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={handleOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={["65%", "90%"]} keyboardBehavior="extend">
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <View className="mb-4 gap-1.5 px-1">
              <BottomSheet.Title>Calendars</BottomSheet.Title>
              <BottomSheet.Description>
                Connect as many calendars as you like — including multiple of the same type.
              </BottomSheet.Description>
            </View>

            {error != null && (
              <View className="mb-3 rounded-xl bg-danger/10 p-3">
                <Text className="text-sm text-danger">{error}</Text>
              </View>
            )}

            {connections.length > 0 && (
              <View className="mb-4">
                <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Connected
                </Text>
                <ListGroup>
                  {connections.map((connection, index) => {
                    const meta = PROVIDER_META[connection.provider];
                    const subtitle =
                      connection.lastSyncError ??
                      formatLastSync(connection.lastSyncedAt) ??
                      "Not synced yet";
                    const isBusy = busy === connection._id;
                    return (
                      <Fragment key={connection._id}>
                        {index > 0 && <Separator className="mx-4" />}
                        <ListGroup.Item onPress={() => handleRefresh(connection)}>
                          <ListGroup.ItemPrefix>
                            <meta.Icon size={32} />
                          </ListGroup.ItemPrefix>
                          <ListGroup.ItemContent>
                            <ListGroup.ItemTitle numberOfLines={1}>
                              {connection.label}
                            </ListGroup.ItemTitle>
                            <ListGroup.ItemDescription numberOfLines={1}>
                              {isBusy ? "Syncing…" : subtitle}
                            </ListGroup.ItemDescription>
                          </ListGroup.ItemContent>
                          <ListGroup.ItemSuffix>
                            {isBusy ? (
                              <Spinner size="sm" />
                            ) : (
                              <Chip
                                variant="soft"
                                color="danger"
                                size="sm"
                                onPress={() => handleDisconnect(connection)}
                              >
                                Remove
                              </Chip>
                            )}
                          </ListGroup.ItemSuffix>
                        </ListGroup.Item>
                      </Fragment>
                    );
                  })}
                </ListGroup>
              </View>
            )}

            <View className="mb-3">
              <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Add calendar
              </Text>
              <ListGroup>
                {addTiles.map((tile, index) => {
                  const isBusy = busy === tile.key;
                  return (
                    <Fragment key={tile.key}>
                      {index > 0 && <Separator className="mx-4" />}
                      <ListGroup.Item onPress={tile.onPress} disabled={isBusy}>
                        <ListGroup.ItemPrefix>
                          <tile.Icon size={32} />
                        </ListGroup.ItemPrefix>
                        <ListGroup.ItemContent>
                          <ListGroup.ItemTitle>{tile.title}</ListGroup.ItemTitle>
                        </ListGroup.ItemContent>
                        <ListGroup.ItemSuffix>
                          {isBusy ? <Spinner size="sm" /> : null}
                        </ListGroup.ItemSuffix>
                      </ListGroup.Item>
                    </Fragment>
                  );
                })}
              </ListGroup>
            </View>

            {adding === "ical" && (
              <View className="mt-2 gap-3 px-1">
                <TextField>
                  <Label>iCal feed URL</Label>
                  <Input
                    placeholder="https://example.com/calendar.ics"
                    value={icalUrl}
                    onChangeText={setIcalUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </TextField>
                <TextField>
                  <Label>Label (optional)</Label>
                  <Input
                    placeholder="Work, Family, etc."
                    value={icalLabel}
                    onChangeText={setIcalLabel}
                    autoCorrect={false}
                  />
                  <Description>
                    Shown in your calendar list. Leave blank to use the feed's hostname.
                  </Description>
                </TextField>
                <View className="flex-row justify-end gap-2">
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={() => resetAddState()}
                    isDisabled={busy === "ical"}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onPress={handleConnectIcal}
                    isDisabled={busy === "ical" || icalUrl.trim().length === 0}
                  >
                    {busy === "ical" ? "Subscribing…" : "Subscribe"}
                  </Button>
                </View>
              </View>
            )}

            {adding === "apple" && applePickerOpen && (
              <View className="mt-2 gap-2 px-1">
                <Text className="text-xs font-semibold uppercase text-muted-foreground">
                  Choose a calendar
                </Text>
                <ListGroup>
                  {appleCalendars.map((cal, index) => (
                    <Fragment key={cal.id}>
                      {index > 0 && <Separator className="mx-4" />}
                      <ListGroup.Item
                        onPress={() => handlePickAppleCalendar(cal)}
                        disabled={busy === "apple"}
                      >
                        <ListGroup.ItemContent>
                          <ListGroup.ItemTitle>{cal.title}</ListGroup.ItemTitle>
                          {cal.source?.name ? (
                            <ListGroup.ItemDescription numberOfLines={1}>
                              {cal.source.name}
                            </ListGroup.ItemDescription>
                          ) : null}
                        </ListGroup.ItemContent>
                        <ListGroup.ItemSuffix>
                          {busy === "apple" ? <Spinner size="sm" /> : null}
                        </ListGroup.ItemSuffix>
                      </ListGroup.Item>
                    </Fragment>
                  ))}
                </ListGroup>
                <View className="flex-row justify-end">
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={resetAddState}
                    isDisabled={busy === "apple"}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            )}

            <Text className="mt-4 text-sm text-muted-foreground">
              We never share event details with your circles — only whether you're free or busy.
            </Text>

            <View className="mt-6">
              <Button variant="secondary" onPress={() => onOpenChange(false)}>
                Done
              </Button>
            </View>
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
