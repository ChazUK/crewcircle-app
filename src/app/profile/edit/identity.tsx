import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Card, FieldError, Input, Label, Spinner, TextField } from "heroui-native";
import { ScrollView, View } from "react-native";

import { Title } from "@/components/ui/Title";

export default function EditIdentityScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateProfileIdentity = useMutation(api.users.mutations.updateProfileIdentity);

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Title title="Sign in to edit your profile" />
      </View>
    );
  }

  return (
    <EditIdentityForm
      initialNickname={profile.nickname ?? ""}
      onDone={() => router.back()}
      onSubmit={updateProfileIdentity}
    />
  );
}

type FormProps = {
  initialNickname: string;
  onDone: () => void;
  onSubmit: (args: { nickname: string | undefined }) => Promise<unknown>;
};

function EditIdentityForm({ initialNickname, onDone, onSubmit }: FormProps) {
  const form = useForm({
    defaultValues: { nickname: initialNickname },
    onSubmit: async ({ value }) => {
      const trimmed = value.nickname.trim();
      await onSubmit({ nickname: trimmed === "" ? undefined : trimmed });
      onDone();
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <Card className="gap-4">
        <Card.Body className="gap-4">
          <form.Field name="nickname">
            {(field) => (
              <TextField>
                <Label>Nickname</Label>
                <Input
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  maxLength={50}
                  autoCorrect={false}
                  returnKeyType="done"
                />
                <FieldError isInvalid={!!field.state.meta.errors.length}>
                  {field.state.meta.errors[0]}
                </FieldError>
              </TextField>
            )}
          </form.Field>
        </Card.Body>

        <Card.Footer className="flex-col gap-4">
          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                variant="primary"
                onPress={() => form.handleSubmit()}
                isDisabled={!canSubmit || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            )}
          </form.Subscribe>
        </Card.Footer>
      </Card>
    </ScrollView>
  );
}
