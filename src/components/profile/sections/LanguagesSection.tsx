import {
  FLUENCY_LABELS,
  LANGUAGE_NAMES,
  type Fluency,
  type LanguageCode,
} from "@shared/profile/languages";
import type { ViewableProfile } from "@shared/profile/viewableProfile";
import { Card, Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  profile: ViewableProfile;
};

type SpokenLanguageEntry = { code: string; fluency: string };

function hasLanguages(profile: ViewableProfile): profile is Extract<
  ViewableProfile,
  { spokenLanguages: SpokenLanguageEntry[] | undefined }
> & {
  spokenLanguages: SpokenLanguageEntry[];
} {
  return (
    "spokenLanguages" in profile &&
    Array.isArray(profile.spokenLanguages) &&
    profile.spokenLanguages.length > 0
  );
}

function sortLanguages(languages: SpokenLanguageEntry[]): SpokenLanguageEntry[] {
  return [...languages].sort((a, b) => {
    if (a.fluency === "native" && b.fluency !== "native") return -1;
    if (a.fluency !== "native" && b.fluency === "native") return 1;
    const nameA = LANGUAGE_NAMES[a.code as LanguageCode] ?? a.code;
    const nameB = LANGUAGE_NAMES[b.code as LanguageCode] ?? b.code;
    return nameA.localeCompare(nameB);
  });
}

const fluencyColor: Record<string, "accent" | "default" | "success" | "warning" | "danger"> = {
  native: "accent",
  fluent: "success",
  professional: "default",
  conversational: "warning",
  basic: "default",
};

export function LanguagesSection({ profile }: Props) {
  if (hasLanguages(profile)) {
    const sorted = sortLanguages(profile.spokenLanguages);
    return (
      <View className="gap-2">
        <Text className="text-sm font-medium text-muted">Spoken Languages</Text>
        <View className="gap-2">
          {sorted.map((entry) => (
            <View key={entry.code} className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">
                {LANGUAGE_NAMES[entry.code as LanguageCode] ?? entry.code}
              </Text>
              <Chip variant="secondary" color={fluencyColor[entry.fluency] ?? "default"} size="sm">
                {FLUENCY_LABELS[entry.fluency as Fluency] ?? entry.fluency}
              </Chip>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (profile.mode === "self") {
    return (
      <Card variant="secondary">
        <Card.Body>
          <Text className="text-sm text-muted">Add the languages you speak</Text>
        </Card.Body>
      </Card>
    );
  }

  return null;
}
