import { createHomeFeed } from "./home-feed.mjs";
import { createServer } from "node:http";
import { createYouTubeClient } from "../experiments/phase-2/services/youtube.mjs";
import { createGeminiClient } from "../experiments/phase-2/services/gemini.mjs";
import { ServiceError } from "../experiments/phase-2/services/request-json.mjs";
import { gpuNotes } from "../experiments/phase-2/content/gpu-notes.mjs";
import { createUsageLimiter } from "./usage.mjs";
import { validateVideoProgress } from "./video-progress.mjs";
import { createSupabaseClient } from "./supabase.mjs";

const origins = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);
const categories = new Set([
  "computing",
  "money",
  "science",
  "health",
  "society",
  "language",
  "arts",
  "life",
  "general",
]);

async function readBody(request) {
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (Buffer.byteLength(text) > 12_000)
      throw new ServiceError("INVALID_INPUT", "The request is too large.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ServiceError("INVALID_INPUT", "Send a valid JSON request.");
  }
}

function validateText(text, max = 480) {
  if (typeof text !== "string" || !text.trim() || text.length > max) {
    throw new ServiceError(
      "INVALID_INPUT",
      `Enter text between 1 and ${max} characters.`,
    );
  }
  return text.trim();
}

export function startServer(environment = process.env, { port = 8787 } = {}) {
  const limits = createUsageLimiter();
  const supabase = createSupabaseClient(environment);
  let homeFeed;
  function loadHomeFeed(queries) {
    if (!homeFeed)
      homeFeed = createHomeFeed({
        youtube: createYouTubeClient({ apiKey: environment.YOUTUBE_API_KEY }),
        reserve: () =>
          limits.reserve(
            "search",
            Number(environment.SEARCH_DAILY_LIMIT ?? 40),
          ),
      });
    return homeFeed(queries);
  }
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const path = new URL(request.url, "http://127.0.0.1").pathname;
      if (request.method === "GET" && path === "/api/config") {
        response.end(JSON.stringify({ supabaseConfigured: Boolean(supabase) }));
        return;
      }
      if (
        request.method !== "POST" ||
        !origins.has(request.headers.origin) ||
        !request.headers["content-type"]?.startsWith("application/json")
      ) {
        throw new ServiceError(
          "ACCESS_DENIED",
          "Open the prototype locally and send requests from its page.",
        );
      }
      const body = await readBody(request);
      const token = request.headers.authorization?.replace(/^Bearer /, "");
      let result;
      if (path === "/api/feed/home") {
        result = await loadHomeFeed(body.queries ?? []);
      } else if (path === "/api/search") {
        const query = validateText(body.query);
        if (
          body.pageToken !== undefined &&
          (typeof body.pageToken !== "string" || body.pageToken.length > 500)
        ) {
          throw new ServiceError("INVALID_INPUT", "The page token is invalid.");
        }
        const youtube = createYouTubeClient({
          apiKey: environment.YOUTUBE_API_KEY,
        });
        limits.reserve("search", Number(environment.SEARCH_DAILY_LIMIT ?? 40));
        const page = await youtube.searchPage(query, body.pageToken);
        const details = await youtube.getVideoDetails(
          page.videos.map((video) => video.id),
        );
        result = {
          ...page,
          videos: page.videos.map((video) => ({
            ...video,
            details: details.find((detail) => detail.id === video.id) ?? null,
          })),
        };
      } else if (path === "/api/videos/details") {
        if (
          !Array.isArray(body.ids) ||
          body.ids.length > 20 ||
          body.ids.some(
            (id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(id),
          )
        )
          throw new ServiceError(
            "INVALID_INPUT",
            "Use up to 20 valid video identifiers.",
          );
        limits.reserve("search", Number(environment.SEARCH_DAILY_LIMIT ?? 40));
        result = await createYouTubeClient({
          apiKey: environment.YOUTUBE_API_KEY,
        }).getPlayableVideos(body.ids);
      } else if (path === "/api/chat") {
        const question = validateText(body.question, 2_000);
        const topic = validateText(body.topic);
        if (!/\b(gpus?|cpus?|cuda|graphics|nvidia|amd)\b/i.test(topic)) {
          result = {
            answer:
              "I do not have checked notes for this topic yet. You can keep exploring its YouTube results.",
            insufficientInformation: true,
            sources: [],
          };
        } else {
          const gemini = createGeminiClient({
            apiKey: environment.GEMINI_API_KEY,
            model: environment.GEMINI_MODEL,
            allowFreeTest: environment.ALLOW_GEMINI_FREE_TEST === "true",
          });
          limits.reserve("chat", Number(environment.CHAT_DAILY_LIMIT ?? 25));
          result = await gemini.answerFromNotes(question, gpuNotes);
        }
      } else if (path === "/api/auth/sign-in" || path === "/api/auth/sign-up") {
        if (!supabase)
          throw new ServiceError(
            "NOT_CONFIGURED",
            "Supabase is not configured yet. Guest exploration still works.",
          );
        const email = validateText(body.email, 254);
        validateText(body.password, 256);
        const password = body.password;
        if (!email.includes("@") || password.length < 8)
          throw new ServiceError(
            "INVALID_INPUT",
            "Use an email and a password of at least 8 characters.",
          );
        const auth = await (path.endsWith("sign-in")
          ? supabase.signIn(email, password)
          : supabase.signUp(email, password));
        result = {
          accessToken: auth.access_token ?? null,
          emailConfirmationRequired: !auth.access_token,
        };
      } else if (
        path === "/api/progress/list" ||
        path === "/api/progress/save"
      ) {
        if (!supabase)
          throw new ServiceError(
            "NOT_CONFIGURED",
            "Supabase is not configured yet.",
          );
        result = path.endsWith("list")
          ? await supabase.videoProgress(token)
          : await supabase.saveVideoProgress(
              token,
              validateVideoProgress(body),
            );
      } else if (path === "/api/topics/list") {
        if (!supabase)
          throw new ServiceError(
            "NOT_CONFIGURED",
            "Supabase is not configured yet.",
          );
        result = await supabase.savedTopics(token);
      } else if (path === "/api/topics/save") {
        if (!supabase)
          throw new ServiceError(
            "NOT_CONFIGURED",
            "Supabase is not configured yet.",
          );
        const topic = {
          key: validateText(body.key, 500),
          query: validateText(body.query),
          category: body.category,
          relatedCategories: body.relatedCategories ?? [],
        };
        if (
          !categories.has(topic.category) ||
          !Array.isArray(topic.relatedCategories) ||
          topic.relatedCategories.length > 3 ||
          topic.relatedCategories.some(
            (category) =>
              !categories.has(category) || category === topic.category,
          )
        ) {
          throw new ServiceError(
            "INVALID_INPUT",
            "Use allowed topic categories.",
          );
        }
        result = await supabase.saveTopic(token, topic);
      } else {
        throw new ServiceError("NOT_FOUND", "This action is unavailable.");
      }
      response.end(JSON.stringify(result));
    } catch (error) {
      const known = error instanceof ServiceError;
      response.statusCode =
        known && ["AUTH_REQUIRED", "ACCESS_DENIED"].includes(error.code)
          ? 403
          : 400;
      response.end(
        JSON.stringify({
          code: known ? error.code : "LOCAL_ERROR",
          message: known
            ? error.message
            : "The local server could not complete the request.",
        }),
      );
    }
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Local API listening at http://127.0.0.1:${port}`),
  );
  return server;
}
