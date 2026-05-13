import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button, Spinner } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { useRemoveContact } from "@/hooks/contacts/useRemoveContact";
import { formatContactName } from "@/lib/contacts/formatContactName";

import { ContactRow } from "./ContactRow";
import { RemoveContactDialog } from "./RemoveContactDialog";

export function ContactsList() {
  const contacts = useQuery(api.contacts.queries.listMyContacts, {});
  const removeContact = useRemoveContact();
  const [target, setTarget] = useState<{ userId: Id<"users">; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!target) return;
    setIsRemoving(true);
    setError(null);
    try {
      await removeContact(target.userId);
      setTarget(null);
    } catch {
      setError("Could not remove contact. Try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  if (contacts === undefined) {
    return (
      <View className="items-center py-8">
        <Spinner />
      </View>
    );
  }

  if (contacts.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-sm text-muted">No contacts yet. Add someone to get started.</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {contacts.map((row) => (
        <ContactRow
          key={row.contactId}
          user={row.user}
          subtitle={row.user.email ?? undefined}
          trailing={
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setTarget({ userId: row.user._id, name: formatContactName(row.user) })}
            >
              Remove
            </Button>
          }
        />
      ))}

      <RemoveContactDialog
        isOpen={target !== null}
        contactName={target?.name ?? ""}
        isRemoving={isRemoving}
        error={error}
        onConfirm={handleRemove}
        onCancel={() => {
          setTarget(null);
          setError(null);
        }}
      />
    </View>
  );
}
