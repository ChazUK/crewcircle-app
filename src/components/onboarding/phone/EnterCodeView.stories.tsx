import type { Meta, StoryObj } from "@storybook/react-native";
import { Button, Card, FieldError } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { VerificationCodeInput } from "@/components/ui/phone/VerificationCodeInput";

import { EnterCodeView } from "./EnterCodeView";

// Pure display helpers for each visual state — avoid importing live Convex/Clerk hooks

type DisplayProps = {
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
}: DisplayProps) {
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

const meta = {
  title: "Onboarding/Phone/EnterCodeView",
  component: EnterCodeView,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
        <Story />
      </View>
    ),
  ],
  tags: ["autodocs"],
  args: {
    phoneE164: "+447700900123",
    onVerified: () => {},
    onEditNumber: () => {},
  },
} satisfies Meta<typeof EnterCodeView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [code, setCode] = useState("");
    return (
      <EnterCodeDisplay
        maskedPhone="•••••• 0123"
        code={code}
        onCodeChange={setCode}
        resendCooldown={30}
        onVerify={() => {}}
        onResend={() => {}}
        onEditNumber={args.onEditNumber}
      />
    );
  },
};

export const WithCodeEntered: Story = {
  render: (args) => {
    const [code, setCode] = useState("123456");
    return (
      <EnterCodeDisplay
        maskedPhone="•••••• 0123"
        code={code}
        onCodeChange={setCode}
        resendCooldown={30}
        onVerify={() => {}}
        onResend={() => {}}
        onEditNumber={args.onEditNumber}
      />
    );
  },
};

export const Loading: Story = {
  render: (args) => (
    <EnterCodeDisplay
      maskedPhone="•••••• 0123"
      code="123456"
      onCodeChange={() => {}}
      loading
      resendCooldown={30}
      onVerify={() => {}}
      onResend={() => {}}
      onEditNumber={args.onEditNumber}
    />
  ),
};

export const WithError: Story = {
  render: (args) => {
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
        onEditNumber={args.onEditNumber}
      />
    );
  },
};

export const ResendAvailable: Story = {
  render: (args) => {
    const [code, setCode] = useState("");
    return (
      <EnterCodeDisplay
        maskedPhone="•••••• 0123"
        code={code}
        onCodeChange={setCode}
        resendCooldown={0}
        onVerify={() => {}}
        onResend={() => {}}
        onEditNumber={args.onEditNumber}
      />
    );
  },
};

export const ResendWithCountdown: Story = {
  render: (args) => {
    const [code, setCode] = useState("");
    return (
      <EnterCodeDisplay
        maskedPhone="•••••• 0123"
        code={code}
        onCodeChange={setCode}
        resendCooldown={12}
        onVerify={() => {}}
        onResend={() => {}}
        onEditNumber={args.onEditNumber}
      />
    );
  },
};
