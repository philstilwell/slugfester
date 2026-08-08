#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V42211738_ROOT } from "./lib/v42211738-publication-field-repair.mjs";

const exists = (file) => access(path.resolve(file)).then(() => true, () => false), sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(path.resolve(`${V42211738_ROOT}/preparation-manifest.json`), "utf8")); assert.equal(preparation.status, "prepared-two-isolated-publication-field-repairs"); assert.deepEqual(preparation.contexts.map((context) => [context.debateNumber, context.correctedFields]), [["153", 8], ["165", 1]]); assert.equal(preparation.totals.modelAuthoredScores, 0);
const manifestPath = `${V42211738_ROOT}/execution-manifest.json`, executionPath = `${V42211738_ROOT}/model-execution.json`, analysisPath = `${V42211738_ROOT}/analysis.json`;
if (!(await exists(manifestPath))) { console.log(JSON.stringify({ status: "passed-prefreeze", contexts: 2, correctedFields: 9, modelAuthoredScores: 0 }, null, 2)); process.exit(0); }
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8")); assert.equal(manifest.status, "frozen-two-isolated-publication-field-repairs-authorized"); assert.equal(manifest.executionPolicy.retries, 0); assert.equal(manifest.executionPolicy.furtherCorrectionContexts, 0); assert.equal(manifest.authorization.merge, false); for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);
if (!(await exists(executionPath))) { for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `future output exists: ${future}`); console.log(JSON.stringify({ status: "passed-frozen", contexts: 2, maximumConcurrency: 2, retries: 0, furtherCorrectionContexts: 0, modelAuthoredScores: 0 }, null, 2)); process.exit(0); }
const execution = JSON.parse(await readFile(path.resolve(executionPath), "utf8")); assert.equal(execution.contextsAttempted, 2); assert.equal(execution.retries, 0); assert.equal(execution.furtherCorrectionContexts, 0); assert.equal(execution.modelAuthoredScores, 0); assert(execution.results.every((result) => result.attemptCount === 1 && result.retryCount === 0));
if (!(await exists(analysisPath))) { console.log(JSON.stringify({ status: "passed-executed", executionStatus: execution.status, validContexts: execution.validContexts, modelAuthoredScores: 0 }, null, 2)); process.exit(0); }
const analysis = JSON.parse(await readFile(path.resolve(analysisPath), "utf8")); assert.equal(analysis.gate.modelAuthoredScores, 0); assert.equal(analysis.authorization.productionMutation, false); if (analysis.status === "publication-field-repair-gate-passed") { assert.equal(analysis.gate.validContexts, 2); assert.equal(analysis.gate.correctedFields, 9); assert.equal(analysis.authorization.merge, true); } else assert.equal(analysis.authorization.merge, false); console.log(JSON.stringify({ status: "passed-analyzed", analysisStatus: analysis.status, validContexts: analysis.gate.validContexts, correctedFields: analysis.gate.correctedFields, modelAuthoredScores: 0 }, null, 2));

