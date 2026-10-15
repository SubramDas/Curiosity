import { Firestore } from "@google-cloud/firestore";
import { startServer } from "./server.mjs";
import { createFirestoreUsage } from "./storage/firestore-usage.mjs";
import { createFirestoreCache } from "./storage/firestore-cache.mjs";
import { createRequestThrottle } from "./http/request-throttle.mjs";

const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid PORT configuration.");
const database = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  databaseId: process.env.FIRESTORE_DATABASE ?? "(default)",
});
// Fail startup clearly if the database or managed service identity is unavailable.
await database.doc("curiosity_system/cache-index").get();
const server = startServer(process.env, {
  port,
  host: "0.0.0.0",
  staticDirectory: new URL("../dist", import.meta.url).pathname,
  allowedOrigins: process.env.PUBLIC_ORIGIN ? [process.env.PUBLIC_ORIGIN] : [],
  allowCloudRunOrigin: Boolean(process.env.K_SERVICE),
  limits: createFirestoreUsage({ database }),
  cache: createFirestoreCache({ database }),
  classificationCache: createFirestoreCache({
    database,
    namespace: "curiosity_classification",
  }),
  beforeRequest: createRequestThrottle(),
});
function stop() {
  server.close(() => database.terminate());
  setTimeout(() => server.closeAllConnections(), 8000).unref();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
