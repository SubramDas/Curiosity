# Graph content tools

These commands operate on local reviewed manifests. They do not read provider keys, call Gemini/YouTube or connect to the database.

- `node scripts/graph/validate-catalog.mjs [manifest.json]`: structural content validation; does not establish factual accuracy.
- `node scripts/graph/match-classification.mjs <manifest.json> <saved-result.json>`: propose a canonical topic for an existing classification; never publishes it.
- `node scripts/graph/publish-catalog.mjs <reviewed-manifest.json> <new-output.sql>`: require review, validate records and prepare owner-operated SQL. Existing output files are not overwritten.

Follow [the activation/publication guide](../../backend/graph/README.md). Stable topic IDs and map positions survive batches. Use a new request ID and the current expected revision for each changed publication; retrying the exact same publication ID/checksum is idempotent. Corrections are audited publications, not deletion of learner history.

No automated weekly job runs yet. The founder has not supplied preferred video/news sources, so the starter deliberately contains no video associations or news stories. Review and publish actual sourced content before presenting it as current.
