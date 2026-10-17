import type { GraphNode, TopicProgress } from "./graph-types";
export function GraphTopicList({
  nodes,
  rows,
  onSelect,
  expanded = false,
}: {
  expanded?: boolean;
  nodes: GraphNode[];
  rows: TopicProgress[];
  onSelect: (n: GraphNode) => void;
}) {
  return (
    <details className="graph-topic-list" open={expanded || undefined}>
      <summary>Browse topics as a list</summary>
      <ul>
        {nodes.map((n) => (
          <li key={n.id}>
            <button onClick={() => onSelect(n)}>
              {n.label}
              {rows.some((p) => p.topic_id === n.id && p.first_explored_at)
                ? " · Explored"
                : ""}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
