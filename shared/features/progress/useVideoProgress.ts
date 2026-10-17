import { useCallback, useEffect, useRef, useState } from "react";
import { callApi } from "../../lib/api";

export interface VideoProgress {
  video_id: string;
  topic_key: string;
  position_seconds: number;
  duration_seconds: number;
  completed: boolean;
  updated_at?: string;
}
const STORE = "curiosity-video-progress-v1";
export function isValidProgress(value: unknown): value is VideoProgress {
  if (!value || typeof value !== "object") return false;
  const row = value as VideoProgress;
  return (
    /^[\w-]{11}$/.test(row.video_id) &&
    typeof row.topic_key === "string" &&
    row.topic_key.trim().length > 0 &&
    row.topic_key.length <= 500 &&
    Number.isFinite(row.position_seconds) &&
    row.position_seconds >= 0 &&
    Number.isFinite(row.duration_seconds) &&
    row.duration_seconds > 0 &&
    row.duration_seconds <= 604800 &&
    row.position_seconds <= row.duration_seconds &&
    typeof row.completed === "boolean"
  );
}
export function readGuestProgress(): VideoProgress[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(STORE) ?? "[]");
    return Array.isArray(rows) ? rows.filter(isValidProgress) : [];
  } catch {
    return [];
  }
}
export function useVideoProgress(token?: string) {
  const [rows, setRows] = useState<VideoProgress[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [message, setMessage] = useState("");
  const rowsRef = useRef(rows);
  const generation = useRef(0);
  // Serialize writes so an older request cannot overwrite a later pause/seek.
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    const current = ++generation.current;
    rowsRef.current = [];
    setRows([]);
    setMessage("");
    setLoading(Boolean(token));
    if (!token) {
      const guest = readGuestProgress();
      rowsRef.current = guest;
      setRows(guest);
      return;
    }
    callApi<VideoProgress[]>("progress/list", {}, token)
      .then((data) => {
        if (generation.current !== current) return;
        const valid = data.filter(isValidProgress);
        rowsRef.current = valid;
        setRows(valid);
        setLoading(false);
      })
      .catch(() => {
        if (generation.current === current) {
          setLoading(false);
          setMessage(
            "Account video progress could not load. Check that the new database setup has been run.",
          );
        }
      });
    return () => {
      generation.current++;
    };
  }, [token]);
  const save = useCallback(
    (row: VideoProgress) => {
      if (!isValidProgress(row)) return;
      const previous = rowsRef.current.find(
        (item) => item.video_id === row.video_id,
      );
      if (
        previous &&
        previous.position_seconds === row.position_seconds &&
        previous.completed === row.completed &&
        previous.topic_key === row.topic_key
      )
        return;
      const next = [
        { ...row, updated_at: new Date().toISOString() },
        ...rowsRef.current.filter((item) => item.video_id !== row.video_id),
      ].slice(0, 200);
      rowsRef.current = next;
      setRows(next);
      if (!token) {
        try {
          localStorage.setItem(STORE, JSON.stringify(next));
        } catch {
          setMessage(
            "Browser storage is unavailable; video progress could not be saved.",
          );
        }
        return;
      }
      const current = generation.current;
      queue.current = queue.current.then(async () => {
        if (generation.current !== current) return;
        try {
          await callApi("progress/save", row, token);
          if (generation.current === current) setMessage("");
        } catch {
          if (generation.current === current)
            setMessage(
              "Video progress has not synced to your account. Check your connection and database setup.",
            );
        }
      });
    },
    [token],
  );
  return { rows, save, message, loading };
}
