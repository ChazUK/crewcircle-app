import { cn } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  children: string;
  size?: "sm" | "md" | "lg";
};

export const EmptyState = ({ children, size = "md" }: Props) => {
  return (
    <View
      className={cn(
        "full-1 items-center",
        {
          sm: "py-4",
          md: "py-8",
          lg: "py-12",
        }[size],
      )}
    >
      <Text className="text-sm text-muted text-center">{children}</Text>
    </View>
  );
};
