import { Button, Card, FieldError, InputOTP } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { useCountdown } from "@/hooks/useCountdown";

type Props = {
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onSubmit: () => void;
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
  onBlur,
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
        <Text className="text-4xl mb-2 font-bold leading-none">{title}</Text>
        <Text className="text-base">{subtitle}</Text>
      </View>

      <Card className="gap-4 mx-4">
        <Card.Body className="gap-4 items-center">
          <InputOTP
            maxLength={6}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={!!error}
            onComplete={onSubmit}
          >
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>
        </Card.Body>

        <Card.Footer className="gap-3 flex-col">
          <FieldError isInvalid={!!error}>{error}</FieldError>

          <Button variant="primary" onPress={onSubmit} isDisabled={isDisabled} className="w-full">
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
