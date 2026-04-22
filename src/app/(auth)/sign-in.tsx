import { useSignIn } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { type Href, Link, useRouter } from "expo-router";
import { Button, Card, FieldError, Input, Label, LinkButton, TextField } from "heroui-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignInWithAppleButton } from "@/components/auth/SignInWithAppleButton";
import { SignInWithGoogleButton } from "@/components/auth/SignInWithGoogleButton";
import { VerifyCodeScreen } from "@/components/ui/VerifyCodeScreen";

export default function Page() {
  const { signIn, errors: clerkErrors, fetchStatus } = useSignIn();
  const router = useRouter();

  useEffect(() => {
    return () => {
      console.log("reset");
      signIn.reset();
      signInForm.reset();
      verifyForm.reset();
    };
  }, []);

  const [secondFactorStrategy, setSecondFactorStrategy] = useState<
    "totp" | "email_code" | "phone_code" | null
  >(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const signInForm = useForm({
    defaultValues: {
      emailAddress: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await signIn.password({
        identifier: value.emailAddress,
        password: value.password,
      });

      if (error) {
        console.log(JSON.stringify(error, null, 2));

        return;
      }

      if (signIn.status === "complete") {
        setIsNavigating(true);

        try {
          await finalizeSignIn();
        } catch (e) {
          setIsNavigating(false);
          throw e;
        }
      } else if (signIn.status === "needs_second_factor") {
        // See https://clerk.com/docs/guides/development/custom-flows/authentication/multi-factor-authentication
        const totpFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "totp",
        );
        const phoneCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "phone_code",
        );
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        if (totpFactor) {
          setSecondFactorStrategy("totp");
        } else if (phoneCodeFactor) {
          setSecondFactorStrategy("phone_code");
          await signIn.mfa.sendPhoneCode();
        } else if (emailCodeFactor) {
          setSecondFactorStrategy("email_code");
          await signIn.mfa.sendEmailCode();
        }
      } else if (signIn.status === "needs_client_trust") {
        // For other second factor strategies,
        // see https://clerk.com/docs/guides/development/custom-flows/authentication/client-trust
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        if (emailCodeFactor) {
          setSecondFactorStrategy("email_code");
          await signIn.mfa.sendEmailCode();
        }
      } else {
        console.error("Sign-in attempt not complete:", signIn);
      }
    },
  });

  const verifyForm = useForm({
    defaultValues: {
      code: "",
    },
    onSubmit: async ({ value }) => {
      if (secondFactorStrategy === "totp") {
        await signIn.mfa.verifyTOTP({ code: value.code });
      } else if (secondFactorStrategy === "phone_code") {
        await signIn.mfa.verifyPhoneCode({ code: value.code });
      } else {
        // email_code (needs_second_factor) or needs_client_trust
        await signIn.mfa.verifyEmailCode({ code: value.code });
      }

      if (signIn.status === "complete") {
        setIsNavigating(true);

        try {
          await finalizeSignIn();
        } catch (e) {
          setIsNavigating(false);
          throw e;
        }
      } else {
        console.error("Sign-in attempt not complete:", signIn);
      }
    },
  });

  async function finalizeSignIn() {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Handle pending session tasks
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.log(session?.currentTask);
          return;
        }

        router.replace(decorateUrl("/") as Href);
      },
    });
  }

  if (isNavigating) return null;

  if (signIn.status === "needs_second_factor" && secondFactorStrategy) {
    const subtitleByStrategy = {
      totp: "Enter the 6-digit code from your authenticator app",
      phone_code: "Enter the 6-digit code sent to your phone",
      email_code: "Enter the 6-digit code sent to your email",
    };

    const handleResendSecondFactor =
      secondFactorStrategy !== "totp"
        ? async () => {
            if (secondFactorStrategy === "phone_code") {
              await signIn.mfa.sendPhoneCode();
            } else {
              await signIn.mfa.sendEmailCode();
            }
          }
        : undefined;

    return (
      <verifyForm.Field name="code">
        {(field) => (
          <verifyForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <VerifyCodeScreen
                title="Two-factor authentication"
                subtitle={subtitleByStrategy[secondFactorStrategy]}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                onSubmit={() => verifyForm.handleSubmit()}
                onBack={() => signIn.reset()}
                isLoading={!!isSubmitting}
                isDisabled={!canSubmit || !!isSubmitting || fetchStatus === "fetching"}
                error={clerkErrors.fields.code?.message ?? clerkErrors.global?.[0]?.message}
                onResend={handleResendSecondFactor}
              />
            )}
          </verifyForm.Subscribe>
        )}
      </verifyForm.Field>
    );
  }

  if (signIn.status === "needs_client_trust") {
    return (
      <verifyForm.Field name="code">
        {(field) => (
          <verifyForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <VerifyCodeScreen
                title="Verify your account"
                subtitle="Enter the 6-digit code sent to your email"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                onSubmit={() => verifyForm.handleSubmit()}
                onBack={() => signIn.reset()}
                isLoading={!!isSubmitting}
                isDisabled={!canSubmit || !!isSubmitting || fetchStatus === "fetching"}
                error={clerkErrors.fields.code?.message ?? clerkErrors.global?.[0]?.message}
                onResend={() => signIn.mfa.sendEmailCode()}
              />
            )}
          </verifyForm.Subscribe>
        )}
      </verifyForm.Field>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* <ScrollView contentContainerStyle={{ flexGrow: 1 }}> */}
      <View className="flex-1 justify-center gap-6">
        <View className="mx-4">
          <Text className="text-4xl mb-2 font-bold leading-none">Welcome back</Text>
          <Text className="text-base">
            Sign in to pick up your next shift, find a replacement, or manage your crew.
          </Text>
        </View>

        <View className="gap-4 mx-4">
          <Card className="gap-4">
            <Card.Body className="gap-4">
              <signInForm.Field name="emailAddress">
                {(field) => (
                  <TextField isInvalid={!!clerkErrors.fields.identifier}>
                    <Label>Email</Label>
                    <Input
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      onBlur={field.handleBlur}
                      keyboardType="email-address"
                      returnKeyType="next"
                      submitBehavior="submit"
                    />

                    <FieldError isInvalid={!!clerkErrors.fields.identifier}>
                      {clerkErrors.fields.identifier?.message}
                    </FieldError>
                  </TextField>
                )}
              </signInForm.Field>

              <signInForm.Field name="password">
                {(field) => (
                  <TextField isRequired isInvalid={!!clerkErrors.fields.password}>
                    <View className="flex-row justify-between items-center">
                      <Label>Password</Label>
                      <Link href="/forgot-password" asChild>
                        <LinkButton size="sm">
                          <LinkButton.Label className="text-accent">
                            Forgot password?
                          </LinkButton.Label>
                        </LinkButton>
                      </Link>
                    </View>
                    <Input
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      value={field.state.value}
                      secureTextEntry
                      onChangeText={field.handleChange}
                      onBlur={field.handleBlur}
                      returnKeyType="send"
                    />

                    <FieldError isInvalid={!!clerkErrors.fields.password}>
                      {clerkErrors.fields.password?.message}
                    </FieldError>
                  </TextField>
                )}
              </signInForm.Field>
            </Card.Body>

            <Card.Footer className="flex-col gap-4">
              {clerkErrors.global?.[0] && (
                <Text className="text-danger text-sm text-left">
                  {clerkErrors.global[0].message}
                </Text>
              )}

              <signInForm.Subscribe selector={(state) => [state.isSubmitting, state.values]}>
                {([isSubmitting, values]) => {
                  const { emailAddress, password } = values as {
                    emailAddress: string;
                    password: string;
                  };
                  return (
                    <Button
                      variant="primary"
                      onPress={() => signInForm.handleSubmit()}
                      isDisabled={
                        !emailAddress || !password || !!isSubmitting || fetchStatus === "fetching"
                      }
                      className="w-full"
                    >
                      Sign In
                    </Button>
                  );
                }}
              </signInForm.Subscribe>
            </Card.Footer>
          </Card>

          <OrDivider />
          <SignInWithGoogleButton />
          <SignInWithAppleButton />
        </View>
      </View>

      <View className="items-end flex-row gap-1 justify-center">
        <Text className="text-base text-muted">Don't have an account?</Text>
        <Link href="/sign-up" asChild>
          <LinkButton>
            <LinkButton.Label className="text-accent">Sign up</LinkButton.Label>
          </LinkButton>
        </Link>
      </View>
      {/* </ScrollView> */}
    </SafeAreaView>
  );
}

function OrDivider() {
  return (
    <View className="flex-row items-center">
      <View className="flex-1 h-px bg-border" />
      <Text className="mx-2 text-muted">OR</Text>
      <View className="flex-1 h-px bg-border" />
    </View>
  );
}
