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
              Toggle <StepHighlight>Camera</StepHighlight> on
            </StepTitle>
          ),
          description: "Find the Camera row in the CrewCircle list and switch it on.",
        },
      ]
    : [
        {
          title: (
            <StepTitle>
              Tap <StepHighlight>Permissions</StepHighlight>
            </StepTitle>
          ),
          description: "Open the Permissions section in CrewCircle's app info.",
        },
        {
          title: (
            <StepTitle>
              Tap <StepHighlight>Camera</StepHighlight>
            </StepTitle>
          ),
          description: "Find the Camera permission entry.",
        },
        {
          title: (
            <StepTitle>
              Select <StepHighlight>Allow</StepHighlight>
            </StepTitle>
          ),
          description: "Switch the camera permission to Allow.",
        },
      ];

export function CameraPermissionDeniedDialog({ isOpen, onClose }: Props) {
  return (
    <PermissionDeniedDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Camera access required"
      reason="CrewCircle needs access to your camera to take a profile photo."
      steps={steps}
    />
  );
}
