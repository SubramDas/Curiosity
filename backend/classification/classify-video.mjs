import { ServiceError } from "../providers/request-json.mjs";
import { POLICY_VERSION } from "./universe-policy.mjs";

export function classificationMetadata(video) {
  const trim = (value, max) =>
    typeof value === "string" ? value.slice(0, max) : "";
  return {
    id: video.id,
    title: trim(video.title, 300),
    description: trim(video.description, 5000),
    channel: trim(video.channel, 200),
    tags: Array.isArray(video.tags)
      ? video.tags
          .filter((tag) => typeof tag === "string")
          .slice(0, 25)
          .map((tag) => tag.slice(0, 100))
      : [],
    categoryId: trim(video.categoryId, 10),
  };
}

export function createVideoClassifier({ gemini, wikidata, store }) {
  let active = 0;
  async function bounded(operation) {
    if (active >= 2)
      throw new ServiceError(
        "TOO_MANY_REQUESTS",
        "Video classification is busy. Try again shortly.",
      );
    active++;
    try {
      return await operation();
    } finally {
      active--;
    }
  }
  return {
    classify(video, { onStatus } = {}) {
      const metadata = classificationMetadata(video);
      return store.getOrClassify(metadata, () =>
        bounded(async () => {
          const extract = () => gemini.extract(metadata, onStatus);
          const extracted = await (store.getExtractedTopic
            ? store.getExtractedTopic(metadata, extract)
            : extract());
          if (!extracted.sufficient)
            return {
              topic: {
                label: extracted.topic,
                wikidataId: null,
                status: "provisional",
              },
              primaryUniverse: null,
              relatedUniverses: [],
              reason: extracted.focus,
              policyVersion: POLICY_VERSION,
              wikidataStatus: "not-needed",
            };
          let candidates = [],
            wikidataStatus = "available";
          try {
            candidates = await wikidata.findCandidates(
              extracted.topic,
              extracted.aliases,
            );
          } catch {
            wikidataStatus = "unavailable";
          }
          const result = await gemini.resolve(
            metadata,
            extracted,
            candidates,
            onStatus,
          );
          const matched = candidates.find(
            (candidate) => candidate.id === result.wikidataId,
          );
          return {
            topic: {
              label: matched ? matched.label : result.topicLabel,
              wikidataId: matched?.id ?? null,
              status: matched ? "matched" : "provisional",
            },
            primaryUniverse: result.primaryUniverse,
            relatedUniverses: result.relatedUniverses,
            reason: result.reason,
            policyVersion: POLICY_VERSION,
            wikidataStatus,
          };
        }),
      );
    },
  };
}
