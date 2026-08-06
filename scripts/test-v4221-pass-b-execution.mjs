#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { V4221_ROOT } from "./lib/v4221-pass-b-consensus.mjs";

const manifest = JSON.parse(await readFile(`${V4221_ROOT}/execution-manifest.json`, "utf8"));
assert.equal(manifest.status, "frozen-three-isolated-source-span-pass-b-contexts-authorized");
assert.equal(manifest.contexts.length, 3);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "high");
assert.equal(manifest.costEstimate.authentication, "ChatGPT subscription");
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.authorization.passBModelContexts, true);
assert.equal(manifest.authorization.scoreDerivation, false);
assert.equal(manifest.deterministicValidation.modelAuthoredEvidenceText, false);
assert.equal(manifest.deterministicValidation.calculatedScores, 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => assert.fail(`future output exists: ${future}`), () => true);
console.log(JSON.stringify({ status: "passed", frozenContexts: manifest.contexts.map((context) => ({ debateNumber: context.debateNumber, lockedMoves: context.packetValidation.lockedMoves })), attempts: 3, retries: 0, reasoningEffort: manifest.model.reasoningEffort, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0, modelContextsExecuted: 0 }, null, 2));
