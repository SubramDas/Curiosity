import { performance } from "node:perf_hooks";
import { createYouTubeClient, mergeVideoPages } from "./services/youtube.mjs";
import { createGeminiClient } from "./services/gemini.mjs";
import { ServiceError } from "./services/request-json.mjs";
import { gpuNotes } from "./content/gpu-notes.mjs";
import { loadLocalEnvironment } from "../../config/local-environment.mjs";
const environment = loadLocalEnvironment();

async function runSearch(query) {
  const youtube = createYouTubeClient({ apiKey: environment.YOUTUBE_API_KEY });
  const started = performance.now();
  const firstPage = await youtube.searchPage(query);
  const firstPageMilliseconds = Math.round(performance.now() - started);
  const pages = [firstPage];
  if (firstPage.nextPageToken)
    pages.push(await youtube.searchPage(query, firstPage.nextPageToken));
  const videos = mergeVideoPages(pages);
  const details = await youtube.getVideoDetails(
    videos.map((video) => video.id),
  );
  console.log(
    JSON.stringify(
      {
        mode: "live YouTube API",
        query,
        firstPageMilliseconds,
        totalMilliseconds: Math.round(performance.now() - started),
        searchCalls: pages.length,
        detailsCalls: videos.length ? 1 : 0,
        duplicateResultsRemoved:
          pages.reduce((count, page) => count + page.videos.length, 0) -
          videos.length,
        videos: videos.map((video) => ({
          ...video,
          details: details.find((item) => item.id === video.id) ?? null,
        })),
        note: "Unreviewed live results. API embeddability does not prove playback works; a browser player check is still required.",
      },
      null,
      2,
    ),
  );
}

async function runChat(question) {
  const gemini = createGeminiClient({
    apiKey: environment.GEMINI_API_KEY,
    model: environment.GEMINI_MODEL,
    allowFreeTest: environment.ALLOW_GEMINI_FREE_TEST === "true",
  });
  const started = performance.now();
  const answer = await gemini.answerFromNotes(question, gpuNotes);
  console.log(
    JSON.stringify(
      {
        mode: "live Gemini API",
        model: environment.GEMINI_MODEL,
        totalMilliseconds: Math.round(performance.now() - started),
        chatCalls: 1,
        ...answer,
        note: "Reference validation does not establish factual accuracy. Manually compare every claim with the supplied notes.",
      },
      null,
      2,
    ),
  );
}

try {
  const [command = "check", ...words] = process.argv.slice(2);
  if (command === "check") {
    console.log(
      JSON.stringify(
        {
          node: process.versions.node,
          youtubeKeyConfigured: Boolean(environment.YOUTUBE_API_KEY?.trim()),
          geminiKeyConfigured: Boolean(environment.GEMINI_API_KEY?.trim()),
          geminiModelConfigured: Boolean(environment.GEMINI_MODEL?.trim()),
          freeTestDataUseConfirmed:
            environment.ALLOW_GEMINI_FREE_TEST === "true",
          note: "Configuration presence only. This does not call providers or verify credentials.",
        },
        null,
        2,
      ),
    );
  } else if (command === "search") {
    await runSearch(words.join(" ") || "I want to know about GPUs");
  } else if (command === "chat") {
    await runChat(
      words.join(" ") || "How do the CPU and GPU work together in CUDA?",
    );
  } else {
    throw new ServiceError(
      "INVALID_INPUT",
      "Use check, search, or chat. See PHASE_2_SETUP.md.",
    );
  }
} catch (error) {
  console.error(
    error instanceof ServiceError
      ? `${error.code}: ${error.message}`
      : "UNEXPECTED_ERROR: The local test failed. No raw request data was printed.",
  );
  process.exitCode = 1;
}
