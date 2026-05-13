import { useRegisterPushToken } from "@/hooks/notifications/useRegisterPushToken";

export function PushTokenRegistrar() {
  useRegisterPushToken();
  return null;
}
