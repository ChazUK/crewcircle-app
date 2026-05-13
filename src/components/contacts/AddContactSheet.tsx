import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet, Button, Spinner } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { BottomSheetSearch } from "@/components/form/BottomSheetSearch";
import { useContactsSearch } from "@/hooks/contacts/useContactsSearch";
import { useSendContactInvite } from "@/hooks/contacts/useSendContactInvite";

import { InviteByEmailPhoneForm } from "./InviteByEmailPhoneForm";
import { UserSearchResultRow } from "./UserSearchResultRow";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type Mode = "search" | "external";

export function AddContactSheet({ isOpen, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const results = useContactsSearch(query);
  const sendInvite = useSendContactInvite();

  const handleInvite = async (userId: string) => {
    setBusyId(userId);
    setInviteError(null);
    try {
      await sendInvite({ targetUserId: userId as never });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invite_exists")) {
        setInviteError("You've already invited this person.");
      } else if (msg.includes("already_contact")) {
        setInviteError("This person is already a contact.");
      } else if (msg.includes("self_invite")) {
        setInviteError("You can't invite yourself.");
      } else {
        setInviteError("Could not send the invite. Try again.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleClose = () => {
    setMode("search");
    setQuery("");
    setInviteError(null);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
            <View className="gap-2">
              <BottomSheet.Title>Add contact</BottomSheet.Title>
              <BottomSheet.Description className="text-sm">
                Find someone already on CrewCircle, or invite them by email or phone.
              </BottomSheet.Description>
            </View>

            <View className="flex-row gap-2">
              <Button
                variant={mode === "search" ? "primary" : "ghost"}
                size="sm"
                onPress={() => setMode("search")}
              >
                Find in app
              </Button>
              <Button
                variant={mode === "external" ? "primary" : "ghost"}
                size="sm"
                onPress={() => setMode("external")}
              >
                Invite by email or phone
              </Button>
            </View>

            {mode === "search" ? (
              <View className="gap-3">
                <BottomSheetSearch
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by name or email"
                />
                {inviteError ? (
                  <Text className="px-3 text-sm text-danger">{inviteError}</Text>
                ) : null}
                {query.trim().length < 2 ? (
                  <Text className="px-3 text-sm text-muted">Type at least 2 characters.</Text>
                ) : results === undefined ? (
                  <View className="items-center py-6">
                    <Spinner />
                  </View>
                ) : results.length === 0 ? (
                  <Text className="px-3 text-sm text-muted">No matches.</Text>
                ) : (
                  <View className="gap-2">
                    {results.map((r) => (
                      <UserSearchResultRow
                        key={r.user._id}
                        user={r.user}
                        state={r.state}
                        isBusy={busyId === r.user._id}
                        onInvite={() => void handleInvite(r.user._id)}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <InviteByEmailPhoneForm onSent={handleClose} />
            )}
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
