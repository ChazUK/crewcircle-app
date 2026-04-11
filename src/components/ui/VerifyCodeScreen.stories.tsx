import type { Meta, StoryObj } from "@storybook/react-native";

import { VerifyCodeScreen } from "./VerifyCodeScreen";

const meta = {
  title: "UI/VerifyCodeScreen",
  component: VerifyCodeScreen,
  args: {
    value: "",
    onChange: () => {},
    onBlur: () => {},
    onSubmit: () => {},
    onBack: () => {},
    isLoading: false,
    isDisabled: false,
  },
} satisfies Meta<typeof VerifyCodeScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ClientTrust: Story = {
  args: {
    title: "Verify your account",
    subtitle: "Enter the 6-digit code sent to your email",
    onResend: () => {},
    resendCountdown: 0,
  },
};

export const ClientTrustResendCountdown: Story = {
  args: {
    title: "Verify your account",
    subtitle: "Enter the 6-digit code sent to your email",
    onResend: () => {},
    resendCountdown: 24,
  },
};

export const MfaTOTP: Story = {
  args: {
    title: "Two-factor authentication",
    subtitle: "Enter the 6-digit code from your authenticator app",
    // no onResend — TOTP doesn't send a code
  },
};

export const MfaEmailCode: Story = {
  args: {
    title: "Two-factor authentication",
    subtitle: "Enter the 6-digit code sent to your email",
    onResend: () => {},
    resendCountdown: 0,
  },
};

export const MfaPhoneCode: Story = {
  args: {
    title: "Two-factor authentication",
    subtitle: "Enter the 6-digit code sent to your phone",
    onResend: () => {},
    resendCountdown: 0,
  },
};

export const PartiallyFilled: Story = {
  args: {
    title: "Two-factor authentication",
    subtitle: "Enter the 6-digit code from your authenticator app",
    value: "123",
  },
};

export const WithError: Story = {
  args: {
    title: "Two-factor authentication",
    subtitle: "Enter the 6-digit code from your authenticator app",
    value: "999999",
    error: "Invalid verification code. Please try again.",
  },
};

export const Loading: Story = {
  args: {
    title: "Two-factor authentication",
    subtitle: "Enter the 6-digit code from your authenticator app",
    value: "123456",
    isLoading: true,
    isDisabled: true,
  },
};
