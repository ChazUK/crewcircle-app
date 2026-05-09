import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { SubCalendar } from "@shared/calendars";
import { useAction } from "convex/react";
import {
  Button,
  ControlField,
  Description,
  Label,
  Separator,
  Spinner,
  Surface,
} from "heroui-native";
import { Fragment, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { EmptyState } from "../ui/EmptyState";

type Provider = "google" | "microsoft" | "ical" | "native";

type SubCalendarListProps = {
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
    <View className="flex-1 gap-4">
      {subCalendars.length === 0 ? (
        <EmptyState size="sm">Your calendar is ready – tap Confirm to start syncing.</EmptyState>
      ) : (
        <Surface className="gap-3">
          {subCalendars.map((cal, idx) => (
            <Fragment key={cal.id}>
              {idx > 0 && <Separator className="my-1" />}

              <ControlField
                hitSlop={10}
                isSelected={selected.has(cal.id)}
                onSelectedChange={() => toggle(cal.id)}
              >
                <View className="flex-1 flex-row items-center gap-3">
                  <View
                    className="size-3 rounded-full"
                    style={{ backgroundColor: connectionColor }}
                  />
                  <View className="flex-1">
                    <Label>
                      <Label.Text className="text-sm text-foreground font-normal" numberOfLines={1}>
                        {cal.label}
                      </Label.Text>
                    </Label>
                    {cal.hint != null ? (
                      <Description className="text-xs text-muted-foreground" numberOfLines={1}>
                        {cal.hint}
                      </Description>
                    ) : null}
                  </View>
                </View>
                <ControlField.Indicator accessibilityLabel={cal.label} />
              </ControlField>
            </Fragment>
          ))}
        </Surface>
      )}

      <View className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" onPress={onBack}>
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
