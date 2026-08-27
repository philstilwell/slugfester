import { copyFile, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { sha256 } from "./assessment-production-post-canary-batch-13-production-publication.mjs";

export const BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-13/production-publication/generated-seo-correction/dependent-pilot-analysis-correction";
export const BATCH_13_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction";
export const BATCH_13_DEPENDENT_PILOT_OUTPUT_PATHS = Object.freeze([
  "docs/calibration/v2.1/pilot-analysis.json",
  "docs/calibration/v2.1/pilot-analysis.md"
]);

export async function dependentPilotInputPaths(repositoryRoot) {
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

export async function runIsolatedBatch13DependentPilotAnalysis(repositoryRoot) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "slugfester-batch-13-pilot-"));
  try {
    const inputPaths = await dependentPilotInputPaths(repositoryRoot);
    for (const relativePath of inputPaths) {
      const destination = path.join(temporaryRoot, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(repositoryRoot, relativePath), destination);
    }
    const run = spawnSync(
      process.execPath,
      [path.join(temporaryRoot, "scripts/analyze-v2.1-pilot.mjs")],
      { cwd: temporaryRoot, encoding: "utf8" }
    );
    if (run.status !== 0) {
      throw new Error(`isolated pilot analysis failed: ${run.stderr || run.stdout}`);
    }
    const outputs = await Promise.all(
      BATCH_13_DEPENDENT_PILOT_OUTPUT_PATHS.map(async (relativePath) => {
        const content = await readFile(path.join(temporaryRoot, relativePath));
        return {
          path: relativePath,
          sha256: sha256(content),
          bytes: content.length,
          content
        };
      })
    );
    return { inputPaths, outputs, stdout: run.stdout, stderr: run.stderr };
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
