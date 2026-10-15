import test from "node:test";
import assert from "node:assert/strict";
import {
  createClassificationClient,
  isClassification,
} from "../shared/features/classification/classification-client";
import type { Video } from "../shared/types";
const classification = {
  topic: { label: "Food chemistry", status: "provisional", wikidataId: null },
  primaryUniverse: "science",
  relatedUniverses: ["arts"],
  reason: "Chemical reactions",
  policyVersion: "1",
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const videos = ["abcdefghijk", "lmnopqrstuv", "mnopqrstuvw"].map(
  (id) => ({ id }) as Video,
);

test("Browser classification deduplicates IDs, caps concurrency, stops after quota errors and ignores responses after disposal", async () => {
  const previousFetch = globalThis.fetch;
  const requests: { id: string; resolve: (response: Response) => void }[] = [];
  globalThis.fetch = (async (url: any, options: any) => {
    if (url === "/api/config")
      return Response.json({ videoClassificationEnabled: true });
    return new Promise<Response>((resolve) =>
      requests.push({ id: JSON.parse(options.body).id, resolve }),
    );
  }) as typeof fetch;
  const client = createClassificationClient();
  try {
    client.request([...videos, videos[0]]);
    client.start();
    await tick();
    assert.equal(requests.length, 1);
    assert.equal(client.getSnapshot().size, 3);
    requests[0].resolve(
      Response.json({ videoId: videos[0].id, classification }),
    );
    await tick();
    assert.equal(requests.length, 2);
    requests[1].resolve(
      Response.json(
        { code: "LOCAL_LIMIT", message: "Daily allowance reached." },
        { status: 400 },
      ),
    );
    await tick();
    assert.equal(requests.length, 2);
    assert.equal(client.getSnapshot().get(videos[0].id)?.status, "ready");
    assert.equal(client.getSnapshot().get(videos[2].id)?.status, "failed");
    client.request(videos);
    assert.equal(requests.length, 2);
    client.retry(videos[2].id);
    assert.equal(requests.length, 3);
    const snapshot = client.getSnapshot();
    client.dispose();
    requests[2].resolve(
      Response.json({ videoId: videos[2].id, classification }),
    );
    await tick();
    assert.equal(client.getSnapshot(), snapshot);
  } finally {
    client.dispose();
    globalThis.fetch = previousFetch;
  }
});

test("Browser rejects inconsistent matched IDs, self-related Universes and unknown categories", () => {
  assert.equal(isClassification(classification), true);
  assert.equal(
    isClassification({ ...classification, primaryUniverse: "other" }),
    false,
  );
  assert.equal(
    isClassification({ ...classification, relatedUniverses: ["science"] }),
    false,
  );
  assert.equal(
    isClassification({
      ...classification,
      topic: { ...classification.topic, status: "matched" },
    }),
    false,
  );
});

test("Classification polls job status without creating another video request in parallel", async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  const bodies: any[] = [];
  globalThis.fetch = (async (url: any, options: any) => {
    if (url === "/api/config")
      return Response.json({ videoClassificationEnabled: true });
    const body = JSON.parse(options.body);
    bodies.push(body);
    requests++;
    if (requests === 1)
      return Response.json(
        { videoId: body.id, status: "waiting" },
        { status: 202 },
      );
    if (requests === 2)
      return Response.json(
        { videoId: body.id, status: "finding" },
        { status: 202 },
      );
    return Response.json({ videoId: body.id, status: "ready", classification });
  }) as typeof fetch;
  const client = createClassificationClient({ pollIntervalMs: 1 });
  try {
    client.start();
    client.request([videos[0]]);
    for (
      let turn = 0;
      turn < 20 && client.getSnapshot().get(videos[0].id)?.status !== "ready";
      turn++
    )
      await tick();
    assert.equal(client.getSnapshot().get(videos[0].id)?.status, "ready");
    assert.equal(requests, 3);
    assert.ok(
      bodies.every(
        (body) => body.id === videos[0].id && body.background === true,
      ),
    );
  } finally {
    client.dispose();
    globalThis.fetch = previousFetch;
  }
});

test("Videos leaving view are removed from the waiting list while the active video completes", async () => {
  const previousFetch = globalThis.fetch;
  const requests: { id: string; resolve: (response: Response) => void }[] = [];
  globalThis.fetch = (async (url: any, options: any) => {
    if (url === "/api/config")
      return Response.json({ videoClassificationEnabled: true });
    return new Promise<Response>((resolve) =>
      requests.push({ id: JSON.parse(options.body).id, resolve }),
    );
  }) as typeof fetch;
  const client = createClassificationClient();
  const owner = Symbol("view");
  try {
    client.start();
    client.request([videos[0]]);
    await tick();
    client.setVisible(videos[1], owner, true);
    client.setVisible(videos[2], owner, true);
    client.setVisible(videos[1], owner, false);
    requests[0].resolve(
      Response.json({ videoId: videos[0].id, classification }),
    );
    await tick();
    assert.equal(requests.length, 2);
    assert.equal(requests[1].id, videos[2].id);
    assert.equal(client.getSnapshot().get(videos[1].id)?.status, "idle");
    requests[1].resolve(
      Response.json({ videoId: videos[2].id, classification }),
    );
    await tick();
  } finally {
    client.dispose();
    globalThis.fetch = previousFetch;
  }
});
