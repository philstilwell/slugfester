#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { classifyV4219PrimaryRoute } from "./lib/v4219-primary-recovery.mjs";
import { V4220_ROOT } from "./lib/v4220-source-span-rendering.mjs";

const manifest = JSON.parse(await readFile(`${V4220_ROOT}/execution-manifest.json`, "utf8"));
assert.equal(manifest.status, "frozen-three-source-span-primary-contexts-authorized"); assert.equal(manifest.contexts.length, 3); assert.equal(manifest.model.label, "5.6 Sol"); assert.equal(manifest.model.reasoningEffort, "low"); assert.equal(manifest.costEstimate.authentication, "ChatGPT subscription"); assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0); assert.equal(manifest.executionPolicy.retriesMaximum, 0); assert.equal(manifest.authorization.scoreDerivation, false); assert.equal(manifest.stopRules.targetRepairAuthorized, false); assert.equal(manifest.deterministicCompilation.modelAuthoredEvidenceText, false);
for (const context of manifest.contexts) { assert.equal(classifyV4219PrimaryRoute(context).route, "direct"); assert.equal(context.routeEvidence.durationUsedForRouting, false); }
const sha256 = (value) => createHash("sha256").update(value).digest("hex"); for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`); for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => assert.fail(`future output exists: ${future}`), () => true);
console.log(JSON.stringify({ status: "passed", frozenContexts: manifest.contexts.map((context) => ({ debateNumber: context.debateNumber, events: context.sourceLedgerEvents, copiedInputBytes: context.compactCopiedInputBytes })), attempts: 3, retries: 0, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0, modelContextsExecuted: 0 }, null, 2));
