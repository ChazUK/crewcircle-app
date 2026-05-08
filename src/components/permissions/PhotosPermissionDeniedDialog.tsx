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
              Tap <StepHighlight>Photos</StepHighlight>
            </StepTitle>
          ),
          description: "Look for the Photos row in the CrewCircle list.",
        },
        {
          title: (
            <StepTitle>
              Select <StepHighlight>Full Access</StepHighlight>
            </StepTitle>
          ),
          description: "Choose Full Access so CrewCircle can read your library.",
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
              Tap <StepHighlight>Photos and videos</StepHighlight>
            </StepTitle>
          ),
          description: "Find the Photos and videos permission entry.",
        },
        {
          title: (
            <StepTitle>
              Select <StepHighlight>Allow</StepHighlight>
            </StepTitle>
          ),
          description: "Switch the photos permission to Allow.",
        },
      ];

export function PhotosPermissionDeniedDialog({ isOpen, onClose }: Props) {
  return (
    <PermissionDeniedDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Photo library access required"
      reason="CrewCircle needs access to your photo library to upload a profile photo."
      steps={steps}
    />
  );
}
