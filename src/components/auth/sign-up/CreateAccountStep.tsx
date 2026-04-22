import { useForm } from "@tanstack/react-form";
import { Link } from "expo-router";
import { Button, FieldError, Input, Label, TextField } from "heroui-native";
import { Text, View } from "react-native";

import { StepLayout } from "./StepLayout";

type SubmitData = { email: string; password: string };

type Props = {
  onSubmit: (data: SubmitData) => Promise<void>;
  emailError?: string;
  passwordError?: string;
  globalError?: string;
  isFetching: boolean;
};

export function CreateAccountStep({
  onSubmit,
  emailError,
  passwordError,
  globalError,
  isFetching,
}: Props) {
  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <StepLayout
      title="Create your account"
      subtitle="We'll use this to sign you in and send important updates."
    >
      <View className="flex-1 px-4 gap-4">
        <form.Field name="email">
          {(field) => (
            <TextField isRequired isInvalid={!!emailError}>
              <Label>Email</Label>
              <Input
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
              <FieldError isInvalid={!!emailError}>{emailError}</FieldError>
            </TextField>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <TextField isRequired isInvalid={!!passwordError}>
              <Label>Password</Label>
              <Input
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                returnKeyType="send"
              />
              <FieldError isInvalid={!!passwordError}>{passwordError}</FieldError>
            </TextField>
          )}
        </form.Field>

        {globalError && <Text className="text-danger text-sm">{globalError}</Text>}
      </View>
      <View>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              variant="primary"
              onPress={() => form.handleSubmit()}
              isDisabled={!canSubmit || !!isSubmitting || isFetching}
              className="w-full"
            >
              {isSubmitting ? "Creating account..." : "Continue"}
            </Button>
          )}
        </form.Subscribe>

        <Text className="text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{"\n"}
          <Link href="https://www.crewcircle.com/terms" className="text-accent">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="https://www.crewcircle.com/privacy" className="text-accent">
            Privacy Policy
          </Link>
        </Text>
      </View>
    </StepLayout>
  );
}
