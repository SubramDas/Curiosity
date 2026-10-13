import { Icon } from "../navigation/Icon";
import { useState } from "react";
import { categories } from "./topic-rules";
import type { CategoryId, Topic } from "../../types";

export function TopicTiles({
  topics,
  onOpen,
}: {
  topics: Topic[];
  onOpen: (topic: Topic) => void;
}) {
  const [expanded, setExpanded] = useState<CategoryId | null>(null);
  const [preview, setPreview] = useState<CategoryId | null>(null);
  const used = Object.keys(categories).filter((id) =>
    topics.some((topic) => topic.category === id),
  ) as CategoryId[];
  return (
    <section className="saved-section" aria-label="Saved topic tiles">
      <div className="section-heading">
        <h2>Your topics</h2>
      </div>
      <p className="topic-count">{topics.length} topics explored</p>
      {topics.length === 0 && (
        <p className="muted">
          Your searches will collect here under broad subjects. Start with
          something you’re curious about.
        </p>
      )}
      <div className="tile-grid">
        {used.map((category) => (
          <article className="topic-tile" key={category}>
            <button
              className="tile-heading"
              onClick={() =>
                setExpanded(expanded === category ? null : category)
              }
              aria-expanded={expanded === category}
            >
              <Icon
                name={
                  category === "computing"
                    ? "chip"
                    : category === "money"
                      ? "money"
                      : category === "science"
                        ? "science"
                        : "bookmark"
                }
              />
              <span>{categories[category]}</span>
              <small>
                {topics.filter((topic) => topic.category === category).length}{" "}
                <span className="sr-only">
                  topics · {expanded === category ? "Close" : "Explore →"}
                </span>
              </small>
            </button>
            {expanded === category && (
              <ul>
                {topics
                  .filter((topic) => topic.category === category)
                  .map((topic) => (
                    <li key={topic.key}>
                      <button
                        className="topic-link"
                        onClick={() => onOpen(topic)}
                      >
                        {topic.query}
                      </button>
                      {topic.relatedCategories.length > 0 && (
                        <div className="related-tags">
                          Related to:{" "}
                          {topic.relatedCategories.map((id) => (
                            <button key={id} onClick={() => setPreview(id)}>
                              {categories[id]}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      {preview && (
        <aside className="notice">
          <strong>{categories[preview]}</strong>
          <p>
            This is a related-subject preview. Your topic stays in its original
            tile. Search this subject to start a separate trail.
          </p>
          <button onClick={() => setPreview(null)}>Close preview</button>
        </aside>
      )}
      <p className="fine-print">Explored topics show activity, not mastery.</p>
    </section>
  );
}
