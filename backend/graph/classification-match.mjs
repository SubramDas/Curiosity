// Candidate matching only. Publishing a video association still requires review.
export function matchClassificationToTopic(classification, topics) {
  if (!classification?.topic || !Array.isArray(topics))
    return { status: "unmatched", topicId: null };
  const name = String(classification.topic.label ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en");
  const qid = classification.topic.wikidataId;
  const exact = qid
    ? topics.filter((t) => t.wikidata_id === qid && t.status === "published")
    : [];
  const candidates = exact.length
    ? exact
    : topics.filter(
        (t) =>
          t.status === "published" &&
          t.primary_universe === classification.primaryUniverse &&
          [t.label, ...(t.aliases ?? [])].some(
            (a) => a.normalize("NFKC").trim().toLocaleLowerCase("en") === name,
          ),
      );
  return {
    status:
      candidates.length === 1
        ? "matched"
        : candidates.length
          ? "ambiguous"
          : "unmatched",
    topicId: candidates.length === 1 ? candidates[0].id : null,
  };
}
