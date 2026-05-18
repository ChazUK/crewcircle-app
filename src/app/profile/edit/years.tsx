import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Card, Label, Spinner } from "heroui-native";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";

import { BottomSheetSelect, type SelectOption } from "@/components/form/BottomSheetSelect";
import { Title } from "@/components/ui/Title";

export default function EditYearsScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateProfileYears = useMutation(api.users.mutations.updateProfileYears.updateProfileYears);

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

  const startYear =
    profile.mode === "self" && profile.startYearInDepartment !== undefined
      ? profile.startYearInDepartment
      : undefined;

  return (
    <EditYearsForm
      initialStartYear={startYear}
      onDone={() => router.back()}
      onSubmit={updateProfileYears}
    />
  );
}

type FormProps = {
  initialStartYear: number | undefined;
  onDone: () => void;
  onSubmit: (args: { startYearInDepartment: number }) => Promise<unknown>;
};

function EditYearsForm({ initialStartYear, onDone, onSubmit }: FormProps) {
  const yearOptions = useMemo<SelectOption[]>(() => {
    const currentYear = new Date().getFullYear();
    const options: SelectOption[] = [];
    for (let y = currentYear; y >= 1900; y--) {
      options.push({ value: String(y), label: String(y) });
    }
    return options;
  }, []);

  const form = useForm({
    defaultValues: {
      startYear: initialStartYear !== undefined ? String(initialStartYear) : "",
    },
    onSubmit: async ({ value }) => {
      if (!value.startYear) return;
      await onSubmit({ startYearInDepartment: Number(value.startYear) });
      onDone();
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <Card className="gap-4">
        <Card.Body className="gap-4">
          <form.Field name="startYear">
            {(field) => (
              <View className="gap-2">
                <Label>Year started in department</Label>
                <BottomSheetSelect
                  options={yearOptions}
                  value={field.state.value}
                  placeholder="Select year"
                  searchable
                  searchPlaceholder="Search year..."
                  onChange={field.handleChange}
                />
              </View>
            )}
          </form.Field>
        </Card.Body>

        <Card.Footer className="flex-col gap-4">
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
              startYear: state.values.startYear,
            })}
          >
            {({ canSubmit, isSubmitting, startYear }) => (
              <Button
                variant="primary"
                onPress={() => form.handleSubmit()}
                isDisabled={!canSubmit || isSubmitting || !startYear}
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
