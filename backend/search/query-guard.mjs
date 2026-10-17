import {
  SEARCH_POLICY_VERSION,
  searchText,
  validateDecision,
} from "./search-policy.mjs";

export function createQueryGuard({ assessor, cache, model }) {
  return async (query, goal = "") => {
    query = searchText(query);
    if (goal) goal = searchText(goal);
    const key = [
      "search-intent",
      SEARCH_POLICY_VERSION,
      model,
      query.toLowerCase().replace(/\s+/g, " "),
      goal.toLowerCase().replace(/\s+/g, " "),
    ];
    return validateDecision(
      await cache.getOrLoad(key, 6 * 3600_000, async () =>
        validateDecision(await assessor.query(query, goal)),
      ),
    );
  };
}
