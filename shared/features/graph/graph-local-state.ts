import { isProgress, isViewState } from "./graph-client";
import type { TopicProgress, GraphViewState } from "./graph-types";
export const PROGRESS_KEY = "curiosity-graph-progress-v1",
  STATE_KEY = "curiosity-graph-view-v1";
export function guestProgress(): TopicProgress[] {
  try {
    const p: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "[]");
    return Array.isArray(p) ? p.filter(isProgress).slice(0, 1000) : [];
  } catch {
    return [];
  }
}
export function guestView(): GraphViewState | null {
  try {
    const s: unknown = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null");
    return isViewState(s) ? s : null;
  } catch {
    return null;
  }
}
