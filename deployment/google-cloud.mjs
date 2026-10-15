import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, basename } from "node:path";
import { loadLocalEnvironment } from "../config/local-environment.mjs";

export const project = "aibuildercup-511419";
export const region = "asia-south1";
export const service = "curiosity";
export const runtime = `curiosity-runtime@${project}.iam.gserviceaccount.com`;
export const builder = `curiosity-build@${project}.iam.gserviceaccount.com`;
export function cloud(args, { optional = false } = {}) {
  const result = spawnSync(
    "gcloud",
    [...args, `--project=${project}`, "--quiet"],
    { encoding: "utf8" },
  );
  if (result.status !== 0 && !optional)
    throw new Error(result.stderr.trim() || "Google Cloud command failed.");
  return result.status === 0 ? result.stdout.trim() : null;
}
export async function googleRequest(path, body, method = "POST") {
  const token = cloud(["auth", "print-access-token"]);
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "x-goog-user-project": project,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      `Google API HTTP ${response.status}: ${result.error?.message ?? "Request failed"}`,
    );
  return result;
}
async function deployRules() {
  cloud(["services", "enable", "firebaserules.googleapis.com"]);
  const source = {
    files: [
      {
        name: "firestore.rules",
        content: readFileSync("firestore.rules", "utf8"),
      },
    ],
  };
  const methods = ["get", "list", "create", "update", "delete"];
  const testCases = [null, { uid: "test-user", token: {} }].flatMap((auth) =>
    methods.map((method) => ({
      expectation: "DENY",
      request: {
        path: "/databases/(default)/documents/curiosity_cache/example",
        method,
        auth,
      },
      resource: { data: { payload: "test" } },
    })),
  );
  const checked = await googleRequest(
    `https://firebaserules.googleapis.com/v1/projects/${project}:test`,
    { source, testSuite: { testCases } },
  );
  if (
    checked.issues?.some((issue) => issue.severity === "ERROR") ||
    checked.testResults?.length !== testCases.length ||
    checked.testResults.some((result) => result.state !== "SUCCESS")
  )
    throw new Error("Firestore rule validation failed.");
  const ruleset = await googleRequest(
    `https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`,
    { source },
  );
  const name = `projects/${project}/releases/cloud.firestore`;
  const existing = cloud([
    "firestore",
    "databases",
    "describe",
    "--database=(default)",
    "--format=value(databaseEdition)",
  ]);
  if (existing !== "STANDARD") throw new Error("Unexpected database edition.");
  const releasesUrl = `https://firebaserules.googleapis.com/v1/projects/${project}/releases`;
  const list = await googleRequest(releasesUrl, null, "GET");
  if (list.releases?.some((release) => release.name === name))
    await googleRequest(
      releasesUrl + "/cloud.firestore",
      {
        release: { name, rulesetName: ruleset.name },
        updateMask: "ruleset_name",
      },
      "PATCH",
    );
  else await googleRequest(releasesUrl, { name, rulesetName: ruleset.name });
  console.log(
    `Firestore deny-all client rules tested (${testCases.length} cases) and deployed.`,
  );
}
function ensureAccount(id, email) {
  if (
    !cloud(
      ["iam", "service-accounts", "describe", email, "--format=value(email)"],
      { optional: true },
    )
  )
    cloud([
      "iam",
      "service-accounts",
      "create",
      id,
      `--display-name=Curiosity ${id}`,
    ]);
}
function configureCacheFields() {
  for (const collection of [
    "curiosity_cache",
    "curiosity_classification_cache",
  ]) {
    cloud([
      "firestore",
      "fields",
      "ttls",
      "update",
      "purgeAt",
      `--collection-group=${collection}`,
      "--database=(default)",
      "--enable-ttl",
      "--async",
    ]);
    // Large public metadata strings should not generate unnecessary index entries.
    cloud([
      "firestore",
      "indexes",
      "fields",
      "update",
      "payload",
      `--collection-group=${collection}`,
      "--database=(default)",
      "--disable-indexes",
      "--async",
    ]);
  }
}
export async function setup() {
  const database = JSON.parse(
    cloud([
      "firestore",
      "databases",
      "describe",
      "--database=(default)",
      "--format=json",
    ]),
  );
  if (database.locationId !== region || database.databaseEdition !== "STANDARD")
    throw new Error(
      "Firestore target differs from approved Mumbai Standard database.",
    );
  ensureAccount("curiosity-runtime", runtime);
  ensureAccount("curiosity-build", builder);
  cloud([
    "projects",
    "add-iam-policy-binding",
    project,
    `--member=serviceAccount:${runtime}`,
    "--role=roles/datastore.user",
    "--condition=None",
    "--format=value(etag)",
  ]);
  cloud([
    "projects",
    "add-iam-policy-binding",
    project,
    `--member=serviceAccount:${builder}`,
    "--role=roles/run.builder",
    "--condition=None",
    "--format=value(etag)",
  ]);
  console.log("Dedicated runtime/build identities configured.");
  await deployRules();
  configureCacheFields();
  const environment = loadLocalEnvironment();
  const secrets = {
    YOUTUBE_API_KEY: "curiosity-youtube-api-key",
    GEMINI_API_KEY: "curiosity-gemini-api-key",
    SUPABASE_URL: "curiosity-supabase-url",
    SUPABASE_PUBLISHABLE_KEY: "curiosity-supabase-publishable-key",
  };
  const directory = mkdtempSync(join(tmpdir(), "curiosity-secrets-"));
  const versions = {};
  try {
    for (const [key, id] of Object.entries(secrets)) {
      if (!environment[key])
        throw new Error(`Missing ${key}; no value is printed.`);
      if (
        !cloud(["secrets", "describe", id, "--format=value(name)"], {
          optional: true,
        })
      )
        cloud(["secrets", "create", id, "--replication-policy=automatic"]);
      const file = join(directory, id);
      writeFileSync(file, environment[key], { mode: 0o600 });
      const version = cloud([
        "secrets",
        "versions",
        "add",
        id,
        `--data-file=${file}`,
        "--format=value(name)",
      ]);
      versions[key] = `${id}:${version.split("/").at(-1)}`;
      cloud([
        "secrets",
        "add-iam-policy-binding",
        id,
        `--member=serviceAccount:${runtime}`,
        "--role=roles/secretmanager.secretAccessor",
        "--condition=None",
        "--format=value(etag)",
      ]);
      console.log(
        `${key} stored in Secret Manager; runtime access scoped to this secret.`,
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  mkdirSync(".local-data", { recursive: true });
  writeFileSync(
    ".local-data/cloud-secret-versions.json",
    JSON.stringify(versions, null, 2) + "\n",
    { mode: 0o600 },
  );
}
export function stageSource() {
  const target = mkdtempSync(join(tmpdir(), "curiosity-source-"));
  for (const name of [
    "Dockerfile",
    ".dockerignore",
    ".gcloudignore",
    "package.json",
    "package-lock.json",
    "index.html",
    "vite.config.ts",
    "tsconfig.json",
  ])
    cpSync(name, join(target, name));
  const extensions = new Set([
    ".ts",
    ".tsx",
    ".mjs",
    ".css",
    ".html",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".ico",
    ".woff2",
  ]);
  for (const name of [
    "backend",
    "desktop-ui",
    "mobile-ui",
    "shared",
    "src",
    "public",
  ])
    cpSync(name, join(target, name), {
      recursive: true,
      filter: (path) => {
        const file = basename(path);
        return (
          !file.startsWith(".") &&
          (!extname(file) || extensions.has(extname(file)))
        );
      },
    });
  return target;
}
export async function deploy() {
  const environment = loadLocalEnvironment();
  const versions = JSON.parse(
    readFileSync(".local-data/cloud-secret-versions.json", "utf8"),
  );
  const settings = {
    GOOGLE_CLOUD_PROJECT: project,
    FIRESTORE_DATABASE: "(default)",
    GEMINI_MODEL: environment.GEMINI_MODEL,
    ALLOW_GEMINI_FREE_TEST: environment.ALLOW_GEMINI_FREE_TEST,
    SEARCH_DAILY_LIMIT: environment.SEARCH_DAILY_LIMIT ?? "40",
    CHAT_DAILY_LIMIT: environment.CHAT_DAILY_LIMIT ?? "25",
    VIDEO_CHAT_DAILY_LIMIT: environment.VIDEO_CHAT_DAILY_LIMIT ?? "8",
    CHAT_VIDEO_CONTEXT: environment.CHAT_VIDEO_CONTEXT ?? "true",
    VIDEO_CLASSIFICATION: environment.VIDEO_CLASSIFICATION ?? "true",
    CLASSIFICATION_DAILY_LIMIT: environment.CLASSIFICATION_DAILY_LIMIT ?? "40",
    GEMINI_REQUEST_INTERVAL_MS:
      environment.GEMINI_REQUEST_INTERVAL_MS ?? "15000",
  };
  if (!settings.GEMINI_MODEL) throw new Error("GEMINI_MODEL is missing.");
  configureCacheFields();
  const directory = stageSource();
  try {
    const args = [
      "run",
      "deploy",
      service,
      `--source=${directory}`,
      `--region=${region}`,
      `--service-account=${runtime}`,
      `--build-service-account=projects/${project}/serviceAccounts/${builder}`,
      "--allow-unauthenticated",
      "--min-instances=0",
      "--max-instances=1",
      "--concurrency=10",
      "--cpu=1",
      "--memory=512Mi",
      "--timeout=120",
      "--set-env-vars=" +
        Object.entries(settings)
          .map(([key, value]) => `${key}=${value}`)
          .join(","),
      "--set-secrets=" +
        Object.entries(versions)
          .map(([key, value]) => `${key}=${value}`)
          .join(","),
    ];
    const process = spawnSync(
      "gcloud",
      [...args, `--project=${project}`, "--quiet"],
      { stdio: "inherit" },
    );
    if (process.status !== 0)
      throw new Error(
        "Cloud Run deployment failed; inspect the command output.",
      );
    const url = cloud([
      "run",
      "services",
      "describe",
      service,
      `--region=${region}`,
      "--format=value(status.url)",
    ]);
    cloud([
      "run",
      "services",
      "update",
      service,
      `--region=${region}`,
      `--update-env-vars=PUBLIC_ORIGIN=${url}`,
      "--format=value(status.latestReadyRevisionName)",
    ]);
    const report = {
      project,
      region,
      service,
      url,
      availableThrough: "2026-12-31",
      deployedAt: new Date().toISOString(),
    };
    mkdirSync("deployment", { recursive: true });
    writeFileSync(
      "deployment/deployment-report.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(`Curiosity demo: ${url}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
if (process.argv[1]?.endsWith("google-cloud.mjs")) {
  if (process.argv[2] === "setup") await setup();
  else if (process.argv[2] === "deploy") await deploy();
  else throw new Error("Use setup or deploy explicitly.");
}
