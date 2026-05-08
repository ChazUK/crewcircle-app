import { Dialog, PressableFeedback, Surface, useThemeColor } from "heroui-native";
import { CogIcon, SettingsIcon as LucideSettingsIcon } from "lucide-react-native";
import { Linking, Platform, Text, View } from "react-native";

export type PermissionStep = {
  title: React.ReactNode;
  description?: React.ReactNode;
  visual?: React.ReactNode;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reason: string;
  steps: PermissionStep[];
};

const platformLabel = Platform.OS === "ios" ? "iOS" : "Android";
const SettingsIcon = Platform.OS === "ios" ? CogIcon : LucideSettingsIcon;

export function PermissionDeniedDialog({ isOpen, onClose, title, reason, steps }: Props) {
  const allSteps: PermissionStep[] = [
    {
      title: `Open ${platformLabel} Settings`.replace(/\s+/g, " ").trim(),
      description: "Tap the button below to open CrewCircle's settings page.",
      visual: <OpenSettingsCard />,
    },
    ...steps,
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close className="absolute top-3 right-2.5 z-50" variant="ghost" />
          <View className="gap-1">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description className="text-sm">{reason}</Dialog.Description>
          </View>

          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            How to turn it on
          </Text>

          <View>
            {allSteps.map((step, i) => (
              <StepRow
                key={i}
                number={i + 1}
                title={step.title}
                description={step.description}
                visual={step.visual}
                isLast={i === allSteps.length - 1}
              />
            ))}
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

type StepRowProps = {
  number: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  visual?: React.ReactNode;
  isLast: boolean;
};

function StepRow({ number, title, description, visual, isLast }: StepRowProps) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
          <Text className="text-xs font-bold text-accent-foreground">{number}</Text>
        </View>
        {!isLast ? (
          <View className="my-1 w-1 flex-1 bg-linear-to-b from-accent-soft to-transparent rounded-full" />
        ) : null}
      </View>
      <View className={`flex-1 gap-1.5 ${isLast ? "" : "pb-5"}`}>
        {typeof title === "string" ? <StepTitle>{title}</StepTitle> : title}
        {description !== undefined ? (
          typeof description === "string" ? (
            <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
          ) : (
            description
          )
        ) : null}
        {visual ? <View className="mt-2">{visual}</View> : null}
      </View>
    </View>
  );
}

export function StepTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-base font-semibold text-foreground">{children}</Text>;
}

export function StepHighlight({ children }: { children: React.ReactNode }) {
  return <Text className="text-accent">{children}</Text>;
}

function OpenSettingsCard() {
  const foregroundColor = useThemeColor("foreground");

  return (
    <Surface className="rounded-2xl bg-default-100 p-2" variant="secondary">
      <PressableFeedback
        onPress={async () => {
          await Linking.openSettings();
        }}
        accessibilityRole="button"
        accessibilityLabel="Open Settings"
        className="flex-row items-center gap-2"
      >
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-gray-200">
          <SettingsIcon size={18} color={foregroundColor} />
        </View>

        <Text className="flex-1 text-sm font-semibold text-foreground">
          Settings → Apps → CrewCircle
        </Text>
      </PressableFeedback>
    </Surface>
  );
}
