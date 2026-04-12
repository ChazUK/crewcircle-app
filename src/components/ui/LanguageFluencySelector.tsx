import { Button } from "heroui-native";
import { View } from "react-native";

import { LANGUAGES } from "@/data/languages";

import { Picker } from "./Picker";

export type FluencyLevel = "Native" | "Fluent" | "Conversational" | "Basic";

export type LanguageEntry = {
  id: string;
  language: string;
  fluency: FluencyLevel;
};

const LANGUAGE_OPTIONS = LANGUAGES.map(({ name, nativeName }) => ({
  value: name,
  label: name === nativeName ? name : `${name} (${nativeName})`,
}));

const FLUENCY_OPTIONS: { value: FluencyLevel; label: string }[] = [
  { value: "Native", label: "Native" },
  { value: "Fluent", label: "Fluent" },
  { value: "Conversational", label: "Conversational" },
  { value: "Basic", label: "Basic" },
];

type Props = {
  value: LanguageEntry[];
  onChange: (entries: LanguageEntry[]) => void;
};

export function LanguageFluencySelector({ value, onChange }: Props) {
  const addLanguage = () => {
    onChange([...value, { id: crypto.randomUUID(), language: "", fluency: "Fluent" }]);
  };

  const removeLanguage = (id: string) => {
    onChange(value.filter((entry) => entry.id !== id));
  };

  const updateLanguage = (id: string, language: string) => {
    onChange(value.map((entry) => (entry.id === id ? { ...entry, language } : entry)));
  };

  const updateFluency = (id: string, fluency: string) => {
    onChange(
      value.map((entry) =>
        entry.id === id ? { ...entry, fluency: fluency as FluencyLevel } : entry,
      ),
    );
  };

  return (
    <View className="gap-3">
      {value.map((entry, index) => (
        <View
          key={entry.id}
          className="gap-3 p-3 rounded-xl border border-default-200 bg-default-50"
          accessibilityLabel={`Language entry ${index + 1}`}
        >
          <View className="flex-row gap-2 items-end">
            <View className="flex-2">
              <Picker
                value={entry.language || null}
                onChange={(language) => updateLanguage(entry.id, language)}
                options={LANGUAGE_OPTIONS}
                label="Language"
                listLabel="Select language"
                placeholder="Select language"
                snapPoints={["60%"]}
                searchable
                searchPlaceholder="Search languages..."
              />
            </View>
            <View className="flex-1">
              <Picker
                value={entry.fluency}
                onChange={(fluency) => updateFluency(entry.id, fluency)}
                options={FLUENCY_OPTIONS}
                label="Fluency"
                listLabel="Select fluency"
                snapPoints={["40%"]}
              />
            </View>
          </View>
          <Button
            variant="danger-soft"
            size="sm"
            onPress={() => removeLanguage(entry.id)}
            accessibilityLabel={`Remove ${entry.language || "language"} entry`}
            className="self-end"
          >
            Remove
          </Button>
        </View>
      ))}
      <Button variant="secondary" onPress={addLanguage} className="w-full">
        Add language
      </Button>
    </View>
  );
}
