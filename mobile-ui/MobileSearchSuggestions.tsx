import type { Topic } from "../shared/types";

export function MobileSearchSuggestions({
  topics,
  onOpen,
  onAsk,
}: {
  topics: Topic[];
  onOpen: (topic: Topic) => void;
  onAsk: () => void;
}) {
  const recent = topics.slice(-5).reverse();
  return (
    <section className="mobile-search-suggestions">
      <h1>What are you curious about?</h1>
      <p className="muted">Search any topic, or ask your teacher a question.</p>
      {recent.length > 0 && (
        <>
          <h2>Recent searches</h2>
          <ul>
            {recent.map((topic) => (
              <li key={topic.key}>
                <button className="secondary" onClick={() => onOpen(topic)}>
                  {topic.query} <span aria-hidden="true">↗</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button onClick={onAsk}>Ask your teacher</button>
    </section>
  );
}
