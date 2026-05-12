import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ListGroup, PressableFeedback, Separator } from "heroui-native";
import { FileTextIcon, InfoIcon, LifeBuoyIcon, LockIcon, UserIcon } from "lucide-react-native";
import { BellIcon } from "lucide-react-native";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SettingsRoute =
  | "/settings/account"
  | "/settings/notifications"
  | "/settings/support"
  | "/settings/about";

type SettingsItem = {
  title: string;
  description?: string;
  icon: React.ComponentType<any>;
} & ({ href: SettingsRoute } | { url: string | undefined });

const extra = Constants.expoConfig?.extra as { privacyUrl?: string; termsUrl?: string } | undefined;

const SETTING_GROUPS: { title: string; items: SettingsItem[] }[] = [
  {
    title: "Account",
    items: [
      {
        title: "Account",
        description: "Email, phone, password",
        icon: UserIcon,
        href: "/settings/account",
      },
    ],
  },
  {
    title: "Preferences",
    items: [{ title: "Notifications", icon: BellIcon, href: "/settings/notifications" }],
  },
  {
    title: "Support",
    items: [
      { title: "Support", icon: LifeBuoyIcon, href: "/settings/support" },
      { title: "About", icon: InfoIcon, href: "/settings/about" },
    ],
  },
  {
    title: "Legal",
    items: [
      { title: "Privacy Policy", icon: LockIcon, url: extra?.privacyUrl },
      { title: "Terms & Conditions", icon: FileTextIcon, url: extra?.termsUrl },
    ],
  },
];

async function openExternal(url: string | undefined, title: string) {
  if (!url) {
    Alert.alert("Unavailable", `${title} is not configured.`);
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (error) {
    Alert.alert(
      `Couldn't open ${title}`,
      error instanceof Error ? error.message : "Please try again.",
    );
  }
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
        {SETTING_GROUPS.map((group) => {
          return (
            <View key={group.title} className="gap-2">
              <Text className="text-sm font-semibold text-muted uppercase">{group.title}</Text>
              <ListGroup>
                {group.items.map((item, index) => {
                  const Icon = item.icon;
                  const key = "href" in item ? item.href : `${group.title}:${item.title}`;
                  const onPress = () => {
                    if ("href" in item) {
                      router.push(item.href);
                    } else {
                      void openExternal(item.url, item.title);
                    }
                  };
                  return (
                    <View key={key}>
                      {index > 0 && <Separator className="mx-4" />}
                      <PressableFeedback animation={false} onPress={onPress}>
                        <PressableFeedback.Scale>
                          <ListGroup.Item disabled>
                            <ListGroup.ItemPrefix>
                              <Icon size={20} />
                            </ListGroup.ItemPrefix>
                            <ListGroup.ItemContent>
                              <ListGroup.ItemTitle>{item.title}</ListGroup.ItemTitle>
                              {item.description && (
                                <ListGroup.ItemDescription>
                                  {item.description}
                                </ListGroup.ItemDescription>
                              )}
                            </ListGroup.ItemContent>
                            <ListGroup.ItemSuffix />
                          </ListGroup.Item>
                        </PressableFeedback.Scale>
                      </PressableFeedback>
                    </View>
                  );
                })}
              </ListGroup>
            </View>
          );
        })}
      </ScrollView>
      <View className="items-center" style={{ paddingBottom: insets.bottom + 12, paddingTop: 12 }}>
        <Text className="text-sm text-muted">CrewCircle V{version}</Text>
      </View>
    </View>
  );
}
