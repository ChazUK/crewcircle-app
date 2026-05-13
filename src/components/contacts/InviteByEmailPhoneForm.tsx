import { useForm } from "@tanstack/react-form";
import { Button, FieldError, Input, Label, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { useSendContactInvite } from "@/hooks/contacts/useSendContactInvite";

type Props = {
  onSent: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{6,14}$/;

export function InviteByEmailPhoneForm({ onSent }: Props) {
  const sendInvite = useSendContactInvite();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { identifier: "", message: "" },
    onSubmit: async ({ value }) => {
      const trimmed = value.identifier.trim();
      const isEmail = EMAIL_RE.test(trimmed);
      const isPhone = PHONE_RE.test(trimmed);
      if (!isEmail && !isPhone) {
        setGlobalError("Enter a valid email or phone number (E.164, e.g. +447700000000)");
        return;
      }
      setGlobalError(null);
      try {
        await sendInvite({
          ...(isEmail ? { email: trimmed } : { phone: trimmed }),
          ...(value.message.trim() && { message: value.message.trim() }),
        });
        onSent();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("invite_exists")) {
          setGlobalError("You've already invited this person.");
        } else if (msg.includes("already_contact")) {
          setGlobalError("This person is already a contact.");
        } else if (msg.includes("self_invite")) {
          setGlobalError("You can't invite yourself.");
        } else {
          setGlobalError("Could not send the invite. Try again.");
        }
      }
    },
  });

  return (
    <View className="gap-4">
      <form.Field name="identifier">
        {(field) => (
          <TextField isRequired>
            <Label>Email or phone</Label>
            <Input
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@example.com or +447700000000"
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
            />
            <FieldError isInvalid={false}>{""}</FieldError>
          </TextField>
        )}
      </form.Field>

      <form.Field name="message">
        {(field) => (
          <TextField>
            <Label>Optional message</Label>
            <Input
              placeholder="A short note (optional)"
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              multiline
            />
          </TextField>
        )}
      </form.Field>

      {globalError ? <Text className="text-sm text-danger">{globalError}</Text> : null}

      <form.Subscribe selector={(state) => [state.isSubmitting, state.values.identifier] as const}>
        {([isSubmitting, identifier]) => (
          <Button
            variant="primary"
            isDisabled={!identifier.trim() || isSubmitting}
            onPress={() => form.handleSubmit()}
          >
            {isSubmitting ? <Spinner size="sm" /> : "Send invite"}
          </Button>
        )}
      </form.Subscribe>
    </View>
  );
}
