import { api } from "@convex/_generated/api";
import type { Department } from "@shared/departments/departments";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { ScrollView, View } from "react-native";

import { DepartmentRolesPicker } from "@/components/profile/DepartmentRolesPicker";
import { Title } from "@/components/ui/Title";

export default function EditDepartmentAndRolesScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.queries.getMyProfile);
  const updateDepartmentAndRoles = useMutation(
    api.users.mutations.updateDepartmentAndRoles.updateDepartmentAndRoles,
  );

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (profile === null || profile.userType !== "crew") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Title title="Sign in to edit your profile" />
      </View>
    );
  }

  return (
    <EditDepartmentAndRolesForm
      initialDepartment={(profile.department as Department | undefined) ?? undefined}
      initialRoles={profile.roles ?? []}
      onDone={() => router.back()}
      onSubmit={updateDepartmentAndRoles}
    />
  );
}

type FormProps = {
  initialDepartment: Department | undefined;
  initialRoles: string[];
  onDone: () => void;
  onSubmit: (args: { department: Department; roles: string[] }) => Promise<unknown>;
};

function EditDepartmentAndRolesForm({
  initialDepartment,
  initialRoles,
  onDone,
  onSubmit,
}: FormProps) {
  const form = useForm({
    defaultValues: {
      department: initialDepartment,
      roles: initialRoles,
    },
    onSubmit: async ({ value }) => {
      if (!value.department) return;
      await onSubmit({ department: value.department, roles: value.roles });
      onDone();
    },
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      <form.Field name="department">
        {(deptField) => (
          <form.Field name="roles">
            {(rolesField) => (
              <DepartmentRolesPicker
                department={deptField.state.value}
                roles={rolesField.state.value}
                onDepartmentChange={(dept) => {
                  if (dept !== deptField.state.value) {
                    rolesField.handleChange([]);
                  }
                  deptField.handleChange(dept);
                }}
                onRolesChange={rolesField.handleChange}
              />
            )}
          </form.Field>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          department: state.values.department,
          roles: state.values.roles,
        })}
      >
        {({ canSubmit, isSubmitting, department, roles }) => (
          <Button
            variant="primary"
            onPress={() => form.handleSubmit()}
            isDisabled={!canSubmit || isSubmitting || !department || roles.length === 0}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}
