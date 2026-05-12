import { isClerkAPIResponseError, useUser } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { Button, Card, FieldError, Input, Label, TextField } from "heroui-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
};

export default function ChangePassword() {
  const router = useRouter();
  const { user } = useUser();

  const [globalError, setGlobalError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (!user) return;

      setGlobalError(undefined);
      setFieldErrors({});

      try {
        await user.updatePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          signOutOfOtherSessions: true,
        });

        router.back();
      } catch (err) {
        if (isClerkAPIResponseError(err)) {
          const next: FieldErrors = {};
          let global: string | undefined;

          for (const apiError of err.errors) {
            const param = apiError.meta?.paramName;
            const message = apiError.longMessage ?? apiError.message;

            if (param === "current_password") {
              next.currentPassword = message;
            } else if (param === "password" || param === "new_password") {
              next.newPassword = message;
            } else {
              global = global ?? message;
            }
          }

          setFieldErrors(next);
          setGlobalError(global);
        } else {
          setGlobalError("Something went wrong. Please try again.");
        }
      }
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <View className="gap-1">
        <Text className="text-base text-muted">
          Enter your current password and choose a new one. You'll be signed out of other devices.
        </Text>
      </View>

      <Card className="gap-4">
        <Card.Body className="gap-4">
          <form.Field name="currentPassword">
            {(field) => (
              <TextField isRequired isInvalid={!!fieldErrors.currentPassword}>
                <Label>Current password</Label>
                <Input
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  secureTextEntry
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  returnKeyType="next"
                />
                <FieldError isInvalid={!!fieldErrors.currentPassword}>
                  {fieldErrors.currentPassword}
                </FieldError>
              </TextField>
            )}
          </form.Field>

          <form.Field name="newPassword">
            {(field) => (
              <TextField isRequired isInvalid={!!fieldErrors.newPassword}>
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
                <FieldError isInvalid={!!fieldErrors.newPassword}>
                  {fieldErrors.newPassword}
                </FieldError>
              </TextField>
            )}
          </form.Field>

          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["newPassword"],
              onChange: ({ value, fieldApi }) => {
                const newPassword = fieldApi.form.getFieldValue("newPassword");
                if (!value) return "Required";
                if (value !== newPassword) return "Passwords do not match";
                return undefined;
              },
            }}
          >
            {(field) => (
              <TextField isRequired isInvalid={!!field.state.meta.errors.length}>
                <Label>Confirm new password</Label>
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
          </form.Field>
        </Card.Body>

        <Card.Footer className="flex-col gap-4">
          {globalError && <Text className="text-danger text-sm text-left">{globalError}</Text>}

          <form.Subscribe selector={(state) => [state.isSubmitting, state.values]}>
            {([isSubmitting, values]) => {
              const { currentPassword, newPassword, confirmPassword } = values as {
                currentPassword: string;
                newPassword: string;
                confirmPassword: string;
              };
              const isDisabled =
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                !!isSubmitting;

              return (
                <Button
                  variant="primary"
                  onPress={() => form.handleSubmit()}
                  isDisabled={isDisabled}
                  className="w-full"
                >
                  {isSubmitting ? "Saving..." : "Update password"}
                </Button>
              );
            }}
          </form.Subscribe>
        </Card.Footer>
      </Card>
    </ScrollView>
  );
}
