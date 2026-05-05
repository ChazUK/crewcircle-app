import { SearchField, useBottomSheetAwareHandlers } from "heroui-native";

type SearchProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

export const Search = ({ value, onChange, placeholder, className }: SearchProps) => {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <SearchField value={value} onChange={onChange} className={className}>
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
