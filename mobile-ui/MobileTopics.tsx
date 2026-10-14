import { TopicTiles } from "../shared/features/topics/TopicTiles";
import type { Topic } from "../shared/types";

export function MobileTopics({
  topics,
  onOpen,
  onSearch,
  onHistory,
}: {
  topics: Topic[];
  onOpen: (topic: Topic) => void;
  onSearch: () => void;
  onHistory: () => void;
}) {
  return (
    <section className="mobile-topics">
      <h1>A home for your curiosity</h1>
      <p className="muted">Broad subjects keep your searches together.</p>
      <TopicTiles topics={topics} onOpen={onOpen} />
      <button onClick={onSearch}>Search another topic</button>
      <button className="secondary" onClick={onHistory}>
        Continue watching
      </button>
    </section>
  );
}
