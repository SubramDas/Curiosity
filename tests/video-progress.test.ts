import test from "node:test";
import assert from "node:assert/strict";
import { validateVideoProgress } from "../server/video-progress.mjs";
import {
  durationSeconds,
  isShortVideo,
} from "../src/features/videos/video-format";
import { isValidProgress } from "../src/features/progress/useVideoProgress";
const valid = {
  video_id: "Kgcfj_KV-mo",
  topic_key: "computing:gpu",
  position_seconds: 72,
  duration_seconds: 234,
  completed: false,
};
test("Playback positions reject invalid numbers and identifiers and ignore supplied ownership", () => {
  assert.deepEqual(
    validateVideoProgress({ ...valid, user_id: "someone-else" }),
    valid,
  );
  for (const values of [
    { position_seconds: -1 },
    { position_seconds: Infinity },
    { position_seconds: 300 },
    { duration_seconds: 0 },
    { duration_seconds: NaN },
    { video_id: "bad" },
    { completed: "yes" },
  ]) {
    assert.throws(() => validateVideoProgress({ ...valid, ...values }));
    assert.equal(isValidProgress({ ...valid, ...values }), false);
  }
});
test("Short video grouping uses duration and leaves unknown and longer videos in the regular feed", () => {
  assert.equal(durationSeconds("PT1H2M3S"), 3723);
  assert.equal(durationSeconds("P1DT1S"), 86401);
  assert.equal(durationSeconds("invalid"), null);
  const video = (duration: string | null) =>
    ({ details: { duration } }) as Parameters<typeof isShortVideo>[0];
  assert.equal(isShortVideo(video("PT3M")), true);
  assert.equal(isShortVideo(video("PT3M1S")), false);
  assert.equal(isShortVideo(video(null)), false);
});

test("Account writes use the verified user identity and require a token", async () => {
  const { createSupabaseClient } = await import("../server/supabase.mjs");
  const original = globalThis.fetch;
  const requests: { url: string; options: RequestInit }[] = [];
  globalThis.fetch = (async (
    url: string | URL | Request,
    options: RequestInit = {},
  ) => {
    requests.push({ url: String(url), options });
    return new Response(
      JSON.stringify(
        String(url).endsWith("/auth/v1/user") ? { id: "verified-owner" } : [],
      ),
      { status: 200 },
    );
  }) as typeof fetch;
  try {
    const client = createSupabaseClient({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    })!;
    await assert.rejects(client.saveVideoProgress(undefined, valid));
    assert.equal(requests.length, 0);
    await client.saveVideoProgress("user-token", valid);
    assert.equal(requests[0].url.endsWith("/auth/v1/user"), true);
    const written = JSON.parse(requests[1].options.body as string);
    assert.equal(written.user_id, "verified-owner");
    assert.equal(written.position_seconds, 72);
    assert.equal(
      (requests[1].options.headers as Record<string, string>).Authorization,
      "Bearer user-token",
    );
  } finally {
    globalThis.fetch = original;
  }
});
