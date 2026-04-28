import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet, Button, Separator, Spinner, Switch } from "heroui-native";
import { Fragment, useEffect, useState } from "react";
import { Text, View } from "react-native";

export type SubCalendarOption = {
  id: string;
  label: string;
  hint?: string;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  calendars: SubCalendarOption[];
  /**
   * IDs that should be ticked when the sheet first opens for a given `calendars`
   * set. If omitted, every calendar in `calendars` is ticked by default.
   */
  initialSelection?: string[];
  confirmLabel?: string;
  busyLabel?: string;
  emptySelectionMessage?: string;
  onConfirm: (pickedIds: string[]) => Promise<void> | void;
};

export function SubCalendarPickerSheet({
  isOpen,
  onOpenChange,
  title,
  description,
  calendars,
  initialSelection,
  confirmLabel = "Save",
  busyLabel = "Saving…",
  emptySelectionMessage = "Pick at least one calendar.",
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the selection when the sheet opens (or when the list of calendars
  // changes while open, e.g. a re-fetch). Default behaviour = everything on.
  // Defensively drop any ids that aren't in the current calendar set so a
  // stale alias (e.g. Google's "primary") can't leak into the saved value.
  useEffect(() => {
    if (!isOpen) return;
    const validIds = new Set(calendars.map((c) => c.id));
    const seed =
      initialSelection !== undefined
        ? new Set(initialSelection.filter((id) => validIds.has(id)))
        : new Set(validIds);
    setSelected(seed);
    setError(null);
  }, [isOpen, calendars, initialSelection]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    const pickedIds = Array.from(selected);
    if (pickedIds.length === 0) {
      setError(emptySelectionMessage);
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      await onConfirm(pickedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={["55%", "85%"]}>
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <View className="mb-4 gap-1.5 px-1">
              <BottomSheet.Title>{title}</BottomSheet.Title>
              {description ? (
                <BottomSheet.Description>{description}</BottomSheet.Description>
              ) : null}
            </View>

            {error != null && (
              <View className="mb-3 rounded-xl bg-danger/10 p-3">
                <Text className="text-sm text-danger">{error}</Text>
              </View>
            )}

            <View className="rounded-xl bg-default-100/40 px-3 py-2">
              {calendars.map((cal, idx) => (
                <Fragment key={cal.id}>
                  {idx > 0 && <Separator className="my-1" />}
                  <View className="flex-row items-center justify-between py-2">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm text-foreground" numberOfLines={1}>
                        {cal.label}
                      </Text>
                      {cal.hint ? (
                        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                          {cal.hint}
                        </Text>
                      ) : null}
                    </View>
                    <Switch
                      isSelected={selected.has(cal.id)}
                      onSelectedChange={() => toggle(cal.id)}
                      isDisabled={isBusy}
                    />
                  </View>
                </Fragment>
              ))}
            </View>

            <View className="mt-6 flex-row justify-end gap-2">
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => onOpenChange(false)}
                isDisabled={isBusy}
              >
                Cancel
              </Button>
              <Button size="sm" onPress={handleConfirm} isDisabled={isBusy || selected.size === 0}>
                {isBusy ? (
                  <View className="flex-row items-center gap-2">
                    <Spinner size="sm" />
                    <Text className="text-sm">{busyLabel}</Text>
                  </View>
                ) : (
                  confirmLabel
                )}
              </Button>
            </View>
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
