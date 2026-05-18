import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Card, FieldError, Input, Label, Spinner, TextField } from "heroui-native";
import { ScrollView, View } from "react-native";

import { CountrySelect } from "@/components/form/CountrySelect";
import { Title } from "@/components/ui/Title";

export default function EditLocationScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateProfileLocation = useMutation(
    api.users.mutations.updateProfileLocation.updateProfileLocation,
  );

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Title title="Sign in to edit your profile" />
      </View>
    );
  }

  const city = "city" in profile ? profile.city : undefined;
  const country = "country" in profile ? profile.country : undefined;

  return (
    <EditLocationForm
      initialCity={city ?? ""}
      initialCountry={country}
      onDone={() => router.back()}
      onSubmit={updateProfileLocation}
    />
  );
}

type FormProps = {
  initialCity: string;
  initialCountry: string | undefined;
  onDone: () => void;
  onSubmit: (args: { city?: string; country?: string }) => Promise<unknown>;
};

function EditLocationForm({ initialCity, initialCountry, onDone, onSubmit }: FormProps) {
  const form = useForm({
    defaultValues: {
      city: initialCity,
      country: initialCountry ?? "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        city: value.city,
        country: value.country || undefined,
      });
      onDone();
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <Card className="gap-4">
        <Card.Body className="gap-4">
          <form.Field name="city">
            {(field) => (
              <TextField>
                <Label>City</Label>
                <Input
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  maxLength={100}
                  placeholder="e.g. London"
                  returnKeyType="done"
                />
                <FieldError isInvalid={!!field.state.meta.errors.length}>
                  {field.state.meta.errors[0]}
                </FieldError>
              </TextField>
            )}
          </form.Field>

          <form.Field name="country">
            {(field) => (
              <TextField>
                <Label>Country</Label>
                <CountrySelect
                  value={field.state.value || undefined}
                  onChange={(val) => field.handleChange(val ?? "")}
                  onBlur={field.handleBlur}
                />
                <FieldError isInvalid={!!field.state.meta.errors.length}>
                  {field.state.meta.errors[0]}
                </FieldError>
              </TextField>
            )}
          </form.Field>
        </Card.Body>

        <Card.Footer className="flex-col gap-4">
          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                variant="primary"
                onPress={() => form.handleSubmit()}
                isDisabled={!canSubmit || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            )}
          </form.Subscribe>
        </Card.Footer>
      </Card>
    </ScrollView>
  );
}
