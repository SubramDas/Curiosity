import type { Video, VideoClassification } from "../../types";
import { callApi } from "../../lib/api";

export interface ClassificationEntry {
  status:
    | "waiting"
    | "finding"
    | "idle"
    | "ready"
    | "failed"
    | "limited"
    | "disabled";
  classification?: VideoClassification;
  message?: string;
}
export function isClassification(value: unknown): value is VideoClassification {
  if (!value || typeof value !== "object") return false;
  const row = value as VideoClassification;
  const universes = ["science", "commerce", "arts"];
  return Boolean(
    row.topic &&
    typeof row.topic.label === "string" &&
    row.topic.label.trim() &&
    row.topic.label.length <= 200 &&
    ["matched", "provisional"].includes(row.topic.status) &&
    (row.topic.wikidataId === null ||
      /^Q[1-9]\d*$/.test(row.topic.wikidataId)) &&
    (row.topic.status === "matched"
      ? row.topic.wikidataId !== null
      : row.topic.wikidataId === null) &&
    (row.primaryUniverse === null || universes.includes(row.primaryUniverse)) &&
    Array.isArray(row.relatedUniverses) &&
    row.relatedUniverses.length <= 2 &&
    new Set(row.relatedUniverses).size === row.relatedUniverses.length &&
    row.relatedUniverses.every(
      (id) => universes.includes(id) && id !== row.primaryUniverse,
    ) &&
    (row.primaryUniverse !== null ||
      (row.relatedUniverses.length === 0 && row.topic.wikidataId === null)) &&
    typeof row.reason === "string" &&
    typeof row.policyVersion === "string",
  );
}

export function createClassificationClient({ pollIntervalMs = 5000 } = {}) {
  let snapshot = new Map<string, ClassificationEntry>();
  const listeners = new Set<() => void>();
  const queue: { id: string; retry: boolean }[] = [];
  const visible = new Map<string, Set<symbol>>();
  let active = false;
  let enabled: boolean | undefined;
  let disposed = false;
  let controller: AbortController | undefined;
  function publish(id: string, entry: ClassificationEntry) {
    if (disposed) return;
    snapshot = new Map(snapshot).set(id, entry);
    listeners.forEach((listener) => listener());
  }
  function wait(signal: AbortSignal, milliseconds: number) {
    return new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new Error("Classification stopped."));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, milliseconds);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  async function classify(id: string, retry: boolean, signal: AbortSignal) {
    let first = true;
    let polls = 0;
    while (!disposed && !signal.aborted) {
      const response = await fetch("/api/videos/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          background: true,
          ...(first && retry ? { retry: true } : {}),
        }),
        signal,
      });
      first = false;
      const data = await response.json();
      if (!response.ok || data.status === "failed") {
        if (["LOCAL_LIMIT", "GEMINI_DAILY_LIMIT"].includes(data.code)) {
          publish(id, {
            status: "limited",
            message: data.message ?? "Daily label limit reached.",
          });
          return;
        }
        throw new Error(data.message ?? "Topic classification is unavailable.");
      }
      if (data.videoId !== id)
        throw new Error("Topic classification returned an invalid response.");
      if (data.classification) {
        if (!isClassification(data.classification))
          throw new Error("Topic classification returned an invalid response.");
        publish(id, { status: "ready", classification: data.classification });
        return;
      }
      if (!["waiting", "finding"].includes(data.status))
        throw new Error("Topic classification returned an invalid response.");
      publish(id, { status: data.status });
      const earlyDelays = [500, 1500];
      const delay = earlyDelays[polls] ?? pollIntervalMs;
      polls++;
      await wait(signal, Math.min(pollIntervalMs, delay));
    }
  }
  function pump() {
    if (enabled === undefined || disposed || active) return;
    const next = queue.shift();
    if (!next) return;
    if (!enabled) {
      publish(next.id, {
        status: "disabled",
        message: "Topic classification is unavailable.",
      });
      pump();
      return;
    }
    active = true;
    controller = new AbortController();
    void classify(next.id, next.retry, controller.signal)
      .catch((error) =>
        publish(next.id, {
          status: "failed",
          message:
            error instanceof Error
              ? error.message
              : "Topic classification is unavailable.",
        }),
      )
      .finally(() => {
        active = false;
        controller = undefined;
        pump();
      });
  }
  function request(videos: Video[]) {
    for (const video of videos) {
      const entry = snapshot.get(video.id);
      if (
        (entry && entry.status !== "idle") ||
        video.classification ||
        !/^[\w-]{11}$/.test(video.id)
      )
        continue;
      publish(video.id, { status: "waiting" });
      queue.push({ id: video.id, retry: false });
    }
    pump();
  }
  return {
    start() {
      disposed = false;
      void callApi<{ videoClassificationEnabled?: boolean }>("config")
        .then((config) => {
          enabled = config.videoClassificationEnabled === true;
          pump();
        })
        .catch(() => {
          enabled = false;
          pump();
        });
    },
    dispose() {
      disposed = true;
      queue.length = 0;
      controller?.abort();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    request,
    setVisible(video: Video, owner: symbol, isVisible: boolean) {
      const owners = visible.get(video.id) ?? new Set<symbol>();
      if (isVisible) {
        owners.add(owner);
        visible.set(video.id, owners);
        request([video]);
      } else {
        owners.delete(owner);
        if (owners.size) return;
        visible.delete(video.id);
        const index = queue.findIndex((row) => row.id === video.id);
        if (index >= 0) {
          queue.splice(index, 1);
          publish(video.id, { status: "idle" });
        }
      }
    },
    retry(id: string) {
      if (snapshot.get(id)?.status !== "failed") return;
      publish(id, { status: "waiting" });
      queue.unshift({ id, retry: true });
      pump();
    },
  };
}
