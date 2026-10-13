import { categories } from "../topics/topic-rules";
import type { CategoryId, Topic } from "../../types";

export function TopicFilters({
  topics,
  active,
  onTrending,
  onTopic,
}: {
  topics: Topic[];
  active?: CategoryId;
  onTrending: () => void;
  onTopic: (topic: Topic) => void;
}) {
  const groups = [...new Set(topics.map((topic) => topic.category))];
  return (
    <nav className="topic-filters" aria-label="Feed topics">
      <button aria-pressed={!active} onClick={onTrending}>
        Trending
      </button>
      {groups.map((category) => (
        <button
          key={category}
          aria-pressed={active === category}
          onClick={() =>
            onTopic(topics.find((topic) => topic.category === category)!)
          }
        >
          {categories[category]}
        </button>
      ))}
    </nav>
  );
}
