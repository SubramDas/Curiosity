import type { Topic, Video } from "../../types";
import type { HomeFeedData } from "./useHomeFeed";
import type { VideoProgress } from "../progress/useVideoProgress";
import { VideoResults } from "../videos/VideoResults";
import { ShortsShelf } from "../videos/ShortsShelf";
import { isShortVideo } from "../videos/video-format";

export function HomeFeed({
  data,
  topics,
  progress,
  onSelect,
}: {
  data: HomeFeedData;
  topics: Topic[];
  progress: VideoProgress[];
  onSelect: (video: Video, topic?: Topic) => void;
}) {
  const all = [
    ...data.trending,
    ...data.recommendations.flatMap((group) => group.videos),
  ];
  const shorts = [
    ...new Map(
      all.filter(isShortVideo).map((video) => [video.id, video]),
    ).values(),
  ].slice(0, 10);
  return (
    <>
      <section className="feed-section">
        <h1>Trending</h1>
        <p className="muted">
          Popular learning videos from the past 30 days, found on YouTube for
          India. Results may include other languages.
        </p>
        <VideoResults
          videos={data.trending.filter((video) => !isShortVideo(video))}
          onSelect={(video) => onSelect(video)}
          progress={progress}
        />
        {!data.trending.length && (
          <p className="empty-state">
            No trending learning videos are available right now. Search a topic
            to start exploring.
          </p>
        )}
      </section>
      {data.recommendations.map((group) => (
        <section className="feed-section" key={group.query}>
          <h2>Because you explored {group.query}</h2>
          <VideoResults
            videos={group.videos
              .filter((video) => !isShortVideo(video))
              .slice(0, 6)}
            progress={progress}
            onSelect={(video) =>
              onSelect(
                video,
                topics.find((topic) => topic.query === group.query),
              )
            }
          />
        </section>
      ))}
      <ShortsShelf
        videos={shorts}
        progress={progress}
        onSelect={(video) => {
          const group = data.recommendations.find((group) =>
            group.videos.some((item) => item.id === video.id),
          );
          onSelect(
            video,
            topics.find((topic) => topic.query === group?.query),
          );
        }}
      />
    </>
  );
}
