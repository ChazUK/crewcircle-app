import { useUser } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { DepartmentStep } from "@/components/onboarding/DepartmentStep";
import { ProfileStep, type ProfileData } from "@/components/onboarding/ProfileStep";
import { UseCaseStep, type UseCase } from "@/components/onboarding/UseCaseStep";
import { BackButton } from "@/components/ui/BackButton";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [pendingProfile, setPendingProfile] = useState<ProfileData | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);

  const { user: clerkUser } = useUser();
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);

  const totalSteps = useCase === "crew" ? 3 : 2;

  function goBack() {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  }

  async function handleProfile(data: ProfileData) {
    setPendingProfile(data);
    if (useCase === "crew") {
      setCurrentStep(3);
    } else {
      await finish(data, []);
    }
  }

  async function finish(profile: ProfileData, depts: string[]) {
    await Promise.all([
      clerkUser!.update({ firstName: profile.firstName, lastName: profile.lastName }),
      completeOnboarding({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || undefined,
        city: profile.city,
        userType: useCase === "crew" ? "crew" : "production-manager",
        departments: depts.length > 0 ? depts : undefined,
      }),
    ]);
    // _layout.tsx watches hasCompletedOnboarding reactively — routing updates automatically.
  }

  const showBottomContinue = currentStep === 1 || currentStep === 3;
  const continueDisabled =
    (currentStep === 1 && useCase === null) || (currentStep === 3 && departments.length === 0);

  function handleContinue() {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 3 && pendingProfile) {
      finish(pendingProfile, departments);
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <UseCaseStep value={useCase} onChange={setUseCase} />;
      case 2:
        return <ProfileStep onSubmit={handleProfile} isFetching={false} />;
      case 3:
        return <DepartmentStep value={departments} onChange={setDepartments} />;
      default:
        return null;
    }
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <View className="flex-row items-center gap-4 mx-4 my-4">
        {currentStep > 1 && <BackButton onPress={goBack} />}
        <ProgressIndicator className="flex-1" currentStep={currentStep} totalSteps={totalSteps} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 gap-6 py-2">{renderStep()}</View>
      </ScrollView>

      {showBottomContinue && (
        <Button
          variant="primary"
          className="mx-4 mb-2"
          isDisabled={continueDisabled}
          onPress={handleContinue}
        >
          Continue
        </Button>
      )}
    </StyledSafeAreaView>
  );
}
