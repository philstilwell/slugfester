#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--authorized-at");
const authorizedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(authorizedAt && !Number.isNaN(Date.parse(authorizedAt)), "invalid --authorized-at");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery";
const originalPath = `${root}/correction-execution-activation.json`;
const successorPath = `${root}/correction-execution-activation-1.json`;
const diagnosisPath = `${root}/correction-harness-diagnosis.json`;
const runnerPath = "scripts/run-assessment-production-post-canary-batch-03-debate-124-adjudication-correction.mjs";
const scriptPath = "scripts/prepare-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-activation-successor.mjs";
const testPath = "scripts/test-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-activation-successor.mjs";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(successorPath)), "successor activation already exists");
const [originalBytes, diagnosisBytes] = await Promise.all([readFile(originalPath), readFile(diagnosisPath)]);
const original = JSON.parse(originalBytes);
const diagnosis = JSON.parse(diagnosisBytes);
assertV4(
  diagnosis.status === "frozen-diagnosed-debate-124-correction-pre-model-activation-path-mismatch" &&
    diagnosis.failure.modelContextsAttempted === 0 &&
    diagnosis.correction.correctedPath === successorPath &&
    diagnosis.hashes.originalActivationSha256 === sha256(originalBytes) &&
    original.contexts.length === 2 && original.executionPolicy.attemptsPerContext === 1 &&
    original.executionPolicy.retriesMaximum === 0,
  "correction activation successor boundary changed"
);
const sourceHashes = structuredClone(original.sourceHashes);
for (const file of [runnerPath, diagnosisPath, scriptPath, testPath])
  sourceHashes[file] = sha256(await readFile(file));
const successor = {
  ...original,
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-activation-successor",
  status: "frozen-two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-authorized",
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  supersedesActivation: { path: originalPath, sha256: sha256(originalBytes) },
  harnessCorrectionDiagnosis: { path: diagnosisPath, sha256: sha256(diagnosisBytes) },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes:
    original.futureOutputPathsExcludedFromSourceHashes,
  nextAuthorizedAction: "execute-two-debate-124-field-disjoint-correction-contexts-once-with-corrected-activation-path"
};
for (const [file, digest] of Object.entries(sourceHashes))
  assertV4(sha256(await readFile(file)) === digest, `successor source drift: ${file}`);
if (shouldWrite) await writeFile(successorPath, `${JSON.stringify(successor, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen-authorized-successor" : "preview",
  contexts: 2, attemptsPerContext: 1, retriesMaximum: 0,
  modelContextsPreviouslyAttempted: 0, directIncrementalCostUsd: 0 }, null, 2));
