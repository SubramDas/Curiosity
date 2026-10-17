import type { GraphEvent, GraphNode } from "./graph-types";
export function WeeklyEventPanel({
  event,
  nodes,
  onSelect,
  onClose,
}: {
  event: GraphEvent;
  nodes: GraphNode[];
  onSelect: (n: GraphNode) => void;
  onClose: () => void;
}) {
  return (
    <section className="graph-weekly-detail" aria-label="Weekly discovery">
      <button onClick={onClose}>← Back to the map</button>
      <span className="graph-eyebrow">
        {event.status === "archived"
          ? "ARCHIVED DISCOVERY"
          : "WEEKLY SPOTLIGHT"}
      </span>
      <h2>{event.title}</h2>
      <p>{event.summary}</p>
      <p>
        Published {new Date(event.published_at).toLocaleDateString()} · Updated{" "}
        {new Date(event.updated_at).toLocaleDateString()}
      </p>
      <h3>Follow the ideas</h3>
      {event.topics.map((t) => {
        const n = nodes.find((n) => n.id === t.topicId);
        return n ? (
          <button
            key={n.id}
            onClick={() => {
              onSelect(n);
              onClose();
            }}
          >
            {n.label} ↗
          </button>
        ) : (
          <p key={t.topicId}>{t.explanation}</p>
        );
      })}
      <h3>Sources</h3>
      <ul>
        {event.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>{" "}
            · {s.publisher} · {new Date(s.published_at).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </section>
  );
}
