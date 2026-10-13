import { spawn } from "node:child_process";
import { startServer } from "./server.mjs";
import { loadLocalEnvironment } from "../config/local-environment.mjs";

const server = startServer(loadLocalEnvironment());
let vite;
server.once("listening", () => {
  vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  });
  vite.on("exit", () => {
    server.close();
  });
});
server.once("error", () => {
  console.error(
    "The local API could not start. Stop an earlier prototype on port 8787, then retry.",
  );
  process.exitCode = 1;
});
function stop() {
  vite?.kill();
  server.closeAllConnections();
  server.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
