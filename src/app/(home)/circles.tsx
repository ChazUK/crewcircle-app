import { Button } from "heroui-native";
import { UserPlusIcon } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddContactSheet } from "@/components/contacts/AddContactSheet";
import { ContactInvitesPendingStrip } from "@/components/contacts/ContactInvitesPendingStrip";
import { ContactsList } from "@/components/contacts/ContactsList";
import { Title } from "@/components/ui/Title";

export default function Circles() {
  const insets = useSafeAreaInsets();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4">
        <Title title="Circles" subtitle="Contacts and groups" />
        <Button variant="primary" isIconOnly onPress={() => setIsAddOpen(true)}>
          <UserPlusIcon size={20} />
        </Button>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-6">
        <ContactInvitesPendingStrip />
        <ContactsList />
      </ScrollView>

      <AddContactSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </View>
  );
}
