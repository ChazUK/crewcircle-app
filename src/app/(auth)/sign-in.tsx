import { useSignIn } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { Image } from "expo-image";
import { type Href, Link, useRouter } from "expo-router";
import { Button, Card, FieldError, Input, Label, LinkButton, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { VerifyCodeScreen } from "@/components/ui/VerifyCodeScreen";

export default function Page() {
  const { signIn, errors: clerkErrors, fetchStatus } = useSignIn();
  const router = useRouter();

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
        emailAddress: value.emailAddress,
        password: value.password,
      });

      if (error) {
        console.error(JSON.stringify(error, null, 2));
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
          await signIn.mfa.sendPhoneCode();
          setSecondFactorStrategy("phone_code");
        } else if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
          setSecondFactorStrategy("email_code");
        }
      } else if (signIn.status === "needs_client_trust") {
        // For other second factor strategies,
        // see https://clerk.com/docs/guides/development/custom-flows/authentication/client-trust
        const emailCodeFactor = signIn.supportedSecondFactors.find(
          (factor) => factor.strategy === "email_code",
        );

        if (emailCodeFactor) {
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

        const url = decorateUrl("/");

        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url as Href);
        }
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
                error={clerkErrors.fields.code?.message}
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
                error={clerkErrors.fields.code?.message}
                onResend={() => signIn.mfa.sendEmailCode()}
              />
            )}
          </verifyForm.Subscribe>
        )}
      </verifyForm.Field>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 gap-6">
            <View className="items-center gap-4 mx-4 my-8">
              <Image
                source={require("@/assets/icons/splash-icon-dark.png")}
                style={{ width: 96, height: 96 }}
              />
              <Text className="text-3xl font-bold">Sign in to your account</Text>
              <Text className="text-muted">Enter your email and password to log in</Text>
            </View>

            <Card className="gap-4 mx-4">
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
                      {clerkErrors.fields.identifier && (
                        <FieldError>{clerkErrors.fields.identifier.message}</FieldError>
                      )}
                    </TextField>
                  )}
                </signInForm.Field>

                <signInForm.Field name="password">
                  {(field) => (
                    <TextField isInvalid={!!clerkErrors.fields.password}>
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
                      {clerkErrors.fields.password && (
                        <FieldError>{clerkErrors.fields.password.message}</FieldError>
                      )}
                    </TextField>
                  )}
                </signInForm.Field>
              </Card.Body>

              <Card.Footer className="flex-col gap-4">
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

            <View className="flex-row gap-1 justify-center">
              <Text className="text-sm text-muted">Don't have an account?</Text>
              <Link href="/sign-up" asChild>
                <LinkButton size="sm">
                  <LinkButton.Label className="text-accent">Sign up</LinkButton.Label>
                </LinkButton>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
