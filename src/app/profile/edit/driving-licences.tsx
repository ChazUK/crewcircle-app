import { api } from "@convex/_generated/api";
import { DRIVING_LICENCES } from "@shared/profile/drivingLicences";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Checkbox, ControlField, Label, Spinner } from "heroui-native";
import { ScrollView, View } from "react-native";

import { Title } from "@/components/ui/Title";

export default function EditDrivingLicencesScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateDrivingLicences = useMutation(
    api.users.mutations.updateProfileDrivingLicences.updateProfileDrivingLicences,
  );

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (profile === null || profile.userType !== "crew") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Title title="Sign in to edit your profile" />
      </View>
    );
  }

  const current =
    profile.mode === "self" || profile.mode === "contact" ? (profile.drivingLicences ?? []) : [];

  return (
    <EditDrivingLicencesForm
      initialLicences={current}
      onDone={() => router.back()}
      onSubmit={updateDrivingLicences}
    />
  );
}

type FormProps = {
  initialLicences: string[];
  onDone: () => void;
  onSubmit: (args: { drivingLicences: string[] }) => Promise<unknown>;
};

function EditDrivingLicencesForm({ initialLicences, onDone, onSubmit }: FormProps) {
  const form = useForm({
    defaultValues: {
      drivingLicences: initialLicences,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ drivingLicences: value.drivingLicences });
      onDone();
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <form.Field name="drivingLicences">
        {(field) => (
          <View className="gap-3">
            {DRIVING_LICENCES.map((licence) => {
              const isSelected = field.state.value.includes(licence);
              return (
                <ControlField
                  key={licence}
                  isSelected={isSelected}
                  onSelectedChange={() => {
                    const next = isSelected
                      ? field.state.value.filter((l) => l !== licence)
                      : [...field.state.value, licence];
                    field.handleChange(next);
                  }}
                >
                  <ControlField.Indicator>
                    <Checkbox />
                  </ControlField.Indicator>
                  <Label>{licence}</Label>
                </ControlField>
              );
            })}
          </View>
        )}
      </form.Field>

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
    </ScrollView>
  );
}
