import { useEffect, useState } from "react";
import {
  advanceBreakClock,
  resetBreakClock,
  type BreakState,
} from "./break-clock";

export function useLearningClock(
  topicKey: string,
  active: boolean,
  demo: boolean,
) {
  const storageKey = `curiosity-clock:${topicKey}:${demo ? "demo-v2" : "real"}`;
  const [clock, setClock] = useState<BreakState>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (
        stored &&
        typeof stored.seconds === "number" &&
        stored.seconds >= 0 &&
        typeof stored.offered === "boolean"
      )
        return stored;
    } catch {
      /* A missing or unavailable browser store does not block viewing. */
    }
    return resetBreakClock();
  });
  useEffect(() => {
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previous) / 1000;
      previous = now;
      setClock((current) =>
        advanceBreakClock(
          current,
          elapsed,
          active && document.visibilityState === "visible",
          demo ? 30 : 720,
        ),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, demo]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(clock));
    } catch {
      /* Persistence unavailable. */
    }
  }, [clock, storageKey]);
  return { clock, reset: () => setClock(resetBreakClock()) };
}
