import { useRelatedBreak } from "./useRelatedBreak";
import type { VideoPresentation } from "../videos/video-presentation";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { ChatPanel } from "../chat/ChatPanel";
import { VideoPlayer } from "../videos/VideoPlayer";
import { ContinueWatching } from "../progress/ContinueWatching";
import { VideoFeed } from "../videos/VideoFeed";
import type { useVideoProgress } from "../progress/useVideoProgress";
import { VideoResults } from "../videos/VideoResults";
import { useLearningClock } from "./useLearningClock";
import { categories } from "../topics/topic-rules";
import { callApi } from "../../lib/api";
import type { useTutorChat } from "../chat/useTutorChat";
import type { VideoSeekRequest } from "../../types";
import type { Topic, Video, VideoPage } from "../../types";

export interface LearningContent {
  feed: ReactNode;
  chat: ReactNode;
  currentVideo: Video | null;
  chatExpanded: boolean;
  hasVideos: boolean;
}

export function LearningWorkspace({
  presentation,
  allowChatExpansion = false,
  headingLabel,
  topic,
  videos,
  demo,
  progress,
  initialVideo,
  initialMode,
  showResumeRow = true,
  chat,
  onRelatedVideo,
  initialSeek,
  renderContent,
  showReelControls = false,
  onReturnToVideo,
  feedHidden = false,
}: {
  presentation?: VideoPresentation;
  allowChatExpansion?: boolean;
  headingLabel?: string;
  feedHidden?: boolean;
  onReturnToVideo?: () => void;
  renderContent?: (content: LearningContent) => ReactNode;
  showReelControls?: boolean;
  chat: ReturnType<typeof useTutorChat>;
  onRelatedVideo: (video: Video, seconds?: number) => void;
  initialSeek?: VideoSeekRequest;
  topic: Topic;
  videos: Video[];
  demo: boolean;
  progress: ReturnType<typeof useVideoProgress>;
  initialVideo?: Video;
  initialMode?: "all" | "short";
  showResumeRow?: boolean;
}) {
  const [chatExpanded, setChatExpanded] = useState(false);
  const [selected, setSelected] = useState<Video | null>(initialVideo ?? null);
  const selectVideo = useCallback(
    (video: Video) => setSelected({ ...video }),
    [],
  );
  const [chatVideo, setChatVideo] = useState<Video | null>(
    initialVideo ?? null,
  );
  const [seekRequest, setSeekRequest] = useState<VideoSeekRequest | undefined>(
    initialSeek,
  );
  const nextSeek = useRef(0);
  function jumpToSection(video: Video, seconds: number) {
    onReturnToVideo?.();
    if (chatVideo?.id !== video.id) {
      onRelatedVideo(video, seconds);
      return;
    }
    selectVideo(video);
    setSeekRequest({
      videoId: video.id,
      seconds,
      requestId: ++nextSeek.current,
    });
  }
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
  const relatedBreak = useRelatedBreak(
    chatVideo?.id ?? videos[0]?.id,
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
      const permit = await relatedBreak.prepare();
      const page = await callApi<VideoPage>("search/break", { permit });
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
    relatedBreak.reset();
    setBreakSelected(null);
    setBreakVideos([]);
    setBreakMessage("");
    clock.reset();
  }
  const feedContent = (
    <div>
      <p className="fine-print">
        Live YouTube results · Not reviewed for accuracy or level
      </p>
      {progress.message && (
        <p role="status" className="notice">
          {progress.message}
        </p>
      )}
      {progress.loading ? (
        <p role="status">Loading your video progress…</p>
      ) : (
        <VideoFeed
          presentation={presentation}
          showReelControls={showReelControls}
          isHidden={feedHidden}
          videos={videos}
          initialMode={initialMode}
          resumeContent={
            showResumeRow && (
              <ContinueWatching
                presentation={presentation}
                rows={progress.rows}
                topicKey={topic.key}
                videos={videos}
                onSelect={selectVideo}
              />
            )
          }
          selected={selected}
          seekRequest={seekRequest}
          onCurrentVideo={setChatVideo}
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
  );
  const chatContent = (
    <ChatPanel
      expanded={chatExpanded}
      onToggleExpanded={
        allowChatExpansion
          ? () => setChatExpanded((value) => !value)
          : undefined
      }
      topic={topic.query}
      currentVideo={chatVideo}
      positionSeconds={
        progress.rows.find((row) => row.video_id === chatVideo?.id)
          ?.position_seconds ?? 0
      }
      chat={chat}
      onSelect={onRelatedVideo}
      onJump={jumpToSection}
      onActivity={() => setLastChatActivity(performance.now())}
    />
  );
  return (
    <section className="learning-workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {headingLabel ?? categories[topic.category]}
          </span>
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
            presentation={presentation}
            videos={breakVideos}
            selectedId={breakSelected?.id}
            onSelect={setBreakSelected}
          />
          {breakSelected && (
            <VideoPlayer
              video={breakSelected}
              onActive={ignoreBreakPlayback}
              playOnOpen={presentation?.playOnOpen}
              showPlayButton={presentation?.showPlayButton}
              renderMetadata={presentation?.renderMetadata}
            />
          )}
        </section>
      ) : (
        <div
          className={`workspace-grid ${!videos.length && !selected ? "chat-only" : ""} ${renderContent ? "custom-layout" : ""}`}
        >
          {renderContent ? (
            renderContent({
              feed: feedContent,
              chat: chatContent,
              currentVideo: chatVideo,
              chatExpanded: allowChatExpansion && chatExpanded,
              hasVideos: videos.length > 0 || Boolean(selected),
            })
          ) : (
            <>
              {feedContent}
              {chatContent}
            </>
          )}
        </div>
      )}
    </section>
  );
}
