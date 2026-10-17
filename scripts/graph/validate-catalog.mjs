import { readFileSync } from "node:fs";
import { validateManifest } from "../../backend/graph/publishing.mjs";
try {
  const m = validateManifest(
    JSON.parse(
      readFileSync(process.argv[2] ?? "content/graph/catalog.json", "utf8"),
    ),
  );
  console.log(
    `Catalog structure valid: ${m.topics.length} topics, ${m.edges.length} connections, ${m.videos.length} video associations, ${m.events.length} events. Reviewed: ${m.reviewed === true}.`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
