import { ServiceError } from "../providers/request-json.mjs";
import { createGraphCatalog, topicRecord } from "./catalog.mjs";
import * as input from "./input.mjs";
export function createGraphRoutes({ enabled, store, youtube }) {
  const catalog = store ? createGraphCatalog({ store, youtube }) : null;
  return async (path, body, token) => {
    if (!enabled)
      throw new ServiceError(
        "GRAPH_DISABLED",
        "The learning map is not enabled yet.",
      );
    if (!store)
      throw new ServiceError(
        "NOT_CONFIGURED",
        "The learning map requires the Supabase graph setup.",
      );
    if (!body || typeof body !== "object" || Array.isArray(body))
      input.invalid();
    const action = path.replace("/api/graph/", "");
    if (action === "neighborhood" || action === "feed" || action === "events")
      return catalog.neighborhood(
        input.universe(body.universe),
        body.topicId ? input.uuid(body.topicId) : null,
      );
    if (action === "topic")
      return catalog.topic(
        input.universe(body.universe),
        input.uuid(body.topicId),
      );
    if (action === "video-match") {
      const topic = await store.videoMatch(input.videoId(body.videoId));
      return { topic: topic ? topicRecord(topic) : null };
    }
    if (
      ![
        "progress",
        "discover",
        "activity/start",
        "activity/report",
        "activity/stop",
        "state/load",
        "state/save",
      ].includes(action)
    )
      throw new ServiceError("NOT_FOUND", "This graph action is unavailable.");
    if (!token)
      throw new ServiceError(
        "AUTH_REQUIRED",
        "Sign in to sync your learning map.",
      );
    if (action === "progress") return store.progress(token);
    if (action === "discover")
      return store.discover(input.uuid(body.topicId), token);
    if (action === "activity/start")
      return store.start(
        input.uuid(body.topicId),
        input.videoId(body.videoId),
        body.replace === true,
        input.uuid(body.requestId),
        token,
      );
    if (action === "activity/stop")
      return store.stop(input.uuid(body.sessionId), token);
    if (action === "activity/report")
      return store.report(
        input.uuid(body.sessionId),
        input.integer(body.sequence, 1, 1000000),
        input.integer(body.activeMs, 0, 3600000),
        token,
      );
    if (action === "state/load") return store.loadState(token);
    if (action === "state/save") {
      if (!["map", "feed"].includes(body.view)) input.invalid();
      const state = {
        universe: input.universe(body.universe),
        topicId: body.topicId ? input.uuid(body.topicId) : null,
        view: body.view === "feed" ? "feed" : "map",
        viewport: input.viewport(body.viewport),
      };
      return store.saveState(state, token);
    }
  };
}
