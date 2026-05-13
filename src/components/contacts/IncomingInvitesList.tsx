import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Spinner } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { useAcceptContactInvite } from "@/hooks/contacts/useAcceptContactInvite";
import { useDeclineContactInvite } from "@/hooks/contacts/useDeclineContactInvite";

import { IncomingInviteRow } from "./IncomingInviteRow";

export function IncomingInvitesList() {
  const invites = useQuery(api.contacts.queries.listMyIncomingInvites, {});
  const acceptInvite = useAcceptContactInvite();
  const declineInvite = useDeclineContactInvite();
  const [busyIds, setBusyIds] = useState<ReadonlySet<Id<"contactInvites">>>(new Set());

  const handle = async (inviteId: Id<"contactInvites">, action: "accept" | "decline") => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.add(inviteId);
      return next;
    });
    try {
      if (action === "accept") await acceptInvite(inviteId);
      else await declineInvite(inviteId);
    } catch (err) {
      console.error(`[IncomingInvitesList] ${action} failed`, err);
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
    }
  };

  if (invites === undefined) {
    return (
      <View className="items-center py-8">
        <Spinner />
      </View>
    );
  }

  if (invites.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-sm text-muted">No pending requests.</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {invites.map(({ invite, from }) =>
        from ? (
          <IncomingInviteRow
            key={invite._id}
            from={from}
            message={invite.message ?? undefined}
            isBusy={busyIds.has(invite._id)}
            onAccept={() => void handle(invite._id, "accept")}
            onDecline={() => void handle(invite._id, "decline")}
          />
        ) : null,
      )}
    </View>
  );
}
