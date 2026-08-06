#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { V42211_ROOT } from "./lib/v42211-charity-closure.mjs";

const manifest = JSON.parse(await readFile(`${V42211_ROOT}/execution-manifest.json`, "utf8"));
assert.equal(manifest.status, "frozen-one-fresh-debate-195-pass-b-recovery-authorized"); assert.equal(manifest.context.debateNumber, "195"); assert.equal(manifest.model.label, "5.6 Sol"); assert.equal(manifest.model.reasoningEffort, "high"); assert.equal(manifest.costEstimate.authentication, "ChatGPT subscription"); assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0); assert.equal(manifest.executionPolicy.attempts, 1); assert.equal(manifest.executionPolicy.retriesMaximum, 0); assert.equal(manifest.deterministicValidation.untestedDescriptionsMustBeEmpty, true); assert.equal(manifest.deterministicValidation.untestedRatingMustEqual75, true); assert.equal(manifest.authorization.scoreDerivation, false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex"); for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`); for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => assert.fail(`future output exists: ${future}`), () => true);
console.log(JSON.stringify({ status: "passed", debate: "195", contexts: 1, attempts: 1, retries: 0, reasoningEffort: manifest.model.reasoningEffort, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0, modelContextsExecuted: 0 }, null, 2));
