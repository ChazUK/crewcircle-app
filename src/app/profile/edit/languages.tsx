import { api } from "@convex/_generated/api";
import {
  FLUENCY_LABELS,
  FLUENCY_LEVELS,
  LANGUAGE_CODES,
  LANGUAGE_NAMES,
  type Fluency,
  type LanguageCode,
} from "@shared/profile/languages";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { TrashIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BottomSheetSelect, type SelectOption } from "@/components/form/BottomSheetSelect";
import { Title } from "@/components/ui/Title";

type SpokenLanguageEntry = { code: string; fluency: string };

const languageOptions: SelectOption[] = LANGUAGE_CODES.map((code) => ({
  value: code,
  label: LANGUAGE_NAMES[code],
}));

const fluencyOptions: SelectOption[] = FLUENCY_LEVELS.map((level) => ({
  value: level,
  label: FLUENCY_LABELS[level],
}));

export default function EditLanguagesScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateLanguages = useMutation(
    api.users.mutations.updateProfileLanguages.updateProfileLanguages,
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
    profile.mode === "self" || profile.mode === "contact" ? (profile.spokenLanguages ?? []) : [];

  return (
    <EditLanguagesForm
      initialLanguages={current}
      onDone={() => router.back()}
      onSubmit={updateLanguages}
    />
  );
}

type FormProps = {
  initialLanguages: SpokenLanguageEntry[];
  onDone: () => void;
  onSubmit: (args: { spokenLanguages: SpokenLanguageEntry[] }) => Promise<unknown>;
};

function EditLanguagesForm({ initialLanguages, onDone, onSubmit }: FormProps) {
  const form = useForm({
    defaultValues: {
      spokenLanguages: initialLanguages,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ spokenLanguages: value.spokenLanguages });
      onDone();
    },
  });

  const [pendingCode, setPendingCode] = useState<string | undefined>(undefined);
  const [pendingFluency, setPendingFluency] = useState<string | undefined>(undefined);

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <form.Field name="spokenLanguages">
        {(field) => {
          const usedCodes = new Set(field.state.value.map((e) => e.code));
          const availableLanguages = languageOptions.filter((o) => !usedCodes.has(o.value));

          const addEntry = () => {
            if (pendingCode && pendingFluency) {
              field.handleChange([
                ...field.state.value,
                { code: pendingCode, fluency: pendingFluency },
              ]);
              setPendingCode(undefined);
              setPendingFluency(undefined);
            }
          };

          const removeEntry = (code: string) => {
            field.handleChange(field.state.value.filter((e) => e.code !== code));
          };

          return (
            <View className="gap-4">
              {field.state.value.map((entry) => (
                <View key={entry.code} className="flex-row items-center gap-2">
                  <Text className="flex-1 text-sm text-foreground">
                    {LANGUAGE_NAMES[entry.code as LanguageCode] ?? entry.code}
                  </Text>
                  <Text className="text-sm text-muted">
                    {FLUENCY_LABELS[entry.fluency as Fluency] ?? entry.fluency}
                  </Text>
                  <Pressable onPress={() => removeEntry(entry.code)} hitSlop={8}>
                    <TrashIcon size={16} className="text-danger" />
                  </Pressable>
                </View>
              ))}

              {availableLanguages.length > 0 ? (
                <View className="border-divider gap-3 rounded-lg border p-3">
                  <BottomSheetSelect
                    options={availableLanguages}
                    value={pendingCode}
                    placeholder="Select language"
                    searchable
                    searchPlaceholder="Search languages..."
                    onChange={setPendingCode}
                  />
                  <BottomSheetSelect
                    options={fluencyOptions}
                    value={pendingFluency}
                    placeholder="Select fluency"
                    onChange={setPendingFluency}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={addEntry}
                    isDisabled={!pendingCode || !pendingFluency}
                  >
                    Add Language
                  </Button>
                </View>
              ) : null}
            </View>
          );
        }}
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
