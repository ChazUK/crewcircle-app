import { Button, Input, Select, TagGroup } from "heroui-native";
import { useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";

const DEFAULT_MAX_SUGGESTIONS = 4;

type SelectOption = { value: string; label: string } | undefined;

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  maxTags?: number;
  autoCompleteFn?: (text: string, currentTags: string[]) => string[];
  maxSuggestions?: number;
};

export function TagInput({
  tags,
  onChange,
  placeholder = "Add a tag...",
  label,
  maxTags,
  autoCompleteFn,
  maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [selectInstance, setSelectInstance] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const isAtMax = maxTags !== undefined && tags.length >= maxTags;

  const suggestions = useMemo(() => {
    if (!autoCompleteFn) return [];
    const trimmed = inputValue.trim();
    if (!trimmed) return [];
    return autoCompleteFn(trimmed, tags).slice(0, maxSuggestions);
  }, [autoCompleteFn, inputValue, tags, maxSuggestions]);

  const isOpen = !isAtMax && suggestions.length > 0 && !dismissed;

  const commitTags = (raw: string) => {
    const segments = raw.split(",");
    const trailing = segments.pop()?.trim() ?? "";

    const seen = new Set(tags.map((t) => t.toLowerCase()));
    const remaining = maxTags === undefined ? Infinity : maxTags - tags.length;
    const additions: string[] = [];

    for (const segment of segments) {
      if (additions.length >= remaining) break;
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      additions.push(trimmed);
    }

    if (additions.length > 0) {
      onChange([...tags, ...additions]);
      setSelectInstance((n) => n + 1);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    setInputValue(trailing);
    setDismissed(false);
  };

  const onRemove = (keys: Set<string | number>) => {
    onChange(tags.filter((t) => !keys.has(t)));
  };

  const handleChangeText = (text: string) => {
    setDismissed(false);
    if (text.includes(",")) commitTags(text);
    else setInputValue(text);
  };

  const onValueChange = (option: SelectOption) => {
    if (!option) return;
    commitTags(option.label + ",");
  };

  const inputRow = (
    <View className="flex-row gap-2 items-center">
      <Input
        ref={inputRef}
        className="flex-1"
        value={inputValue}
        onChangeText={handleChangeText}
        onSubmitEditing={() => commitTags(inputValue + ",")}
        onBlur={() => {
          setTimeout(() => setDismissed(true), 150);
        }}
        placeholder={placeholder}
        returnKeyType="done"
        isDisabled={isAtMax}
        accessibilityLabel={label ?? placeholder}
      />
      <Button
        variant="secondary"
        onPress={() => commitTags(inputValue + ",")}
        isDisabled={!inputValue.trim() || isAtMax}
        accessibilityLabel="Add tag"
      >
        Add
      </Button>
    </View>
  );

  return (
    <View className="flex-1 gap-3">
      {autoCompleteFn ? (
        <Select
          key={selectInstance}
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) setDismissed(true);
          }}
          onValueChange={onValueChange}
        >
          <Select.Trigger variant="unstyled" asChild>
            {inputRow}
          </Select.Trigger>
          <Select.Portal>
            <Select.Content presentation="popover" placement="bottom" align="start" width="trigger">
              {suggestions.map((suggestion) => (
                <Select.Item key={suggestion} value={suggestion} label={suggestion} />
              ))}
            </Select.Content>
          </Select.Portal>
        </Select>
      ) : (
        inputRow
      )}
      <TagGroup onRemove={onRemove}>
        <TagGroup.List>
          {tags.map((tag) => (
            <TagGroup.Item key={tag} id={tag}>
              <TagGroup.ItemLabel>{tag}</TagGroup.ItemLabel>
              <TagGroup.ItemRemoveButton />
            </TagGroup.Item>
          ))}
        </TagGroup.List>
      </TagGroup>
    </View>
  );
}
