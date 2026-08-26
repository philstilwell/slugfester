import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { sha256 } from "./assessment-production-post-canary-batch-11-production-publication.mjs";

export const BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/generated-seo-correction/repository-dependent-correction-1";
export const BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-11-repository-dependent-correction-1";
export const BATCH_11_LEGACY_V2_SOURCE_PATH =
  "docs/assessment-ledgers/craig-oconnor-god-debate-2026.json";
export const BATCH_11_LEGACY_V2_FIXTURE_PATH =
  "scripts/fixtures/reassessment-scoring-v2-ledger.json";
export const BATCH_11_SCORING_TEST_PATH =
  "scripts/test-reassessment-scoring.mjs";
export const BATCH_11_PILOT_OUTPUT_PATHS = Object.freeze([
  "docs/calibration/v2.1/pilot-analysis.json",
  "docs/calibration/v2.1/pilot-analysis.md"
]);
export const BATCH_11_REPOSITORY_DEPENDENT_WRITABLE_PATHS = Object.freeze([
  BATCH_11_LEGACY_V2_FIXTURE_PATH,
  BATCH_11_SCORING_TEST_PATH,
  ...BATCH_11_PILOT_OUTPUT_PATHS
]);

function replaceExactOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected exactly one baseline anchor`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export function buildBatch11FixtureBackedScoringTest(baselineSource) {
  return replaceExactOnce(
    baselineSource,
    'new URL("../docs/assessment-ledgers/craig-oconnor-god-debate-2026.json", import.meta.url)',
    'new URL("./fixtures/reassessment-scoring-v2-ledger.json", import.meta.url)',
    "Batch 11 legacy-v2 scoring fixture route"
  );
}

export function loadBatch11LegacyV2Fixture(repositoryRoot, revision) {
  const result = spawnSync(
    "git",
    ["show", `${revision}:${BATCH_11_LEGACY_V2_SOURCE_PATH}`],
    { cwd: repositoryRoot, maxBuffer: 100 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(
      `failed to recover frozen legacy-v2 fixture: ${result.stderr?.toString() || result.stdout?.toString()}`
    );
  }
  return result.stdout;
}

export async function runIsolatedBatch11ScoringFixtureTest({
  repositoryRoot,
  testSource,
  fixtureBytes
}) {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "slugfester-batch-11-scoring-fixture-")
  );
  try {
    await mkdir(path.join(temporaryRoot, "scripts/lib"), { recursive: true });
    await mkdir(path.join(temporaryRoot, "scripts/fixtures"), {
      recursive: true
    });
    await writeFile(
      path.join(temporaryRoot, BATCH_11_SCORING_TEST_PATH),
      testSource
    );
    await copyFile(
      path.join(repositoryRoot, "scripts/lib/reassessment-scoring.mjs"),
      path.join(temporaryRoot, "scripts/lib/reassessment-scoring.mjs")
    );
    await writeFile(
      path.join(temporaryRoot, BATCH_11_LEGACY_V2_FIXTURE_PATH),
      fixtureBytes
    );
    const run = spawnSync(
      process.execPath,
      [path.join(temporaryRoot, BATCH_11_SCORING_TEST_PATH)],
      { cwd: temporaryRoot, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
    );
    return { status: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function batch11PilotInputPaths(repositoryRoot) {
  const ledgerDirectory = "docs/calibration/v2.1/ledgers";
  const ledgers = (await readdir(path.join(repositoryRoot, ledgerDirectory)))
    .filter((name) => name.endsWith(".json"))
    .map((name) => `${ledgerDirectory}/${name}`)
    .sort();
  return [
    "src/data/debates.js",
    "scripts/analyze-v2.1-pilot.mjs",
    "scripts/lib/reassessment-scoring.mjs",
    "docs/calibration/v2.1/pilot-manifest.json",
    ...ledgers
  ];
}

export async function runIsolatedBatch11PilotAnalysis(repositoryRoot) {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "slugfester-batch-11-pilot-")
  );
  try {
    const inputPaths = await batch11PilotInputPaths(repositoryRoot);
    for (const relativePath of inputPaths) {
      const destination = path.join(temporaryRoot, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(repositoryRoot, relativePath), destination);
    }
    const run = spawnSync(
      process.execPath,
      [path.join(temporaryRoot, "scripts/analyze-v2.1-pilot.mjs")],
      { cwd: temporaryRoot, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
    );
    if (run.status !== 0) {
      throw new Error(
        `isolated Batch 11 pilot analysis failed: ${run.stderr || run.stdout}`
      );
    }
    const outputs = await Promise.all(
      BATCH_11_PILOT_OUTPUT_PATHS.map(async (relativePath) => {
        const content = await readFile(path.join(temporaryRoot, relativePath));
        return {
          path: relativePath,
          sha256: sha256(content),
          bytes: content.length,
          content
        };
      })
    );
    return {
      inputPaths,
      outputs,
      stdout: run.stdout ?? "",
      stderr: run.stderr ?? ""
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export function jsonLeafChanges(before, after, pointer = "") {
  if (Object.is(before, after)) return [];
  if (
    before === null ||
    after === null ||
    typeof before !== "object" ||
    typeof after !== "object" ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    return [{ pointer: pointer || "/", before, after }];
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .sort()
    .flatMap((key) =>
      jsonLeafChanges(
        before[key],
        after[key],
        `${pointer}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`
      )
    );
}

export function outputLock(record) {
  return { path: record.path, sha256: record.sha256, bytes: record.bytes };
}

export function contentSha256(value) {
  return sha256(value);
}
