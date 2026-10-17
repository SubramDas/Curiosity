import type { Topic } from "../../../shared/types";
import {
  groupUniverseTopics,
  universes,
  type UniverseId,
} from "../../../shared/features/universes/universe-rules";
import { Icon } from "../../../shared/components/Icon";

export function UniverseFilters({
  active,
  isTrending,
  onSelect,
  onTrending,
}: {
  active?: UniverseId;
  isTrending: boolean;
  onSelect: (id: UniverseId) => void;
  onTrending: () => void;
}) {
  return (
    <nav className="topic-filters" aria-label="Universes">
      <button aria-pressed={isTrending} onClick={onTrending}>
        Trending
      </button>
      {(Object.keys(universes) as UniverseId[]).map((id) => (
        <button
          key={id}
          aria-pressed={active === id}
          onClick={() => onSelect(id)}
        >
          {universes[id].name}
        </button>
      ))}
    </nav>
  );
}
export function UniverseSidebar({
  topics,
  active,
  onSelect,
}: {
  topics: Topic[];
  active?: UniverseId;
  onSelect: (id: UniverseId) => void;
}) {
  return (
    <section
      className="saved-section universe-sidebar"
      aria-label="Your Universes"
    >
      <h2>Your Universes</h2>
      {(Object.keys(universes) as UniverseId[]).map((id) => (
        <button
          key={id}
          className={`nav-item ${active === id ? "active" : ""}`}
          onClick={() => onSelect(id)}
        >
          <Icon
            name={
              id === "science"
                ? "science"
                : id === "commerce"
                  ? "money"
                  : "bookmark"
            }
          />
          <span>{universes[id].name}</span>
          <small aria-label="saved searches">
            {groupUniverseTopics(topics, id).length || ""}
          </small>
        </button>
      ))}
      <p className="fine-print">
        {topics.length} searches explored. Search freely; your discoveries stay
        organised.
      </p>
    </section>
  );
}
