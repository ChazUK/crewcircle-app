import { api } from "@convex/_generated/api";
import { COUNTRIES } from "@shared/countries/countries";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Checkbox, ControlField, Label, Spinner } from "heroui-native";
import { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";

import { Title } from "@/components/ui/Title";

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ code: c.code, name: c.name }));

export default function EditPassportsScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updatePassports = useMutation(
    api.users.mutations.updateProfilePassports.updateProfilePassports,
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
    profile.mode === "self" || profile.mode === "contact" ? (profile.passports ?? []) : [];

  return (
    <EditPassportsForm
      initialPassports={current}
      onDone={() => router.back()}
      onSubmit={updatePassports}
    />
  );
}

type FormProps = {
  initialPassports: string[];
  onDone: () => void;
  onSubmit: (args: { passports: string[] }) => Promise<unknown>;
};

function EditPassportsForm({ initialPassports, onDone, onSubmit }: FormProps) {
  const [search, setSearch] = useState("");

  const form = useForm({
    defaultValues: {
      passports: initialPassports,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ passports: value.passports });
      onDone();
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRY_OPTIONS;
    const q = search.trim().toLowerCase();
    return COUNTRY_OPTIONS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
      <TextInput
        className="border-divider rounded-lg border px-3 py-2 text-sm text-foreground"
        placeholder="Search countries..."
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <form.Field name="passports">
        {(field) => (
          <View className="gap-3">
            {filtered.map((country) => {
              const isSelected = field.state.value.includes(country.code);
              return (
                <ControlField
                  key={country.code}
                  isSelected={isSelected}
                  onSelectedChange={() => {
                    const next = isSelected
                      ? field.state.value.filter((c) => c !== country.code)
                      : [...field.state.value, country.code];
                    field.handleChange(next);
                  }}
                >
                  <ControlField.Indicator>
                    <Checkbox />
                  </ControlField.Indicator>
                  <Label>{country.name}</Label>
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
