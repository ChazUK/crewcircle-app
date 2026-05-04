import { useUser } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { Button, Card, FieldError } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { VerificationCodeInput } from "@/components/ui/phone/VerificationCodeInput";
import { useCountdown } from "@/hooks/useCountdown";
import { addAndStartVerification } from "@/lib/phone/clerk/addAndStartVerification";
import { confirmVerification } from "@/lib/phone/clerk/confirmVerification";

type Props = {
  phoneE164: string;
  onVerified: () => void;
  onEditNumber: () => void;
};

export function EnterCodeView({ phoneE164, onVerified, onEditNumber }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, startResendCooldown] = useCountdown(30);

  const { user } = useUser();
  const syncVerifiedPhone = useAction(api.users.syncVerifiedPhone.syncVerifiedPhone);

  const last4 = phoneE164.slice(-4);
  const maskedPhone = `•••••• ${last4}`;

  async function handleVerify(codeToVerify: string) {
    if (codeToVerify.length !== 6 || loading) return;

    setLoading(true);
    setError(null);

    if (!user) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }

    const result = await confirmVerification({ user, code: codeToVerify });
    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    try {
      await syncVerifiedPhone({});
      onVerified();
    } catch {
      setError("Phone verified but failed to sync. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!user) {
      setError("You must be signed in.");
      return;
    }

    setError(null);
    const result = await addAndStartVerification({ user, phoneNumber: phoneE164 });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    startResendCooldown(30);
  }

  return (
    <View className="gap-6">
      <View className="mx-4">
        <Text className="text-4xl font-bold leading-none mb-2">Enter the code</Text>
        <Text className="text-base">Sent to {maskedPhone}</Text>
      </View>

      <Card className="gap-4 mx-4">
        <Card.Body className="gap-4">
          <VerificationCodeInput
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
            disabled={loading}
            isInvalid={!!error}
            autoFocus
          />
        </Card.Body>

        <Card.Footer className="gap-3 flex-col">
          {error && <FieldError isInvalid>{error}</FieldError>}

          <Button
            variant="primary"
            onPress={() => handleVerify(code)}
            isDisabled={code.length !== 6 || loading}
            className="w-full"
            accessibilityLabel="Verify code"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </Card.Footer>
      </Card>

      <View className="items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          isDisabled={resendCooldown > 0}
          onPress={handleResend}
          accessibilityLabel={
            resendCooldown > 0
              ? `Resend code available in ${resendCooldown} seconds`
              : "Resend code"
          }
        >
          {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          isDisabled={loading}
          onPress={onEditNumber}
          accessibilityLabel="Edit phone number"
        >
          Edit number
        </Button>
      </View>
    </View>
  );
}
