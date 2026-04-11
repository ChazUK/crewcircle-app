import { useSignIn } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { Image } from "expo-image";
import { type Href, Link, useRouter } from "expo-router";
import {
  Button,
  Card,
  FieldError,
  Input,
  InputOTP,
  Label,
  LinkButton,
  TextField,
} from "heroui-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Page() {
  const { signIn, errors: clerkErrors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [resendCountdown, setResendCountdown] = useState(30);

  useEffect(() => {
    if (resendCountdown === 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleResendCode = async () => {
    await signIn.mfa.sendEmailCode();
    setResendCountdown(30);
  };

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
      } else if (signIn.status === "needs_second_factor") {
        // See https://clerk.com/docs/guides/development/custom-flows/authentication/multi-factor-authentication
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
      await signIn.mfa.verifyEmailCode({ code: value.code });

      if (signIn.status === "complete") {
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
      } else {
        console.error("Sign-in attempt not complete:", signIn);
      }
    },
  });

  if (signIn.status === "needs_client_trust") {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <View className="self-start">
            <Button variant="ghost" onPress={() => signIn.reset()} className="-ml-2">
              ← Back
            </Button>
          </View>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-1 gap-6 p-5">
              <View className="items-center gap-4 mx-4 mb-2">
                <Text className="text-3xl font-bold">Verify your account</Text>
                <Text className="text-muted">Enter the the 6-digit code sent to your email</Text>
              </View>

              <Card className="gap-4 mx-4">
                <Card.Body className="gap-4 items-center">
                  <verifyForm.Field name="code">
                    {(field) => (
                      <View className="gap-2 items-center">
                        <InputOTP
                          maxLength={6}
                          value={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          isInvalid={!!clerkErrors.fields.code}
                          onComplete={() => verifyForm.handleSubmit()}
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
                        {clerkErrors.fields.code && (
                          <FieldError>{clerkErrors.fields.code.message}</FieldError>
                        )}
                      </View>
                    )}
                  </verifyForm.Field>
                </Card.Body>
                <Card.Footer className="gap-3 flex-col">
                  <verifyForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        variant="primary"
                        onPress={() => verifyForm.handleSubmit()}
                        isDisabled={!canSubmit || isSubmitting || fetchStatus === "fetching"}
                        className="w-full"
                      >
                        {isSubmitting ? "Verifying..." : "Verify"}
                      </Button>
                    )}
                  </verifyForm.Subscribe>
                </Card.Footer>
              </Card>
              <View className="items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  isDisabled={resendCountdown > 0}
                  onPress={handleResendCode}
                >
                  {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
                </Button>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
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

            <View className="flex-row gap-1 justify-center ">
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
