import { InputOTP as HeroInputOTP, InputOTPRef } from "heroui-native";
import { useRef } from "react";

export function InputOTP() {
  const ref = useRef<InputOTPRef>(null);

  const onComplete = (code: string) => {
    console.log("OTP completed:", code);
    setTimeout(() => {
      ref.current?.clear();
    }, 1000);
  };

  return (
    <HeroInputOTP className="self-center" ref={ref} maxLength={6} onComplete={onComplete}>
      <HeroInputOTP.Group>
        <HeroInputOTP.Slot index={0} />
        <HeroInputOTP.Slot index={1} />
        <HeroInputOTP.Slot index={2} />
      </HeroInputOTP.Group>
      <HeroInputOTP.Separator />
      <HeroInputOTP.Group>
        <HeroInputOTP.Slot index={3} />
        <HeroInputOTP.Slot index={4} />
        <HeroInputOTP.Slot index={5} />
      </HeroInputOTP.Group>
    </HeroInputOTP>
  );
}
