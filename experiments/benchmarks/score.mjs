const universes = new Set(["science", "commerce", "arts", null]);
const actions = new Set(["allow", "choices", "redirect"]);
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, " ");

export function validateCases(cases, suite) {
  if (!Array.isArray(cases) || !cases.length || cases.length > 100)
    throw new Error("Use a dataset containing 1–100 cases.");
  const ids = new Set();
  for (const sample of cases) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(sample?.id ?? "") || ids.has(sample.id))
      throw new Error(
        "Case IDs must be unique and contain only letters, numbers, _ or -.",
      );
    ids.add(sample.id);
    const input = sample.input;
    const validText = (text, max) =>
      typeof text === "string" && text.trim() && text.length <= max;
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error(`Missing input for ${sample.id}.`);
    if (
      suite === "search" &&
      (!validText(input.query, 480) ||
        (input.goal !== undefined && !validText(input.goal, 480)))
    )
      throw new Error(`Invalid search input for ${sample.id}.`);
    if (suite === "classification" && !/^[\w-]{11}$/.test(input.id ?? ""))
      throw new Error(`Use a public YouTube ID for ${sample.id}.`);
    if (suite === "teacher") {
      if (
        !validText(input.question, 2000) ||
        typeof input.topic !== "string" ||
        input.topic.length > 480 ||
        (input.history !== undefined &&
          (!Array.isArray(input.history) ||
            input.history.length > 6 ||
            input.history.some(
              (item) =>
                !item ||
                !["user", "assistant"].includes(item.role) ||
                !validText(item.content, 2000),
            )))
      )
        throw new Error(`Invalid teacher input for ${sample.id}.`);
      const video = input.currentVideo;
      if (
        video != null &&
        (!/^[\w-]{11}$/.test(video.id ?? "") ||
          typeof video.title !== "string" ||
          video.title.length > 300 ||
          !Number.isFinite(video.positionSeconds) ||
          video.positionSeconds < 0 ||
          video.positionSeconds > 604800)
      )
        throw new Error(`Invalid teacher video for ${sample.id}.`);
    }
    const review = sample.review;
    if (!review || !["draft", "reviewed"].includes(review.status))
      throw new Error(
        `Specify a draft or reviewed expectation for ${sample.id}.`,
      );
    if (review.status === "draft") continue;
    if (
      !validText(review.reviewer, 80) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? "") ||
      !Number.isFinite(Date.parse(review.reviewedAt)) ||
      new Date(review.reviewedAt).toISOString().slice(0, 10) !==
        review.reviewedAt
    )
      throw new Error(`Record reviewer and reviewedAt for ${sample.id}.`);
    const expected = review.expected;
    if (!expected || typeof expected !== "object" || Array.isArray(expected))
      throw new Error(`Missing reviewed expectations for ${sample.id}.`);
    if (suite === "search") {
      if (!actions.has(expected.action))
        throw new Error(`Invalid expected search action for ${sample.id}.`);
      if (
        expected.videoLabels !== undefined &&
        (!expected.videoLabels ||
          typeof expected.videoLabels !== "object" ||
          Array.isArray(expected.videoLabels) ||
          Object.entries(expected.videoLabels).some(
            ([id, label]) =>
              !/^[\w-]{11}$/.test(id) ||
              !["educational", "entertainment", "unclear"].includes(label),
          ))
      )
        throw new Error(`Invalid reviewed video labels for ${sample.id}.`);
    }
    if (suite === "classification") {
      if (!universes.has(expected.primaryUniverse))
        throw new Error(`Invalid expected Universe for ${sample.id}.`);
      for (const [field, valid] of [
        ["topicLabels", (v) => validText(v, 160)],
        ["wikidataIds", (v) => /^Q\d+$/.test(v)],
      ]) {
        if (
          expected[field] !== undefined &&
          (!Array.isArray(expected[field]) ||
            !expected[field].length ||
            expected[field].some((v) => !valid(v)))
        )
          throw new Error(`Invalid ${field} for ${sample.id}.`);
      }
    }
  }
  return cases;
}

// Failed attempted cases count as incorrect; skipped cases are reported separately.
export function scoreResults(cases, results, suite) {
  const byId = new Map(cases.map((sample) => [sample.id, sample]));
  const metrics = {};
  const add = (name, correct) => {
    metrics[name] ??= { correct: 0, total: 0 };
    metrics[name].total++;
    if (correct) metrics[name].correct++;
  };
  let reviewedAttempts = 0,
    returnedVideos = 0,
    reviewedReturnedVideos = 0;
  const reviewedCaseIds = new Set();
  for (const row of results) {
    const review = byId.get(row.caseId)?.review;
    if (review?.status !== "reviewed" || row.status === "skipped") continue;
    reviewedAttempts++;
    reviewedCaseIds.add(row.caseId);
    const expected = review.expected;
    const actual = row.status === "success" ? row.observation : undefined;
    if (suite === "search") {
      add("searchDecision", actual?.action === expected.action);
      if (actual)
        for (const id of actual.videoIds) {
          returnedVideos++;
          if (!Object.hasOwn(expected.videoLabels ?? {}, id)) continue;
          reviewedReturnedVideos++;
          add(
            "returnedVideoEducationalPrecision",
            expected.videoLabels[id] === "educational",
          );
        }
    }
    if (suite === "classification") {
      add(
        "primaryUniverse",
        Boolean(actual) && actual.primaryUniverse === expected.primaryUniverse,
      );
      if (expected.topicLabels || expected.wikidataIds) {
        const matched =
          Boolean(actual) &&
          (expected.wikidataIds?.includes(actual.wikidataId) ||
            expected.topicLabels?.some(
              (label) => normalize(label) === normalize(actual.topicLabel),
            ));
        add("topicMapping", Boolean(matched));
      }
    }
  }
  for (const metric of Object.values(metrics))
    metric.percentage =
      Math.round((10000 * metric.correct) / metric.total) / 100;
  return {
    reviewedAttempts,
    distinctReviewedCases: reviewedCaseIds.size,
    returnedVideos,
    reviewedReturnedVideos,
    metrics,
  };
}
