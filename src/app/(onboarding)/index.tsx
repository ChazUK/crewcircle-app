import { useUser } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { DepartmentStep } from "@/components/onboarding/DepartmentStep";
import { PhoneVerificationStep } from "@/components/onboarding/phone/PhoneVerificationStep";
import { UseCaseStep, type UseCase } from "@/components/onboarding/UseCaseStep";
import { BackButton } from "@/components/ui/BackButton";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const { user: clerkUser } = useUser();
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);
  const convexUser = useQuery(api.users.queries.getCurrentUser);

  const form = useForm({
    defaultValues: {
      useCase: null as UseCase | null,
      departments: [] as string[],
    },
    onSubmit: async ({ value }) => {
      await completeOnboarding({
        firstName: clerkUser?.firstName ?? "",
        lastName: clerkUser?.lastName ?? "",
        userType: value.useCase === "crew" ? "crew" : "production-manager",
        departments:
          value.useCase === "crew" && value.departments.length > 0 ? value.departments : undefined,
      });
    },
  });

  function goBack() {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  }

  async function handleContinue() {
    const useCase = form.getFieldValue("useCase");
    if (currentStep === 1) {
      if (useCase === "crew") {
        setCurrentStep(2);
      } else {
        await form.handleSubmit();
      }
    } else if (currentStep === 2) {
      await form.handleSubmit();
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <form.Field name="useCase">
            {(field) => <UseCaseStep value={field.state.value} onChange={field.handleChange} />}
          </form.Field>
        );
      case 2:
        return (
          <form.Field name="departments">
            {(field) => <DepartmentStep value={field.state.value} onChange={field.handleChange} />}
          </form.Field>
        );
      default:
        return null;
    }
  }

  if (convexUser === undefined) return null;

  if (!convexUser?.phone) {
    return (
      <StyledSafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 gap-6 py-2">
            <PhoneVerificationStep onComplete={() => {}} />
          </View>
        </ScrollView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <form.Subscribe selector={(s) => s.values.useCase}>
        {(useCase) => (
          <View className="flex-row items-center gap-4 mx-4 my-4">
            {currentStep > 1 && <BackButton onPress={goBack} />}
            <ProgressIndicator
              className="flex-1"
              currentStep={currentStep}
              totalSteps={useCase === "crew" ? 2 : 1}
            />
          </View>
        )}
      </form.Subscribe>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 gap-6 py-2">{renderStep()}</View>
      </ScrollView>

      <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, values: s.values })}>
        {({ isSubmitting, values }) => (
          <Button
            variant="primary"
            className="mx-4 mb-2"
            isDisabled={
              isSubmitting ||
              (currentStep === 1 && values.useCase === null) ||
              (currentStep === 2 && values.departments.length === 0)
            }
            onPress={handleContinue}
          >
            Continue
          </Button>
        )}
      </form.Subscribe>
    </StyledSafeAreaView>
  );
}
