import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../backend/server.mjs";
import { createRequestThrottle } from "../backend/http/request-throttle.mjs";
import { request as httpRequest } from "node:http";

test("Production serves built assets and health, denies hidden paths and rejects unrelated origins", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-production-"));
  mkdirSync(join(directory, "assets"));
  writeFileSync(join(directory, "index.html"), "<h1>Revelink</h1>");
  writeFileSync(join(directory, "assets", "app.js"), 'console.log("app");');
  writeFileSync(join(directory, ".env"), "private");
  const server = startServer(
    {},
    {
      port: 0,
      staticDirectory: directory,
      allowCloudRunOrigin: true,
      limits: { reserve: () => {} },
      cache: {
        getOrLoad: async <T>(
          _: unknown[],
          __: number,
          load: () => Promise<T>,
        ) => load(),
        sweep: () => {},
      },
    },
  );
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.match(await (await fetch(base + "/")).text(), /Revelink/);
    assert.match(
      (await fetch(base + "/assets/app.js")).headers.get("cache-control")!,
      /immutable/,
    );
    assert.equal((await fetch(base + "/.env")).status, 404);
    assert.equal((await fetch(base + "/missing.svg")).status, 404);
    assert.equal((await fetch(base + "/api/health")).status, 200);
    const post = (origin: string) =>
      new Promise<{ status: number; body: any }>((resolve, reject) => {
        const request = httpRequest(
          base + "/api/unavailable",
          {
            method: "POST",
            headers: {
              Host: "demo.run.app",
              Origin: origin,
              "Content-Type": "application/json",
            },
          },
          (response) => {
            let body = "";
            response.on("data", (chunk) => (body += chunk));
            response.on("end", () =>
              resolve({ status: response.statusCode!, body: JSON.parse(body) }),
            );
          },
        );
        request.on("error", reject);
        request.end("{}");
      });
    assert.equal((await post("https://demo.run.app")).body.code, "NOT_FOUND");
    assert.equal((await post("https://other.example")).status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Burst protection limits repeated chat requests and resets at the next minute", () => {
  let now = 1000;
  const check = createRequestThrottle({ now: () => now });
  const request = {
    method: "POST",
    url: "/api/chat",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  };
  for (let i = 0; i < 6; i++) check(request);
  assert.throws(() => check(request), /Too many/);
  now = 61_000;
  check(request);
});
