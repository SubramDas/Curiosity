import type { GraphNode, GraphEdge, TopicProgress } from "./graph-types";
// Discovery is presentation, never an access restriction. Search/list can open any node.
export function revealedTopics(
  nodes: GraphNode[],
  edges: GraphEdge[],
  rows: TopicProgress[],
  selected: string | null,
) {
  const anchors = new Set(
    rows.map((p) => p.topic_id).filter((id) => nodes.some((n) => n.id === id)),
  );
  if (selected) anchors.add(selected);
  if (!anchors.size && nodes.length)
    anchors.add((nodes.find((n) => n.label === "GPUs") ?? nodes[0]).id);
  const revealed = new Set(anchors);
  for (const e of edges) {
    if (anchors.has(e.from_topic_id)) revealed.add(e.to_topic_id);
    if (anchors.has(e.to_topic_id)) revealed.add(e.from_topic_id);
  }
  return revealed;
}
