import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { EnterCodeView } from "@/components/onboarding/phone/EnterCodeView";
import { EnterNumberView } from "@/components/onboarding/phone/EnterNumberView";
import { BackButton } from "@/components/ui/BackButton";
import { cancelPendingPhone } from "@/lib/phone/clerk/cancelPendingPhone";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function ChangePhoneNumber() {
  const [view, setView] = useState<"enter-number" | "enter-code">("enter-number");
  const [pendingE164, setPendingE164] = useState("");
  const { user } = useUser();
  const router = useRouter();
  const hasCleanedUp = useRef(false);

  useEffect(() => {
    if (user && !hasCleanedUp.current) {
      hasCleanedUp.current = true;
      void cancelPendingPhone({ user });
    }
  }, [user]);

  return (
    <StyledSafeAreaView className="flex-1">
      <BackButton onPress={() => router.back()} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 gap-6 py-2">
          {view === "enter-number" ? (
            <EnterNumberView
              onCodeSent={(e164) => {
                setPendingE164(e164);
                setView("enter-code");
              }}
            />
          ) : (
            <EnterCodeView
              phoneE164={pendingE164}
              onVerified={() => router.back()}
              onEditNumber={() => {
                if (user) void cancelPendingPhone({ user });
                setView("enter-number");
              }}
            />
          )}
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
