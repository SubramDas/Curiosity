import { TopicTiles } from "../topics/TopicTiles";
import { Icon } from "./Icon";
import type { Topic } from "../../types";
export type PageView = "home" | "topic" | "shorts" | "history";

export function Sidebar({
  topics,
  view,
  open,
  onNavigate,
  onTopic,
  onAsk,
  demo,
  onDemo,
}: {
  topics: Topic[];
  view: PageView;
  open: boolean;
  onNavigate: (view: PageView) => void;
  onTopic: (topic: Topic) => void;
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
      <TopicTiles topics={topics} onOpen={onTopic} />
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
        Private prototype · 18+
      </p>
    </aside>
  );
}
