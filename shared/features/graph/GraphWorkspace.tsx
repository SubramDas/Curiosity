import { useEffect, useState, type ReactNode } from "react";
import { useGraph } from "./useGraph";
import { useGraphProgress } from "./GraphProvider";
import { GraphCanvas } from "./GraphCanvas";
import { GraphTopicList } from "./GraphTopicList";
import { TopicPanel } from "./TopicPanel";
import { WeeklyEventPanel } from "./WeeklyEventPanel";
import { universes } from "../universes/universe-rules";
import type { GraphEvent } from "./graph-types";
import type { VideoProgress } from "../progress/useVideoProgress";
export interface GraphWorkspaceProps {
  token?: string;
  onSearch: (s: string) => void;
  entry?: { id: string; universe: keyof typeof universes };
  onAsk: (label: string) => void;
  onSave: (p: VideoProgress) => void;
  progress: VideoProgress[];
}
export interface GraphContent {
  header: ReactNode;
  body: ReactNode;
  panel: ReactNode;
  footer: ReactNode;
}
export function GraphWorkspace({
  token,
  entry,
  onSearch,
  onAsk,
  onSave,
  progress,
  render,
}: { render: (c: GraphContent) => ReactNode } & GraphWorkspaceProps) {
  const graph = useGraph(token, entry),
    personal = useGraphProgress(),
    [event, setEvent] = useState<GraphEvent | null>(null),
    [filter, setFilter] = useState("");
  const { data, state } = graph;
  const selected = data?.nodes.find((n) => n.id === state.topicId) ?? null;
  useEffect(() => {
    if (selected) personal.discover(selected.id);
  }, [selected?.id, personal.discover]);
  useEffect(() => {
    setEvent(null);
    setFilter("");
  }, [state.universe]);
  const header = (
    <>
      <div className="graph-universes" aria-label="Learning map Universes">
        {(Object.keys(universes) as (keyof typeof universes)[]).map((id) => (
          <button
            key={id}
            aria-pressed={state.universe === id}
            onClick={() =>
              graph.setState((s) => ({
                ...s,
                universe: id,
                topicId: null,
                viewport: { x: 0, y: 0, zoom: 1 },
              }))
            }
          >
            {universes[id].name}
          </button>
        ))}
      </div>
      <div className="graph-title-row">
        <div>
          <h1>
            {state.view === "map"
              ? "A new world, one idea away."
              : "Big questions. Small discoveries."}
          </h1>
          <p>
            Follow a connection. Find something you never knew you wanted to
            learn.
          </p>
        </div>
        <div
          className="graph-view-switch"
          role="group"
          aria-label="Explore map view"
        >
          {(["map", "feed"] as const).map((view) => (
            <button
              key={view}
              aria-pressed={state.view === view}
              onClick={() => graph.setState((s) => ({ ...s, view }))}
            >
              {view === "map" ? "✦ Map" : "▤ Feed"}
            </button>
          ))}
        </div>
      </div>
      {graph.saveMessage && <p role="status">{graph.saveMessage}</p>}
      <p className="sr-only" role="status">
        {selected ? `Selected ${selected.label}` : ""}
      </p>
    </>
  );
  let body: ReactNode;
  if (graph.busy) body = <p role="status">Opening your learning Universe…</p>;
  else if (graph.error)
    body = (
      <div className="graph-empty" role="alert">
        <h2>The map could not open.</h2>
        <p>{graph.error}</p>
        <button onClick={graph.retry}>Try again</button>
      </div>
    );
  else if (!data?.nodes.length)
    body = (
      <div className="graph-empty">
        <h2>Your Universe is getting ready.</h2>
        <p>
          No reviewed topics have been published here yet. Ordinary search and
          videos are still available.
        </p>
        <button onClick={() => onSearch(universes[state.universe].query)}>
          Search educational videos
        </button>
      </div>
    );
  else if (event)
    body = (
      <WeeklyEventPanel
        event={event}
        nodes={data.nodes}
        onSelect={graph.select}
        onClose={() => setEvent(null)}
      />
    );
  else {
    const shown = data.nodes.filter(
      (n) =>
        n.primaryUniverse === state.universe &&
        n.label.toLowerCase().includes(filter.toLowerCase()),
    );
    body = (
      <>
        <label className="graph-topic-filter">
          Find a topic in this neighborhood
          <input
            value={filter}
            maxLength={120}
            placeholder="Try GPUs, photography…"
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        {state.view === "map" ? (
          <GraphCanvas
            data={data}
            universe={state.universe}
            selected={state.topicId}
            rows={personal.rows}
            viewport={state.viewport}
            onViewport={(viewport) =>
              graph.setState((s) => ({ ...s, viewport }))
            }
            onSelect={graph.select}
          />
        ) : (
          <div className="graph-feed">
            <div className="graph-feed-hero">
              <span className="graph-eyebrow">FOLLOW YOUR CURIOSITY</span>
              <h2>
                {selected?.description ?? "What will you discover today?"}
              </h2>
              <p>
                {personal.rows.filter((p) => p.first_explored_at).length} topics
                explored. Every new idea opens another direction.
              </p>
              <button
                className="graph-primary"
                onClick={() => graph.setState((s) => ({ ...s, view: "map" }))}
              >
                Open your map →
              </button>
            </div>
            <h2>New worlds to step into</h2>
            <div className="graph-discovery-grid">
              {shown.map((n, i) => (
                <button
                  key={n.id}
                  className="graph-discovery-card"
                  onClick={() => graph.select(n)}
                >
                  <span
                    className={"graph-card-art graph-card-art-" + (i % 3)}
                    aria-hidden="true"
                  >
                    {personal.rows.some(
                      (r) => r.topic_id === n.id && r.first_explored_at,
                    )
                      ? "✓"
                      : ["✦", "◇", "◎"][i % 3]}
                  </span>
                  <strong>{n.label}</strong>
                  <span>{n.description}</span>
                  <small>
                    {n.videoIds.length
                      ? `${n.videoIds.length} published video choices`
                      : "Preview the concept and its connections"}{" "}
                    →
                  </small>
                </button>
              ))}
            </div>
          </div>
        )}
        <GraphTopicList
          nodes={shown}
          expanded={Boolean(filter)}
          rows={personal.rows}
          onSelect={graph.select}
        />
        {data.truncated && (
          <p>
            Showing a bounded neighborhood. Select a connection to explore
            further.
          </p>
        )}
      </>
    );
  }
  const panel =
    data?.nodes.length && !event ? (
      <TopicPanel
        node={selected}
        detail={graph.detail}
        error={graph.detailError}
        edges={data.edges}
        nodes={data.nodes}
        onSelect={graph.select}
        onSearch={onSearch}
        onAsk={onAsk}
        onSave={onSave}
        progress={progress}
      />
    ) : null;
  const footer = (
    <div className="graph-weekly">
      <span className="graph-eyebrow">WEEKLY DISCOVERIES</span>
      {data?.events.length ? (
        data.events.map((e) => (
          <button
            key={e.id}
            className="graph-event-link"
            onClick={() => setEvent(e)}
          >
            <strong>{e.title}</strong>
            <small>
              {new Date(e.published_at).toLocaleDateString()} ·{" "}
              {e.status === "archived" ? "Archived story" : "Explore the story"}{" "}
              ↗
            </small>
          </button>
        ))
      ) : (
        <p>
          Reviewed stories and their concept connections will appear here when
          published.
        </p>
      )}
    </div>
  );
  return render({ header, body, panel, footer });
}
