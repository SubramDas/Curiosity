import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { validateCases } from "./score.mjs";
import { createMeasurementClient, runCases } from "./measure.mjs";
import { validateRun, writeRun } from "./report.mjs";

const help = `Prototype benchmarks (developer tool)

  npm run benchmark -- search [options]
  npm run benchmark -- teacher [options]
  npm run benchmark -- classification [options]
  npm run benchmark -- report --run PATH/TO/run.json

Without --live, shows a plan and makes no API calls.
Options:
  --live                   Call the running app; consumes its existing allowance
  --base-url URL           App/API origin (default http://127.0.0.1:8787)
  --origin URL             App browser origin (local default http://127.0.0.1:5173)
  --cases FILE             Custom public-case JSON dataset
  --case-id ID             Select one case
  --max-cases N            Maximum selected cases (default 1; maximum 30)
  --repeats N              Trials per case (default 1; maximum 5; at most 30 total)
  --timeout-ms N           Deadline per trial (default 180000; maximum 600000)
  --poll-ms N              Poll interval (default 1500; minimum 1000)
  --model NAME             Record the actual server model, not a model switch
  --server-revision VALUE  Record the deployed revision
  --output DIRECTORY       Results directory (default .local-data/benchmarks/RUN)
  --run FILE               Saved run to regenerate reports without API calls
  --help                   Show these instructions`;

export function readOptions(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      live: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
      ...Object.fromEntries(
        [
          "base-url",
          "origin",
          "cases",
          "case-id",
          "max-cases",
          "repeats",
          "timeout-ms",
          "poll-ms",
          "model",
          "server-revision",
          "output",
          "run",
        ].map((name) => [name, { type: "string" }]),
      ),
    },
  });
  if (values.help || !positionals.length) return { help: true };
  if (
    positionals.length !== 1 ||
    !["search", "teacher", "classification", "report"].includes(positionals[0])
  )
    throw new Error("Select search, teacher, classification or report.");
  const suite = positionals[0];
  if (suite === "report") {
    if (!values.run || values.live)
      throw new Error("Use report --run PATH/TO/run.json without --live.");
    return {
      suite,
      runFile: resolve(values.run),
      output: values.output ? resolve(values.output) : undefined,
    };
  }
  if (values.run) throw new Error("--run is only for report generation.");
  const number = (name, fallback, min, max) => {
    const value = values[name] ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
      throw new Error(`--${name} must be an integer from ${min} to ${max}.`);
    return Number(value);
  };
  const originUrl = (value, name) => {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`Invalid --${name}.`);
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol === "http:" &&
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
      throw new Error(
        `--${name} must be an HTTPS origin or a local HTTP origin, without credentials, path or query.`,
      );
    return url.origin;
  };
  const baseUrl = originUrl(
    values["base-url"] ?? "http://127.0.0.1:8787",
    "base-url",
  );
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(baseUrl).hostname,
  );
  const origin = originUrl(
    values.origin ?? (local ? "http://127.0.0.1:5173" : baseUrl),
    "origin",
  );
  for (const name of ["model", "server-revision"])
    if (values[name] && !/^[\w.:-]{1,160}$/.test(values[name]))
      throw new Error(
        `Invalid --${name}; use an identifier, not credentials or a URL.`,
      );
  return {
    suite,
    live: values.live,
    baseUrl,
    origin,
    maxCases: number("max-cases", 1, 1, 30),
    repeats: number("repeats", 1, 1, 5),
    timeoutMs: number("timeout-ms", 180000, 1000, 600000),
    pollMs: number("poll-ms", 1500, 1000, 10000),
    casesFile: values.cases
      ? resolve(values.cases)
      : new URL(`./cases/${suite}.json`, import.meta.url),
    caseId: values["case-id"],
    model: values.model ?? "unrecorded",
    serverRevision: values["server-revision"] ?? "unrecorded",
    output: values.output ? resolve(values.output) : undefined,
  };
}

