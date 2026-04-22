import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  currentStep: number;
  totalSteps: number;
  className?: string;
};

export function ProgressIndicator({ currentStep, totalSteps, className }: Props) {
  const safeTotalSteps = Math.min(5, Math.max(1, Math.trunc(totalSteps)));
  const safeCurrentStep = Math.min(safeTotalSteps, Math.max(1, Math.trunc(currentStep)));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${safeCurrentStep} of ${safeTotalSteps}`}
      accessibilityValue={{ min: 1, max: safeTotalSteps, now: safeCurrentStep }}
      style={[styles.container]}
      className={className}
    >
      {Array.from({ length: safeTotalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < safeCurrentStep;
        const isActive = step === safeCurrentStep;

        return (
          <View
            key={step}
            style={[
              styles.line,
              isCompleted && styles.lineCompleted,
              isActive && styles.lineActive,
              !isCompleted && !isActive && styles.lineUpcoming,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  line: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  lineCompleted: {
    backgroundColor: "#0a7ea4",
  },
  lineActive: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0a7ea4",
  },
  lineUpcoming: {
    backgroundColor: "#ccc",
  },
});
