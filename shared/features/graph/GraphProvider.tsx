import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { graphCall, isProgress, loadProgress } from "./graph-client";
import { guestProgress, PROGRESS_KEY } from "./graph-local-state";
import { createActivityController } from "./activity-controller";
import type { GraphNode, PlaybackSample, TopicProgress } from "./graph-types";
interface GraphContext {
  matches: Record<string, GraphNode>;
  openTopic: (n: GraphNode) => void;
  rows: TopicProgress[];
  message: string;
  onPlayback: (s: PlaybackSample) => void;
  discover: (id: string) => void;
  retryTracking: () => void;
}
const Context = createContext<GraphContext>({
  matches: {},
  openTopic: () => {},
  rows: [],
  message: "",
  onPlayback: () => {},
  discover: () => {},
  retryTracking: () => {},
});
export const useGraphProgress = () => useContext(Context);
export function GraphProvider({
  token,
  enabled,
  children,
  onOpenTopic,
}: {
  token?: string;
  enabled: boolean;
  children: ReactNode;
  onOpenTopic: (n: GraphNode) => void;
}) {
  const [matches, setMatches] = useState<Record<string, GraphNode>>({});
  const [rows, setRows] = useState<TopicProgress[]>(() =>
      token ? [] : guestProgress(),
    ),
    [message, setMessage] = useState(""),
    [award, setAward] = useState<GraphNode | null>(null);
  const rowsRef = useRef(rows),
    tokenRef = useRef(token),
    live = useRef(false),
    ready = useRef(!token),
    controller = useRef<ReturnType<typeof createActivityController> | null>(
      null,
    );
  tokenRef.current = token;
  const apply = useCallback((p: TopicProgress) => {
    if (!live.current || !isProgress(p)) return false;
    const next = [
      p,
      ...rowsRef.current.filter((r) => r.topic_id !== p.topic_id),
    ].slice(0, 1000);
    rowsRef.current = next;
    setRows(next);
    if (!tokenRef.current) {
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch {
        setMessage(
          "Browser storage is unavailable; map progress is not saved.",
        );
        return false;
      }
    }
    return true;
  }, []);
  const load = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) {
      ready.current = true;
      return;
    }
    try {
      const data = await loadProgress(t);
      if (!live.current) return;
      rowsRef.current = data;
      setRows(data);
      ready.current = true;
      setMessage("");
      controller.current?.flush();
    } catch {
      if (live.current) {
        ready.current = false;
        setMessage(
          "Account map progress could not load. Tracking is paused; retry when ready.",
        );
      }
    }
  }, []);
  useEffect(() => {
    live.current = true;
    if (!enabled)
      return () => {
        live.current = false;
      };
    controller.current = createActivityController({
      token: () => tokenRef.current,
      ready: () => ready.current,
      progress: () => rowsRef.current,
      apply,
      award: (n) => {
        if (live.current) setAward(n);
      },
      message: (m) => {
        if (live.current) setMessage(m);
      },
      association: (id, n) => {
        if (live.current)
          setMatches((old) => ({
            ...Object.fromEntries(Object.entries(old).slice(-199)),
            [id]: n,
          }));
      },
      guestCredit: (n, ms) => {
        if (!document.hasFocus()) return;
        const latest = guestProgress();
        const old =
          latest.find((p) => p.topic_id === n.id) ??
          rowsRef.current.find((p) => p.topic_id === n.id);
        if (old?.first_explored_at) return;
        const total = Math.min(30000, (old?.active_viewing_ms ?? 0) + ms),
          earned = total === 30000;
        const saved = apply({
          topic_id: n.id,
          active_viewing_ms: total,
          discovered_at: old?.discovered_at ?? new Date().toISOString(),
          first_explored_at: earned ? new Date().toISOString() : null,
        });
        if (earned && saved) setAward(n);
      },
    });
    void load();
    const timer = setInterval(() => controller.current?.flush(), 5000);
    function syncGuest(e: StorageEvent) {
      if (!tokenRef.current && e.key === PROGRESS_KEY) {
        const data = guestProgress();
        rowsRef.current = data;
        setRows(data);
      }
    }
    window.addEventListener("storage", syncGuest);
    return () => {
      live.current = false;
      clearInterval(timer);
      controller.current?.dispose();
      controller.current = null;
      window.removeEventListener("storage", syncGuest);
    };
  }, [enabled, apply, load]);
  const onPlayback = useCallback(
    (s: PlaybackSample) => controller.current?.sample(s),
    [],
  );
  const discover = useCallback(
    (id: string) => {
      if (rowsRef.current.some((r) => r.topic_id === id)) return;
      if (tokenRef.current) {
        void graphCall<unknown>("discover", { topicId: id }, tokenRef.current)
          .then((r) => {
            if (isProgress(r)) {
              const old = rowsRef.current.find((p) => p.topic_id === id);
              if (!old || r.active_viewing_ms >= old.active_viewing_ms)
                apply(r);
            } else throw Error();
          })
          .catch(() => {
            if (live.current) setMessage("Topic discovery could not sync.");
          });
      } else
        apply({
          topic_id: id,
          active_viewing_ms: 0,
          first_explored_at: null,
          discovered_at: new Date().toISOString(),
        });
    },
    [apply],
  );
  const retryTracking = useCallback(() => {
    setMessage("");
    void load().then(() => {
      if (live.current && ready.current) controller.current?.retry();
    });
  }, [load]);
  return (
    <Context.Provider
      value={{
        matches,
        openTopic: onOpenTopic,
        rows,
        message,
        onPlayback,
        discover,
        retryTracking,
      }}
    >
      {children}
      {enabled && message && (
        <aside className="graph-sync-notice" role="status">
          {message}
          <button onClick={retryTracking}>Retry tracking</button>
        </aside>
      )}
      {enabled && award && (
        <aside className="graph-award" role="status">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>Achievement unlocked</strong>
            <p>Your first exploration of {award.label}.</p>
            <small>
              {token ? "Saved to your account." : "Saved in this browser."}
            </small>
          </div>
          <button
            onClick={() => setAward(null)}
            aria-label="Dismiss achievement"
          >
            ×
          </button>
        </aside>
      )}
    </Context.Provider>
  );
}
