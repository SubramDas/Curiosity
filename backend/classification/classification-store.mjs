import { createHash } from "node:crypto";
import { POLICY_VERSION } from "./universe-policy.mjs";

class TemporaryClassification extends Error {
  constructor(classification) {
    super("Wikidata lookup was temporarily unavailable.");
    this.classification = classification;
  }
}
export function createClassificationStore({ cache, model }) {
  return {
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
        24 * 3600_000,
        extract,
      );
    },
    async getOrClassify(metadata, classify) {
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(metadata))
        .digest("hex");
      const key = [
        "video-classification-v2",
        POLICY_VERSION,
        model,
        metadata.id,
        fingerprint,
      ];
      // Re-evaluate changed metadata/model/policy; never save source metadata here.
      try {
        return await cache.getOrLoad(key, 24 * 3600_000, async () => {
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
        });
      } catch (error) {
        if (error instanceof TemporaryClassification)
          return error.classification;
        throw error;
      }
    },
  };
}
