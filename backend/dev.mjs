import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { startServer } from "./server.mjs";
import { loadLocalEnvironment } from "../config/local-environment.mjs";

const lan = process.argv.includes("--lan");
const lanAddresses = lan
  ? [
      ...new Set(
        Object.values(networkInterfaces())
          .flat()
          .filter(
            (address) =>
              address &&
              !address.internal &&
              address.family === "IPv4" &&
              /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
                address.address,
              ),
          )
          .map((address) => address.address),
      ),
    ]
  : [];
const phoneUrls = lanAddresses.map((address) => `http://${address}:5173`);
const server = startServer(loadLocalEnvironment(), {
  allowedOrigins: phoneUrls,
});
let vite;
server.once("listening", () => {
  const argumentsForVite = [
    "node_modules/vite/bin/vite.js",
    ...(lan ? ["--host", "0.0.0.0"] : []),
  ];
  vite = spawn(process.execPath, argumentsForVite, {
    stdio: "inherit",
  });
  if (lan) {
    if (!phoneUrls.length)
      console.log(
        "No private Wi-Fi address found. Connect this computer to Wi-Fi and restart.",
      );
    for (const url of phoneUrls) console.log(`Phone on the same Wi-Fi: ${url}`);
  }
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
