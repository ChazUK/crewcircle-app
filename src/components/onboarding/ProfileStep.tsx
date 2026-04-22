import { useForm } from "@tanstack/react-form";
import { Button, Card, FieldError, Input, Label, TextField } from "heroui-native";
import { Text } from "react-native";

import { StepLayout } from "./StepLayout";

export type ProfileData = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
};

type Props = {
  onSubmit: (data: ProfileData) => Promise<void>;
  globalError?: string;
  isFetching: boolean;
};

export function ProfileStep({ onSubmit, globalError, isFetching }: Props) {
  const form = useForm({
    defaultValues: { firstName: "", lastName: "", phone: "", city: "" },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <StepLayout title="Your profile" subtitle="Tell us a bit about yourself.">
      <Card className="mx-4">
        <Card.Body className="gap-4">
          <form.Field name="firstName">
            {(field) => (
              <TextField isRequired isInvalid={field.state.meta.isTouched && !field.state.value}>
                <Label>First name</Label>
                <Input
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  returnKeyType="next"
                />
                <FieldError isInvalid={field.state.meta.isTouched && !field.state.value}>
                  Required
                </FieldError>
              </TextField>
            )}
          </form.Field>

          <form.Field name="lastName">
            {(field) => (
              <TextField isRequired isInvalid={field.state.meta.isTouched && !field.state.value}>
                <Label>Last name</Label>
                <Input
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  returnKeyType="next"
                />
                <FieldError isInvalid={field.state.meta.isTouched && !field.state.value}>
                  Required
                </FieldError>
              </TextField>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <TextField>
                <Label>Phone number (optional)</Label>
                <Input
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </TextField>
            )}
          </form.Field>

          <form.Field name="city">
            {(field) => (
              <TextField isRequired isInvalid={field.state.meta.isTouched && !field.state.value}>
                <Label>City you're based in</Label>
                <Input
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  autoCapitalize="words"
                  autoComplete="address-line1"
                  returnKeyType="done"
                />
                <FieldError isInvalid={field.state.meta.isTouched && !field.state.value}>
                  Required
                </FieldError>
              </TextField>
            )}
          </form.Field>
        </Card.Body>

        <Card.Footer className="flex-col gap-3">
          {globalError && <Text className="text-danger text-sm">{globalError}</Text>}

          <form.Subscribe selector={(s) => [s.isSubmitting, s.values]}>
            {([isSubmitting, values]) => {
              const { firstName, lastName, city } = values as ProfileData;
              return (
                <Button
                  variant="primary"
                  onPress={() => form.handleSubmit()}
                  isDisabled={!firstName || !lastName || !city || !!isSubmitting || isFetching}
                  className="w-full"
                >
                  {isSubmitting ? "Saving..." : "Continue"}
                </Button>
              );
            }}
          </form.Subscribe>
        </Card.Footer>
      </Card>
    </StepLayout>
  );
}
