import { readFileSync } from "node:fs";
import { validateManifest } from "../../backend/graph/publishing.mjs";
import { matchClassificationToTopic } from "../../backend/graph/classification-match.mjs";
// Reads a previously obtained classification. Never requests an LLM or publishes.
try {
  const [catalogPath, resultPath] = process.argv.slice(2);
  if (!catalogPath || !resultPath)
    throw Error(
      "Usage: node scripts/graph/match-classification.mjs <catalog.json> <classification-result.json>",
    );
  const catalog = validateManifest(
    JSON.parse(readFileSync(catalogPath, "utf8")),
  );
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  console.log(
    JSON.stringify(
      matchClassificationToTopic(
        result.classification ?? result,
        catalog.topics,
      ),
      null,
      2,
    ),
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
