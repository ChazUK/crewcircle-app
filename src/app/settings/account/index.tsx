import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { ListGroup, PressableFeedback, Separator } from "heroui-native";
import { CirclePauseIcon, KeyRoundIcon, ShieldCheckIcon, TrashIcon } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

export default function AccountSettings() {
  const router = useRouter();
  const { user } = useUser();

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted uppercase">Identity</Text>
        <ListGroup>
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle numberOfLines={1}>Email</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Text className="text-muted" numberOfLines={1}>
                {user?.emailAddresses[0]?.emailAddress}
              </Text>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>

          <Separator className="mx-4" />

          <PressableFeedback animation={false} onPress={() => {}}>
            <PressableFeedback.Scale>
              <ListGroup.Item disabled>
                <ListGroup.ItemPrefix>
                  <ShieldCheckIcon size={20} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent className="flex-row items-center justify-between">
                  <ListGroup.ItemTitle numberOfLines={1}>
                    Two-factor authentication
                  </ListGroup.ItemTitle>
                  <Text className="text-muted" numberOfLines={1}>
                    Off
                  </Text>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix />
              </ListGroup.Item>
            </PressableFeedback.Scale>
            <PressableFeedback.Ripple />
          </PressableFeedback>
        </ListGroup>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted uppercase">Security</Text>
        <ListGroup>
          <ListGroup.Item onPress={() => router.push("/settings/account/change-password")}>
            <ListGroup.ItemPrefix>
              <KeyRoundIcon size={20} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Change password</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>

          <ListGroup.Item onPress={() => void 0}>
            <ListGroup.ItemPrefix>
              <ShieldCheckIcon size={20} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent className="flex-row items-center justify-between">
              <ListGroup.ItemTitle numberOfLines={1}>Two-factor authentication</ListGroup.ItemTitle>
              <Text numberOfLines={1}>Off</Text>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted uppercase">Danger Zone</Text>
        <ListGroup>
          <ListGroup.Item onPress={() => router.push("/settings/account/delete-account")}>
            <ListGroup.ItemPrefix>
              <CirclePauseIcon size={20} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Deactivate Account</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>

          <ListGroup.Item onPress={() => router.push("/settings/account/delete-account")}>
            <ListGroup.ItemPrefix>
              <TrashIcon size={20} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Delete Account</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>
      </View>
    </ScrollView>
  );
}
