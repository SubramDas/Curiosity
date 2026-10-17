import type { ReactNode } from "react";
import type { useVideoSearch } from "../videos/useVideoSearch";
import { LearningChoices } from "./LearningChoices";
import { SearchRedirect } from "./SearchRedirect";

const examples = [
  {
    label: "How GPUs work",
    query: "How GPUs work",
    description: "Understand the technology behind the screen.",
  },
  {
    label: "Football",
    query: "Football",
    description: "Choose rules, tactics, or history.",
  },
  {
    label: "Funny videos",
    query: "Funny videos",
    description: "Find a learning angle on humor.",
  },
];
export function SearchWorkspace({
  search,
  onChoose,
  onClarify,
  onChange,
  onRetry,
  children,
}: {
  search: ReturnType<typeof useVideoSearch>;
  onChoose: (query: string) => void;
  onClarify: (goal: string) => void;
  onChange: () => void;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (search.busy && !search.videos.length)
    return (
      <div role="status" className="search-waiting">
        <span className="search-eyebrow">Finding your direction</span>
        <h1>
          {search.phase === "filtering"
            ? "Finding learning videos…"
            : "Finding a learning angle…"}
        </h1>
        <p>Your search is saved above. You can change it at any time.</p>
        <div className="search-promise">
          <strong>
            {search.phase === "filtering"
              ? "Looking for explanations and useful skills"
              : "Checking your search"}
          </strong>
          <div className="search-progress" />
        </div>
        <button className="secondary" onClick={onChange}>
          Change search
        </button>
      </div>
    );
  if (search.error && !search.videos.length)
    return (
      <div role="alert">
        <span className="search-eyebrow">Search paused</span>
        <h1>We couldn’t finish this search.</h1>
        <p>{search.error}</p>
        <div className="search-actions">
          <button onClick={onRetry}>Try again</button>
          <button className="secondary" onClick={onChange}>
            Change search
          </button>
        </div>
      </div>
    );
  if (search.decision && search.decision.action !== "allow")
    return (
      <SearchRedirect
        decision={search.decision}
        query={search.topic?.query ?? ""}
        onChoose={onChoose}
        onClarify={onClarify}
        onChange={onChange}
      />
    );
  if (search.topic)
    return (
      <>
        <span className="search-eyebrow">Learning results</span>
        <h1>{search.topic.query}</h1>
        {search.videos.length ? (
          <>
            <p>
              Explanations, practical skills, and new ideas. Results from every
              Universe, together.
            </p>
            <p className="search-result-note">
              Focused on learning · AI filtering can make mistakes. Videos are
              not fact-checked.
            </p>
            {search.error && <p role="alert">{search.error}</p>}
            {children}
          </>
        ) : (
          <>
            <h2>Try a different learning angle.</h2>
            <p>No suitable learning videos were found in this batch.</p>
            <button className="secondary" onClick={onChange}>
              Change search
            </button>
          </>
        )}
        {search.busy && (
          <p role="status">
            Finding more learning videos… You can start watching now.
          </p>
        )}
        {search.nextPage && !search.busy && (
          <button
            className="load-more"
            onClick={() => void search.load(search.topic!, true)}
          >
            Load more videos
          </button>
        )}
      </>
    );
  return (
    <>
      <span className="search-eyebrow">Follow your curiosity</span>
      <h1>What would you like to learn?</h1>
      <p>
        Explore any subject. Find explanations, practical skills, and new ideas.
      </p>
      <LearningChoices choices={examples} onSelect={onChoose} />
      <aside className="search-promise">
        <strong>Learning can be fun.</strong>
        <p>Funny explanations are welcome here.</p>
      </aside>
    </>
  );
}
