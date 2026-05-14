import * as Sentry from "@sentry/react-native";
import { Button } from "heroui-native";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { reportError } from "@/lib/observability/reportError";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

export type ErrorFallbackProps = {
  onReset: () => void;
};

export function ErrorFallback({ onReset }: ErrorFallbackProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold mb-3 text-center" accessibilityRole="header">
          Something went wrong
        </Text>
        <Text className="text-base text-center mb-8 text-default-500">
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
