import { useMemo, useState } from "react";
import type { Topic, Video } from "../../../shared/types";
import type { VideoProgress } from "../../../shared/features/progress/useVideoProgress";
import {
  classifyVideo,
  groupUniverseTopics,
  universes,
  type UniverseId,
} from "../../../shared/features/universes/universe-rules";
import { VideoResults } from "../../../shared/features/videos/VideoResults";
import { ShortsShelf } from "../../../shared/features/videos/ShortsShelf";
import { isShortVideo } from "../../../shared/features/videos/video-format";
import { desktopVideoPresentation } from "./VideoUniverseLabel";
import { useUniverseFeed } from "./useUniverseFeed";

export function UniverseFeed({
  universe,
  topics,
  progress,
  onSelect,
  onTopic,
}: {
  universe: UniverseId;
  topics: Topic[];
  progress: VideoProgress[];
  onSelect: (video: Video, videos: Video[]) => void;
  onTopic: (topic: Topic) => void;
}) {
  const feed = useUniverseFeed(universe, topics);
  const [subject, setSubject] = useState("All");
  const videos = useMemo(
    () =>
      feed.videos.filter((video) => {
        const classification = classifyVideo(video);
        return !classification || classification.universe === universe;
      }),
    [feed.videos, universe],
  );
  const subjects = [
    ...new Set(videos.flatMap((v) => classifyVideo(v)?.subtopic ?? [])),
  ];
  const shown = videos.filter(
    (v) => subject === "All" || classifyVideo(v)?.subtopic === subject,
  );
  const saved = groupUniverseTopics(topics, universe);
  return (
    <section className="feed-section universe-feed">
      <h1>{universes[universe].name}</h1>
      <p className="muted">
        Videos for your curiosity. Filter by subject or keep exploring.
      </p>
      <nav className="universe-subject-filters" aria-label="Subject filters">
        {["All", ...subjects].map((name) => (
          <button
            key={name}
            aria-pressed={subject === name}
            onClick={() => setSubject(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {feed.busy && <p role="status">Finding videos for this Universe…</p>}
      {(feed.error || feed.messages.length > 0) && (
        <p className="notice" role="status">
          {feed.error || feed.messages.join(" ")}{" "}
          <button onClick={feed.retry}>Try again</button>
        </p>
      )}
      {!feed.busy && (
        <>
          <VideoResults
            videos={shown.filter((v) => !isShortVideo(v))}
            progress={progress}
            onSelect={(video) => onSelect(video, shown)}
            presentation={desktopVideoPresentation}
          />
          <ShortsShelf
            videos={shown.filter(isShortVideo)}
            progress={progress}
            onSelect={(video) => onSelect(video, shown)}
            presentation={desktopVideoPresentation}
          />
          {!shown.length && (
            <p className="empty-state">
              No videos are available in this view. Try another filter or search
              any topic above.
            </p>
          )}
        </>
      )}
      {saved.length > 0 && (
        <details className="universe-saved-searches">
          <summary>Your saved searches ({saved.length})</summary>
          <div>
            {saved.map((topic) => (
              <button key={topic.key} onClick={() => onTopic(topic)}>
                {topic.query}
              </button>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
