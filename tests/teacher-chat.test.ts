import test from "node:test";
import assert from "node:assert/strict";
import { validateChatInput } from "../backend/chat/input.mjs";
import {
  validateTeacherAnswer,
  createGeminiTeacher,
} from "../backend/chat/gemini-teacher.mjs";
import { createTeacher } from "../backend/chat/teacher.mjs";
import { ServiceError } from "../backend/providers/request-json.mjs";

const currentVideo = {
  id: "abcdefghijk",
  title: "GPUs",
  durationSeconds: 234,
  positionSeconds: 30,
};
const output = {
  answer: "GPUs can process many tasks in parallel.",
  relation: "related",
  relationReason: "The video covers GPUs.",
  sourceIds: [],
  searchQuery: "GPU parallel processing explained",
  timestamp: {
    startSeconds: 45,
    endSeconds: 75,
    explanation: "Parallel work",
    evidence: "The presenter compares many workers performing similar tasks.",
  },
};
const videos = ["abcdefghijk", "Kgcfj_KV-mo", "other000000"].map((id) => ({
  id,
  title: "Example",
  details: { duration: "PT3M54S", privacyStatus: "public", embeddable: true },
}));

test("Chat boundaries reject arbitrary video URLs, oversized history, and invalid positions", () => {
  const input = {
    question: "How do GPUs work?",
    topic: "GPUs",
    history: [],
    currentVideo,
  };
  assert.equal(validateChatInput(input).currentVideo!.id, "abcdefghijk");
  assert.throws(() =>
    validateChatInput({
      ...input,
      currentVideo: { ...currentVideo, id: "https://private.example" },
    }),
  );
  assert.throws(() =>
    validateChatInput({
      ...input,
      history: Array(7).fill({ role: "user", content: "hi" }),
    }),
  );
  assert.throws(() =>
    validateChatInput({
      ...input,
      currentVideo: { ...currentVideo, positionSeconds: NaN },
    }),
  );
});

test("Timestamps require related video analysis, valid ranges, and evidence; server supplies the ID", () => {
  const options = { currentVideo, analysisUsed: true, sources: [] };
  const good = validateTeacherAnswer(
    { ...output, timestamp: { ...output.timestamp, videoId: "fake-id" } },
    options,
  );
  assert.equal(good.timestamp!.videoId, currentVideo.id);
  assert.equal(
    validateTeacherAnswer(output, { ...options, analysisUsed: false })
      .timestamp,
    null,
  );
  assert.equal(
    validateTeacherAnswer({ ...output, relation: "unrelated" }, options)
      .timestamp,
    null,
  );
  assert.equal(
    validateTeacherAnswer(
      { ...output, timestamp: { ...output.timestamp, endSeconds: 999 } },
      options,
    ).timestamp,
    null,
  );
  assert.equal(
    validateTeacherAnswer(
      { ...output, timestamp: { ...output.timestamp, evidence: "" } },
      options,
    ).timestamp,
    null,
  );
  assert.throws(() =>
    validateTeacherAnswer(
      { ...output, sourceIds: ["invented-source"] },
      options,
    ),
  );
});

test("Unrelated questions receive an answer and at most two provider videos, without replacing the current video", async () => {
  const queries: string[] = [];
  const teacher = createTeacher({
    gemini: {
      async answer(input: any) {
        assert.equal(input.currentVideo.id, currentVideo.id);
        return {
          ...validateTeacherAnswer(
            {
              ...output,
              relation: "unrelated",
              searchQuery: "compound interest explained",
            },
            { currentVideo, analysisUsed: true, sources: [] },
          ),
        };
      },
    },
    youtube: {
      async getPlayableVideos(ids: string[]) {
        return videos.filter((video) => ids.includes(video.id));
      },
      async searchPage(query: string) {
        queries.push(query);
        return { videos };
      },
    },
    reserveChat() {},
    reserveVideo() {},
    sources: [],
  });
  const result = await teacher({
    question: "What is compound interest?",
    topic: "GPUs",
    history: [],
    currentVideo,
  });
  assert.equal(result.relation, "unrelated");
  assert.equal(result.timestamp, null);
  assert.equal(result.recommendations.length, 2);
  assert.ok(
    result.recommendations.every((video: any) => video.id !== currentVideo.id),
  );
  assert.deepEqual(queries, ["compound interest explained"]);
});

test("Related timestamp answers avoid search; exhausted recommendations do not discard explanations", async () => {
  let calls = 0;
  const make = (timestamp: boolean) =>
    createTeacher({
      gemini: {
        async answer() {
          return validateTeacherAnswer(
            { ...output, timestamp: timestamp ? output.timestamp : null },
            { currentVideo, analysisUsed: true, sources: [] },
          );
        },
      },
      youtube: {
        async getPlayableVideos() {
          return [videos[0]];
        },
        async searchPage() {
          calls++;
          throw Error("allowance");
        },
      },
      reserveChat() {},
      reserveVideo() {},
      sources: [],
    });
  const input = {
    question: "Why parallel?",
    topic: "GPUs",
    history: [],
    currentVideo,
  };
  assert.equal((await make(true)(input)).timestamp.startSeconds, 45);
  assert.equal(calls, 0);
  const fallback = await make(false)(input);
  assert.ok(fallback.answer);
  assert.equal(fallback.recommendations.length, 0);
  assert.equal(fallback.notices.length, 1);
});

test("Unsupported video input falls back once to text, consumes both attempts, and cannot supply a timestamp", async () => {
  let attempts = 0,
    reserved = 0;
  const teacher = createTeacher({
    gemini: {
      async answer(input: any, sources: any, analyzed: boolean) {
        attempts++;
        if (analyzed) throw new ServiceError("SERVICE_ERROR", "HTTP 400");
        return validateTeacherAnswer(output, {
          currentVideo,
          analysisUsed: false,
          sources: [],
        });
      },
    },
    youtube: {
      async getPlayableVideos() {
        return [videos[0]];
      },
      async searchPage() {
        return { videos: [] };
      },
    },
    reserveChat() {
      reserved++;
    },
    reserveVideo() {},
    sources: [],
  });
  const result = await teacher({
    question: "Explain",
    topic: "GPU",
    history: [],
    currentVideo,
  });
  assert.equal(attempts, 2);
  assert.equal(reserved, 2);
  assert.equal(result.timestamp, null);
  assert.equal(result.videoContext, "title-only");
});

test("Gemini video requests use only the selected public URL and pass follow-up history", async () => {
  let request: any;
  const gemini = createGeminiTeacher({
    apiKey: "fake-test-key",
    model: "test-model",
    allowFreeTest: true,
    fetchRequest: async (_url: any, options: any) => {
      request = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(output) }] },
            },
          ],
        }),
      );
    },
  });
  await gemini.answer(
    {
      question: "Explain that more simply",
      topic: "GPU",
      currentVideo,
      history: [{ role: "user", content: "What is parallelism?" }],
    },
    [],
    true,
  );
  assert.equal(
    request.contents[0].parts[0].fileData.fileUri,
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
  assert.equal(
    JSON.parse(request.contents[0].parts[1].text).history[0].content,
    "What is parallelism?",
  );
});
