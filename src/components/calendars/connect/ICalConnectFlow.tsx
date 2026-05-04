import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { useAction } from "convex/react";
import { Button, FieldError, Input, Label, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

type Step = "form" | "syncing";

type Props = {
  onBack: () => void;
};

export function ICalConnectFlow({ onBack }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [urlError, setUrlError] = useState<string | null>(null);
  const connectIcal = useAction(api.calendars.actions.connectIcal);

  const form = useForm({
    defaultValues: {
      url: "",
      label: "",
    },
    onSubmit: async ({ value }) => {
      setStep("syncing");
      setUrlError(null);
      try {
        await connectIcal({
          url: value.url.trim(),
          label: value.label.trim() || "iCal Calendar",
        });
        onBack();
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("ICAL_UNREACHABLE")) {
          setUrlError("We couldn't reach this URL. Please check it and try again.");
        } else {
          setUrlError("This URL doesn't appear to be a valid iCal feed.");
        }
        setStep("form");
      }
    },
  });

  return (
    <View className="flex-1 gap-6 py-4">
      <View className="flex-row items-center gap-2 px-1">
        <Button
          variant="tertiary"
          size="sm"
          onPress={onBack}
          accessibilityLabel="Back to calendars"
        >
          ← Back
        </Button>
        <Text className="text-base font-semibold text-foreground">iCal / Webcal</Text>
      </View>

      <View className="items-center gap-3 py-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-default-100">
          <Text className="text-2xl">📅</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          Subscribe to a calendar via iCal or Webcal feed URL
        </Text>
      </View>

      {step === "syncing" ? (
        <View className="items-center py-4">
          <Spinner />
        </View>
      ) : (
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
                      if (urlError) setUrlError(null);
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

          <Button
            onPress={() => form.handleSubmit()}
            className="w-full"
            accessibilityLabel="Connect iCal calendar"
          >
            Connect
          </Button>
        </View>
      )}
    </View>
  );
}
