import { useSignUp } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { CreateAccountStep } from "@/components/auth/sign-up/CreateAccountStep";
import { DepartmentStep } from "@/components/auth/sign-up/DepartmentStep";
import { ProfileStep, type ProfileData } from "@/components/auth/sign-up/ProfileStep";
import { UseCaseStep, type UseCase } from "@/components/auth/sign-up/UseCaseStep";
import { VerifyEmailStep } from "@/components/auth/sign-up/VerifyEmailStep";
import { BackButton } from "@/components/ui/BackButton";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function Page() {
  const [currentStep, setCurrentStep] = useState(1);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);

  const { signUp, errors: clerkErrors, fetchStatus } = useSignUp();
  const router = useRouter();

  const totalSteps = 5;
  const isFetching = fetchStatus === "fetching";

  function goBack() {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  }

  async function handleCreateAccount({ email, password }: { email: string; password: string }) {
    setSignUpEmail(email);
    const { error } = await signUp.password({ emailAddress: email, password });
    console.log({ error });
    if (error) return;
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) return;
    setCurrentStep(3);
  }

  async function handleVerifyEmail(code: string) {
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) return;
    setCurrentStep(4);
  }

  async function handleResendVerification() {
    await signUp.verifications.sendEmailCode();
  }

  async function handleProfile(data: ProfileData) {
    // TODO: save profile to Convex
    console.log("profile data", data);
    if (useCase === "crew") {
      setCurrentStep(5);
    } else {
      await finalizeSignUp();
    }
  }

  async function handleDepartments() {
    // TODO: save departments to Convex
    console.log("departments", departments);
    await finalizeSignUp();
  }

  async function finalizeSignUp() {
    await signUp.finalize({
      navigate: ({ decorateUrl }) => {
        router.replace(decorateUrl("/") as Href);
      },
    });
  }

  const showBottomContinue = currentStep === 1 || currentStep === 5;
  const continueDisabled =
    (currentStep === 1 && useCase === null) ||
    (currentStep === 5 && departments.length === 0) ||
    isFetching;

  function handleContinue() {
    if (currentStep === 5) {
      handleDepartments();
    } else {
      setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <UseCaseStep value={useCase} onChange={setUseCase} />;
      case 2:
        return (
          <CreateAccountStep
            onSubmit={handleCreateAccount}
            emailError={clerkErrors.fields.emailAddress?.longMessage}
            passwordError={clerkErrors.fields.password?.longMessage}
            globalError={(clerkErrors.global?.[0] as any)?.errors?.[0]?.longMessage}
            isFetching={isFetching}
          />
        );
      case 3:
        return (
          <VerifyEmailStep
            email={signUpEmail}
            onVerify={handleVerifyEmail}
            onResend={handleResendVerification}
            error={
              clerkErrors.fields.code?.longMessage ??
              (clerkErrors.global?.[0] as any)?.errors?.[0]?.longMessage
            }
            isFetching={isFetching}
          />
        );
      case 4:
        return (
          <ProfileStep
            onSubmit={handleProfile}
            globalError={(clerkErrors.global?.[0] as any)?.errors?.[0]?.longMessage}
            isFetching={isFetching}
          />
        );
      case 5:
        return <DepartmentStep value={departments} onChange={setDepartments} />;
      default:
        return null;
    }
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <View className="flex-row items-center gap-4 mx-4 my-4">
        <BackButton onPress={goBack} />
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
