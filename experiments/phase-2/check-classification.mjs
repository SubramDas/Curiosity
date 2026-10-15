// One public-video check, using the app's persisted cache and daily allowances.
import { startServer } from "../../backend/server.mjs";
import { loadLocalEnvironment } from "../../config/local-environment.mjs";

const id = process.argv[2];
if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? "")) {
  console.error("Usage: npm run phase2:classify -- YOUTUBE_VIDEO_ID");
  process.exitCode = 1;
} else {
  const server = startServer(loadLocalEnvironment(), { port: 0 });
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    const port = server.address().port;
    const response = await fetch(
      `http://127.0.0.1:${port}/api/videos/classify`,
      {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(90_000),
      },
    );
    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
    if (!response.ok) process.exitCode = 1;
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
