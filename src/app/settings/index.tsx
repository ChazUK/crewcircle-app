import Constants from "expo-constants";
import { router } from "expo-router";
import { ListGroup, PressableFeedback, Separator } from "heroui-native";
import { FileTextIcon, InfoIcon, LifeBuoyIcon, LockIcon, UserIcon } from "lucide-react-native";
import { BellIcon } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SettingsRoute =
  | "/settings/account"
  | "/settings/notifications"
  | "/settings/support"
  | "/settings/about"
  | "/settings/privacy-policy"
  | "/settings/terms";

const SETTING_GROUPS: {
  title: string;
  items: {
    title: string;
    description?: string;
    icon: React.ComponentType<any>;
    href: SettingsRoute;
  }[];
}[] = [
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
      { title: "Privacy Policy", icon: LockIcon, href: "/settings/privacy-policy" },
      { title: "Terms & Conditions", icon: FileTextIcon, href: "/settings/terms" },
    ],
  },
];

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
                  return (
                    <View key={item.href}>
                      {index > 0 && <Separator className="mx-4" />}
                      <PressableFeedback animation={false} onPress={() => router.push(item.href)}>
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
