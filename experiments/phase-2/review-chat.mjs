import { loadLocalEnvironment } from "../../config/local-environment.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createGeminiClient } from "./services/gemini.mjs";
import { gpuNotes } from "../../backend/content/gpu-notes.mjs";
import { createUsageLimiter } from "../../backend/usage.mjs";
import { ServiceError } from "../../backend/providers/request-json.mjs";

try {
  const environment = loadLocalEnvironment();
  const client = createGeminiClient({
    apiKey: environment.GEMINI_API_KEY,
    model: environment.GEMINI_MODEL,
    allowFreeTest: environment.ALLOW_GEMINI_FREE_TEST === "true",
  });
  const limiter = createUsageLimiter();
  const lines = readFileSync(
    new URL("./content/CHAT_REVIEW.md", import.meta.url),
    "utf8",
  ).split("\n");
  const cases = lines
    .filter((line) => /^\| \d+ \|/.test(line))
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return {
        number: Number(cells[1]),
        question: cells[2],
        expectedInsufficient: Number(cells[1]) > 10,
      };
    });
  const results = [];
  for (const item of cases) {
    limiter.reserve("chat", Number(environment.CHAT_DAILY_LIMIT ?? 25));
    const start = performance.now();
    const answer = await client.answerFromNotes(item.question, gpuNotes);
    const result = {
      ...item,
      ...answer,
      milliseconds: Math.round(performance.now() - start),
      expectedBehaviorMatched:
        answer.insufficientInformation === item.expectedInsufficient,
    };
    results.push(result);
    mkdirSync(".local-data", { recursive: true });
    writeFileSync(
      ".local-data/chat-review.json",
      JSON.stringify(
        {
          date: new Date().toISOString(),
          model: environment.GEMINI_MODEL,
          results,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        number: item.number,
        expectedBehaviorMatched: result.expectedBehaviorMatched,
        milliseconds: result.milliseconds,
        answer: answer.answer,
      }),
    );
  }
  console.log(
    JSON.stringify({
      reviewed: results.length,
      behaviorMatches: results.filter(
        (result) => result.expectedBehaviorMatched,
      ).length,
      note: "Source references passed validation. Claims still require human review; this is not a general accuracy score.",
    }),
  );
} catch (error) {
  console.error(
    error instanceof ServiceError
      ? `${error.code}: ${error.message}`
      : "REVIEW_FAILED: The review stopped. See the safely saved partial results.",
  );
  process.exitCode = 1;
}
