import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IncomingInvitesList } from "@/components/contacts/IncomingInvitesList";
import { Title } from "@/components/ui/Title";

export default function Requests() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <View className="px-4">
        <Title title="Requests" subtitle="Incoming contact invites" />
      </View>
      <ScrollView contentContainerClassName="p-4">
        <IncomingInvitesList />
      </ScrollView>
    </View>
  );
}
