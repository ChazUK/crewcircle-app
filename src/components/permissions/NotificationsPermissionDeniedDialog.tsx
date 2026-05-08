import { Platform } from "react-native";

import {
  PermissionDeniedDialog,
  StepHighlight,
  StepTitle,
  type PermissionStep,
} from "./PermissionDeniedDialog";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const steps: PermissionStep[] =
  Platform.OS === "ios"
    ? [
        {
          title: (
            <StepTitle>
              Tap <StepHighlight>Notifications</StepHighlight>
            </StepTitle>
          ),
          description: "Look for the Notifications row in the CrewCircle list.",
        },
        {
          title: (
            <StepTitle>
              Turn on<StepHighlight>Allow Notifications</StepHighlight>
            </StepTitle>
          ),
          description: "Toggle Allow Notifications so CrewCircle can reach you.",
        },
      ]
    : [
        {
          title: (
            <StepTitle>
              Tap <StepHighlight>Notifcations</StepHighlight>
            </StepTitle>
          ),
          description: "Open the Notifications section in CrewCircle's app info.",
        },
        {
          title: (
            <StepTitle>
              Turn on <StepHighlight>all Notifications</StepHighlight>
            </StepTitle>
          ),
          description: "Enable All notifications so CrewCircle can reach you.",
        },
      ];

export function NotificationsPermissionDeniedDialog({ isOpen, onClose }: Props) {
  return (
    <PermissionDeniedDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications disabled"
      reason="CrewCircle uses notifications to let you know when crew members respond to invitations and when shared events change."
      steps={steps}
    />
  );
}
