import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { SubCalendar } from "@shared/calendars";
import { useAction } from "convex/react";
import { Button, Separator, Spinner, Switch } from "heroui-native";
import { Fragment, useEffect, useState } from "react";
import { Text, View } from "react-native";

type Provider = "google" | "microsoft" | "ical" | "native";

export type SubCalendarListProps = {
  subCalendars: SubCalendar[] | undefined;
  provider: Provider;
  connectionColor: string;
  onConfirm: (selected: { externalId: string; label: string }[]) => void;
  onBack: () => void;
};

function getInitialSelection(subCalendars: SubCalendar[], provider: Provider): Set<string> {
  if (provider === "google" || provider === "microsoft") {
    const primaryIds = subCalendars.filter((c) => c.primary).map((c) => c.id);
    return new Set(primaryIds.length > 0 ? primaryIds : subCalendars.map((c) => c.id));
  }
  return new Set(subCalendars.map((c) => c.id));
}

export function SubCalendarList({
  subCalendars,
  provider,
  connectionColor,
  onConfirm,
  onBack,
}: SubCalendarListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!subCalendars) return;
    setSelected(getInitialSelection(subCalendars, provider));
  }, [subCalendars, provider]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!subCalendars) return;
    onConfirm(
      subCalendars
        .filter((c) => selected.has(c.id))
        .map((c) => ({ externalId: c.id, label: c.label })),
    );
  };

  if (subCalendars === undefined) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Spinner />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {subCalendars.length === 0 ? (
        <View className="px-1 py-4">
          <Text className="text-sm text-muted-foreground">
            Your calendar is ready — tap Confirm to start syncing.
          </Text>
        </View>
      ) : (
        <View className="rounded-xl bg-default-100/40 px-3 py-2">
          {subCalendars.map((cal, idx) => (
            <Fragment key={cal.id}>
              {idx > 0 && <Separator className="my-1" />}
              <View className="flex-row items-center gap-3 py-3">
                <View
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: connectionColor }}
                />
                <View className="flex-1">
                  <Text className="text-sm text-foreground" numberOfLines={1}>
                    {cal.label}
                  </Text>
                  {cal.hint != null ? (
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {cal.hint}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  isSelected={selected.has(cal.id)}
                  onSelectedChange={() => toggle(cal.id)}
                  accessibilityLabel={cal.label}
                />
              </View>
            </Fragment>
          ))}
        </View>
      )}

      <View className="mt-6 flex-row items-center justify-between">
        <Button variant="tertiary" size="sm" onPress={onBack}>
          Back
        </Button>
        <Button size="sm" onPress={handleConfirm}>
          Confirm
        </Button>
      </View>
    </View>
  );
}

type SubCalendarPickerProps = {
  connectionId: Id<"calendarConnections">;
  provider: Provider;
  connectionColor: string;
  onConfirm: (selected: { externalId: string; label: string }[]) => void;
  onBack: () => void;
};

export function SubCalendarPicker({
  connectionId,
  provider,
  connectionColor,
  onConfirm,
  onBack,
}: SubCalendarPickerProps) {
  const [subCalendars, setSubCalendars] = useState<SubCalendar[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const listSubCalendarsAction = useAction(api.calendars.actions.listSubCalendars);

  useEffect(() => {
    let cancelled = false;
    setSubCalendars(undefined);
    setError(null);
    listSubCalendarsAction({ connectionId })
      .then((result) => {
        if (cancelled) return;
        setSubCalendars(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load calendars");
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId, listSubCalendarsAction]);

  if (error !== null) {
    return (
      <View className="px-1 py-4">
        <Text className="text-sm text-danger">{error}</Text>
        <View className="mt-3">
          <Button variant="tertiary" size="sm" onPress={onBack}>
            Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <SubCalendarList
      subCalendars={subCalendars}
      provider={provider}
      connectionColor={connectionColor}
      onConfirm={onConfirm}
      onBack={onBack}
    />
  );
}
