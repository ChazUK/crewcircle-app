import { Button, Input, TagGroup, TextField } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  maxTags?: number;
};

export function TagInput({ tags, onChange, placeholder = "Add a tag...", label, maxTags }: Props) {
  const [inputValue, setInputValue] = useState("");

  const isAtMax = maxTags !== undefined && tags.length >= maxTags;

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

    if (additions.length > 0) onChange([...tags, ...additions]);
    setInputValue(trailing);
  };

  const onRemove = (keys: Set<string | number>) => {
    onChange(tags.filter((t) => !keys.has(t)));
  };

  const handleChangeText = (text: string) => {
    if (text.includes(",")) commitTags(text);
    else setInputValue(text);
  };

  return (
    <View className="flex-1 gap-3">
      <View className="flex-row gap-2 items-center">
        <View className="flex-1">
          <TextField>
            <Input
              value={inputValue}
              onChangeText={handleChangeText}
              onSubmitEditing={() => commitTags(inputValue + ",")}
              placeholder={placeholder}
              returnKeyType="done"
              blurOnSubmit={false}
              isDisabled={isAtMax}
              accessibilityLabel={label ?? placeholder}
            />
          </TextField>
        </View>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => commitTags(inputValue + ",")}
          isDisabled={!inputValue.trim() || isAtMax}
          accessibilityLabel="Add tag"
        >
          Add
        </Button>
      </View>
      <TagGroup selectionMode="single" onRemove={onRemove}>
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
