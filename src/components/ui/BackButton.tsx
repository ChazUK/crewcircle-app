import { type Href, Link } from "expo-router";
import { Button } from "heroui-native";
import { View } from "react-native";

type StandardProps = {
  className?: string;
  children?: React.ReactNode;
};

type Props =
  | (StandardProps & { onPress: () => void; href?: never })
  | (StandardProps & { href: Href; onPress?: never });

export function BackButton({ onPress, href, className, children }: Props) {
  const button = (
    <Button variant="ghost" onPress={onPress} className={className}>
      ← {children ?? "Back"}
    </Button>
  );

  return (
    <View className="self-start">
      {href ? (
        <Link href={href} asChild>
          {button}
        </Link>
      ) : (
        button
      )}
    </View>
  );
}
