import type { LearningChoice } from "./search-types";

export function LearningChoices({
  choices,
  onSelect,
}: {
  choices: LearningChoice[];
  onSelect: (query: string) => void;
}) {
  return (
    <div className="learning-choices">
      {choices.map((choice) => (
        <button
          key={choice.query}
          className="learning-choice"
          onClick={() => onSelect(choice.query)}
        >
          <span>
            <strong>{choice.label}</strong>
            <small>{choice.description}</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
}
