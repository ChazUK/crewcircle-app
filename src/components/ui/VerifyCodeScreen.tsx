import { Button, Card, FieldError, InputOTP } from "heroui-native";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCountdown } from "@/hooks/useCountdown";

import { BackButton } from "./BackButton";

type Props = {
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onSubmit: () => void;
  onBack: () => void;
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
  onBack,
  isLoading,
  isDisabled,
  error,
  onResend,
}: Props) {
  const [countdown, setCountdown] = useCountdown(onResend ? 30 : 0);
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <BackButton onPress={onBack} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 gap-6 p-5">
            <View className="items-center gap-4 mx-4 mb-2">
              <Text className="text-3xl font-bold">{title}</Text>
              <Text className="text-muted">{subtitle}</Text>
            </View>

            <Card className="gap-4 mx-4">
              <Card.Body className="gap-4 items-center">
                <View className="gap-2 items-center">
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
                  {error && <FieldError>{error}</FieldError>}
                </View>
              </Card.Body>

              <Card.Footer className="gap-3 flex-col">
                <Button
                  variant="primary"
                  onPress={onSubmit}
                  isDisabled={isDisabled}
                  className="w-full"
                >
                  {isLoading ? "Verifying..." : "Verify"}
                </Button>
              </Card.Footer>
            </Card>

            {onResend && (
              <View className="items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  isDisabled={isDisabled || isLoading || countdown > 0}
                  onPress={async () => {
                    await onResend();
                    setCountdown(30);
                  }}
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                </Button>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
