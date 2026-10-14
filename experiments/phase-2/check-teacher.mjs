import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { loadLocalEnvironment } from "../../config/local-environment.mjs";
import { createUsageLimiter } from "../../backend/usage.mjs";
import { createProviderCache } from "../../backend/provider-cache.mjs";
import { createCachedYouTubeClient } from "../../backend/cached-youtube.mjs";
import { createYouTubeClient } from "../../backend/providers/youtube.mjs";
import { createGeminiTeacher } from "../../backend/chat/gemini-teacher.mjs";
import { createTeacher } from "../../backend/chat/teacher.mjs";
import { gpuNotes } from "../../backend/content/gpu-notes.mjs";

const environment = loadLocalEnvironment();
const directory = ".local-data/teacher-check";
mkdirSync(directory, { recursive: true });
const limits = createUsageLimiter(directory);
const teacher = createTeacher({
  gemini: createGeminiTeacher({
    apiKey: environment.GEMINI_API_KEY,
    model: environment.GEMINI_MODEL,
    allowFreeTest: environment.ALLOW_GEMINI_FREE_TEST === "true",
  }),
  youtube: createCachedYouTubeClient({
    youtube: createYouTubeClient({ apiKey: environment.YOUTUBE_API_KEY }),
    cache: createProviderCache({ directory }),
    reserve: (count) => {
      for (let i = 0; i < count; i++) limits.reserve("search", 6);
    },
  }),
  reserveChat: () => limits.reserve("chat", 3),
  reserveVideo: () => limits.reserve("videoChat", 2),
  sources: gpuNotes,
});
const samples = [
  {
    question: "What is compound interest? Give a simple numerical example.",
    topic: "GPUs",
    history: [],
    currentVideo: null,
  },
  {
    question:
      "What does a GPU do? Point to the section in this video that explains its job.",
    topic: "GPUs",
    history: [],
    currentVideo: {
      id: "Kgcfj_KV-mo",
      title: "GPU explanation",
      positionSeconds: 20,
    },
  },
];
const results = [];
for (const sample of process.argv.includes("--video-only")
  ? samples.slice(1)
  : samples) {
  const started = Date.now();
  try {
    const answer = await teacher(sample);
    results.push({
      question: sample.question,
      milliseconds: Date.now() - started,
      answer,
    });
    console.log(
      JSON.stringify({
        question: sample.question,
        milliseconds: Date.now() - started,
        relation: answer.relation,
        videoContext: answer.videoContext,
        timestamp: answer.timestamp,
        videoCount: answer.recommendations.length,
        answer: answer.answer.slice(0, 600),
        notices: answer.notices,
      }),
    );
  } catch (error) {
    results.push({
      question: sample.question,
      code: error.code ?? "ERROR",
      message: error.message,
    });
    console.log(JSON.stringify(results.at(-1)));
  }
}
writeFileSync(`${directory}/results.json`, JSON.stringify(results, null, 2), {
  mode: 0o600,
});

appendFileSync(
  `${directory}/runs.jsonl`,
  JSON.stringify({ checkedAt: new Date().toISOString(), results }) + "\n",
  { mode: 0o600 },
);
