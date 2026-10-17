import type {
  GraphNode,
  GraphSnapshot,
  GraphViewState,
  TopicDetail,
  TopicProgress,
} from "./graph-types";
export const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const isUniverse = (v: unknown) =>
  ["science", "commerce", "arts"].includes(String(v));
export function isNode(v: unknown): v is GraphNode {
  const t = v as GraphNode;
  return Boolean(
    t &&
    isUuid(t.id) &&
    typeof t.label === "string" &&
    t.label.length <= 120 &&
    typeof t.description === "string" &&
    t.description.length <= 1000 &&
    isUniverse(t.primaryUniverse) &&
    Array.isArray(t.aliases) &&
    t.aliases.every((a) => typeof a === "string" && a.length <= 120) &&
    Array.isArray(t.relatedUniverses) &&
    t.relatedUniverses.every(isUniverse) &&
    Number.isFinite(t.position?.x) &&
    Math.abs(t.position.x) <= 10000 &&
    Number.isFinite(t.position?.y) &&
    Math.abs(t.position.y) <= 10000 &&
    Array.isArray(t.videoIds) &&
    t.videoIds.every((id) => /^[\w-]{11}$/.test(id)),
  );
}
export function isProgress(v: unknown): v is TopicProgress {
  const p = v as TopicProgress;
  return Boolean(
    p &&
    isUuid(p.topic_id) &&
    Number.isInteger(p.active_viewing_ms) &&
    p.active_viewing_ms >= 0 &&
    p.active_viewing_ms <= 30000 &&
    Number.isFinite(Date.parse(p.discovered_at)) &&
    (p.first_explored_at === null ||
      (p.active_viewing_ms === 30000 &&
        Number.isFinite(Date.parse(p.first_explored_at)))),
  );
}
export function isViewState(v: unknown): v is GraphViewState {
  const s = v as GraphViewState;
  return Boolean(
    s &&
    isUniverse(s.universe) &&
    (s.topicId === null || isUuid(s.topicId)) &&
    ["map", "feed"].includes(s.view) &&
    Number.isFinite(s.viewport?.x) &&
    Math.abs(s.viewport.x) <= 12000 &&
    Number.isFinite(s.viewport?.y) &&
    Math.abs(s.viewport.y) <= 12000 &&
    s.viewport.zoom >= 0.5 &&
    s.viewport.zoom <= 2,
  );
}
export async function neighborhood(
  universe: string,
  topicId?: string,
): Promise<GraphSnapshot> {
  const s = await graphCall<GraphSnapshot>("neighborhood", {
    universe,
    topicId,
  });
  if (
    !Number.isSafeInteger(s.revision) ||
    !Array.isArray(s.nodes) ||
    s.nodes.length > 40 ||
    !s.nodes.every(isNode) ||
    !Array.isArray(s.edges) ||
    s.edges.length > 80 ||
    s.edges.some(
      (e) =>
        !isUuid(e.id) ||
        !s.nodes.some((n) => n.id === e.from_topic_id) ||
        !s.nodes.some((n) => n.id === e.to_topic_id) ||
        typeof e.explanation !== "string" ||
        e.explanation.length > 500 ||
        !["related_to", "helps_explain", "part_of", "learn_first"].includes(
          e.relation_type,
        ),
    ) ||
    !Array.isArray(s.events) ||
    s.events.length > 12 ||
    s.events.some(
      (e) =>
        !isUuid(e.id) ||
        typeof e.title !== "string" ||
        typeof e.summary !== "string" ||
        !Number.isFinite(Date.parse(e.published_at)) ||
        !Number.isFinite(Date.parse(e.updated_at)) ||
        !Array.isArray(e.topics) ||
        e.topics.some(
          (t) => !isUuid(t.topicId) || typeof t.explanation !== "string",
        ) ||
        !Array.isArray(e.sources) ||
        e.sources.some(
          (source) =>
            typeof source.title !== "string" ||
            typeof source.publisher !== "string" ||
            !/^https:\/\//i.test(source.url) ||
            !Number.isFinite(Date.parse(source.published_at)),
        ),
    )
  )
    throw Error("The map returned invalid content.");
  return s;
}
export async function topicDetail(
  universe: string,
  topicId: string,
): Promise<TopicDetail> {
  const d = await graphCall<TopicDetail>("topic", { universe, topicId });
  if (
    !isNode(d.topic) ||
    !Array.isArray(d.videos) ||
    d.videos.length > 6 ||
    d.videos.some(
      (v) => !v || !/^[\w-]{11}$/.test(v.id) || typeof v.title !== "string",
    ) ||
    typeof d.message !== "string"
  )
    throw Error("This topic returned invalid content.");
  return d;
}
export async function loadProgress(token: string) {
  const rows = await graphCall<unknown>("progress", {}, token);
  if (!Array.isArray(rows) || rows.length > 1000 || !rows.every(isProgress))
    throw Error("Map progress could not load.");
  return rows;
}
export async function graphCall<T>(
  path: string,
  data: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch(`/api/graph/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.message === "string"
        ? result.message
        : "The learning map request failed.",
    );
  return result as T;
}
