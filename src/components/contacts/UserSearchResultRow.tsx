import { Button, Spinner } from "heroui-native";

import { ContactRow, type ContactRowUser } from "./ContactRow";

type Props = {
  user: ContactRowUser;
  state: "none" | "pending" | "contact";
  isBusy?: boolean;
  onInvite: () => void;
};

export function UserSearchResultRow({ user, state, isBusy, onInvite }: Props) {
  return (
    <ContactRow
      user={user}
      subtitle={user.email ?? undefined}
      trailing={
        state === "contact" ? (
          <Button variant="ghost" size="sm" isDisabled>
            Contact
          </Button>
        ) : state === "pending" ? (
          <Button variant="ghost" size="sm" isDisabled>
            Pending
          </Button>
        ) : (
          <Button variant="primary" size="sm" onPress={onInvite} isDisabled={isBusy}>
            {isBusy ? <Spinner size="sm" /> : "Invite"}
          </Button>
        )
      }
    />
  );
}
