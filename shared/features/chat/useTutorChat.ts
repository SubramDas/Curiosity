import { useEffect, useRef, useState } from "react";
import { callApi } from "../../lib/api";
import type { TeacherAnswer, Video } from "../../types";

export interface ChatTurn {
  question: string;
  answer: TeacherAnswer;
  video: Video | null;
}
export function useTutorChat(accountId?: string) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    generation.current++;
    pending.current = false;
    setTurns([]);
    setBusy(false);
    setError("");
  }, [accountId]);
  async function ask(
    question: string,
    topic: string,
    video: Video | null,
    positionSeconds: number,
  ) {
    if (pending.current || !question.trim()) return false;
    pending.current = true;
    const current = generation.current;
    setBusy(true);
    setError("");
    const history = turns
      .flatMap((turn) => [
        { role: "user", content: turn.question },
        { role: "assistant", content: turn.answer.answer.slice(0, 2000) },
      ])
      .slice(-6);
    try {
      const answer = await callApi<TeacherAnswer>("chat", {
        question,
        topic,
        history,
        currentVideo: video
          ? { id: video.id, title: video.title.slice(0, 300), positionSeconds }
          : null,
      });
      if (generation.current !== current) return false;
      if (
        !answer ||
        typeof answer.answer !== "string" ||
        !["related", "unrelated", "unclear", "no-video"].includes(
          answer.relation,
        ) ||
        !Array.isArray(answer.sources) ||
        !Array.isArray(answer.recommendations) ||
        !Array.isArray(answer.notices)
      )
        throw new Error(
          "Chat needs the updated server. Restart npm run dev and refresh.",
        );
      setTurns((previous) =>
        [...previous, { question, answer, video }].slice(-12),
      );
      return true;
    } catch (failure) {
      if (generation.current === current)
        setError(
          failure instanceof Error ? failure.message : "Chat is unavailable.",
        );
      return false;
    } finally {
      if (generation.current === current) {
        setBusy(false);
        pending.current = false;
      }
    }
  }
  function clear() {
    generation.current++;
    pending.current = false;
    setTurns([]);
    setError("");
    setBusy(false);
  }
  return { turns, busy, error, ask, clear };
}
