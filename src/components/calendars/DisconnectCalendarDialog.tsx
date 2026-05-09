import { Button, Dialog, Spinner } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  isOpen: boolean;
  isDisconnecting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DisconnectCalendarDialog({
  isOpen,
  isDisconnecting,
  error,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="mb-4 gap-1.5">
            <Dialog.Title>Disconnect calendar?</Dialog.Title>
            <Dialog.Description>
              This will delete all synced events for this calendar. This cannot be undone.
            </Dialog.Description>
          </View>

          {error != null && (
            <View className="mb-3 rounded-xl bg-danger/10 p-3">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}

          <View className="flex-row justify-between gap-3">
            <Button variant="ghost" size="sm" onPress={onCancel} isDisabled={isDisconnecting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onPress={onConfirm} isDisabled={isDisconnecting}>
              {isDisconnecting ? <Spinner size="sm" /> : "Disconnect"}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
