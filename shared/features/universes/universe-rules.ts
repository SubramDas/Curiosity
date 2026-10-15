import type { CategoryId, Topic, Video } from "../../types";

export type UniverseId = "science" | "commerce" | "arts";
export interface VideoClassification {
  universe: UniverseId;
  subtopic: string;
  relatedUniverses: UniverseId[];
}
export const universes: Record<UniverseId, { name: string; query: string }> = {
  science: {
    name: "Science & Technology",
    query: "science technology explained",
  },
  commerce: {
    name: "Commerce & Business",
    query: "finance business explained",
  },
  arts: {
    name: "Arts & Humanities",
    query: "art history humanities explained",
  },
};
// These conservative title rules are a starting point, not a knowledge graph.
const subjects: { universe: UniverseId; name: string; matches: RegExp }[] = [
  {
    universe: "commerce",
    name: "Accounting & tax",
    matches: /\b(tax|taxes|accounting|accountant|gst|chartered accountant)\b/i,
  },
  {
    universe: "commerce",
    name: "Business & markets",
    matches:
      /\b(stock|stocks|shares|valuation|business|economics|economy|markets?|entrepreneur|startup)\b/i,
  },
  {
    universe: "commerce",
    name: "Personal finance",
    matches:
      /\b(finance|financial|money|budget|investing|investment|interest|savings?|banking)\b/i,
  },
  {
    universe: "arts",
    name: "History & society",
    matches:
      /\b(history|historical|civilization|politics|society|law|legal|philosophy|humanities|geography)\b/i,
  },
  {
    universe: "arts",
    name: "Languages & communication",
    matches:
      /\b(language|english|literature|writing|communication|grammar|poetry)\b/i,
  },
  {
    universe: "arts",
    name: "Design & art",
    matches: /\b(arts?|design|painting|drawing|architecture|photography)\b/i,
  },
  {
    universe: "arts",
    name: "Music & film",
    matches: /\b(music|film|cinema|theatre|dance)\b/i,
  },
  {
    universe: "science",
    name: "Graphics & GPUs",
    matches: /\b(gpus?|graphics|nvidia|amd|dlss|ray tracing|rendering)\b/i,
  },
  {
    universe: "science",
    name: "Artificial intelligence",
    matches:
      /\b(ai|artificial intelligence|machine learning|neural networks?|chatgpt)\b/i,
  },
  {
    universe: "science",
    name: "Computing",
    matches:
      /\b(cpus?|computers?|computing|cuda|programming|software|coding|code|algorithms?|technology|tech)\b/i,
  },
  {
    universe: "science",
    name: "Physics & space",
    matches:
      /\b(physics|space|astronomy|gravity|quantum|electricity|light|universe|stars?)\b/i,
  },
  {
    universe: "science",
    name: "Biology & health",
    matches:
      /\b(biology|medicine|medical|health|anatomy|cells?|dna|neuroscience)\b/i,
  },
  {
    universe: "science",
    name: "Chemistry",
    matches: /\b(chemistry|chemical|molecules?|atoms?)\b/i,
  },
  {
    universe: "science",
    name: "Mathematics",
    matches: /\b(mathematics|maths?|algebra|calculus|statistics|geometry)\b/i,
  },
  {
    universe: "science",
    name: "Science",
    matches: /\b(science|scientific|engineering)\b/i,
  },
];
function classifyLegacyQuery(
  video: Pick<Video, "title">,
): VideoClassification | null {
  const matches = subjects.filter((subject) =>
    subject.matches.test(video.title),
  );
  const primary = matches[0];
  if (!primary) return null;
  return {
    universe: primary.universe,
    subtopic: primary.name,
    relatedUniverses: [
      ...new Set(matches.map((subject) => subject.universe)),
    ].filter((id) => id !== primary.universe),
  };
}
const legacyUniverse: Partial<Record<CategoryId, UniverseId>> = {
  computing: "science",
  science: "science",
  health: "science",
  money: "commerce",
  society: "arts",
  language: "arts",
  arts: "arts",
};
export function topicUniverse(topic: Topic): UniverseId | null {
  return (
    classifyLegacyQuery({ title: topic.query })?.universe ??
    legacyUniverse[topic.category] ??
    null
  );
}
export function groupUniverseTopics(
  topics: Topic[],
  universe: UniverseId,
): Topic[] {
  return topics.filter((topic) => topicUniverse(topic) === universe);
}

// Video placement uses server classification; title heuristics are legacy-search-only.
export function classifyVideo(
  video: Pick<Video, "title" | "classification">,
): VideoClassification | null {
  const result = video.classification;
  return result?.primaryUniverse
    ? {
        universe: result.primaryUniverse,
        subtopic: result.topic.label,
        relatedUniverses: result.relatedUniverses,
      }
    : null;
}
