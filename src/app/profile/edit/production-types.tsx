import { api } from "@convex/_generated/api";
import { PRODUCTION_TYPES } from "@shared/profile/productionTypes";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Checkbox, ControlField, Label, Spinner } from "heroui-native";
import { ScrollView, View } from "react-native";

import { Title } from "@/components/ui/Title";

export default function EditProductionTypesScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateProductionTypes = useMutation(
    api.users.mutations.updateProfileProductionTypes.updateProfileProductionTypes,
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
    profile.mode === "self" || profile.mode === "contact" ? (profile.productionTypes ?? []) : [];

  return (
    <EditProductionTypesForm
      initialTypes={current}
      onDone={() => router.back()}
      onSubmit={updateProductionTypes}
    />
  );
}

type FormProps = {
  initialTypes: string[];
  onDone: () => void;
  onSubmit: (args: { productionTypes: string[] }) => Promise<unknown>;
};

function EditProductionTypesForm({ initialTypes, onDone, onSubmit }: FormProps) {
  const form = useForm({
    defaultValues: {
      productionTypes: initialTypes,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ productionTypes: value.productionTypes });
      onDone();
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <form.Field name="productionTypes">
        {(field) => (
          <View className="gap-3">
            {PRODUCTION_TYPES.map((type) => {
              const isSelected = field.state.value.includes(type);
              return (
                <ControlField
                  key={type}
                  isSelected={isSelected}
                  onSelectedChange={() => {
                    const next = isSelected
                      ? field.state.value.filter((t) => t !== type)
                      : [...field.state.value, type];
                    field.handleChange(next);
                  }}
                >
                  <ControlField.Indicator>
                    <Checkbox />
                  </ControlField.Indicator>
                  <Label>{type}</Label>
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
