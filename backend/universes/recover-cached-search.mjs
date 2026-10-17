import { createHash } from "node:crypto";
import {
  SEARCH_POLICY_VERSION,
  videoEvidence,
} from "../search/search-policy.mjs";

// Recover older public references once per process. Never infer educational
// approval from a Universe label or trigger a provider request to fill a gap.
export function createCachedSearchRecovery({
  cache,
  catalog,
  model,
  now = Date.now,
}) {
  let recovery;
  return () =>
    (recovery ??= (async () => {
      const entries = (await cache.entries?.()) ?? [];
      const byKey = new Map(entries.map((row) => [row.key, row]));
      const videos = new Map();
      const expiresAtById = new Map();
      for (const entry of entries) {
        const video = entry.value;
        if (
          !video ||
          typeof video !== "object" ||
          !/^[\w-]{11}$/.test(video.id ?? "") ||
          typeof video.title !== "string" ||
          typeof video.channel !== "string" ||
          !video.details?.embeddable ||
          video.details.privacyStatus !== "public"
        )
          continue;
        const key = createHash("sha256")
          .update(
            JSON.stringify([
              "search-video-purpose",
              SEARCH_POLICY_VERSION,
              model,
              videoEvidence(video),
              "learning",
              "",
            ]),
          )
          .digest("hex");
        const purpose = byKey.get(key);
        if (
          !(entry.expiresAt > now()) ||
          !(purpose?.expiresAt > now()) ||
          purpose.value?.purpose !== "educational"
        )
          continue;
        videos.set(video.id, video);
        expiresAtById.set(
          video.id,
          Math.min(entry.expiresAt, purpose.expiresAt),
        );
      }
      await catalog.approve([...videos.values()], { expiresAtById });
    })().catch((error) => {
      recovery = undefined;
      throw error;
    }));
}
