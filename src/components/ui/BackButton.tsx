import { type Href, Link } from "expo-router";
import { Button } from "heroui-native";
import { View } from "react-native";

type Props = { onPress: () => void; href?: never } | { href: Href; onPress?: never };

export function BackButton({ onPress, href }: Props) {
  const button = (
    <Button variant="ghost" onPress={onPress} className="-ml-2">
      ← Back
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
