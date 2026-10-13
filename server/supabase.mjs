import {
  requestJson,
  ServiceError,
} from "../experiments/phase-2/services/request-json.mjs";

export function createSupabaseClient(environment) {
  const root = environment.SUPABASE_URL;
  const key = environment.SUPABASE_PUBLISHABLE_KEY;
  if (!root || !key) return null;
  let isPublicKey = key.startsWith("sb_publishable_");
  if (!isPublicKey) {
    try {
      const claims = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      isPublicKey = claims.role === "anon";
    } catch {
      /* Unknown or privileged keys are rejected below. */
    }
  }
  if (!isPublicKey)
    throw new ServiceError(
      "INVALID_CONFIG",
      "Use a Supabase publishable or legacy anon key, never a secret or service-role key.",
    );
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(root)) {
    throw new ServiceError(
      "INVALID_CONFIG",
      "Use the development project HTTPS Supabase URL.",
    );
  }
  const base = root.replace(/\/$/, "");
  const call = (path, options = {}, token) =>
    requestJson(`${base}${path}`, {
      ...options,
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  return {
    async signIn(email, password) {
      return call("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    async signUp(email, password) {
      return call("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    async videoProgress(token) {
      if (!token)
        throw new ServiceError(
          "AUTH_REQUIRED",
          "Sign in to open your video progress.",
        );
      await call("/auth/v1/user", {}, token);
      return call(
        "/rest/v1/video_progress?select=video_id,topic_key,position_seconds,duration_seconds,completed&order=updated_at.desc&limit=200",
        {},
        token,
      );
    },
    async saveVideoProgress(token, progress) {
      if (!token)
        throw new ServiceError(
          "AUTH_REQUIRED",
          "Sign in to save video progress.",
        );
      const user = await call("/auth/v1/user", {}, token);
      await call(
        "/rest/v1/video_progress?on_conflict=user_id,video_id",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            ...progress,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          }),
        },
        token,
      );
      return { saved: true };
    },
    async savedTopics(token) {
      if (!token)
        throw new ServiceError(
          "AUTH_REQUIRED",
          "Sign in to open your saved topics.",
        );
      await call("/auth/v1/user", {}, token);
      return call(
        "/rest/v1/saved_topics?select=topic_key,query,category,related_categories,updated_at&order=updated_at.desc",
        {},
        token,
      );
    },
    async saveTopic(token, topic) {
      if (!token)
        throw new ServiceError(
          "AUTH_REQUIRED",
          "Sign in to save across devices.",
        );
      const user = await call("/auth/v1/user", {}, token);
      return call(
        "/rest/v1/saved_topics?on_conflict=user_id,topic_key",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            user_id: user.id,
            topic_key: topic.key,
            query: topic.query,
            category: topic.category,
            related_categories: topic.relatedCategories,
            updated_at: new Date().toISOString(),
          }),
        },
        token,
      );
    },
  };
}
