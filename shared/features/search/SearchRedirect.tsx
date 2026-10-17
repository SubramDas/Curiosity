import { useEffect, useState } from "react";
import type { SearchDecision } from "./search-types";
import { LearningChoices } from "./LearningChoices";

export function SearchRedirect({
  decision,
  query,
  onChoose,
  onClarify,
  onChange,
}: {
  decision: SearchDecision;
  query: string;
  onChoose: (query: string) => void;
  onClarify: (goal: string) => void;
  onChange: () => void;
}) {
  const [clarifying, setClarifying] = useState(false);
  const [goal, setGoal] = useState("");
  useEffect(() => {
    setClarifying(false);
    setGoal("");
  }, [query, decision]);
  if (clarifying)
    return (
      <>
        <span className="search-eyebrow">Tell us a little more</span>
        <h1>What do you want to understand?</h1>
        <p>
          Your original search “{query}” stays above. Add a learning goal to
          help us find the right videos.
        </p>
        <form
          className="search-goal"
          onSubmit={(event) => {
            event.preventDefault();
            if (goal.trim()) onClarify(goal.trim());
          }}
        >
          <label htmlFor="learning-goal">Your learning goal</label>
          <textarea
            id="learning-goal"
            maxLength={480}
            required
            autoFocus
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="For example: I want to understand how comedians use timing."
          />
          <button disabled={!goal.trim()}>Find learning videos</button>
          <button type="button" className="secondary" onClick={onChange}>
            Back to search
          </button>
          <small>Be specific: a concept, a skill, or a question.</small>
        </form>
      </>
    );
  const redirected = decision.action === "redirect";
  return (
    <>
      <span className="search-eyebrow">
        {redirected ? "A different direction" : query}
      </span>
      <h1>
        {redirected
          ? "Let’s find something to learn."
          : "What would you like to learn?"}
      </h1>
      <p>{decision.reason}</p>
      <LearningChoices choices={decision.choices} onSelect={onChoose} />
      <button className="secondary" onClick={() => setClarifying(true)}>
        {redirected ? "I meant a learning topic" : "Something else"}
      </button>
      {redirected && (
        <aside className="search-promise">
          <strong>A little fun, along the way.</strong>
          <p>Short, topic-related breaks appear while you learn.</p>
        </aside>
      )}
    </>
  );
}
