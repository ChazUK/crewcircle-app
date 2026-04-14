import { SearchField, useBottomSheetAwareHandlers } from "heroui-native";

export const BottomSheetSearchField = ({
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
