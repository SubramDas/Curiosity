import { UniverseSidebar } from "../features/universes/UniverseNavigation";
import type { UniverseId } from "../../shared/features/universes/universe-rules";
import { Icon } from "../../shared/components/Icon";
import type { Topic } from "../../shared/types";
import type { PageView } from "../../shared/types";

export function Sidebar({
  graphEnabled = false,
  topics,
  view,
  open,
  onNavigate,
  onUniverse,
  onTopic,
  activeUniverse,
  onAsk,
  demo,
  onDemo,
}: {
  graphEnabled?: boolean;
  topics: Topic[];
  view: PageView;
  open: boolean;
  onNavigate: (view: PageView) => void;
  onUniverse: (id: UniverseId) => void;
  onTopic: (topic: Topic) => void;
  activeUniverse?: UniverseId;
  onAsk: () => void;
  demo: boolean;
  onDemo: (value: boolean) => void;
}) {
  return (
    <aside
      id="sidebar"
      className={`sidebar ${open ? "is-open" : ""}`}
      aria-label="Main navigation"
    >
      <nav>
        {(
          [
            ["home", "home", "Home"],
            ...(graphEnabled ? [["graph", "map", "Explore map"] as const] : []),
            ["shorts", "shorts", "Short videos"],
            ["history", "history", "Continue watching"],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            className={`nav-item ${view === id ? "active" : ""}`}
            aria-current={view === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <UniverseSidebar
        topics={topics}
        active={activeUniverse}
        onSelect={onUniverse}
        onTopic={onTopic}
      />
      <button className="nav-item" onClick={onAsk}>
        <Icon name="chat" />
        <span>Ask a question</span>
      </button>
      <details className="developer-options">
        <summary>Developer options</summary>
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={demo}
            onChange={(event) => onDemo(event.target.checked)}
          />
          30-second timer demo
        </label>
      </details>
      <p className="sidebar-footer">
        Follow your curiosity.
        <br />
        YouTube videos belong to their creators.
        <br />
        Hackathon demo · 18+
        <br />
        <a href="/demo-info.html">Demo and data information</a>
      </p>
    </aside>
  );
}
