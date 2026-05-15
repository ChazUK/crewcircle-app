import { Button, Card, FieldError } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { VerificationCodeInput } from "@/components/ui/phone/VerificationCodeInput";
import { useCountdown } from "@/hooks/useCountdown";

type Props = {
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when the user submits - either by pressing the button (no arg) or by completing the code (with the completed code). */
  onSubmit: (code?: string) => void;
  isLoading: boolean;
  isDisabled: boolean;
  error?: string | null;
  /** Omit for strategies that don't send a code (e.g. TOTP) */
  onResend?: () => unknown;
};

export function VerifyCodeScreen({
  title,
  subtitle,
  value,
  onChange,
  onSubmit,
  isLoading,
  isDisabled,
  error,
  onResend,
}: Props) {
  const [countdown, startCountdown] = useCountdown(onResend ? 30 : 0);
  const [resendError, setResendError] = useState<string | null>(null);

  return (
    <View className="gap-6">
      <View className="mx-4">
        <Text className="mb-2 text-4xl leading-none font-bold text-foreground">{title}</Text>
        <Text className="text-base text-muted">{subtitle}</Text>
      </View>

      <Card className="mx-4 gap-4">
        <Card.Body className="gap-4">
          <VerificationCodeInput
            value={value}
            onChange={onChange}
            onComplete={onSubmit}
            disabled={isDisabled}
            isInvalid={!!error}
            autoFocus
          />
        </Card.Body>

        <Card.Footer className="flex-col gap-3">
          <FieldError isInvalid={!!error}>{error}</FieldError>

          <Button
            variant="primary"
            onPress={() => onSubmit()}
            isDisabled={isDisabled}
            className="w-full"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
        </Card.Footer>
      </Card>

      {onResend && (
        <View className="items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            isDisabled={isDisabled || isLoading || countdown > 0}
            onPress={async () => {
              setResendError(null);
              try {
                await onResend();
                startCountdown(30);
              } catch {
                setResendError("Failed to resend code. Please try again.");
              }
            }}
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
          </Button>
          {resendError && <FieldError isInvalid>{resendError}</FieldError>}
        </View>
      )}
    </View>
  );
}
