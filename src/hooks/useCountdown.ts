import { useEffect, useState } from "react";

/**
 * Returns the current countdown value and a function to start the countdown
 * from a given number (counting down to 0, one tick per second).
 */
export function useCountdown(initialValue = 0): [number, (n: number) => void] {
  const [countdown, setCountdown] = useState(initialValue);

  useEffect(() => {
    if (countdown === 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return [countdown, setCountdown];
}
