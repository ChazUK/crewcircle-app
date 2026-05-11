import { useForm } from "@tanstack/react-form";
import { Button, FieldError, Input, Label, TextField } from "heroui-native";
import { View } from "react-native";

type Props = {
  isSubmitting: boolean;
  urlError: string | null;
  onClearUrlError: () => void;
  onSubmit: (values: { url: string; label: string }) => void;
  onCancel: () => void;
};

export function ICalConnectForm({
  isSubmitting,
  urlError,
  onClearUrlError,
  onSubmit,
  onCancel,
}: Props) {
  const form = useForm({
    defaultValues: {
      url: "",
      label: "",
    },
    onSubmit: ({ value }) => {
      onSubmit({
        url: value.url.trim(),
        label: value.label.trim() || "iCal Calendar",
      });
    },
  });

  return (
    <View className="gap-4">
      <form.Field
        name="url"
        validators={{
          onSubmit: ({ value }) => (!value.trim() ? "Please enter a URL" : undefined),
        }}
      >
        {(field) => {
          const fieldError = field.state.meta.errors.find(Boolean) as string | undefined;
          const shownError = fieldError ?? urlError ?? undefined;
          return (
            <TextField isInvalid={!!shownError}>
              <Label>Calendar URL</Label>
              <Input
                keyboardType="url"
                autoCorrect={false}
                autoCapitalize="none"
                value={field.state.value}
                onChangeText={(text) => {
                  field.handleChange(text);
                  if (urlError) onClearUrlError();
                }}
                onBlur={field.handleBlur}
              />
              <FieldError isInvalid={!!shownError}>{shownError}</FieldError>
            </TextField>
          );
        }}
      </form.Field>

      <form.Field name="label">
        {(field) => (
          <TextField>
            <Label>Label</Label>
            <Input
              placeholder="iCal Calendar"
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
            />
          </TextField>
        )}
      </form.Field>

      <View className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" onPress={onCancel} isDisabled={isSubmitting}>
          Back
        </Button>
        <Button
          size="sm"
          onPress={() => form.handleSubmit()}
          isDisabled={isSubmitting}
          accessibilityLabel="Connect iCal calendar"
        >
          Connect
        </Button>
      </View>
    </View>
  );
}
