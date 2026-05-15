import * as Sentry from "@sentry/react-native";
import { Button } from "heroui-native";
import React from "react";
import { Text, View } from "react-native";

import { SafeAreaView } from "./SafeAreaView";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

export type ErrorFallbackProps = {
  onReset: () => void;
};

export function ErrorFallback({ onReset }: ErrorFallbackProps) {
  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-3 text-center text-2xl font-bold" accessibilityRole="header">
          Something went wrong
        </Text>
        <Text className="text-default-500 mb-8 text-center text-base">
          An unexpected error occurred. Please try again.
        </Text>
        <Button variant="primary" onPress={onReset} accessibilityLabel="Try again">
          Try again
        </Button>
      </View>
    </SafeAreaView>
  );
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback onReset={resetError} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
