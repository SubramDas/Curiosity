import { createProviderCache } from "./provider-cache.mjs";
import { createCachedYouTubeClient } from "./cached-youtube.mjs";
import { createHomeFeed } from "./home-feed.mjs";
import { createServer } from "node:http";
import { createYouTubeClient } from "./providers/youtube.mjs";
import { createGeminiTeacher } from "./chat/gemini-teacher.mjs";
import { createTeacher } from "./chat/teacher.mjs";
import { validateChatInput } from "./chat/input.mjs";
import { ServiceError } from "./providers/request-json.mjs";
import { gpuNotes } from "./content/gpu-notes.mjs";
import { createUsageLimiter } from "./usage.mjs";
import { validateVideoProgress } from "./video-progress.mjs";
import { createSupabaseClient } from "./supabase.mjs";
import { createStaticHandler } from "./http/static-files.mjs";

const localOrigins = ["http://127.0.0.1:5173", "http://localhost:5173"];
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

async function readBody(request, maxBytes = 12_000) {
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (Buffer.byteLength(text) > maxBytes)
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

/**
 * @param {NodeJS.ProcessEnv} environment
 * @param {{port?: number, host?: string, usageDirectory?: string, youtube?: ReturnType<typeof createYouTubeClient>, allowedOrigins?: string[], limits?: import('./storage/contracts').UsageStore, cache?: import('./storage/contracts').VideoCache, staticDirectory?: string, allowCloudRunOrigin?: boolean, beforeRequest?: Function}} options
 */
export function startServer(
  environment = process.env,
  {
    port = 8787,
    usageDirectory = ".local-data",
    youtube: providedYouTube,
    allowedOrigins = [],
    host = "127.0.0.1",
    limits: providedLimits,
    cache: providedCache,
    staticDirectory,
    allowCloudRunOrigin = false,
    beforeRequest,
  } = {},
) {
  const origins = new Set([...localOrigins, ...allowedOrigins]);
  const limits = providedLimits ?? createUsageLimiter(usageDirectory);
  const supabase = createSupabaseClient(environment);
  const videoCache =
    providedCache ?? createProviderCache({ directory: usageDirectory });
  const serveStatic = staticDirectory
    ? createStaticHandler(staticDirectory)
    : null;
  let cachedYouTube;
  function youtubeClient() {
    cachedYouTube ??= createCachedYouTubeClient({
      youtube:
        providedYouTube ??
        createYouTubeClient({ apiKey: environment.YOUTUBE_API_KEY }),
      cache: videoCache,
      reserve: async (count) => {
        for (let index = 0; index < count; index++)
          await limits.reserve(
            "search",
            Number(environment.SEARCH_DAILY_LIMIT ?? 40),
          );
      },
    });
    return cachedYouTube;
  }
  let homeFeed;
  function loadHomeFeed(queries) {
    if (!homeFeed)
      homeFeed = createHomeFeed({
        youtube: youtubeClient(),
        // The provider wrapper reserves allowance only on cache misses.
        reserve: () => {},
      });
    return homeFeed(queries);
  }
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const path = new URL(request.url, "http://127.0.0.1").pathname;
      if (request.method === "GET" && path === "/api/health") {
        response.end(JSON.stringify({ status: "ok" }));
        return;
      }
      if (serveStatic && (await serveStatic(request, response))) return;
      beforeRequest?.(request);
      if (request.method === "GET" && path === "/api/config") {
        response.end(
          JSON.stringify({
            supabaseConfigured: Boolean(supabase),
            ...(supabase
              ? {
                  supabaseUrl: environment.SUPABASE_URL,
                  // The validated publishable key is intended for browser use.
                  supabasePublishableKey: environment.SUPABASE_PUBLISHABLE_KEY,
                }
              : {}),
          }),
        );
        return;
      }
      const sameCloudRunOrigin =
        allowCloudRunOrigin &&
        typeof request.headers.host === "string" &&
        /^[a-z0-9.-]+\.run\.app$/.test(request.headers.host) &&
        request.headers.origin === `https://${request.headers.host}`;
      if (
        request.method !== "POST" ||
        (!origins.has(request.headers.origin) && !sameCloudRunOrigin) ||
        !request.headers["content-type"]?.startsWith("application/json")
      ) {
        throw new ServiceError(
          "ACCESS_DENIED",
          "Send requests from the app's website.",
        );
      }
      const body = await readBody(
        request,
        path === "/api/chat" ? 64_000 : 12_000,
      );
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
        const youtube = youtubeClient();
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
        result = await youtubeClient().getPlayableVideos(body.ids);
      } else if (path === "/api/chat") {
        const input = validateChatInput(body);
        const teacher = createTeacher({
          gemini: createGeminiTeacher({
            apiKey: environment.GEMINI_API_KEY,
            model: environment.GEMINI_MODEL,
            allowFreeTest: environment.ALLOW_GEMINI_FREE_TEST === "true",
          }),
          youtube: {
            getPlayableVideos: (ids) => youtubeClient().getPlayableVideos(ids),
            searchPage: (query) => youtubeClient().searchPage(query),
          },
          reserveChat: () =>
            limits.reserve("chat", Number(environment.CHAT_DAILY_LIMIT ?? 25)),
          reserveVideo: () =>
            limits.reserve(
              "videoChat",
              Number(environment.VIDEO_CHAT_DAILY_LIMIT ?? 8),
            ),
          videoEnabled: environment.CHAT_VIDEO_CONTEXT !== "false",
          sources: gpuNotes,
        });
        result = await teacher(input);
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
        known && error.code === "TOO_MANY_REQUESTS"
          ? 429
          : known && ["AUTH_REQUIRED", "ACCESS_DENIED"].includes(error.code)
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
  const cacheCleanup = setInterval(() => {
    try {
      Promise.resolve(videoCache.sweep()).catch(() =>
        console.error("Video cache cleanup failed."),
      );
    } catch {
      console.error(
        "Expired YouTube cache data could not be removed. Check local storage permissions.",
      );
    }
  }, 15 * 60_000);
  cacheCleanup.unref();
  server.once("close", () => clearInterval(cacheCleanup));
  server.listen(port, host, () =>
    console.log(`API listening at http://${host}:${port}`),
  );
  return server;
}
