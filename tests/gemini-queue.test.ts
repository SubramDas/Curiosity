import test from "node:test";
import assert from "node:assert/strict";
import { createGeminiRequestQueue } from "../backend/gemini/request-queue.mjs";
import { createGeminiRequester } from "../backend/gemini/request.mjs";
import { createClassificationJobs } from "../backend/classification/classification-jobs.mjs";
import { ServiceError } from "../backend/providers/request-json.mjs";
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("One queue serializes requests, spaces starts and gives teacher questions the next slot", async () => {
  const queue = createGeminiRequestQueue({ intervalMs: 25 });
  const order: string[] = [],
    starts: number[] = [];
  let finish!: () => void;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let active = 0,
    maximum = 0;
  const work =
    (name: string, hold = false) =>
    async () => {
      active++;
      maximum = Math.max(maximum, active);
      order.push(name);
      starts.push(Date.now());
      if (hold) await held;
      active--;
      return name;
    };
  try {
    const first = queue.run(work("first", true));
    const background = queue.run(work("classification"));
    const teacher = queue.run(work("teacher"), { priority: "teacher" });
    await tick();
    assert.deepEqual(order, ["first"]);
    finish();
    await Promise.all([first, background, teacher]);
    assert.deepEqual(order, ["first", "teacher", "classification"]);
    assert.equal(maximum, 1);
    assert.ok(starts[1] - starts[0] >= 24);
    assert.ok(starts[2] - starts[1] >= 24);
  } finally {
    finish?.();
    queue.close();
  }
});

test("Rate limits pause subsequent work without retrying the failed operation", async () => {
  const queue = createGeminiRequestQueue({ intervalMs: 0 });
  let attempts = 0;
  const start = Date.now();
  const limited = new ServiceError("GEMINI_RATE_LIMIT", "rate");
  (limited as any).retryAfterSeconds = 0.04;
  try {
    const first = queue.run(async () => {
      attempts++;
      throw limited;
    });
    const next = queue.run(async () => Date.now());
    await assert.rejects(first, /rate/);
    assert.ok((await next) - start >= 39);
    assert.equal(attempts, 1);
  } finally {
    queue.close();
  }
});

test("A provider daily limit blocks pending and new work until the Pacific calendar day changes", async () => {
  let time = Date.parse("2030-06-01T12:00:00Z"),
    calls = 0;
  const queue = createGeminiRequestQueue({ intervalMs: 0, now: () => time });
  try {
    const first = queue.run(async () => {
      calls++;
      throw new ServiceError("GEMINI_DAILY_LIMIT", "daily");
    });
    const pending = queue.run(async () => {
      calls++;
    });
    await Promise.all([
      assert.rejects(first, /daily/),
      assert.rejects(pending, /daily allowance/),
    ]);
    await assert.rejects(
      queue.run(async () => {
        calls++;
      }),
      /daily allowance/,
    );
    assert.equal(calls, 1);
    time += 86400_000;
    await queue.run(async () => {
      calls++;
    });
    assert.equal(calls, 2);
  } finally {
    queue.close();
  }
});

test("Expired or overflow work never reaches the provider; shutdown clears pending requests", async () => {
  const queue = createGeminiRequestQueue({ intervalMs: 0, maxPending: 1 });
  let finish!: () => void,
    calls = 0;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const first = queue.run(async () => {
    calls++;
    await held;
  });
  const expired = queue.run(
    async () => {
      calls++;
    },
    { maxWaitMs: 10 },
  );
  await assert.rejects(
    queue.run(async () => {
      calls++;
    }),
    /busy/,
  );
  await assert.rejects(expired, /busy or cooling/);
  const pending = queue.run(async () => {
    calls++;
  });
  queue.close();
  await assert.rejects(pending, /restarting/);
  finish();
  await first;
  assert.equal(calls, 1);
});

