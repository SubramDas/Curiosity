import { createHash } from "node:crypto";
import { POLICY_VERSION } from "./universe-policy.mjs";

export const CLASSIFICATION_CACHE_TTL_MS = 30 * 24 * 3600_000;

class TemporaryClassification extends Error {
  constructor(classification) {
    super("Wikidata lookup was temporarily unavailable.");
    this.classification = classification;
  }
}
export function createClassificationStore({ cache, model }) {
  function classificationKey(metadata) {
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(metadata))
      .digest("hex");
    return [
      "video-classification-v2",
      POLICY_VERSION,
      model,
      metadata.id,
      fingerprint,
    ];
  }
  async function cached(key) {
    const [complete, recent] = await Promise.all([
      cache.get?.(key),
      cache.get?.([...key, "attempt"]),
    ]);
    return complete ?? recent;
  }
  return {
    getCached(metadata) {
      return cached(classificationKey(metadata));
    },
    getCachedByFingerprint(id, fingerprint) {
      if (!/^[\w-]{11}$/.test(id) || !/^[a-f0-9]{64}$/.test(fingerprint))
        return Promise.resolve(undefined);
      return cached([
        "video-classification-v2",
        POLICY_VERSION,
        model,
        id,
        fingerprint,
      ]);
    },
    getExtractedTopic(metadata, extract) {
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(metadata))
        .digest("hex");
      return cache.getOrLoad(
        [
          "extracted-video-topic",
          POLICY_VERSION,
          model,
          metadata.id,
          fingerprint,
        ],
        CLASSIFICATION_CACHE_TTL_MS,
        extract,
      );
    },
    async getOrClassify(metadata, classify) {
      const key = classificationKey(metadata);
      // Re-evaluate changed metadata/model/policy; never save source metadata here.
      try {
        return await cache.getOrLoad(
          key,
          CLASSIFICATION_CACHE_TTL_MS,
          async () => {
            // Keep outage fallbacks briefly, so revisits do not spend model allowance
            // repeatedly and a temporary graph outage does not last a whole day.
            const result = await cache.getOrLoad(
              [...key, "attempt"],
              5 * 60_000,
              classify,
            );
            if (result.wikidataStatus === "unavailable")
              throw new TemporaryClassification(result);
            return result;
          },
        );
      } catch (error) {
        if (error instanceof TemporaryClassification)
          return error.classification;
        throw error;
      }
    },
  };
}
