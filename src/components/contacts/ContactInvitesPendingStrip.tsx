import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Spinner } from "heroui-native";
import { Text, View } from "react-native";

import { useCancelContactInvite } from "@/hooks/contacts/useCancelContactInvite";
import { formatContactName } from "@/lib/contacts/formatContactName";

import { OutgoingInviteRow } from "./OutgoingInviteRow";

export function ContactInvitesPendingStrip() {
  const invites = useQuery(api.contacts.queries.listMyOutgoingInvites, {});
  const cancelInvite = useCancelContactInvite();

  if (invites === undefined) {
    return (
      <View className="items-center py-2">
        <Spinner size="sm" />
      </View>
    );
  }

  if (invites.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-xs uppercase tracking-wide text-muted">Pending invites</Text>
      {invites.map(({ invite, targetUser }) => {
        const label = targetUser
          ? formatContactName(targetUser)
          : (invite.targetEmail ?? invite.targetPhone ?? "Pending");
        const subtitle = targetUser
          ? (targetUser.email ?? "Pending")
          : invite.targetEmail
            ? "Awaiting signup"
            : "Awaiting signup";
        return (
          <OutgoingInviteRow
            key={invite._id}
            targetLabel={label}
            targetSubtitle={subtitle}
            onCancel={() => void cancelInvite(invite._id)}
          />
        );
      })}
    </View>
  );
}
