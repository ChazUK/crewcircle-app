import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { PushTokenRegistrar } from "@/components/contacts/PushTokenRegistrar";

export default function HomeLayout() {
  const incomingCount = useQuery(api.notifications.queries.myUnreadIncomingInviteCount, {}) ?? 0;
  const badgeValue = incomingCount > 0 ? String(incomingCount) : undefined;

  return (
    <>
      <PushTokenRegistrar />
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="diary">
          <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} />
          <NativeTabs.Trigger.Label>My Diary</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="circles">
          <NativeTabs.Trigger.Icon
            sf={{ default: "circle.grid.2x2", selected: "circle.grid.2x2.fill" }}
          />
          <NativeTabs.Trigger.Label>Circles</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="requests">
          <NativeTabs.Trigger.Icon
            sf={{ default: "person.badge.plus", selected: "person.badge.plus.fill" }}
          />
          <NativeTabs.Trigger.Label>Requests</NativeTabs.Trigger.Label>
          {badgeValue ? <NativeTabs.Trigger.Badge>{badgeValue}</NativeTabs.Trigger.Badge> : null}
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
