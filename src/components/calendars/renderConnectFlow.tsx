import type { ActiveStep } from "./CalendarAddSection";
import { GoogleConnectFlow } from "./connect/GoogleConnectFlow";
import { ICalConnectFlow } from "./connect/ICalConnectFlow";
import { MicrosoftConnectFlow } from "./connect/MicrosoftConnectFlow";
import { NativeConnectFlow } from "./connect/NativeConnectFlow";

export function renderConnectFlow(step: ActiveStep, onBack: () => void) {
  switch (step) {
    case "google":
      return <GoogleConnectFlow onBack={onBack} />;
    case "microsoft":
      return <MicrosoftConnectFlow onBack={onBack} />;
    case "ical":
      return <ICalConnectFlow onBack={onBack} />;
    case "native":
      return <NativeConnectFlow onBack={onBack} />;
  }
}
