import { Button, Input, Label, TextField } from "heroui-native";
import { View } from "react-native";

import { Picker } from "./Picker";

export type FluencyLevel = "Native" | "Fluent" | "Conversational" | "Basic";

export type LanguageEntry = {
  language: string;
  fluency: FluencyLevel;
};

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
    onChange([...value, { language: "", fluency: "Fluent" }]);
  };

  const removeLanguage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateLanguage = (index: number, language: string) => {
    onChange(value.map((entry, i) => (i === index ? { ...entry, language } : entry)));
  };

  const updateFluency = (index: number, fluency: string) => {
    onChange(
      value.map((entry, i) =>
        i === index ? { ...entry, fluency: fluency as FluencyLevel } : entry,
      ),
    );
  };

  return (
    <View className="gap-3">
      {value.map((entry, index) => (
        <View
          key={index}
          className="gap-3 p-3 rounded-xl border border-default-200 bg-default-50"
          accessibilityLabel={`Language entry ${index + 1}`}
        >
          <View className="flex-row gap-2 items-end">
            <TextField className="flex-[2]">
              <Label>Language</Label>
              <Input
                value={entry.language}
                onChangeText={(text) => updateLanguage(index, text)}
                placeholder="e.g. English"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </TextField>
            <View className="flex-1">
              <Picker
                value={entry.fluency}
                onChange={(fluency) => updateFluency(index, fluency)}
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
            onPress={() => removeLanguage(index)}
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
