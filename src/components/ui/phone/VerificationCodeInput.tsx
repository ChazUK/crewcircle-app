import { InputOTP, REGEXP_ONLY_DIGITS } from "heroui-native";

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
  return (
    <InputOTP
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      isDisabled={disabled}
      isInvalid={isInvalid}
      textInputProps={{
        autoFocus,
        textContentType: "oneTimeCode",
        autoComplete: "sms-otp",
      }}
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
  );
}
