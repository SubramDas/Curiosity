import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyTopic,
  saveUniqueTopic,
} from "../shared/features/topics/topic-rules";
import {
  advanceBreakClock,
  resetBreakClock,
} from "../shared/features/learning/break-clock";
import { createUsageLimiter } from "../backend/usage.mjs";
import { createSupabaseClient } from "../backend/supabase.mjs";
import { loadLocalEnvironment } from "../config/local-environment.mjs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Project API settings override inherited keys without changing unrelated environment settings", () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-config-"));
  try {
    const path = join(directory, ".env");
    writeFileSync(
      path,
      'GEMINI_API_KEY="local-example"\nYOUTUBE_API_KEY=\nHOME=ignored\n',
    );
    const environment = loadLocalEnvironment(
      {
        GEMINI_API_KEY: "inherited-example",
        YOUTUBE_API_KEY: "inherited-youtube",
        HOME: "/original",
      },
      path,
    );
    assert.equal(environment.GEMINI_API_KEY, "local-example");
    assert.equal(environment.YOUTUBE_API_KEY, "");
    assert.equal(environment.HOME, "/original");
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("Saved topics keep their main tile when a later rule suggests another category", () => {
  const saved = classifyTopic("Income tax on GPU imports")!;
  assert.deepEqual(
    saveUniqueTopic([saved], {
      ...saved,
      key: "general:tax",
      category: "general",
    }),
    [saved],
  );
});

test("Supabase rejects privileged keys that could bypass owner access rules", () => {
  assert.throws(
    () =>
      createSupabaseClient({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
      }),
    { code: "INVALID_CONFIG" },
  );
});

test("GPU aliases reuse one saved topic; AMD reuses the broad tile as a distinct topic", () => {
  const gpu = classifyTopic("I want to know about GPUs")!;
  const alias = classifyTopic("GPU")!;
  const amd = classifyTopic("AMD")!;
  const topics = saveUniqueTopic(saveUniqueTopic([gpu], alias), amd);
  assert.equal(topics.length, 2);
  assert.equal(topics[0].category, "computing");
  assert.equal(topics[1].category, "computing");
});
test("Full query intent controls Nvidia finance and GPU tax placement with related tags", () => {
  assert.equal(classifyTopic("Nvidia GPU architecture")!.category, "computing");
  assert.equal(classifyTopic("Nvidia stock valuation")!.category, "money");
  const tax = classifyTopic("Income tax on GPU imports")!;
  assert.equal(tax.category, "money");
  assert.deepEqual(tax.relatedCategories, ["computing", "society"]);
});
test("Ambiguous CA needs clarification; unknown subjects can still be searched", () => {
  assert.equal(classifyTopic("CA"), null);
  assert.equal(classifyTopic("a new unknown topic")!.category, "general");
});
test("Idle time, suspended tabs, and already-offered breaks add no learning time", () => {
  const state = { seconds: 10, offered: false };
  assert.deepEqual(advanceBreakClock(state, 1, false), state);
  assert.deepEqual(advanceBreakClock(state, 90, true), state);
  assert.deepEqual(
    advanceBreakClock({ seconds: 720, offered: true }, 1, true),
    { seconds: 720, offered: true },
  );
});
test("Real and demo thresholds trigger once; returning to learning resets time", () => {
  assert.equal(
    advanceBreakClock({ seconds: 719, offered: false }, 1, true).offered,
    true,
  );
  assert.equal(
    advanceBreakClock({ seconds: 29, offered: false }, 1, true, 30).offered,
    true,
  );
  assert.deepEqual(resetBreakClock(), { seconds: 0, offered: false });
});
test("Local allowance persists across restart and cannot be spent twice near its limit", () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-limits-"));
  try {
    const first = createUsageLimiter(directory);
    first.reserve("search", 1);
    const restarted = createUsageLimiter(directory);
    assert.throws(() => restarted.reserve("search", 1), {
      code: "LOCAL_LIMIT",
    });
    writeFileSync(join(directory, "usage.json"), "invalid JSON");
    assert.throws(() => createUsageLimiter(directory), {
      code: "INVALID_CONFIG",
    });
  } finally {
    rmSync(directory, { recursive: true });
  }
});
