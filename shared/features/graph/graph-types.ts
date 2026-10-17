import type { UniverseId } from "../universes/universe-rules";
import type { Video } from "../../types";
export interface GraphNode {
  id: string;
  label: string;
  description: string;
  aliases: string[];
  wikidataId: string | null;
  primaryUniverse: UniverseId;
  relatedUniverses: UniverseId[];
  position: { x: number; y: number };
  videoIds: string[];
}
export interface GraphEdge {
  id: string;
  from_topic_id: string;
  to_topic_id: string;
  relation_type: "related_to" | "helps_explain" | "part_of" | "learn_first";
  explanation: string;
}
export interface GraphEvent {
  id: string;
  title: string;
  summary: string;
  published_at: string;
  updated_at: string;
  status: "published" | "archived";
  sources: {
    title: string;
    url: string;
    publisher: string;
    published_at: string;
  }[];
  topics: { topicId: string; explanation: string }[];
}
export interface GraphSnapshot {
  revision: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  events: GraphEvent[];
  truncated: boolean;
}
export interface TopicDetail {
  revision: number;
  topic: GraphNode;
  videos: Video[];
  message: string;
}
export interface TopicProgress {
  topic_id: string;
  active_viewing_ms: number;
  first_explored_at: string | null;
  discovered_at: string;
}
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
export interface GraphViewState {
  universe: UniverseId;
  topicId: string | null;
  view: "map" | "feed";
  viewport: Viewport;
}
export interface PlaybackSample {
  owner: string;
  videoId: string;
  position: number;
  rate: number;
  now: number;
  active: boolean;
  kind: "tick" | "state";
}
