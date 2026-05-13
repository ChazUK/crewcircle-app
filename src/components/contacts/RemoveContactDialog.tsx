import { Button, Dialog, Spinner } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  isOpen: boolean;
  contactName: string;
  isRemoving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RemoveContactDialog({
  isOpen,
  contactName,
  isRemoving,
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
            <Dialog.Title>Remove {contactName}?</Dialog.Title>
            <Dialog.Description>
              They'll be removed from your contacts. You can invite them again later.
            </Dialog.Description>
          </View>

          {error != null && (
            <View className="mb-3 rounded-xl bg-danger/10 p-3">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}

          <View className="flex-row justify-between gap-3">
            <Button variant="ghost" size="sm" onPress={onCancel} isDisabled={isRemoving}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onPress={onConfirm} isDisabled={isRemoving}>
              {isRemoving ? <Spinner size="sm" /> : "Remove"}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
