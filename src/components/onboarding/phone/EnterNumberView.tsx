import { useUser } from "@clerk/expo";
import { Button, Spinner } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { PhoneNumberInput } from "@/components/form/PhoneNumberInput";
import { addAndStartVerification } from "@/lib/phone/clerk/addAndStartVerification";

const DISCLOSURE =
  "We use your phone number to help fellow crew find you and to send job alerts and time-sensitive updates. It is never shown on your profile.";

type Props = {
  onCodeSent: (e164: string) => void;
};

export function EnterNumberView({ onCodeSent }: Props) {
  const { user } = useUser();
  const [value, setValue] = useState({ country: "", national: "" });
  const [normalized, setNormalized] = useState<{ e164: string | null; isValid: boolean }>({
    e164: null,
    isValid: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    next: { country: string; national: string },
    norm: { e164: string | null; isValid: boolean },
  ) {
    setValue(next);
    setNormalized(norm);
    setError(null);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    if (!user) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }

    const result = await addAndStartVerification({ user, phoneNumber: normalized.e164! });

    if (result.ok) {
      onCodeSent(normalized.e164!);
    } else {
      setError(result.message);
      setLoading(false);
    }
  }

  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput
          value={value}
          onChange={handleChange}
          disabled={loading}
          error={error ?? undefined}
        />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
        <Text>{JSON.stringify(normalized)}</Text>
      </View>
      <Button
        variant="primary"
        isDisabled={!normalized.isValid || loading}
        onPress={handleSubmit}
        accessibilityLabel="Send verification code"
      >
        {loading ? <Spinner /> : "Send code"}
      </Button>
    </View>
  );
}
