export interface LearningChoice {
  label: string;
  query: string;
  description: string;
}
export interface SearchDecision {
  action: "allow" | "choices" | "redirect";
  reason: string;
  choices: LearningChoice[];
}
export function isSearchDecision(value: unknown): value is SearchDecision {
  if (!value || typeof value !== "object") return false;
  const row = value as SearchDecision;
  return (
    ["allow", "choices", "redirect"].includes(row.action) &&
    typeof row.reason === "string" &&
    row.reason.length <= 300 &&
    Array.isArray(row.choices) &&
    row.choices.length <= 3 &&
    (row.action === "allow"
      ? row.choices.length === 0
      : row.choices.length >= 2) &&
    row.choices.every(
      (c) =>
        c &&
        typeof c.label === "string" &&
        c.label.length > 0 &&
        c.label.length <= 100 &&
        typeof c.query === "string" &&
        c.query.length > 0 &&
        c.query.length <= 480 &&
        typeof c.description === "string" &&
        c.description.length <= 180,
    )
  );
}
