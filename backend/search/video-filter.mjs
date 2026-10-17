import { readYouTubeSearchPageSize } from "../providers/youtube-settings.mjs";
import { SEARCH_POLICY_VERSION, videoEvidence } from "./search-policy.mjs";

export function createVideoFilter({
  assessor,
  cache,
  model,
  searchPageSize = 10,
}) {
  const pageSize = readYouTubeSearchPageSize(searchPageSize);
  /** @param {any[]} videos
   * @param {{purpose?: string, topic?: string, onProgress?: (videos: any[]) => void | Promise<void>}} options
   */
  return async (
    videos,
    { purpose = "learning", topic = "", onProgress } = {},
  ) => {
    const candidates = [
      ...new Map(
        videos
          .filter(
            (v) =>
              v.details?.embeddable && v.details.privacyStatus === "public",
          )
          .map((v) => [v.id, v]),
      ).values(),
    ].slice(0, pageSize);
    const evidence = candidates.map(videoEvidence);
    const key = (v) => [
      "search-video-purpose",
      SEARCH_POLICY_VERSION,
      model,
      v,
      purpose,
      purpose === "break" ? topic : "",
    ];
    const approved = (row) =>
      purpose === "break"
        ? row?.related === true && row?.purpose !== "unclear"
        : row?.purpose === "educational";
    const accepted = [];
    async function check(group) {
      let batch;
      const rows = await Promise.all(
        group.map((v) =>
          cache.getOrLoad(key(v), 24 * 3600_000, async () => {
            batch ??= assessor.videos(group, purpose, topic);
            return (await batch).find((row) => row.id === v.id);
          }),
        ),
      );
      group.forEach((v, i) => {
        if (approved(rows[i]))
          accepted.push(candidates.find((candidate) => candidate.id === v.id));
      });
    }
    // Synchronous consumers retain one batch. Desktop jobs publish cache hits first,
    // then append checked groups; never reorder cards already visible to a learner.
    if (!onProgress) {
      await check(evidence);
      return accepted;
    }
    const cached = await Promise.all(evidence.map((v) => cache.get?.(key(v))));
    const missing = [];
    evidence.forEach((v, i) => {
      if (cached[i] === undefined) missing.push(v);
      else if (approved(cached[i])) accepted.push(candidates[i]);
    });
    await onProgress([...accepted]);
    for (let i = 0; i < missing.length; i += 3) {
      await check(missing.slice(i, i + 3));
      await onProgress([...accepted]);
    }
    return accepted;
  };
}
