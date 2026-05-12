import { router } from "expo-router";
import { Button } from "heroui-native";
import { ChevronLeftIcon } from "lucide-react-native";

type Props = {
  label?: string;
  onPress?: () => void;
};

export function HeaderBack({ label, onPress }: Props) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-6 px-2"
      onPress={onPress ?? (() => router.back())}
    >
      <ChevronLeftIcon size={16} />
      {label ? <Button.Label className="text-sm">{label}</Button.Label> : null}
    </Button>
  );
}
