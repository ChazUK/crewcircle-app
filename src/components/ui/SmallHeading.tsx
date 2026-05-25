import { Text } from "react-native";

export function SmallHeading({ children }: { children: string }) {
  return (
    <Text className="text-sm font-medium tracking-wider text-muted uppercase">{children}</Text>
  );
}
