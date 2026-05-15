import { useSignInWithGoogle } from "@clerk/expo/google";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";
import { Alert, Platform } from "react-native";

import { reportError } from "@/lib/observability/reportError";

import { GoogleIcon } from "../ui/icons/Google";

type Props = {
  onSignInComplete?: () => void;
};

export function SignInWithGoogle({ onSignInComplete }: Props) {
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const router = useRouter();

  // Only render on iOS and Android
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;

  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startGoogleAuthenticationFlow();

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
      if (code === "SIGN_IN_CANCELLED" || code === "-5") return;

      const message =
        err instanceof Error ? err.message : "An error occurred during Google sign-in";
      Alert.alert("Error", message);
      reportError(err, { tags: { area: "auth.google" } });
    }
  };

  return <SignInWithGoogleButton onPress={handleGoogleSignIn} />;
}

type SignInWithGoogleButtonProps = {
  onPress: () => void;
};

export function SignInWithGoogleButton({ onPress }: SignInWithGoogleButtonProps) {
  return (
    <Button variant="outline" className="w-full" onPress={onPress}>
      <GoogleIcon size={24} />
      <Button.Label>Sign in with Google</Button.Label>
    </Button>
  );
}
