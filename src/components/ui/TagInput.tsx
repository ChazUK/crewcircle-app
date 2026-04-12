import { Button, Chip, CloseButton, Input, Label, TextField } from "heroui-native";
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

  const addTags = (raw: string) => {
    const segments = raw.split(",");
    const trailing = segments[segments.length - 1]?.trim() ?? "";
    const completedSegments = segments.slice(0, -1);

    const existing = new Set(tags.map((t) => t.toLowerCase()));
    const newTags: string[] = [];

    for (const segment of completedSegments) {
      if (maxTags !== undefined && tags.length + newTags.length >= maxTags) break;
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (existing.has(key)) continue;
      existing.add(key);
      newTags.push(trimmed);
    }

    if (newTags.length > 0) {
      onChange([...tags, ...newTags]);
    }
    setInputValue(trailing);
  };

  const addSingleTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (maxTags !== undefined && tags.length >= maxTags) return;
    const isDuplicate = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setInputValue("");
      return;
    }
    onChange([...tags, trimmed]);
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleChangeText = (text: string) => {
    if (text.includes(",")) {
      addTags(text);
    } else {
      setInputValue(text);
    }
  };

  return (
    <View>
      {label ? <Label accessibilityRole="text">{label}</Label> : null}
      <View className="flex-row gap-2 items-center">
        <View className="flex-1">
          <TextField>
            <Input
              value={inputValue}
              onChangeText={handleChangeText}
              onSubmitEditing={() => addSingleTag(inputValue)}
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
          onPress={() => addSingleTag(inputValue)}
          isDisabled={!inputValue.trim() || isAtMax}
          accessibilityLabel="Add tag"
        >
          Add
        </Button>
      </View>
      {tags.length > 0 && (
        <View
          className="flex-row flex-wrap gap-2 mt-2"
          accessibilityRole="list"
          accessibilityLabel="Tags"
        >
          {tags.map((tag) => (
            <View key={tag} className="flex-row items-center">
              <Chip animation="disable-all" color="default" variant="soft">
                <View className="flex-row items-center gap-1 pl-1">
                  <Chip.Label>{tag}</Chip.Label>
                  <CloseButton
                    onPress={() => removeTag(tag)}
                    accessibilityLabel={`Remove ${tag}`}
                  />
                </View>
              </Chip>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
