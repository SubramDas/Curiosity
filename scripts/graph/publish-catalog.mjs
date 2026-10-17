import { dirname } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { publicationSql } from "../../backend/graph/publishing.mjs";
// Preparation only: this command cannot connect to or mutate the database.
try {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw Error(
      "Usage: node scripts/graph/publish-catalog.mjs <reviewed-manifest.json> <new-output.sql>",
    );
  if (existsSync(output))
    throw Error(
      "Choose a new output path; publication SQL will not be overwritten.",
    );
  const sql = publicationSql(JSON.parse(readFileSync(input, "utf8")));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, sql, { flag: "wx" });
  console.log(
    "Prepared owner-operated publication SQL. No database changes made.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
