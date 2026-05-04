import { useUser } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";

import { cancelPendingPhone } from "@/lib/phone/clerk/cancelPendingPhone";

import { EnterCodeView } from "./EnterCodeView";
import { EnterNumberView } from "./EnterNumberView";

type Props = {
  onComplete: () => void;
};

export function PhoneVerificationStep({ onComplete }: Props) {
  const [view, setView] = useState<"enter-number" | "enter-code">("enter-number");
  const [pendingE164, setPendingE164] = useState("");
  const { user } = useUser();
  const hasCleanedUp = useRef(false);

  useEffect(() => {
    if (user && !hasCleanedUp.current) {
      hasCleanedUp.current = true;
      void cancelPendingPhone({ user });
    }
  }, [user]);

  if (view === "enter-code") {
    return (
      <EnterCodeView
        phoneE164={pendingE164}
        onVerified={onComplete}
        onEditNumber={() => {
          if (user) void cancelPendingPhone({ user });
          setView("enter-number");
        }}
      />
    );
  }

  return (
    <EnterNumberView
      onCodeSent={(e164) => {
        setPendingE164(e164);
        setView("enter-code");
      }}
    />
  );
}
