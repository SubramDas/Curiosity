import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const projectSettings = [
  "YOUTUBE_API_KEY",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "ALLOW_GEMINI_FREE_TEST",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SEARCH_DAILY_LIMIT",
  "CHAT_DAILY_LIMIT",
  "CHAT_VIDEO_CONTEXT",
  "VIDEO_CHAT_DAILY_LIMIT",
];

// Project settings deliberately override ambient keys, including with empty values.
// This avoids accidentally using a different project's quota or billing account.
/** @param {string | URL} [path] */
export function loadLocalEnvironment(
  inherited = process.env,
  path = new URL("../.env", import.meta.url),
) {
  let local;
  try {
    local = parseEnv(readFileSync(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { ...inherited };
    throw new Error("The local settings file could not be read.");
  }
  const environment = { ...inherited };
  for (const setting of projectSettings) {
    if (Object.hasOwn(local, setting)) environment[setting] = local[setting];
  }
  return environment;
}
