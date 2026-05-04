import { Input } from "heroui-native";
import { useRef } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  isInvalid?: boolean;
};

export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
  isInvalid,
}: Props) {
  const lastCompleted = useRef<string | null>(null);

  function handleChangeText(text: string) {
    const cleaned = text.replace(/\D/g, "").slice(0, 6);
    onChange(cleaned);
    if (cleaned.length === 6 && cleaned !== lastCompleted.current) {
      lastCompleted.current = cleaned;
      onComplete?.(cleaned);
    }
  }

  return (
    <Input
      value={value}
      onChangeText={handleChangeText}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      maxLength={6}
      autoFocus={autoFocus}
      editable={!disabled}
      isInvalid={isInvalid}
    />
  );
}
