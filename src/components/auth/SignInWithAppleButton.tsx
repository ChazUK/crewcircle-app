import { useSignInWithApple } from "@clerk/expo/apple";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { Alert, Platform } from "react-native";

import { reportError } from "@/lib/observability/reportError";

type Props = {
  onSignInComplete?: () => void;
};

export function SignInWithAppleButton({ onSignInComplete }: Props) {
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const router = useRouter();

  // Only show on iOS
  if (Platform.OS !== "ios") return null;

  const handleAppleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startAppleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        if (onSignInComplete) {
          onSignInComplete();
        } else {
          router.replace("/");
        }
      }
    } catch (err: unknown) {
      const code = err instanceof Error ? (err as Error & { code?: string }).code : undefined;
      if (code === "ERR_REQUEST_CANCELED") return;

      const message = err instanceof Error ? err.message : "An error occurred during Apple sign-in";
      Alert.alert("Error", message);
      reportError(err, { tags: { area: "auth.apple" } });
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
      cornerRadius={22}
      style={{ height: 44, width: "100%" }}
      onPress={handleAppleSignIn}
    />
  );
}
