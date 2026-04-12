import { Button, Chip, CloseButton } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { LANGUAGES } from "@/data/languages";

import { Picker } from "./Picker";

export type FluencyLevel = "Native" | "Fluent" | "Conversational" | "Basic";

export type LanguageEntry = {
  language: string;
  fluency: FluencyLevel;
};

const ALL_LANGUAGE_OPTIONS = LANGUAGES.map(({ name, nativeName }) => ({
  value: name,
  label: name === nativeName ? name : `${name} (${nativeName})`,
}));

const FLUENCY_OPTIONS: { value: FluencyLevel; label: string }[] = [
  { value: "Native", label: "Native" },
  { value: "Fluent", label: "Fluent" },
  { value: "Conversational", label: "Conversational" },
  { value: "Basic", label: "Basic" },
];

const FLUENCY_SHORT: Record<FluencyLevel, string> = {
  Native: "Native",
  Fluent: "Fluent",
  Conversational: "Conv.",
  Basic: "Basic",
};

type Props = {
  value: LanguageEntry[];
  onChange: (entries: LanguageEntry[]) => void;
};

export function LanguageFluencySelector({ value, onChange }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [pendingFluency, setPendingFluency] = useState<FluencyLevel>("Fluent");

  const selectedLanguages = new Set(value.map((e) => e.language));
  const availableOptions = ALL_LANGUAGE_OPTIONS.filter((o) => !selectedLanguages.has(o.value));
  const canAdd = availableOptions.length > 0 && !isAdding;

  const startAdding = () => {
    setPendingLanguage(null);
    setPendingFluency("Fluent");
    setIsAdding(true);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setPendingLanguage(null);
    setPendingFluency("Fluent");
  };

  const confirmAdd = () => {
    if (!pendingLanguage) return;
    onChange([...value, { language: pendingLanguage, fluency: pendingFluency }]);
    cancelAdding();
  };

  const removeLanguage = (language: string) => {
    onChange(value.filter((e) => e.language !== language));
  };

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2 p-3 rounded-xl border border-default-200 items-center min-h-[52px]">
        {value.map((entry) => (
          <Chip key={entry.language} animation="disable-all" color="default" variant="soft">
            <View className="flex-row items-center gap-1 pl-1">
              <Chip.Label>
                {entry.language} ({FLUENCY_SHORT[entry.fluency]})
              </Chip.Label>
              <CloseButton
                onPress={() => removeLanguage(entry.language)}
                accessibilityLabel={`Remove ${entry.language}`}
              />
            </View>
          </Chip>
        ))}
        {canAdd && (
          <Button
            variant="secondary"
            size="sm"
            onPress={startAdding}
            accessibilityLabel="Add language"
          >
            + Add
          </Button>
        )}
      </View>

      {isAdding && (
        <View className="gap-3 p-3 rounded-xl border border-default-200 bg-default-50">
          <Picker
            value={pendingLanguage}
            onChange={setPendingLanguage}
            options={availableOptions}
            label="Language"
            listLabel="Select language"
            placeholder="Select language"
            snapPoints={["60%"]}
            searchable
            searchPlaceholder="Search languages..."
          />
          <Picker
            value={pendingFluency}
            onChange={(f) => {
              if (FLUENCY_OPTIONS.some((o) => o.value === f)) {
                setPendingFluency(f as FluencyLevel);
              }
            }}
            options={FLUENCY_OPTIONS}
            label="Fluency"
            listLabel="Select fluency"
            snapPoints={["40%"]}
          />
          <View className="flex-row gap-2 justify-end">
            <Button variant="tertiary" size="sm" onPress={cancelAdding}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onPress={confirmAdd} isDisabled={!pendingLanguage}>
              Add
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