export async function main(args = process.argv.slice(2)) {
  const options = readOptions(args);
  if (options.help) {
    console.log(help);
    return;
  }
  if (options.suite === "report") {
    const run = validateRun(JSON.parse(readFileSync(options.runFile, "utf8")));
    const directory = options.output ?? resolve(options.runFile, "..");
    writeRun(directory, run);
    console.log(`Reports generated in ${directory}. No API calls made.`);
    return;
  }
  const contents = readFileSync(options.casesFile, "utf8");
  const allCases = validateCases(JSON.parse(contents), options.suite);
  const matching = options.caseId
    ? allCases.filter((sample) => sample.id === options.caseId)
    : allCases;
  if (!matching.length) throw new Error("The selected case does not exist.");
  const cases = matching.slice(0, options.maxCases);
  if (cases.length * options.repeats > 30)
    throw new Error(
      "Limit a run to 30 trials. Each trial may use several provider calls.",
    );
  console.log(
    `${options.suite}: ${cases.length} case(s), ${options.repeats} trial(s) each; target ${options.baseUrl}.`,
  );
  console.log(
    `${cases.filter((sample) => sample.review.status === "reviewed").length} reviewed case(s); cache state unknown.`,
  );
  if (!options.live) {
    console.log(
      "Plan only. Add --live to measure the running app within its existing quotas.",
    );
    return;
  }
  let clientRevision = "unrecorded";
  try {
    clientRevision = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: new URL("../../", import.meta.url),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (
      execFileSync(
        "git",
        ["status", "--porcelain", "--untracked-files=normal"],
        {
          cwd: new URL("../../", import.meta.url),
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      ).trim()
    )
      clientRevision += "-dirty";
  } catch {
    /* Running an exported source snapshot is supported. */
  }
  const run = {
    schemaVersion: 1,
    suite: options.suite,
    mode: "live-api",
    startedAt: new Date().toISOString(),
    metadata: {
      target: options.baseUrl,
      origin: options.origin,
      clientRevision,
      serverRevision: options.serverRevision,
      model: options.model,
      nodeVersion: process.version,
      datasetSha256: createHash("sha256").update(contents).digest("hex"),
      timeoutMs: options.timeoutMs,
      pollMs: options.pollMs,
      repeats: options.repeats,
      cacheState: "unknown",
    },
    cases: cases.map((sample) => ({
      id: sample.id,
      inputSha256: createHash("sha256")
        .update(JSON.stringify(sample.input))
        .digest("hex"),
      review: sample.review,
    })),
    results: [],
  };
  const directory =
    options.output ??
    resolve(
      ".local-data",
      "benchmarks",
      `${run.startedAt.replace(/[:.]/g, "-")}-${options.suite}-${randomUUID().slice(0, 8)}`,
    );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(
    join(directory, "user-study-template.csv"),
    "participant_alias,workflow,task_id,completed,duration_seconds,context_switches,difficulty_notes\n",
    { mode: 0o600 },
  );
  writeRun(directory, run);
  await runCases({
    suite: options.suite,
    cases,
    repeats: options.repeats,
    measure: createMeasurementClient(options),
    onResult: async (row) => {
      run.results.push(row);
      writeRun(directory, run);
      console.log(
        `${row.caseId} #${row.repeat}: ${row.status}${row.elapsedMs !== undefined ? ` (${row.elapsedMs} ms)` : ""}${row.errorCode ? ` [${row.errorCode}]` : ""}`,
      );
    },
  });
  run.finishedAt = new Date().toISOString();
  const summary = writeRun(directory, run);
  console.log(`Saved JSON, CSV and Markdown in ${directory}.`);
  if (summary.failed || summary.skipped) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch(() => {
    // Avoid printing raw provider responses, URLs with credentials or personal input.
    console.error(
      "Benchmark could not run. Check the command, JSON dataset, app availability and writable output directory. Use --help for instructions.",
    );
    process.exitCode = 1;
  });
}
