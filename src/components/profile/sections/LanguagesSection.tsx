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
      <SmallHeading>Spoken Languages</SmallHeading>
      <View className="flex-row flex-wrap gap-2">
        {sorted.map((entry) => (
          <Chip
            key={entry.code}
            size="sm"
            variant="secondary"
            color={fluencyColor[entry.fluency] ?? "default"}
          >
            <Chip.Label>
              <Text className="font-semibold">
                {LANGUAGE_NAMES[entry.code as LanguageCode] ?? entry.code}
              </Text>{" "}
              &middot; {FLUENCY_LABELS[entry.fluency as Fluency] ?? entry.fluency}
            </Chip.Label>
          </Chip>
        ))}
      </View>
    </View>
  );
}
