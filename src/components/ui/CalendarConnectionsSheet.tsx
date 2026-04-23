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
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";

import {
  AppleCalendarIcon,
  GoogleCalendarIcon,
  LinkCalendarIcon,
  OutlookCalendarIcon,
} from "./icons/CalendarProviderIcons";
import { SubCalendarPickerSheet, type SubCalendarOption } from "./SubCalendarPickerSheet";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"];
const APPLE_WINDOW_PAST_DAYS = 30;
const APPLE_WINDOW_FUTURE_DAYS = 180;

// Reuses Clerk's Google OAuth clients; must be literal property access so
// babel-preset-expo can inline the values at build time.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID;

type Provider = Doc<"calendarConnections">["provider"];

type SafeConnection = {
  _id: Id<"calendarConnections">;
  provider: Provider;
  label: string;
  enabledSubCalendarIds?: string[];
  lastSyncedAt?: number;
  lastSyncError?: string;
};

type EventInput = {
  externalId: string;
  subCalendarId?: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
};

type AddProvider = "ical";

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

function formatLastSync(ts?: number): string | undefined {
  if (!ts) return undefined;
  const delta = Date.now() - ts;
  if (delta < 60_000) return "Synced just now";
  if (delta < 3_600_000) return `Synced ${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `Synced ${Math.floor(delta / 3_600_000)}h ago`;
  return `Synced ${new Date(ts).toLocaleDateString()}`;
}

async function readAppleEvents(subCalendarIds: string[]): Promise<EventInput[]> {
  const start = new Date(Date.now() - APPLE_WINDOW_PAST_DAYS * 86_400_000);
  const end = new Date(Date.now() + APPLE_WINDOW_FUTURE_DAYS * 86_400_000);
  const events: EventInput[] = [];
  for (const calId of subCalendarIds) {
    const native = await Calendar.getEventsAsync([calId], start, end);
    for (const event of native) {
      events.push({
        externalId: `${calId}::${event.id}`,
        subCalendarId: calId,
        title: event.title || "(No title)",
        description: event.notes || undefined,
        location: event.location || undefined,
        startsAt: new Date(event.startDate).getTime(),
        endsAt: new Date(event.endDate).getTime(),
        isAllDay: Boolean(event.allDay),
      });
    }
  }
  return events;
}

export function CalendarConnectionsSheet({ isOpen, onOpenChange }: Props) {
  const connections = useQuery(api.calendars.queries.listConnections) ?? [];
  const connectIcal = useAction(api.calendars.actions.connectIcal);
  const connectApple = useAction(api.calendars.actions.connectApple);
  const connectGoogleAction = useAction(api.calendars.google.connectGoogle);
  const listGoogleCalendars = useAction(api.calendars.google.listGoogleCalendars);
  const syncConnection = useAction(api.calendars.actions.syncConnection);
  const setEnabledSubCalendars = useAction(api.calendars.actions.setEnabledSubCalendars);
  const disconnect = useAction(api.calendars.actions.disconnect);
  const uploadAppleEvents = useAction(api.calendars.actions.uploadAppleEvents);

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: GOOGLE_SCOPES,
    responseType: "code",
    shouldAutoExchangeCode: false,
  });

  const [adding, setAdding] = useState<AddProvider | null>(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalLabel, setIcalLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleDeviceCalendars, setAppleDeviceCalendars] = useState<Calendar.Calendar[]>([]);
  const [applePickerOpen, setApplePickerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"calendarConnections"> | null>(null);
  // State backing the "Manage calendars" picker — reused for Google + Apple.
  const [managePickerOpen, setManagePickerOpen] = useState(false);
  const [managePickerConnection, setManagePickerConnection] = useState<{
    connectionId: Id<"calendarConnections">;
    provider: Provider;
  } | null>(null);
  const [managePickerOptions, setManagePickerOptions] = useState<SubCalendarOption[]>([]);
  const [managePickerInitial, setManagePickerInitial] = useState<string[]>([]);

  const consumedGoogleCodeRef = useRef<string | null>(null);
  const googleAuthSnapshotRef = useRef<{
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
  } | null>(null);

  const resetAddState = useCallback(() => {
    setAdding(null);
    setIcalUrl("");
    setIcalLabel("");
    setAppleDeviceCalendars([]);
    setApplePickerOpen(false);
  }, []);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      onOpenChange(value);
      if (!value) {
        resetAddState();
        setError(null);
        setExpandedId(null);
      }
    },
    [onOpenChange, resetAddState],
  );

  const openManagePicker = useCallback(
    async (args: {
      connectionId: Id<"calendarConnections">;
      provider: Provider;
      currentIds: string[];
    }) => {
      if (args.provider === "ical" || args.provider === "outlook") return;
      setError(null);
      setBusy(args.connectionId);
      try {
        let options: SubCalendarOption[] = [];
        if (args.provider === "google") {
          const items = await listGoogleCalendars({ connectionId: args.connectionId });
          options = items.map((item) => ({
            id: item.id,
            label: item.label,
            hint: item.primary ? "Primary" : item.accessRole,
          }));
        } else if (args.provider === "apple") {
          const permission = await Calendar.requestCalendarPermissionsAsync();
          if (permission.status !== "granted") {
            throw new Error("Calendar permission is required");
          }
          const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
          options = calendars.map((c) => ({
            id: c.id,
            label: c.title,
            hint: c.source?.name,
          }));
        }
        setManagePickerOptions(options);
        setManagePickerInitial(args.currentIds);
        setManagePickerConnection({ connectionId: args.connectionId, provider: args.provider });
        setManagePickerOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calendars");
      } finally {
        setBusy(null);
      }
    },
    [listGoogleCalendars],
  );

  const handleConfirmManage = useCallback(
    async (pickedIds: string[]) => {
      const target = managePickerConnection;
      if (!target) return;
      await setEnabledSubCalendars({
        connectionId: target.connectionId,
        enabledSubCalendarIds: pickedIds,
      });
      if (target.provider === "apple") {
        // For Apple the server can't sync on its own; push events from the device.
        const events = await readAppleEvents(pickedIds);
        await uploadAppleEvents({ connectionId: target.connectionId, events });
      }
      setManagePickerOpen(false);
    },
    [managePickerConnection, setEnabledSubCalendars, uploadAppleEvents],
  );

  useEffect(() => {
    if (googleResponse?.type !== "success") return;
    const { code } = googleResponse.params;
    const snapshot = googleAuthSnapshotRef.current;
    if (!code || !snapshot) return;
    if (consumedGoogleCodeRef.current === code) return;
    consumedGoogleCodeRef.current = code;

    (async () => {
      setBusy("google");
      setError(null);
      try {
        const connectionId = await connectGoogleAction({
          code,
          codeVerifier: snapshot.codeVerifier,
          clientId: snapshot.clientId,
          redirectUri: snapshot.redirectUri,
        });
        // After Google returns tokens, surface its sub-calendars so the user
        // can pick which ones to actually sync. Defaults to "primary" (what
        // connectGoogle enabled during its initial sync).
        await openManagePicker({
          connectionId,
          provider: "google",
          currentIds: ["primary"],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Google connection failed";
        setError(`${message} — redirect_uri=${snapshot.redirectUri}`);
      } finally {
        setBusy(null);
      }
    })();
  }, [googleResponse, connectGoogleAction, openManagePicker]);

  const handleConnectGoogle = useCallback(async () => {
    setError(null);
    const resolvedClientId =
      Platform.OS === "ios"
        ? GOOGLE_IOS_CLIENT_ID
        : Platform.OS === "android"
          ? GOOGLE_ANDROID_CLIENT_ID
          : GOOGLE_WEB_CLIENT_ID;
    if (!resolvedClientId) {
      setError(
        "Google OAuth client IDs are missing. Set EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID / _ANDROID_CLIENT_ID / _WEB_CLIENT_ID in your env.",
      );
      return;
    }
    if (!googleRequest?.codeVerifier || !googleRequest.redirectUri) {
      setError("Google OAuth request not ready yet — try again in a moment.");
      return;
    }
    googleAuthSnapshotRef.current = {
      codeVerifier: googleRequest.codeVerifier,
      redirectUri: googleRequest.redirectUri,
      clientId: resolvedClientId,
    };
    try {
      await promptGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch Google sign-in");
    }
  }, [googleRequest, promptGoogle]);

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
    setAppleDeviceCalendars(calendars);
    setApplePickerOpen(true);
  }, []);

  const handleConfirmApple = useCallback(
    async (pickedIds: string[]) => {
      const events = await readAppleEvents(pickedIds);
      await connectApple({
        label: "Apple Calendar",
        enabledSubCalendarIds: pickedIds,
        events,
      });
      setApplePickerOpen(false);
      setAppleDeviceCalendars([]);
    },
    [connectApple],
  );

  const handleToggleExpand = useCallback((connection: SafeConnection) => {
    setExpandedId((current) => (current === connection._id ? null : connection._id));
  }, []);

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
                if (expandedId === connection._id) setExpandedId(null);
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
    [disconnect, expandedId],
  );

  const handleRefresh = useCallback(
    async (connection: SafeConnection) => {
      setBusy(connection._id);
      setError(null);
      try {
        if (connection.provider === "apple") {
          const ids = connection.enabledSubCalendarIds ?? [];
          if (ids.length === 0) {
            throw new Error("No calendars selected for this Apple connection");
          }
          const events = await readAppleEvents(ids);
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

  const applePickerOptions = useMemo<SubCalendarOption[]>(
    () =>
      appleDeviceCalendars.map((cal) => ({
        id: cal.id,
        label: cal.title,
        hint: cal.source?.name,
      })),
    [appleDeviceCalendars],
  );

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
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={["65%", "90%"]} keyboardBehavior="extend">
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <View className="mb-4 gap-1.5 px-1">
              <BottomSheet.Title>Calendars</BottomSheet.Title>
              <BottomSheet.Description>
                Connect as many calendars as you like. Tap any connection to toggle its
                sub-calendars.
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
                    const isBusyRow = busy === connection._id;
                    const isExpanded = expandedId === connection._id;
                    const hasSubCalendars =
                      connection.provider === "google" || connection.provider === "apple";

                    return (
                      <Fragment key={connection._id}>
                        {index > 0 && <Separator className="mx-4" />}
                        <ListGroup.Item onPress={() => handleToggleExpand(connection)}>
                          <ListGroup.ItemPrefix>
                            <meta.Icon size={32} />
                          </ListGroup.ItemPrefix>
                          <ListGroup.ItemContent>
                            <ListGroup.ItemTitle numberOfLines={1}>
                              {connection.label}
                            </ListGroup.ItemTitle>
                            <ListGroup.ItemDescription numberOfLines={1}>
                              {isBusyRow ? "Working…" : subtitle}
                            </ListGroup.ItemDescription>
                          </ListGroup.ItemContent>
                          <ListGroup.ItemSuffix>
                            {isBusyRow ? (
                              <Spinner size="sm" />
                            ) : (
                              <Text className="text-lg text-foreground/60">
                                {isExpanded ? "▾" : "▸"}
                              </Text>
                            )}
                          </ListGroup.ItemSuffix>
                        </ListGroup.Item>

                        {isExpanded && (
                          <View className="gap-2 bg-default-100/40 px-4 py-3">
                            {connection.provider === "ical" ? (
                              <Text className="text-sm text-muted-foreground">
                                iCal feeds are a single subscription — no sub-calendars to pick.
                              </Text>
                            ) : connection.provider === "outlook" ? (
                              <Text className="text-sm text-muted-foreground">
                                Outlook support isn't wired up yet.
                              </Text>
                            ) : (
                              <Text className="text-sm text-muted-foreground">
                                {(connection.enabledSubCalendarIds?.length ?? 0) === 0
                                  ? "No sub-calendars selected yet."
                                  : `${connection.enabledSubCalendarIds?.length} sub-calendar${
                                      connection.enabledSubCalendarIds?.length === 1 ? "" : "s"
                                    } syncing.`}
                              </Text>
                            )}

                            <View className="mt-2 flex-row justify-end gap-2">
                              <Chip
                                variant="soft"
                                color="default"
                                size="sm"
                                onPress={() => handleRefresh(connection)}
                              >
                                Refresh
                              </Chip>
                              {hasSubCalendars && (
                                <Chip
                                  variant="soft"
                                  color="accent"
                                  size="sm"
                                  onPress={() =>
                                    openManagePicker({
                                      connectionId: connection._id,
                                      provider: connection.provider,
                                      currentIds: connection.enabledSubCalendarIds ?? [],
                                    })
                                  }
                                >
                                  Manage
                                </Chip>
                              )}
                              <Chip
                                variant="soft"
                                color="danger"
                                size="sm"
                                onPress={() => handleDisconnect(connection)}
                              >
                                Remove
                              </Chip>
                            </View>
                          </View>
                        )}
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
                  const isBusyTile = busy === tile.key;
                  return (
                    <Fragment key={tile.key}>
                      {index > 0 && <Separator className="mx-4" />}
                      <ListGroup.Item onPress={tile.onPress} disabled={isBusyTile}>
                        <ListGroup.ItemPrefix>
                          <tile.Icon size={32} />
                        </ListGroup.ItemPrefix>
                        <ListGroup.ItemContent>
                          <ListGroup.ItemTitle>{tile.title}</ListGroup.ItemTitle>
                        </ListGroup.ItemContent>
                        <ListGroup.ItemSuffix>
                          {isBusyTile ? <Spinner size="sm" /> : null}
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

      <SubCalendarPickerSheet
        isOpen={applePickerOpen}
        onOpenChange={(open) => {
          setApplePickerOpen(open);
          if (!open) setAppleDeviceCalendars([]);
        }}
        title="Pick calendars to sync"
        description="Choose which Apple calendars from this device to pull into your diary. You can change this any time."
        calendars={applePickerOptions}
        confirmLabel="Connect"
        busyLabel="Connecting…"
        onConfirm={handleConfirmApple}
      />

      <SubCalendarPickerSheet
        isOpen={managePickerOpen}
        onOpenChange={(open) => {
          setManagePickerOpen(open);
          if (!open) {
            setManagePickerConnection(null);
            setManagePickerOptions([]);
            setManagePickerInitial([]);
          }
        }}
        title="Manage calendars"
        description="Tick the sub-calendars you want to appear in your diary."
        calendars={managePickerOptions}
        initialSelection={managePickerInitial}
        confirmLabel="Save"
        busyLabel="Saving…"
        onConfirm={handleConfirmManage}
      />
    </BottomSheet>
  );
}
