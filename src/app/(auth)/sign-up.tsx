import { useAuth, useSignUp } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { Image } from "expo-image";
import { type Href, Link, useRouter } from "expo-router";
import { Button, Card, FieldError, Input, Label, LinkButton, TextField } from "heroui-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { VerifyCodeScreen } from "@/components/ui/VerifyCodeScreen";

export default function Page() {
  const { signUp, errors: clerkErrors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [pendingVerification, setPendingVerification] = useState(false);

  useEffect(() => {
    return () => {
      signUp.reset();
    };
  }, []);

  const signUpForm = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      emailAddress: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await signUp.password({
        firstName: value.firstName,
        lastName: value.lastName,
        emailAddress: value.emailAddress,
        password: value.password,
      });

      if (error) {
        console.error(JSON.stringify(error, null, 2));

        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();

      if (sendError) {
        console.error(JSON.stringify(sendError, null, 2));
        return;
      }

      setPendingVerification(true);
    },
  });

  const verifyForm = useForm({
    defaultValues: {
      code: "",
    },
    onSubmit: async ({ value }) => {
      await signUp.verifications.verifyEmailCode({ code: value.code });

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);

              return;
            }

            router.replace(decorateUrl("/") as Href);
          },
        });
      } else {
        console.error("Sign-up attempt not complete:", signUp);
      }
    },
  });

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  if (pendingVerification) {
    return (
      <verifyForm.Field name="code">
        {(field) => (
          <verifyForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <VerifyCodeScreen
                title="Verify your email"
                subtitle="Enter the 6-digit code sent to your email"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                onSubmit={() => verifyForm.handleSubmit()}
                onBack={() => setPendingVerification(false)}
                isLoading={!!isSubmitting}
                isDisabled={!canSubmit || !!isSubmitting || fetchStatus === "fetching"}
                error={clerkErrors.fields.code?.message ?? clerkErrors.global?.[0]?.message}
                onResend={() => signUp.verifications.sendEmailCode()}
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
              <Text className="text-3xl font-bold">Create an account</Text>
              <Text className="text-muted">Enter your details to get started</Text>
            </View>

            <Card className="gap-4 mx-4">
              <Card.Body className="gap-4">
                <View className="flex-row gap-3">
                  <signUpForm.Field name="firstName">
                    {(field) => (
                      <TextField
                        className="flex-1"
                        isRequired
                        isInvalid={!!clerkErrors.fields.firstName}
                      >
                        <Label>First name</Label>
                        <Input
                          autoComplete="given-name"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          onBlur={field.handleBlur}
                          returnKeyType="next"
                        />
                        {clerkErrors.fields.firstName && (
                          <FieldError>{clerkErrors.fields.firstName.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  </signUpForm.Field>

                  <signUpForm.Field name="lastName">
                    {(field) => (
                      <TextField
                        className="flex-1"
                        isRequired
                        isInvalid={!!clerkErrors.fields.lastName}
                      >
                        <Label>Last name</Label>
                        <Input
                          autoComplete="family-name"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          onBlur={field.handleBlur}
                          returnKeyType="next"
                        />
                        {clerkErrors.fields.lastName && (
                          <FieldError>{clerkErrors.fields.lastName.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  </signUpForm.Field>
                </View>

                <signUpForm.Field name="emailAddress">
                  {(field) => (
                    <TextField isRequired isInvalid={!!clerkErrors.fields.emailAddress}>
                      <Label>Email address</Label>
                      <Input
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                        keyboardType="email-address"
                        returnKeyType="next"
                      />
                      {clerkErrors.fields.emailAddress && (
                        <FieldError>{clerkErrors.fields.emailAddress.message}</FieldError>
                      )}
                    </TextField>
                  )}
                </signUpForm.Field>

                <signUpForm.Field name="password">
                  {(field) => (
                    <TextField isRequired isInvalid={!!clerkErrors.fields.password}>
                      <Label>Password</Label>
                      <Input
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
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
                </signUpForm.Field>
              </Card.Body>

              <Card.Footer className="flex-col gap-4">
                <signUpForm.Subscribe selector={(state) => [state.isSubmitting, state.values]}>
                  {([isSubmitting, values]) => {
                    const { firstName, lastName, emailAddress, password } = values as {
                      firstName: string;
                      lastName: string;
                      emailAddress: string;
                      password: string;
                    };
                    return (
                      <Button
                        variant="primary"
                        onPress={() => signUpForm.handleSubmit()}
                        isDisabled={
                          !firstName ||
                          !lastName ||
                          !emailAddress ||
                          !password ||
                          !!isSubmitting ||
                          fetchStatus === "fetching"
                        }
                        className="w-full"
                      >
                        Create account
                      </Button>
                    );
                  }}
                </signUpForm.Subscribe>
              </Card.Footer>
            </Card>

            {clerkErrors.global?.[0] && (
              <Text className="text-danger text-sm text-center mx-4">
                {clerkErrors.global[0].message}
              </Text>
            )}

            <View className="flex-row gap-1 justify-center">
              <Text className="text-sm text-muted">Already have an account?</Text>
              <Link href="../" asChild>
                <LinkButton size="sm">
                  <LinkButton.Label className="text-accent">Sign in</LinkButton.Label>
                </LinkButton>
              </Link>
            </View>

            <View nativeID="clerk-captcha" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
