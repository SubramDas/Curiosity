import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../backend/server.mjs";

test("Phone testing accepts only explicit LAN origins and keeps the API bound to localhost", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-lan-"));
  async function check(allowedOrigins: string[]) {
    const server = startServer(
      {},
      { port: 0, usageDirectory: directory, allowedOrigins },
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as { address: string; port: number };
    assert.equal(address.address, "127.0.0.1");
    async function post(origin: string) {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/unavailable`,
        {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: "{}",
        },
      );
      return (await response.json()).code;
    }
    try {
      assert.equal(await post("http://localhost:5173"), "NOT_FOUND");
      assert.equal(
        await post("http://192.168.1.6:5173"),
        allowedOrigins.length ? "NOT_FOUND" : "ACCESS_DENIED",
      );
      assert.equal(await post("http://192.168.1.7:5173"), "ACCESS_DENIED");
      assert.equal(await post("https://unrelated.example"), "ACCESS_DENIED");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
  try {
    await check([]);
    await check(["http://192.168.1.6:5173"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
