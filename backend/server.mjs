import { createGraphRoutes } from "./graph/routes.mjs";
import { createSupabaseGraphStore } from "./storage/supabase-graph.mjs";
import { createGeminiRequestQueue } from "./gemini/request-queue.mjs";
import { createGeminiRequester } from "./gemini/request.mjs";
import { createClassificationJobs } from "./classification/classification-jobs.mjs";
import { createGeminiClassifier } from "./classification/gemini-classifier.mjs";
import { createVideoClassifier } from "./classification/classify-video.mjs";
import { createClassificationStore } from "./classification/classification-store.mjs";
import { createWikidataClient } from "./providers/wikidata.mjs";
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
 * @param {{port?: number, host?: string, usageDirectory?: string, youtube?: ReturnType<typeof createYouTubeClient>, allowedOrigins?: string[], limits?: import('./storage/contracts').UsageStore, cache?: import('./storage/contracts').VideoCache, staticDirectory?: string, allowCloudRunOrigin?: boolean, classificationCache?: import('./storage/contracts').VideoCache, classifier?: {classify(video: any): Promise<any>}, beforeRequest?: Function}} options
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
    classificationCache: providedClassificationCache,
    classifier: providedClassifier,
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
  const geminiQueue = createGeminiRequestQueue({
    intervalMs: Number(environment.GEMINI_REQUEST_INTERVAL_MS ?? 15_000),
  });
  const geminiRequest = createGeminiRequester({ queue: geminiQueue });
  let classifier = providedClassifier;
  const classificationEnabled =
    environment.VIDEO_CLASSIFICATION !== "false" &&
    (Boolean(providedClassifier) ||
      Boolean(
        environment.GEMINI_API_KEY &&
        environment.GEMINI_MODEL &&
        environment.ALLOW_GEMINI_FREE_TEST === "true",
      ));
  let classificationCache;
  function videoClassifier() {
    if (!classificationEnabled)
      throw new ServiceError(
        "NOT_CONFIGURED",
        "Video classification is unavailable. Videos are still watchable.",
      );
    if (!classifier) {
      classificationCache =
        providedClassificationCache ??
        createProviderCache({
          directory: usageDirectory,
          filename: "classification-cache.json",
        });
      classifier = createVideoClassifier({
        gemini: createGeminiClassifier({
          request: geminiRequest,
          apiKey: environment.GEMINI_API_KEY,
          model: environment.GEMINI_MODEL,
          allowFreeTest: environment.ALLOW_GEMINI_FREE_TEST === "true",
          reserve: () =>
            limits.reserve(
              "classification",
              Number(environment.CLASSIFICATION_DAILY_LIMIT ?? 40),
            ),
        }),
        wikidata: createWikidataClient({ cache: classificationCache }),
        store: createClassificationStore({
          cache: classificationCache,
          model: environment.GEMINI_MODEL,
        }),
      });
    }
    return classifier;
  }
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
  async function classifyPublicVideo(id, onStatus) {
    const classifier = videoClassifier();
    const [video] = await youtubeClient().getPlayableVideos([id]);
    if (
      !video ||
      video.id !== id ||
      video.details?.privacyStatus !== "public" ||
      !video.details?.embeddable
    )
      throw new ServiceError(
        "NOT_FOUND",
        "This video is unavailable for classification.",
      );
    return classifier.classify(video, { onStatus });
  }
  const graphEnabled = environment.LEARNING_GRAPH_ENABLED === "true";
  const graphRoutes = createGraphRoutes({
    enabled: graphEnabled,
    store: supabase ? createSupabaseGraphStore(supabase.graphRpc) : null,
    youtube: youtubeClient,
  });
  const classificationJobs = createClassificationJobs({
    classify: classifyPublicVideo,
  });
  let homeFeed;
  function loadHomeFeed(queries, includeTrending = true) {
    if (!homeFeed)
      homeFeed = createHomeFeed({
        youtube: youtubeClient(),
        // The provider wrapper reserves allowance only on cache misses.
        reserve: () => {},
      });
    return homeFeed(queries, { includeTrending });
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
            videoClassificationEnabled: classificationEnabled,
            learningGraphEnabled: graphEnabled,
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
      if (path.startsWith("/api/graph/")) {
        result = await graphRoutes(path, body, token);
      } else if (path === "/api/videos/classify") {
        if (typeof body.id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(body.id))
          throw new ServiceError(
            "INVALID_INPUT",
            "Use one valid video identifier.",
          );
        videoClassifier(); // Check configuration before accepting background work.
        if (body.background === true) {
          result = classificationJobs.getOrStart(body.id, {
            retry: body.retry === true,
          });
          if (["waiting", "finding"].includes(result.status))
            response.statusCode = 202;
        } else {
          result = {
            videoId: body.id,
            classification: await classifyPublicVideo(body.id),
          };
        }
      } else if (path === "/api/feed/home") {
        result = await loadHomeFeed(body.queries ?? []);
      } else if (path === "/api/feed/universe") {
        result = await loadHomeFeed(body.queries ?? [], false);
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
            request: geminiRequest,
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
        known &&
        [
          "TOO_MANY_REQUESTS",
          "GEMINI_BUSY",
          "GEMINI_RATE_LIMIT",
          "GEMINI_DAILY_LIMIT",
        ].includes(error.code)
          ? 429
          : known && ["AUTH_REQUIRED", "ACCESS_DENIED"].includes(error.code)
            ? 403
            : 400;
      response.end(
        JSON.stringify({
          code: known ? error.code : "LOCAL_ERROR",
          ...(known && error.provider
            ? { provider: error.provider, limitKind: error.limitKind }
            : {}),
          ...(known && Number.isFinite(error.retryAfterSeconds)
            ? { retryAfterSeconds: error.retryAfterSeconds }
            : {}),
          message: known
            ? error.message
            : "The local server could not complete the request.",
        }),
      );
    }
  });
  const cacheCleanup = setInterval(() => {
    try {
      Promise.resolve(classificationCache?.sweep()).catch(() =>
        console.error("Classification cache cleanup failed."),
      );
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
  server.once("close", () => {
    clearInterval(cacheCleanup);
    classificationJobs.close();
    geminiQueue.close();
  });
  server.listen(port, host, () =>
    console.log(`API listening at http://${host}:${port}`),
  );
  return server;
}
