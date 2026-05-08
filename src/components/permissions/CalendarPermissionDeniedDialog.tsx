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
              Tap <StepHighlight>Calendars</StepHighlight>
            </StepTitle>
          ),
          description: "Look for the row labeled “Calendars” in the CrewCircle list.",
        },
        {
          title: (
            <StepTitle>
              Select <StepHighlight>Full Access</StepHighlight>
            </StepTitle>
          ),
          description: "Choose Full Access so CrewCircle can see and add events.",
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
              Tap <StepHighlight>Calendars</StepHighlight>
            </StepTitle>
          ),
          description: "Find the Calendar permission entry.",
        },
        {
          title: (
            <StepTitle>
              Select <StepHighlight>Allow</StepHighlight>
            </StepTitle>
          ),
          description: "Switch the calendar permission to Allow.",
        },
      ];

export function CalendarPermissionDeniedDialog({ isOpen, onClose }: Props) {
  return (
    <PermissionDeniedDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Calendar access required"
      reason="CrewCircle needs full calendar access to view when you're busy and add events to your schedule."
      steps={steps}
    />
  );
}
