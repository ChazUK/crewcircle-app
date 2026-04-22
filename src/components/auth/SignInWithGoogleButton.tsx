import { useSignInWithGoogle } from "@clerk/expo/google";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";
import { Alert, Platform } from "react-native";

type Props = {
  onSignInComplete?: () => void;
};

export function SignInWithGoogleButton({ onSignInComplete }: Props) {
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
    } catch (err: any) {
      if (err.code === "SIGN_IN_CANCELLED" || err.code === "-5") return;

      Alert.alert("Error", err.message || "An error occurred during Google sign-in");
      console.error("Sign in with Google error:", JSON.stringify(err, null, 2));
    }
  };

  return (
    <Button variant="outline" className="w-full" onPress={handleGoogleSignIn}>
      <Button.Label>Sign in with Google</Button.Label>
    </Button>
  );
}
