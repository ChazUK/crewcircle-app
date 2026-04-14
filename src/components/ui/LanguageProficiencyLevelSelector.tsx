import { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import {
  Button,
  ScrollShadow,
  SearchField,
  Select,
  useBottomSheetAwareHandlers,
  useThemeColor,
} from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import {
  LANGUAGE_PROFICIENCY_LEVELS,
  type LanguageProficiencyLevel,
} from "@/data/language-proficiency-levels";
import { type Language, LANGUAGES } from "@/data/languages";

import { RemovableChip } from "./RemovableChip";

export type LanguageProficiencyEntry = {
  language: Language;
  proficiency: LanguageProficiencyLevel;
};

type SelectOption = {
  value: string;
  label: string;
};

const LANGUAGE_OPTIONS = LANGUAGES.map(({ name, nativeName }) => ({
  value: name,
  label: name === nativeName ? name : `${name} (${nativeName})`,
})) as SelectOption[];

const LANGUAGE_PROFICIENCY_LEVEL_OPTIONS = LANGUAGE_PROFICIENCY_LEVELS.map((proficiency_level) => ({
  value: proficiency_level,
  label: proficiency_level,
})) as SelectOption[];

type Step = "idle" | "select_language" | "select_proficiency";

type Props = {
  value: LanguageProficiencyEntry[];
  onChange: (entries: LanguageProficiencyEntry[] | undefined) => void;
};

export function LanguageProficiencyLevelSelector({ value, onChange }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  const selectedLanguages = new Set(value.map((e) => e.language));
  const availableOptions = LANGUAGE_OPTIONS.filter(
    (o) => !selectedLanguages.has(o.value as Language),
  );
  const canAdd = availableOptions.length > 0;

  const handleAddPress = useCallback(() => {
    setSelectedLanguage(null);
    setStep("select_language");
  }, []);

  const handleLanguageChange = useCallback((option: SelectOption | undefined) => {
    if (!option) return;

    const isValidLanguage = LANGUAGE_OPTIONS.some((o) => o.value === option.value);
    if (!isValidLanguage) return;

    setSelectedLanguage(option.value as Language);
    setStep("select_proficiency");
  }, []);

  const handleProficiencyChange = useCallback(
    (option: SelectOption | undefined) => {
      if (!selectedLanguage || !option) return;

      const isValidProficiency = LANGUAGE_PROFICIENCY_LEVEL_OPTIONS.some(
        (o) => o.value === option.value,
      );
      if (!isValidProficiency) return;

      onChange([
        ...value,
        {
          language: selectedLanguage,
          proficiency: option.value as LanguageProficiencyLevel,
        },
      ]);
      setStep("idle");
    },
    [selectedLanguage, value, onChange],
  );

  const removeLanguage = (language: string) => {
    onChange(value.filter((e) => e.language !== language));
  };

  return (
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
          onPress={handleAddPress}
          accessibilityLabel="Add language"
        >
          + Add
        </Button>
      )}
      <LanguageSelectSheet
        isOpen={step === "select_language"}
        options={LANGUAGE_OPTIONS}
        onValueChange={handleLanguageChange}
      />
      <LangaugeProficiencyLevelSelectSheet
        isOpen={step === "select_proficiency"}
        options={LANGUAGE_PROFICIENCY_LEVEL_OPTIONS}
        onValueChange={handleProficiencyChange}
      />
    </View>
  );
}

const LanguageSelectSheet = ({
  isOpen,
  options,
  onOpenChange,
  onValueChange,
}: {
  isOpen: boolean;
  options: SelectOption[];
  onOpenChange?: (isOpen: boolean) => void;
  onValueChange?: (value: SelectOption | undefined) => void;
}) => {
  const themeColorOverlay = useThemeColor("overlay");
  const [searchValue, setSearchValue] = useState("");

  const filteredOptions = useMemo(() => {
    const q = searchValue.trim();

    if (!q) return options;

    const filter = (option: SelectOption, searchValue: string) => {
      return option.label.toLowerCase().includes(searchValue.toLowerCase());
    };
    return options.filter((option) => filter(option, q));
  }, [searchValue, options]);

  return (
    <Select
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onValueChange={onValueChange}
      presentation="bottom-sheet"
    >
      <Select.Trigger variant="unstyled" className="absolute w-0 h-0 overflow-hidden" />
      <Select.Portal>
        <Select.Overlay className="bg-black/50" />
        <Select.Content
          presentation="bottom-sheet"
          snapPoints={["50%", "80%"]}
          keyboardBehavior="extend"
          enableDynamicSizing={false}
          enableOverDrag={false}
          contentContainerClassName="flex-1 h-full"
        >
          <BottomSheetSearchField
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search languages..."
          />

          <ScrollShadow LinearGradientComponent={LinearGradient} color={themeColorOverlay}>
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {filteredOptions.map((option) => (
                <Select.Item key={option.value} value={option.value} label={option.label} />
              ))}
            </BottomSheetScrollView>
          </ScrollShadow>
        </Select.Content>
      </Select.Portal>
    </Select>
  );
};

const LangaugeProficiencyLevelSelectSheet = ({
  isOpen,
  options,
  onOpenChange,
  onValueChange,
}: {
  isOpen: boolean;
  options: SelectOption[];
  onOpenChange?: (isOpen: boolean) => void;
  onValueChange?: (value: SelectOption | undefined) => void;
}) => {
  return (
    <Select
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onValueChange={onValueChange}
      presentation="bottom-sheet"
    >
      <Select.Trigger variant="unstyled" className="absolute w-0 h-0 overflow-hidden" />
      <Select.Portal>
        <Select.Overlay className="bg-black/50" />
        <Select.Content
          presentation="bottom-sheet"
          keyboardBehavior="extend"
          enableDynamicSizing={true}
          enableOverDrag={false}
          contentContainerClassName="flex-1 h-full"
        >
          <BottomSheetView style={{ paddingBottom: 16, paddingInline: 16 }}>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} label={option.label} />
            ))}
          </BottomSheetView>
        </Select.Content>
      </Select.Portal>
    </Select>
  );
};

const BottomSheetSearchField = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <SearchField value={value} onChange={onChange} className="mb-3 px-4 pt-3">
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input
          autoCapitalize="sentences"
          autoCorrect={true}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
};
