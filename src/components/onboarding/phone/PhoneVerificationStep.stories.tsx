import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button, Card, FieldError } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PhoneNumberInput } from "@/components/form/PhoneNumberInput";
import { VerificationCodeInput } from "@/components/ui/phone/VerificationCodeInput";

import { PhoneVerificationStep } from "./PhoneVerificationStep";

// Pure display helpers for each visual state - avoid importing live Clerk/Convex hooks

const DISCLOSURE =
  "We use your phone number to help fellow crew find you and to send job alerts and time-sensitive updates. It is never shown on your profile.";

function EnterNumberState() {
  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput value={{ country: "GB", national: "" }} onChange={() => {}} />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
      </View>
      <Button
        variant="primary"
        isDisabled
        onPress={() => {}}
        accessibilityLabel="Send verification code"
      >
        Send code
      </Button>
    </View>
  );
}

function EnterNumberWithValidNumberState() {
  return (
    <View className="gap-6">
      <Text className="text-4xl font-bold">Verify your phone number</Text>
      <View className="gap-3">
        <PhoneNumberInput value={{ country: "GB", national: "07700900123" }} onChange={() => {}} />
        <Text className="text-sm text-muted">{DISCLOSURE}</Text>
      </View>
      <Button variant="primary" onPress={() => {}} accessibilityLabel="Send verification code">
        Send code
      </Button>
    </View>
  );
}

type EnterCodeDisplayProps = {
  maskedPhone: string;
  code: string;
  onCodeChange: (v: string) => void;
  loading?: boolean;
  error?: string | null;
  resendCooldown?: number;
  onVerify: () => void;
  onResend: () => void;
  onEditNumber: () => void;
};

function EnterCodeDisplay({
  maskedPhone,
  code,
  onCodeChange,
  loading = false,
  error = null,
  resendCooldown = 30,
  onVerify,
  onResend,
  onEditNumber,
}: EnterCodeDisplayProps) {
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
            onChange={onCodeChange}
            onComplete={onVerify}
            disabled={loading}
            isInvalid={!!error}
            autoFocus={false}
          />
        </Card.Body>

        <Card.Footer className="gap-3 flex-col">
          {error && <FieldError isInvalid>{error}</FieldError>}

          <Button
            variant="primary"
            onPress={onVerify}
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
          onPress={onResend}
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

const decorator = (Story: React.ComponentType) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

const meta = {
  title: "Onboarding/Phone/PhoneVerificationStep",
  component: PhoneVerificationStep,
  decorators: [decorator],
  tags: ["autodocs"],
  args: {
    onComplete: () => {},
  },
} satisfies Meta<typeof PhoneVerificationStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <EnterNumberState />,
};

export const EnterNumber: Story = {
  render: () => <EnterNumberState />,
};

export const EnterNumberWithValidNumber: Story = {
  render: () => <EnterNumberWithValidNumberState />,
};

export const EnterCode: Story = {
  render: () => {
    const [code, setCode] = useState("");
    return (
      <EnterCodeDisplay
        maskedPhone="•••••• 0123"
        code={code}
        onCodeChange={setCode}
        resendCooldown={30}
        onVerify={() => {}}
        onResend={() => {}}
        onEditNumber={() => {}}
      />
    );
  },
};

export const EnterCodeWithError: Story = {
  render: () => {
    const [code, setCode] = useState("123456");
    return (
      <EnterCodeDisplay
        maskedPhone="•••••• 0123"
        code={code}
        onCodeChange={setCode}
        error="Incorrect code. Please try again."
        resendCooldown={30}
        onVerify={() => {}}
        onResend={() => {}}
        onEditNumber={() => {}}
      />
    );
  },
};

export const EnterCodeResendAvailable: Story = {
  render: () => {
    const [code, setCode] = useState("");
    return (
      <EnterCodeDisplay
        maskedPhone="•••••• 0123"
        code={code}
        onCodeChange={setCode}
        resendCooldown={0}
        onVerify={() => {}}
        onResend={() => {}}
        onEditNumber={() => {}}
      />
    );
  },
};
