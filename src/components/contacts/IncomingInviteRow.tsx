import { Button, Spinner } from "heroui-native";
import { Text, View } from "react-native";

import { ContactRow, type ContactRowUser } from "./ContactRow";

type Props = {
  from: ContactRowUser;
  message?: string;
  isBusy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingInviteRow({ from, message, isBusy, onAccept, onDecline }: Props) {
  return (
    <View className="gap-2">
      <ContactRow
        user={from}
        trailing={
          <View className="flex-row gap-2">
            <Button variant="ghost" size="sm" onPress={onDecline} isDisabled={isBusy}>
              Decline
            </Button>
            <Button variant="primary" size="sm" onPress={onAccept} isDisabled={isBusy}>
              {isBusy ? <Spinner size="sm" /> : "Accept"}
            </Button>
          </View>
        }
      />
      {message ? (
        <Text className="px-3 text-xs text-muted" numberOfLines={3}>
          “{message}”
        </Text>
      ) : null}
    </View>
  );
}
