import { createGeminiRequester } from "../gemini/request.mjs";
import { ServiceError } from "../providers/request-json.mjs";
import { extractTopicPrompt, resolveTopicPrompt } from "./prompts.mjs";
import { universePolicy } from "./universe-policy.mjs";

const text = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
function invalid() {
  throw new ServiceError(
    "INVALID_RESPONSE",
    "Video classification returned an invalid response.",
  );
}
export function validateExtractedTopic(value) {
  if (
    !value ||
    !text(value.topic, 100) ||
    !text(value.focus, 500) ||
    typeof value.sufficient !== "boolean" ||
    !Array.isArray(value.aliases) ||
    value.aliases.length > 2 ||
    value.aliases.some((alias) => !text(alias, 100))
  )
    invalid();
  return {
    topic: value.topic.trim(),
    focus: value.focus.trim(),
    aliases: [...new Set(value.aliases.map((alias) => alias.trim()))],
    sufficient: value.sufficient,
  };
}
export function validateResolution(value, candidates) {
  if (
    !value ||
    !text(value.topicLabel, 100) ||
    !text(value.reason, 500) ||
    !(
      value.primaryUniverse === null ||
      (typeof value.primaryUniverse === "string" &&
        Object.hasOwn(universePolicy, value.primaryUniverse))
    ) ||
    !Array.isArray(value.relatedUniverses) ||
    value.relatedUniverses.length > 2 ||
    value.relatedUniverses.some(
      (id) =>
        typeof id !== "string" ||
        !Object.hasOwn(universePolicy, id) ||
        id === value.primaryUniverse,
    ) ||
    new Set(value.relatedUniverses).size !== value.relatedUniverses.length ||
    !(
      value.wikidataId === null ||
      candidates.some((candidate) => candidate.id === value.wikidataId)
    ) ||
    (value.primaryUniverse === null &&
      (value.relatedUniverses.length || value.wikidataId !== null))
  )
    invalid();
  return {
    ...value,
    topicLabel: value.topicLabel.trim(),
    reason: value.reason.trim(),
  };
}

export function createGeminiClassifier({
  apiKey,
  model,
  allowFreeTest,
  reserve,
  fetchRequest = fetch,
  request = createGeminiRequester({ fetchRequest }),
}) {
  // No default, alternate model or automatic provider switch.
  if (!apiKey?.trim() || !/^[\w.-]+$/.test(model ?? ""))
    throw new ServiceError(
      "MISSING_CONFIG",
      "Video classification needs GEMINI_API_KEY and GEMINI_MODEL.",
    );
  if (!allowFreeTest)
    throw new ServiceError(
      "DATA_USE_NOT_CONFIRMED",
      "Enable the existing Gemini prototype data-use setting before classification.",
    );
  async function generate(instruction, data, onStatus) {
    const response = await request(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(data) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
            maxOutputTokens: 1024,
          },
        }),
      },
      { reserve, priority: "classification", onStatus },
    );
    const candidate = response.candidates?.[0];
    if (candidate?.finishReason !== "STOP") invalid();
    try {
      return JSON.parse(
        candidate.content.parts
          .filter((part) => !part.thought)
          .map((part) => part.text ?? "")
          .join(""),
      );
    } catch {
      invalid();
    }
  }
  return {
    async extract(metadata, onStatus) {
      return validateExtractedTopic(
        await generate(extractTopicPrompt, { metadata }, onStatus),
      );
    },
    async resolve(metadata, extracted, candidates, onStatus) {
      return validateResolution(
        await generate(
          resolveTopicPrompt,
          { metadata, extracted, candidates },
          onStatus,
        ),
        candidates,
      );
    },
  };
}
