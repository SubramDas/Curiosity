import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "../chat/ChatPanel";
import { VideoPlayer } from "../videos/VideoPlayer";
import { ContinueWatching } from "../progress/ContinueWatching";
import { VideoFeed } from "../videos/VideoFeed";
import type { useVideoProgress } from "../progress/useVideoProgress";
import { VideoResults } from "../videos/VideoResults";
import { useLearningClock } from "./useLearningClock";
import { categories } from "../topics/topic-rules";
import { callApi } from "../../lib/api";
import type { Topic, Video, VideoPage } from "../../types";

export function LearningWorkspace({
  topic,
  videos,
  demo,
  progress,
  initialVideo,
  initialMode,
}: {
  topic: Topic;
  videos: Video[];
  demo: boolean;
  progress: ReturnType<typeof useVideoProgress>;
  initialVideo?: Video;
  initialMode?: "all" | "short";
}) {
  const [selected, setSelected] = useState<Video | null>(initialVideo ?? null);
  const selectVideo = useCallback(
    (video: Video) => setSelected({ ...video }),
    [],
  );
  const [playing, setPlaying] = useState(false);
  const [lastChatActivity, setLastChatActivity] = useState(-Infinity);
  const [breakVideos, setBreakVideos] = useState<Video[]>([]);
  const [breakMessage, setBreakMessage] = useState("");
  const [breakBusy, setBreakBusy] = useState(false);
  const [breakSelected, setBreakSelected] = useState<Video | null>(null);
  const clock = useLearningClock(
    topic.key,
    playing || performance.now() - lastChatActivity < 30_000,
    demo,
  );
  const onPlaying = useCallback((active: boolean) => setPlaying(active), []);
  const ignoreBreakPlayback = useCallback(() => {}, []);
  useEffect(() => {
    if (clock.clock.offered) {
      setPlaying(false);
      setLastChatActivity(-Infinity);
    }
  }, [clock.clock.offered]);
  async function loadBreak() {
    if (breakBusy || breakVideos.length) return;
    setBreakBusy(true);
    setBreakMessage("");
    try {
      const page = await callApi<VideoPage>("search", {
        query: `${topic.query} funny educational demonstration`,
      });
      const candidates = page.videos
        .filter((video) => video.details?.embeddable)
        .slice(0, 3);
      setBreakVideos(candidates);
      if (!candidates.length)
        setBreakMessage(
          "No related candidates are available. Return to your topic.",
        );
    } catch (error) {
      setBreakMessage(
        error instanceof Error
          ? error.message
          : "Break videos are unavailable.",
      );
    } finally {
      setBreakBusy(false);
    }
  }
  function resume() {
    setBreakSelected(null);
    setBreakVideos([]);
    setBreakMessage("");
    clock.reset();
  }
  return (
    <section className="learning-workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{categories[topic.category]}</span>
          <h2>{topic.query}</h2>
        </div>
        <span className="timer">
          {Math.floor(clock.clock.seconds / 60)}m active ·{" "}
          {demo ? "30-second demo" : "12-minute break"}
        </span>
      </div>
      {clock.clock.offered ? (
        <section className="break-panel" aria-label="Learning break">
          <span className="eyebrow">A CHANGE OF PACE</span>
          <h2>Take a small related break</h2>
          <p>
            Up to three topic-related candidates. These are unreviewed search
            results; skip any that don’t fit.
          </p>
          <div className="button-row">
            <button
              onClick={() => void loadBreak()}
              disabled={breakBusy || breakVideos.length > 0}
            >
              {breakBusy ? "Finding clips…" : "Find related clips"}
            </button>
            <button className="secondary" onClick={resume}>
              Return to learning
            </button>
          </div>
          {breakMessage && <p role="status">{breakMessage}</p>}
          <VideoResults
            videos={breakVideos}
            selectedId={breakSelected?.id}
            onSelect={setBreakSelected}
          />
          {breakSelected && (
            <VideoPlayer video={breakSelected} onActive={ignoreBreakPlayback} />
          )}
        </section>
      ) : (
        <div className="workspace-grid">
          <div>
            <p className="fine-print">
              Live YouTube results · Not reviewed for accuracy or level
            </p>
            {progress.message && (
              <p role="status" className="notice">
                {progress.message}
              </p>
            )}
            <ContinueWatching
              rows={progress.rows}
              topicKey={topic.key}
              videos={videos}
              onSelect={selectVideo}
            />
            {progress.loading ? (
              <p role="status">Loading your video progress…</p>
            ) : (
              <VideoFeed
                videos={videos}
                initialMode={initialMode}
                selected={selected}
                onSelect={selectVideo}
                onActive={onPlaying}
                progress={progress.rows}
                onProgress={(video, position, duration, completed) =>
                  progress.save({
                    video_id: video.id,
                    topic_key: topic.key,
                    position_seconds: position,
                    duration_seconds: duration,
                    completed,
                  })
                }
              />
            )}
          </div>
          <ChatPanel
            topic={topic.query}
            videos={videos}
            onSelect={selectVideo}
            onActivity={() => setLastChatActivity(performance.now())}
          />
        </div>
      )}
    </section>
  );
}
