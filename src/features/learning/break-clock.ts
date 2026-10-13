export interface BreakState {
  seconds: number;
  offered: boolean;
}
export function advanceBreakClock(
  state: BreakState,
  elapsedSeconds: number,
  active: boolean,
  threshold = 720,
): BreakState {
  if (!active || state.offered || elapsedSeconds <= 0 || elapsedSeconds > 2)
    return state;
  const seconds = state.seconds + elapsedSeconds;
  return { seconds, offered: seconds >= threshold };
}
export const resetBreakClock = (): BreakState => ({
  seconds: 0,
  offered: false,
});