test("Gemini 429 errors expose safe provider, quota kind and retry delay without leaking the raw response", async () => {
  const request = createGeminiRequester({
    fetchRequest: async () =>
      Response.json(
        {
          error: {
            message: "secret raw text",
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.RetryInfo",
                retryDelay: "70.5s",
              },
            ],
          },
        },
        { status: 429, headers: { "retry-after": "65" } },
      ),
  });
  await assert.rejects(request("https://example.invalid", {}), (error: any) => {
    assert.equal(error.code, "GEMINI_RATE_LIMIT");
    assert.equal(error.provider, "gemini");
    assert.equal(error.retryAfterSeconds, 71);
    assert.doesNotMatch(error.message, /secret raw text/);
    return true;
  });
  const daily = createGeminiRequester({
    fetchRequest: async () =>
      Response.json(
        {
          error: {
            details: [
              {
                violations: [
                  {
                    quotaId:
                      "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
                  },
                ],
              },
            ],
          },
        },
        { status: 429 },
      ),
  });
  await assert.rejects(
    daily("https://example.invalid", {}),
    (error: any) =>
      error.code === "GEMINI_DAILY_LIMIT" && error.limitKind === "daily",
  );
});

test("Classification polling coalesces jobs, runs one pipeline at a time and retries only on explicit request", async () => {
  let calls = 0,
    finish!: () => void;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const jobs = createClassificationJobs({
    classify: async (_: string, status: any) => {
      calls++;
      status("running");
      if (calls === 1) await held;
      if (calls === 2) throw new ServiceError("GEMINI_RATE_LIMIT", "paused");
      return { topic: "classified" };
    },
  });
  try {
    assert.equal(jobs.getOrStart("first").status, "waiting");
    jobs.getOrStart("first");
    jobs.getOrStart("second");
    await tick();
    assert.equal(calls, 1);
    assert.equal(jobs.getOrStart("first").status, "finding");
    finish();
    await tick();
    await tick();
    assert.equal(jobs.getOrStart("first").status, "ready");
    assert.equal(jobs.getOrStart("second").status, "failed");
    assert.equal(calls, 2);
    jobs.getOrStart("second", { retry: true });
    await tick();
    assert.equal(jobs.getOrStart("second").status, "ready");
    assert.equal(calls, 3);
  } finally {
    finish?.();
    jobs.close();
  }
});

test("Real teacher and classifier adapters share the same scheduled requester", async () => {
  const { createGeminiClassifier } =
    await import("../backend/classification/gemini-classifier.mjs");
  const { createGeminiTeacher } =
    await import("../backend/chat/gemini-teacher.mjs");
  const queue = createGeminiRequestQueue({ intervalMs: 0 });
  let release!: () => void,
    active = 0,
    maximum = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const order: string[] = [];
  const extracted = {
    topic: "Food chemistry",
    focus: "Explains chemical reactions",
    aliases: [],
    sufficient: true,
  };
  const request = createGeminiRequester({
    queue,
    fetchRequest: async (_: any, options: any) => {
      const body = JSON.parse(options.body);
      const instruction = body.systemInstruction.parts[0].text;
      const kind = instruction.startsWith("You are a patient teacher")
        ? "teacher"
        : instruction.includes("Match the extracted topic")
          ? "resolve"
          : "extract";
      order.push(kind);
      active++;
      maximum = Math.max(maximum, active);
      if (order.length === 1) await held;
      const result =
        kind === "teacher"
          ? {
              answer: "A chemical reaction changes molecules.",
              relation: "no-video",
              relationReason: "No video selected",
              sourceIds: [],
              searchQuery: "",
              timestamp: null,
            }
          : kind === "extract"
            ? extracted
            : {
                topicLabel: "Food chemistry",
                wikidataId: null,
                primaryUniverse: "science",
                relatedUniverses: [],
                reason: "Chemical reactions",
              };
      active--;
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(result) }] },
          },
        ],
      });
    },
  });
  const classifier = createGeminiClassifier({
    apiKey: "test",
    model: "configured-model",
    allowFreeTest: true,
    reserve: async () => {},
    request,
  });
  const teacher = createGeminiTeacher({
    apiKey: "test",
    model: "configured-model",
    allowFreeTest: true,
    request,
  });
  try {
    const first = classifier.extract({ title: "Food chemistry" });
    const second = classifier.resolve(
      { title: "Food chemistry" },
      extracted,
      [],
    );
    const answer = teacher.answer(
      { question: "Explain a chemical reaction", currentVideo: null },
      [],
      false,
    );
    await tick();
    release();
    await Promise.all([first, second, answer]);
    assert.deepEqual(order, ["extract", "teacher", "resolve"]);
    assert.equal(maximum, 1);
  } finally {
    release?.();
    queue.close();
  }
});
