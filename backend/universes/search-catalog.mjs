import { createHash } from "node:crypto";
import { classificationMetadata } from "../classification/classify-video.mjs";
import { POLICY_VERSION } from "../classification/universe-policy.mjs";
import { SEARCH_POLICY_VERSION } from "../search/search-policy.mjs";
import { ServiceError } from "../providers/request-json.mjs";

const lifetime = 24 * 3600_000;
const universes = new Set(["science", "commerce", "arts"]);
const fingerprint = (video) =>
  createHash("sha256")
    .update(JSON.stringify(classificationMetadata(video)))
    .digest("hex");

// Shared public references only: no submitted queries, users or viewing history.
export function createSearchCatalog({
  cache,
  model,
  now = Date.now,
  maxVideos = 100,
  resolveClassification = async (_id, _fingerprint) => undefined,
}) {
  const key = [
    "approved-search-catalog",
    SEARCH_POLICY_VERSION,
    POLICY_VERSION,
    model ?? "",
  ];
  function fresh(rows) {
    return Array.isArray(rows)
      ? rows.filter((row) => row.expiresAt > now())
      : [];
  }
  async function update(change) {
    if (!cache.update) return;
    await cache.update(key, lifetime, (saved) => {
      const rows = change(fresh(saved));
      // Prefer approved videos over classification-only entries if capacity is reached.
      return rows
        .sort(
          (a, b) =>
            (b.approvedUntil || 0) - (a.approvedUntil || 0) ||
            b.expiresAt - a.expiresAt,
        )
        .slice(0, maxVideos);
    });
  }
  return {
    async approve(videos, { expiresAtById = new Map() } = {}) {
      if (!videos.length) return;
      await update((rows) => {
        const entries = new Map(rows.map((row) => [row.id, row]));
        for (const video of videos) {
          const hash = fingerprint(video);
          const previous = entries.get(video.id);
          entries.set(video.id, {
            id: video.id,
            fingerprint: hash,
            classification:
              previous?.fingerprint === hash && previous.classifiedUntil > now()
                ? previous.classification
                : undefined,
            classifiedUntil:
              previous?.fingerprint === hash ? previous.classifiedUntil : 0,
            expiresAt: Math.min(
              now() + lifetime,
              expiresAtById.get(video.id) ?? Infinity,
            ),
            approvedUntil: Math.min(
              now() + lifetime,
              expiresAtById.get(video.id) ?? Infinity,
            ),
            video: {
              id: video.id,
              title: video.title.slice(0, 300),
              channel: video.channel.slice(0, 200),
              watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
              reviewed: false,
              details: video.details,
            },
          });
        }
        return [...entries.values()];
      });
    },
    async classify(video, classification) {
      await update((rows) => {
        const hash = fingerprint(video);
        const previous = rows.find(
          (row) => row.id === video.id && row.fingerprint === hash,
        );
        return [
          ...rows.filter((row) => row.id !== video.id),
          {
            ...previous,
            id: video.id,
            fingerprint: hash,
            classification,
            classifiedUntil:
              now() +
              (classification.wikidataStatus === "unavailable"
                ? 5 * 60_000
                : lifetime),
            // Classifying never grants or extends educational approval.
            approvedUntil: previous?.approvedUntil ?? 0,
            expiresAt: Math.max(previous?.expiresAt ?? 0, now() + lifetime),
          },
        ];
      });
    },
    async list(universe) {
      if (!universes.has(universe))
        throw new ServiceError("INVALID_INPUT", "Choose a valid Universe.");
      const rows = await Promise.all(
        fresh(await cache.get?.(key)).map(async (row) => {
          const classification =
            row.classifiedUntil > now() ? row.classification : undefined;
          if (classification || !row.video || !(row.approvedUntil > now()))
            return { ...row, classification };
          return {
            ...row,
            classification: await resolveClassification(
              row.id,
              row.fingerprint,
            ),
          };
        }),
      );
      return rows
        .filter(
          (row) =>
            row.video &&
            row.approvedUntil > now() &&
            (!row.classification?.primaryUniverse ||
              row.classification.primaryUniverse === universe),
        )
        .map((row) => ({
          ...row.video,
          ...(row.classification ? { classification: row.classification } : {}),
        }));
    },
  };
}
