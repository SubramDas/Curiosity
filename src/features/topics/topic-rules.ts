import type { CategoryId, Topic } from "../../types";

export const categories: Record<CategoryId, string> = {
  computing: "Computing & Tech",
  money: "Money & Business",
  science: "Science & Mathematics",
  health: "Health & Medicine",
  society: "Society, History & Law",
  language: "Language & Communication",
  arts: "Arts & Media",
  life: "Everyday Skills",
  general: "General / Unsorted",
};

export function classifyTopic(query: string): Topic | null {
  const cleaned = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (cleaned === "ca") return null;
  const computing =
    /\b(gpus?|cpus?|cuda|graphics|nvidia|amd|computer|programming|software|dlss|ray tracing|ai)\b/.test(
      cleaned,
    );
  const money =
    /\b(finance|stocks?|shares?|valuation|tax|taxes|accounting|chartered accountant|business)\b/.test(
      cleaned,
    );
  const health = /\b(medicine|medical|health|anatomy)\b/.test(cleaned);
  const law = /\b(law|tax|taxes|legal|import)\b/.test(cleaned);
  let category: CategoryId = "general";
  if (money) category = "money";
  else if (health) category = "health";
  else if (computing) category = "computing";
  else if (
    /\b(physics|chemistry|biology|mathematics|maths?|science)\b/.test(cleaned)
  )
    category = "science";
  else if (/\b(history|law|california|politics)\b/.test(cleaned))
    category = "society";
  else if (/\b(language|english|communication|writing)\b/.test(cleaned))
    category = "language";
  else if (/\b(art|music|painting|film)\b/.test(cleaned)) category = "arts";
  else if (/\b(cooking|gardening|repair|sports?|fitness)\b/.test(cleaned))
    category = "life";
  const relatedCategories: CategoryId[] = [];
  if (computing && category !== "computing")
    relatedCategories.push("computing");
  if (law && category !== "society") relatedCategories.push("society");
  // Normalize only simple aliases. Mixed queries keep their full intent.
  const aliases: Record<string, string> = {
    gpu: "gpu",
    gpus: "gpu",
    "what is a gpu": "gpu",
    "what are gpus": "gpu",
    "i want to know about gpus": "gpu",
    "graphics processing unit": "gpu",
    cpu: "cpu",
    cpus: "cpu",
    amd: "amd",
    nvidia: "nvidia",
  };
  return {
    key: `${category}:${aliases[cleaned] ?? cleaned}`,
    query: query.trim(),
    category,
    relatedCategories,
  };
}

export function saveUniqueTopic(topics: Topic[], topic: Topic): Topic[] {
  // Retain the existing main tile if a later classifier gives a different mapping.
  const existing = findSavedTopic(topics, topic);
  return existing ? topics : [topic, ...topics];
}

export function findSavedTopic(
  topics: Topic[],
  topic: Topic,
): Topic | undefined {
  return topics.find(
    (saved) =>
      saved.key === topic.key ||
      saved.query.trim().toLowerCase() === topic.query.trim().toLowerCase(),
  );
}
