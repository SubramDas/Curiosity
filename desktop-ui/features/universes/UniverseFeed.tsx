import { VideoClassificationLabel } from "../../../shared/features/classification/VideoClassificationLabel";
import { useClassifiedVideos } from "../../../shared/features/classification/ClassificationProvider";
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
  const classifiedVideos = useClassifiedVideos(feed.videos);
  const [subject, setSubject] = useState("All");
  const [candidateLimit, setCandidateLimit] = useState(3);
  const pendingCandidates = classifiedVideos
    .slice(0, candidateLimit)
    .filter((video) => !video.classification);
  const videos = useMemo(
    () =>
      classifiedVideos.filter((video) => {
        const classification = classifyVideo(video);
        return classification?.universe === universe;
      }),
    [classifiedVideos, universe],
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
      {!feed.busy &&
        classifiedVideos.some((video) => !classifyVideo(video)) && (
          <p className="fine-print">
            Some results are awaiting a Universe label or could not be
            classified. They remain available through search and Trending.
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
          {pendingCandidates.length > 0 && (
            <section
              className="universe-classification-candidates"
              aria-label="Finding Universe videos"
            >
              {pendingCandidates.map((video) => (
                <div key={video.id} className="classification-candidate">
                  <span>Checking a video's subject</span>
                  <VideoClassificationLabel video={video} />
                </div>
              ))}
            </section>
          )}
          {candidateLimit < classifiedVideos.length && (
            <button
              className="secondary"
              onClick={() => setCandidateLimit((count) => count + 3)}
            >
              Explore more videos
            </button>
          )}
          {!shown.length && !pendingCandidates.length && (
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
