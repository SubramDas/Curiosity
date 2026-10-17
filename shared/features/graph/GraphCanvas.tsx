import type { UniverseId } from "../universes/universe-rules";
import { revealedTopics } from "./graph-discovery";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { useId, useRef, type KeyboardEvent } from "react";
import type {
  GraphNode,
  GraphSnapshot,
  TopicProgress,
  Viewport,
} from "./graph-types";
export function GraphCanvas({
  data,
  universe,
  selected,
  rows,
  viewport,
  onViewport,
  onSelect,
}: {
  data: GraphSnapshot;
  universe: UniverseId;
  selected: string | null;
  rows: TopicProgress[];
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onSelect: (n: GraphNode) => void;
}) {
  const revealed = revealedTopics(data.nodes, data.edges, rows, selected);
  const compact = useMediaQuery("(max-width:600px)");
  const id = useId().replaceAll(":", ""),
    drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
      null,
    );
  const move = (x: number, y: number, zoom = viewport.zoom) =>
    onViewport({
      x: Math.max(-12000, Math.min(12000, x)),
      y: Math.max(-12000, Math.min(12000, y)),
      zoom: Math.max(0.5, Math.min(2, zoom)),
    });
  function keyboard(e: KeyboardEvent<SVGSVGElement>) {
    if (e.target !== e.currentTarget) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(viewport.x + 35, viewport.y),
      ArrowRight: () => move(viewport.x - 35, viewport.y),
      ArrowUp: () => move(viewport.x, viewport.y + 35),
      ArrowDown: () => move(viewport.x, viewport.y - 35),
      "+": () => move(viewport.x, viewport.y, viewport.zoom + 0.1),
      "-": () => move(viewport.x, viewport.y, viewport.zoom - 0.1),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  }
  return (
    <div className="graph-map">
      <div className="graph-map-heading">
        <span>YOUR LEARNING CONSTELLATION</span>
        <span>
          {rows.filter((r) => r.first_explored_at).length} topics explored
        </span>
      </div>
      <svg
        viewBox={`0 0 ${compact ? 600 : 1000} 650`}
        tabIndex={0}
        role="group"
        aria-label="Learning map. Use arrow keys to pan, plus and minus to zoom, or use the topic list."
        onKeyDown={keyboard}
        onPointerDown={(e) => {
          if ((e.target as Element).closest("[data-graph-node]")) return;
          const b = e.currentTarget.getBoundingClientRect();
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            vx: viewport.x,
            vy: viewport.y,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          if (!b.width) drag.current = null;
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const scale =
            (compact ? 600 : 1000) /
            e.currentTarget.getBoundingClientRect().width;
          move(
            drag.current.vx + (e.clientX - drag.current.x) * scale,
            drag.current.vy + (e.clientY - drag.current.y) * scale,
          );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <radialGradient id={id + "nebula"}>
            <stop stopColor="#6446A4" stopOpacity=".32" />
            <stop offset="1" stopColor="#10182C" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id + "orb"} x2="1" y2="1">
            <stop stopColor="#8DF5E5" />
            <stop offset="1" stopColor="#1A3956" />
          </linearGradient>
        </defs>
        <rect width="1000" height="650" rx="24" fill="#0B1225" />
        <ellipse
          cx="450"
          cy="300"
          rx="450"
          ry="300"
          fill={`url(#${id}nebula)`}
        />
        {Array.from({ length: 75 }, (_, i) => (
          <circle
            key={i}
            cx={15 + ((i * 137) % 970)}
            cy={15 + ((i * 83) % 620)}
            r={i % 9 === 0 ? 1.5 : 0.7}
            fill="#8FA9DA"
            opacity=".45"
          />
        ))}
        <g
          transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}
        >
          {data.edges.map((e) => {
            const a = data.nodes.find((n) => n.id === e.from_topic_id)!,
              b = data.nodes.find((n) => n.id === e.to_topic_id)!;
            return (
              <path
                key={e.id}
                d={`M${a.position.x},${a.position.y} Q${(a.position.x + b.position.x) / 2},${(a.position.y + b.position.y) / 2 - 35} ${b.position.x},${b.position.y}`}
                stroke={
                  e.from_topic_id === selected || e.to_topic_id === selected
                    ? "#7EDCD6"
                    : "#35476D"
                }
                strokeWidth={1.5}
                fill="none"
              >
                <title>
                  {e.relation_type.replaceAll("_", " ")}: {e.explanation}
                </title>
              </path>
            );
          })}
          {data.nodes.map((n) => {
            const known = revealed.has(n.id);
            const bridge = n.primaryUniverse !== universe;
            const p = rows.find((r) => r.topic_id === n.id),
              active = n.id === selected,
              explored = Boolean(p?.first_explored_at),
              r = active ? 43 : 24;
            return (
              <g
                key={n.id}
                data-graph-node="true"
                transform={`translate(${n.position.x},${n.position.y})`}
                tabIndex={0}
                role="button"
                aria-label={`${known ? n.label : "Undiscovered topic"}${explored ? ", explored" : p ? ", discovered" : ", new to you"}${active ? ", selected" : ""}`}
                aria-pressed={active}
                onClick={() => onSelect(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(n);
                  }
                }}
                className="graph-node"
              >
                <title>
                  {known
                    ? n.description
                    : "Follow this direction to discover another topic."}
                </title>
                <circle
                  r={Math.max(28, r + 8)}
                  fill="transparent"
                  strokeDasharray={bridge ? "4 4" : undefined}
                  stroke={active ? "#73F1E7" : "#344561"}
                />
                {active && (
                  <ellipse
                    rx="64"
                    ry="48"
                    stroke="#73F1E7"
                    fill="none"
                    transform="rotate(-30)"
                  />
                )}
                <circle
                  r={r}
                  fill={`url(#${id}orb)`}
                  opacity={explored || active ? 1 : known ? 0.75 : 0.35}
                />
                <text textAnchor="middle" y="7" className="graph-node-symbol">
                  {explored ? "✓" : active ? "✦" : "·"}
                </text>
                <text
                  textAnchor="middle"
                  y={r + 27}
                  className="graph-node-title"
                >
                  {known ? n.label : "A new direction"}
                </text>
                <text
                  textAnchor="middle"
                  y={r + 45}
                  className="graph-node-status"
                >
                  {bridge
                    ? `Bridge → ${n.primaryUniverse}`
                    : active
                      ? "YOUR NEXT STOP"
                      : explored
                        ? "Explored"
                        : p
                          ? "Discovered"
                          : "New connection"}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="graph-map-controls">
        <span>Drag to explore</span>
        <button
          aria-label="Zoom out"
          onClick={() => move(viewport.x, viewport.y, viewport.zoom - 0.15)}
        >
          −
        </button>
        <button
          aria-label="Zoom in"
          onClick={() => move(viewport.x, viewport.y, viewport.zoom + 0.15)}
        >
          +
        </button>
        <button onClick={() => onViewport({ x: 0, y: 0, zoom: 1 })}>
          Reset
        </button>
      </div>
      <p className="graph-legend">
        ✓ Explored · Filled ring: selected · Nearby topics remain open to
        everyone
      </p>
    </div>
  );
}
