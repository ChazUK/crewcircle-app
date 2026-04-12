import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { LANGUAGES } from "@/data/languages";

import { Picker } from "./Picker";
import { RemovableChip } from "./RemovableChip";

export type ProficiencyLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type LanguageEntry = {
  language: string;
  proficiency: ProficiencyLevel;
};

const ALL_LANGUAGE_OPTIONS = LANGUAGES.map(({ name, nativeName }) => ({
  value: name,
  label: name === nativeName ? name : `${name} (${nativeName})`,
}));

const PROFICIENCY_OPTIONS: { value: ProficiencyLevel; label: string }[] = [
  { value: "A1", label: "A1 — Beginner" },
  { value: "A2", label: "A2 — Elementary" },
  { value: "B1", label: "B1 — Intermediate" },
  { value: "B2", label: "B2 — Upper Intermediate" },
  { value: "C1", label: "C1 — Advanced" },
  { value: "C2", label: "C2 — Proficient" },
];

type Props = {
  value: LanguageEntry[];
  onChange: (entries: LanguageEntry[]) => void;
};

export function LanguageProficiencySelector({ value, onChange }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [pendingProficiency, setPendingProficiency] = useState<ProficiencyLevel>("B1");

  const selectedLanguages = new Set(value.map((e) => e.language));
  const availableOptions = ALL_LANGUAGE_OPTIONS.filter((o) => !selectedLanguages.has(o.value));
  const canAdd = availableOptions.length > 0 && !isAdding;

  const startAdding = () => {
    setPendingLanguage(null);
    setPendingProficiency("B1");
    setIsAdding(true);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setPendingLanguage(null);
    setPendingProficiency("B1");
  };

  const confirmAdd = () => {
    if (!pendingLanguage) return;
    onChange([...value, { language: pendingLanguage, proficiency: pendingProficiency }]);
    cancelAdding();
  };

  const removeLanguage = (language: string) => {
    onChange(value.filter((e) => e.language !== language));
  };

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2 p-3 rounded-xl border border-default-200 items-center min-h-[52px]">
        {value.map((entry) => (
          <RemovableChip
            key={entry.language}
            label={`${entry.language} (${entry.proficiency})`}
            onRemove={() => removeLanguage(entry.language)}
          />
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
            value={pendingProficiency}
            onChange={(p) => {
              if (PROFICIENCY_OPTIONS.some((o) => o.value === p)) {
                setPendingProficiency(p as ProficiencyLevel);
              }
            }}
            options={PROFICIENCY_OPTIONS}
            label="Proficiency"
            listLabel="Select proficiency"
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
