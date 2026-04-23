import {
  BottomSheet,
  Button,
  Chip,
  Description,
  Input,
  Label,
  ListGroup,
  Separator,
  TextField,
} from "heroui-native";
import { Fragment, useState } from "react";
import { Text, View } from "react-native";

import {
  AppleCalendarIcon,
  GoogleCalendarIcon,
  LinkCalendarIcon,
  OutlookCalendarIcon,
} from "./icons/CalendarProviderIcons";

type ProviderId = "google" | "apple" | "outlook" | "ical";

type Connection = { kind: "oauth"; account: string } | { kind: "ical"; url: string };

type ConnectionsState = Partial<Record<ProviderId, Connection>>;

type ProviderMeta = {
  id: ProviderId;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number }>;
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: "google",
    title: "Google Calendar",
    description: "Sync events from your Google account",
    Icon: GoogleCalendarIcon,
  },
  {
    id: "apple",
    title: "Apple Calendar",
    description: "Sync events from iCloud",
    Icon: AppleCalendarIcon,
  },
  {
    id: "outlook",
    title: "Outlook",
    description: "Sync events from Microsoft 365",
    Icon: OutlookCalendarIcon,
  },
  {
    id: "ical",
    title: "iCal URL",
    description: "Subscribe to any public .ics feed",
    Icon: LinkCalendarIcon,
  },
];

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CalendarConnectionsSheet({ isOpen, onOpenChange }: Props) {
  const [connections, setConnections] = useState<ConnectionsState>({});
  const [icalInputOpen, setIcalInputOpen] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");

  const connectOAuth = (id: Exclude<ProviderId, "ical">) => {
    // TODO: replace with real OAuth flow (expo-auth-session / backend exchange)
    setConnections((prev) => ({
      ...prev,
      [id]: { kind: "oauth", account: "you@example.com" },
    }));
  };

  const saveIcal = () => {
    const trimmed = icalUrl.trim();
    if (!trimmed) return;
    setConnections((prev) => ({ ...prev, ical: { kind: "ical", url: trimmed } }));
    setIcalUrl("");
    setIcalInputOpen(false);
  };

  const disconnect = (id: ProviderId) => {
    setConnections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (id === "ical") {
      setIcalInputOpen(false);
      setIcalUrl("");
    }
  };

  const handleProviderPress = (id: ProviderId) => {
    if (connections[id]) {
      disconnect(id);
      return;
    }
    if (id === "ical") {
      setIcalInputOpen(true);
      return;
    }
    connectOAuth(id);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setIcalInputOpen(false);
          setIcalUrl("");
        }
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content enableDynamicSizing keyboardBehavior="extend">
          <View className="mb-4 gap-1.5 px-1">
            <BottomSheet.Title>Link a calendar</BottomSheet.Title>
            <BottomSheet.Description>
              Bring your existing events into your diary. You can connect more than one.
            </BottomSheet.Description>
          </View>

          <ListGroup>
            {PROVIDERS.map((provider, index) => {
              const connection = connections[provider.id];
              const isConnected = Boolean(connection);
              const description = connection
                ? connection.kind === "oauth"
                  ? `Connected · ${connection.account}`
                  : `Connected · ${connection.url}`
                : provider.description;

              return (
                <Fragment key={provider.id}>
                  {index > 0 && <Separator className="mx-4" />}
                  <ListGroup.Item onPress={() => handleProviderPress(provider.id)}>
                    <ListGroup.ItemPrefix>
                      <provider.Icon size={32} />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>{provider.title}</ListGroup.ItemTitle>
                      <ListGroup.ItemDescription numberOfLines={1}>
                        {description}
                      </ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix>
                      <Chip variant="soft" color={isConnected ? "success" : "default"} size="sm">
                        {isConnected ? "Connected" : "Connect"}
                      </Chip>
                    </ListGroup.ItemSuffix>
                  </ListGroup.Item>
                </Fragment>
              );
            })}
          </ListGroup>

          {icalInputOpen && !connections.ical && (
            <View className="mt-4 gap-3 px-1">
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
                <Description>Paste the subscription link from your calendar provider.</Description>
              </TextField>
              <View className="flex-row justify-end gap-2">
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => {
                    setIcalInputOpen(false);
                    setIcalUrl("");
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onPress={saveIcal}>
                  Save
                </Button>
              </View>
            </View>
          )}

          <Text className="text-sm mt-2 text-muted-foreground">
            We never share event details with your circles - only whether you're free or busy
          </Text>

          <View className="mt-6">
            <Button variant="secondary" onPress={() => onOpenChange(false)}>
              Done
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
