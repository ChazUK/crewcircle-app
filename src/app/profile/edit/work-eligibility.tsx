import { api } from "@convex/_generated/api";
import { WORK_ELIGIBILITY_REGIONS } from "@shared/profile/workEligibility";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Checkbox, ControlField, Label, Spinner } from "heroui-native";
import { ScrollView, View } from "react-native";

import { Title } from "@/components/ui/Title";

export default function EditWorkEligibilityScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateWorkEligibility = useMutation(
    api.users.mutations.updateProfileWorkEligibility.updateProfileWorkEligibility,
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
    profile.mode === "self" || profile.mode === "contact" ? (profile.workEligibility ?? []) : [];

  return (
    <EditWorkEligibilityForm
      initialRegions={current}
      onDone={() => router.back()}
      onSubmit={updateWorkEligibility}
    />
  );
}

type FormProps = {
  initialRegions: string[];
  onDone: () => void;
  onSubmit: (args: { workEligibility: string[] }) => Promise<unknown>;
};

function EditWorkEligibilityForm({ initialRegions, onDone, onSubmit }: FormProps) {
  const form = useForm({
    defaultValues: {
      workEligibility: initialRegions,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ workEligibility: value.workEligibility });
      onDone();
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <form.Field name="workEligibility">
        {(field) => (
          <View className="gap-3">
            {WORK_ELIGIBILITY_REGIONS.map((region) => {
              const isSelected = field.state.value.includes(region);
              return (
                <ControlField
                  key={region}
                  isSelected={isSelected}
                  onSelectedChange={() => {
                    const next = isSelected
                      ? field.state.value.filter((r) => r !== region)
                      : [...field.state.value, region];
                    field.handleChange(next);
                  }}
                >
                  <ControlField.Indicator>
                    <Checkbox />
                  </ControlField.Indicator>
                  <Label>{region}</Label>
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
