import { useSignIn } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { type Href, Link, useRouter } from "expo-router";
import { Button, Card, FieldError, Input, Label, LinkButton, TextField } from "heroui-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { BackButton } from "@/components/ui/BackButton";
import { VerifyCodeScreen } from "@/components/ui/VerifyCodeScreen";

type Step = "email" | "code" | "new-password" | "mfa";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function Page() {
  const { signIn, errors: clerkErrors, fetchStatus } = useSignIn();
  const router = useRouter();

  useEffect(() => {
    return () => {
      console.log("reset, forgot password");
      signIn.reset();
    };
  }, []);

  const [step, setStep] = useState<Step>("email");
  const [mfaStrategy, setMfaStrategy] = useState<"totp" | "phone_code" | "email_code" | null>(null);

  const emailForm = useForm({
    defaultValues: {
      emailAddress: "",
    },
    onSubmit: async ({ value }) => {
      const { error: createError } = await signIn.create({
        identifier: value.emailAddress,
      });

      if (createError) {
        console.error(JSON.stringify(createError, null, 2));

        return;
      }

      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();

      if (sendError) {
        console.error(JSON.stringify(sendError, null, 2));

        return;
      }

      setStep("code");
    },
  });

  const codeForm = useForm({
    defaultValues: {
      code: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({
        code: value.code,
      });

      if (error) {
        console.error(JSON.stringify(error, null, 2));

        return;
      }

      setStep("new-password");
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: value.password,
      });

      if (error) {
        console.error(JSON.stringify(error, null, 2));

        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);

              return;
            }

            router.replace(decorateUrl("/") as Href);
          },
        });
      } else if (signIn.status === "needs_second_factor") {
        // MFA required after password reset (user has MFA enabled)
        const totpFactor = signIn.supportedSecondFactors?.find((f) => f.strategy === "totp");
        const phoneFactor = signIn.supportedSecondFactors?.find((f) => f.strategy === "phone_code");
        const emailFactor = signIn.supportedSecondFactors?.find((f) => f.strategy === "email_code");

        if (totpFactor) {
          setMfaStrategy("totp");
          setStep("mfa");
        } else if (emailFactor) {
          await signIn.mfa.sendEmailCode();
          setMfaStrategy("email_code");
          setStep("mfa");
        } else if (phoneFactor) {
          await signIn.mfa.sendPhoneCode();
          setMfaStrategy("phone_code");
          setStep("mfa");
        }
      } else {
        console.error(
          `[forgot-password] Unexpected sign-in status after password reset: "${signIn.status}".`,
        );
      }
    },
  });

  const mfaForm = useForm({
    defaultValues: {
      code: "",
    },
    onSubmit: async ({ value }) => {
      let verifyError;

      if (mfaStrategy === "totp") {
        const { error } = await signIn.mfa.verifyTOTP({ code: value.code });
        verifyError = error;
      } else if (mfaStrategy === "phone_code") {
        const { error } = await signIn.mfa.verifyPhoneCode({ code: value.code });
        verifyError = error;
      } else {
        const { error } = await signIn.mfa.verifyEmailCode({ code: value.code });
        verifyError = error;
      }

      if (verifyError) {
        console.error(JSON.stringify(verifyError, null, 2));
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);

              return;
            }

            router.replace(decorateUrl("/") as Href);
          },
        });
      } else {
        console.error("Sign-in attempt not complete after MFA:", signIn);
      }
    },
  });

  if (step === "mfa" && mfaStrategy) {
    const subtitleByStrategy = {
      totp: "Enter the 6-digit code from your authenticator app",
      phone_code: "Enter the 6-digit code sent to your phone",
      email_code: "Enter the 6-digit code sent to your email",
    };

    const handleResend =
      mfaStrategy !== "totp"
        ? async () => {
            if (mfaStrategy === "phone_code") {
              await signIn.mfa.sendPhoneCode();
            } else {
              await signIn.mfa.sendEmailCode();
            }
          }
        : undefined;

    return (
      <mfaForm.Field name="code">
        {(field) => (
          <mfaForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <VerifyCodeScreen
                title="Two-factor authentication"
                subtitle={subtitleByStrategy[mfaStrategy]}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                onSubmit={() => mfaForm.handleSubmit()}
                isLoading={!!isSubmitting}
                isDisabled={!canSubmit || !!isSubmitting || fetchStatus === "fetching"}
                error={clerkErrors.fields.code?.message ?? clerkErrors.global?.[0]?.message}
                onResend={handleResend}
              />
            )}
          </mfaForm.Subscribe>
        )}
      </mfaForm.Field>
    );
  }

  if (step === "code") {
    return (
      <StyledSafeAreaView className="flex-1">
        <BackButton className="mb-2" onPress={() => setStep("email")} />
        <ScrollView contentContainerStyle={{ flex: 1 }}>
          <View className="flex-1 gap-6">
            <codeForm.Field name="code">
              {(field) => (
                <codeForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <VerifyCodeScreen
                      title="Check your email"
                      subtitle="Enter the 6-digit code sent to your email"
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      onSubmit={() => codeForm.handleSubmit()}
                      isLoading={!!isSubmitting}
                      isDisabled={!canSubmit || !!isSubmitting || fetchStatus === "fetching"}
                      error={
                        clerkErrors.fields.code?.longMessage ??
                        (clerkErrors.global?.[0] as any)?.errors?.[0]?.longMessage
                      }
                      onResend={() => {
                        codeForm.reset();
                        signIn.resetPasswordEmailCode.sendCode();
                      }}
                    />
                  )}
                </codeForm.Subscribe>
              )}
            </codeForm.Field>
          </View>
        </ScrollView>
      </StyledSafeAreaView>
    );
  }

  if (step === "new-password") {
    return (
      <StyledSafeAreaView className="flex-1">
        <BackButton className="mb-2" onPress={() => setStep("email")} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 gap-6">
            <View className="mx-4">
              <Text className="text-4xl mb-2 font-bold leading-none">Set new password</Text>
              <Text className="text-base">Choose a strong password for your account</Text>
            </View>

            <Card className="gap-4 mx-4">
              <Card.Body className="gap-4">
                <passwordForm.Field name="password">
                  {(field) => (
                    <TextField isRequired isInvalid={!!clerkErrors.fields.password}>
                      <Label>New password</Label>
                      <Input
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        secureTextEntry
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                        returnKeyType="next"
                      />
                      <FieldError isInvalid={!!clerkErrors.fields.password}>
                        {clerkErrors.fields.password?.message}
                      </FieldError>
                    </TextField>
                  )}
                </passwordForm.Field>

                <passwordForm.Field
                  name="confirmPassword"
                  validators={{
                    onChange: ({ value, fieldApi }) => {
                      const password = fieldApi.form.getFieldValue("password");

                      if (!value) return "Required";
                      if (value !== password) return "Passwords do not match";

                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <TextField isRequired isInvalid={!!field.state.meta.errors.length}>
                      <Label>Confirm password</Label>
                      <Input
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        secureTextEntry
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                        returnKeyType="send"
                      />
                      <FieldError isInvalid={!!field.state.meta.errors.length}>
                        {field.state.meta.errors[0]}
                      </FieldError>
                    </TextField>
                  )}
                </passwordForm.Field>
              </Card.Body>

              <Card.Footer>
                <passwordForm.Subscribe selector={(state) => [state.isSubmitting, state.values]}>
                  {([isSubmitting, values]) => {
                    const { password, confirmPassword } = values as {
                      password: string;
                      confirmPassword: string;
                    };
                    const isDisabled =
                      !password ||
                      !confirmPassword ||
                      password !== confirmPassword ||
                      !!isSubmitting ||
                      fetchStatus === "fetching";

                    return (
                      <Button
                        variant="primary"
                        onPress={() => passwordForm.handleSubmit()}
                        isDisabled={isDisabled}
                        className="w-full"
                      >
                        {isSubmitting ? "Saving..." : "Reset password"}
                      </Button>
                    );
                  }}
                </passwordForm.Subscribe>
              </Card.Footer>
            </Card>

            {clerkErrors.global?.[0] && (
              <Text className="text-danger text-sm text-center mx-4">
                {clerkErrors.global[0].message}
              </Text>
            )}
          </View>
        </ScrollView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <ScrollView contentContainerStyle={{ flex: 1 }}>
        <View className="flex-1 mt-12 gap-6">
          <View className="mx-4">
            <Text className="text-4xl mb-2 font-bold leading-none">Reset your password</Text>
            <Text className="text-base">
              Enter the email you signed up with and we'll send a code to reset your password.
            </Text>
          </View>

          <View className="gap-4 mx-4">
            <Card className="gap-4">
              <Card.Body className="gap-4">
                <emailForm.Field name="emailAddress">
                  {(field) => (
                    <TextField isRequired isInvalid={!!clerkErrors.fields.identifier}>
                      <Label>Email address</Label>
                      <Input
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                        keyboardType="email-address"
                        returnKeyType="send"
                      />

                      <FieldError isInvalid={!!clerkErrors.fields.identifier}>
                        {clerkErrors.fields.identifier?.message}
                      </FieldError>
                    </TextField>
                  )}
                </emailForm.Field>
              </Card.Body>

              <Card.Footer className="flex-col gap-4">
                {clerkErrors.global?.[0] && (
                  <Text className="text-danger text-sm text-left">
                    {clerkErrors.global[0].message}
                  </Text>
                )}

                <emailForm.Subscribe selector={(state) => [state.isSubmitting, state.values]}>
                  {([isSubmitting, values]) => {
                    const { emailAddress } = values as { emailAddress: string };
                    return (
                      <Button
                        variant="primary"
                        onPress={() => emailForm.handleSubmit()}
                        isDisabled={!emailAddress || !!isSubmitting || fetchStatus === "fetching"}
                        className="w-full"
                      >
                        {isSubmitting ? "Sending..." : "Send reset code"}
                      </Button>
                    );
                  }}
                </emailForm.Subscribe>
              </Card.Footer>
            </Card>
          </View>
        </View>

        <View className="items-end flex-row gap-1 justify-center">
          <Text className="text-base text-muted">Remember your password?</Text>
          <Link href="../" asChild>
            <LinkButton>
              <LinkButton.Label className="text-accent">Sign in</LinkButton.Label>
            </LinkButton>
          </Link>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
