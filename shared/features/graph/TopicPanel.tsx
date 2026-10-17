import { useState, useEffect, useCallback } from "react";
import { VideoThumbnail } from "../videos/VideoThumbnail";
import { VideoPlayer } from "../videos/VideoPlayer";
import { useGraphProgress } from "./GraphProvider";
import type { GraphNode, TopicDetail, GraphEdge } from "./graph-types";
import type { VideoProgress } from "../progress/useVideoProgress";
export function TopicPanel({
  node,
  detail,
  error,
  edges,
  nodes,
  onSelect,
  onSearch,
  onAsk,
  onSave,
  progress,
}: {
  node: GraphNode | null;
  detail: TopicDetail | null;
  error: string;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onSelect: (n: GraphNode) => void;
  onSearch: (s: string) => void;
  onAsk: (label: string) => void;
  onSave: (p: VideoProgress) => void;
  progress: VideoProgress[];
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => setChosen(null), [node?.id]);
  const onActive = useCallback(() => {}, []);
  const { rows } = useGraphProgress();
  if (!node)
    return (
      <aside className="graph-topic-panel">
        <span className="graph-eyebrow">START ANYWHERE</span>
        <h2>One idea away.</h2>
        <p>
          Choose a planet to preview a topic and see where its connections lead.
        </p>
        <p>
          Thirty seconds of active viewing on a published learning video unlocks
          your first-exploration badge.
        </p>
      </aside>
    );
  const video = detail?.videos.find((v) => v.id === chosen),
    p = rows.find((p) => p.topic_id === node.id),
    links = edges.filter(
      (e) => e.from_topic_id === node.id || e.to_topic_id === node.id,
    );
  return (
    <aside className="graph-topic-panel" aria-label={`${node.label} details`}>
      <span className="graph-eyebrow">
        {p?.first_explored_at ? "EXPLORED" : p ? "DISCOVERED" : "NEW TO YOU"}
      </span>
      <h2>{node.label}</h2>
      <p>{node.description}</p>
      {!detail && !error && <p role="status">Loading this topic…</p>}
      {error && <p role="alert">{error}</p>}
      {detail?.message && (
        <p className="graph-content-message">{detail.message}</p>
      )}
      {video && (
        <VideoPlayer
          key={video.id}
          video={video}
          onActive={onActive}
          playOnOpen
          startSeconds={
            progress.find((p) => p.video_id === video.id)?.position_seconds ?? 0
          }
          onProgress={(position, duration, completed) =>
            onSave({
              video_id: video.id,
              topic_key:
                progress.find((p) => p.video_id === video.id)?.topic_key ??
                `graph:${node.id}`,
              position_seconds: position,
              duration_seconds: duration,
              completed,
            })
          }
        />
      )}
      {detail?.videos.map((v) => (
        <button
          className="graph-video-option"
          key={v.id}
          aria-pressed={chosen === v.id}
          onClick={() => setChosen(v.id)}
        >
          <VideoThumbnail video={v} />
          <span>
            {v.title}
            <small>{v.channel}</small>
          </span>
        </button>
      ))}
      <p className="graph-progress-caption">
        {p?.first_explored_at
          ? "First exploration saved."
          : `${Math.floor((p?.active_viewing_ms ?? 0) / 1000)} / 30 active seconds · Exploration, not mastery`}
      </p>
      <button className="graph-primary" onClick={() => onSearch(node.label)}>
        Search more videos →
      </button>
      <button className="graph-secondary" onClick={() => onAsk(node.label)}>
        Ask the teacher
      </button>
      <h3>Follow a connection</h3>
      {links.map((e) => {
        const other = nodes.find(
          (n) =>
            n.id ===
            (e.from_topic_id === node.id ? e.to_topic_id : e.from_topic_id),
        );
        return (
          other && (
            <button
              className="graph-connection"
              key={e.id}
              onClick={() => onSelect(other)}
            >
              <strong>{other.label} ↗</strong>
              <small>
                {e.relation_type.replaceAll("_", " ")} · {e.explanation}
              </small>
            </button>
          )
        );
      })}
    </aside>
  );
}
