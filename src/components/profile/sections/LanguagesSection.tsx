import {
  FLUENCY_LABELS,
  FLUENCY_LEVELS,
  LANGUAGE_NAMES,
  type Fluency,
  type LanguageCode,
} from "@shared/profile/languages";
import type { Profile, SpokenLanguageEntry } from "@shared/profile/viewableProfile";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

import { SmallHeading } from "@/components/ui/SmallHeading";

type Props = Partial<Pick<Profile, "spokenLanguages">>;

function sortLanguages(languages: SpokenLanguageEntry[]): SpokenLanguageEntry[] {
  return [...languages].sort((a, b) => {
    const fluencyDiff =
      FLUENCY_LEVELS.indexOf(a.fluency as Fluency) - FLUENCY_LEVELS.indexOf(b.fluency as Fluency);
    if (fluencyDiff !== 0) return fluencyDiff;

    const nameA = LANGUAGE_NAMES[a.code as LanguageCode] ?? a.code;
    const nameB = LANGUAGE_NAMES[b.code as LanguageCode] ?? b.code;

    return nameA.localeCompare(nameB);
  });
}

const fluencyColor: Record<string, "accent" | "default" | "success" | "warning" | "danger"> = {
  Native: "accent",
  Fluent: "success",
  Professional: "success",
  Conversational: "warning",
  Basic: "danger",
};

export function LanguagesSection({ spokenLanguages }: Props) {
  if (!spokenLanguages || spokenLanguages.length === 0) return null;

  const sorted = sortLanguages(spokenLanguages);

  return (
    <View className="gap-1">
      <SmallHeading>Languages</SmallHeading>
      <View className="gap-2">
        {sorted.map((entry) => (
          <View key={entry.code} className="flex-row items-center gap-2">
            <Text className="flex-1 font-semibold text-foreground">
              {LANGUAGE_NAMES[entry.code as LanguageCode] ?? entry.code}
            </Text>
            <Chip color="default" size="sm">
              <Chip.Label className="text-foreground">
                {FLUENCY_LABELS[entry.fluency as Fluency] ?? entry.fluency}
              </Chip.Label>
            </Chip>
          </View>
        ))}
      </View>
    </View>
  );
}
