import { useCallback, useEffect, useRef, useState } from "react";
import { classifyTopic } from "../topics/topic-rules";
import { callApi } from "../../lib/api";
import type { Topic, Video, VideoPage } from "../../types";
import { isSearchDecision, type SearchDecision } from "../search/search-types";

interface SearchResponse extends VideoPage {
  jobId?: string;
  status?: "checking" | "filtering" | "ready" | "failed";
  decision?: SearchDecision;
  message?: string;
}
export function useVideoSearch({ background = false } = {}) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<SearchDecision | null>(null);
  const [phase, setPhase] = useState("checking");
  const pending = useRef(false);
  const generation = useRef(0);
  const searchId = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const lastGoal = useRef("");
  const lastQuery = useRef("");
  const reset = useCallback(() => {
    generation.current++;
    searchId.current++;
    activeRequest.current?.abort();
    pending.current = false;
    lastGoal.current = "";
    setTopic(null);
    setVideos([]);
    setNextPage(null);
    setBusy(false);
    setError("");
    setDecision(null);
  }, []);
  useEffect(
    () => () => {
      generation.current++;
      activeRequest.current?.abort();
    },
    [],
  );
  async function load(
    nextTopic: Topic,
    append = false,
    goal = append ? lastGoal.current : "",
  ): Promise<boolean> {
    if (pending.current) return false;
    const current = ++generation.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    const deadline = setTimeout(() => controller.abort(), 180_000);
    pending.current = true;
    setBusy(true);
    setPhase("checking");
    setError("");
    if (!append) {
      searchId.current++;
      lastGoal.current = goal;
      lastQuery.current = nextTopic.query;
      setTopic(nextTopic);
      setVideos([]);
      setNextPage(null);
      setDecision(null);
    }
    try {
      let page = await callApi<SearchResponse>(
        "search",
        {
          query: append ? lastQuery.current : nextTopic.query,
          ...(goal ? { goal } : {}),
          ...(append ? { pageToken: nextPage } : {}),
          ...(background
            ? { background: true, requestId: crypto.randomUUID() }
            : {}),
        },
        undefined,
        { signal: controller.signal },
      );
      function applyResults(result: SearchResponse) {
        if (
          !Array.isArray(result.videos) ||
          !(
            result.nextPageToken === null ||
            typeof result.nextPageToken === "string"
          ) ||
          !isSearchDecision(result.decision)
        )
          throw new Error("Search returned an invalid response.");
        setDecision(result.decision);
        if (result.decision.action !== "allow") {
          setVideos([]);
          setNextPage(null);
          return;
        }
        if (goal && !append) setTopic(classifyTopic(goal) ?? nextTopic);
        setVideos((previous) => [
          ...new Map(
            [...previous, ...result.videos].map((video) => [video.id, video]),
          ).values(),
        ]);
      }
      const jobId = page.jobId;
      while (["checking", "filtering"].includes(page.status ?? "")) {
        if (generation.current !== current) return false;
        if (!jobId || page.jobId !== jobId)
          throw new Error("Search returned an invalid response.");
        if (page.decision !== undefined || page.videos !== undefined)
          applyResults(page);
        setPhase(page.status!);
        await new Promise<void>((resolve, reject) => {
          const abort = () => {
            clearTimeout(timer);
            reject(new Error("Search was cancelled."));
          };
          const timer = setTimeout(() => {
            controller.signal.removeEventListener("abort", abort);
            resolve();
          }, 1500);
          controller.signal.addEventListener("abort", abort, { once: true });
          if (controller.signal.aborted) abort();
        });
        page = await callApi<SearchResponse>(
          "search/status",
          { jobId },
          undefined,
          { signal: controller.signal },
        );
      }
      if (generation.current !== current) return false;
      if (jobId && page.jobId !== jobId)
        throw new Error("Search returned an invalid response.");
      if (page.status === "failed") {
        if (page.decision !== undefined || page.videos !== undefined)
          applyResults(page);
        throw new Error(
          page.message ??
            "The search check could not finish. Please try again.",
        );
      }
      applyResults(page);
      if (page.decision!.action !== "allow") {
        if (!background) setError(page.decision!.reason);
        return false;
      }
      setNextPage(page.nextPageToken);
      return true;
    } catch (failure) {
      if (generation.current === current)
        setError(
          controller.signal.aborted
            ? "This search took too long. Please try again."
            : failure instanceof Error
              ? failure.message
              : "Search failed.",
        );
      return false;
    } finally {
      clearTimeout(deadline);
      if (generation.current === current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return {
    topic,
    searchId: searchId.current,
    videos,
    nextPage,
    busy,
    error,
    decision,
    phase,
    goal: lastGoal.current,
    load,
    reset,
  };
}
