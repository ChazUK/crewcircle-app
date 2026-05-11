import { Button, Dialog } from "heroui-native";
import { View } from "react-native";

type Props = {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
};

export function ConnectCalendarErrorDialog({ isOpen, message, onClose }: Props) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="mb-4 gap-1.5">
            <Dialog.Title>Couldn't connect</Dialog.Title>
            <Dialog.Description>
              {message ?? "Something went wrong. Please try again."}
            </Dialog.Description>
          </View>

          <View className="flex-row justify-end">
            <Button size="sm" onPress={onClose}>
              OK
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
