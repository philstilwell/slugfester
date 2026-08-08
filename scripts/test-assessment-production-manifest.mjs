#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const file = "docs/assessment-production/manifest-v1.json";
const manifest = JSON.parse(await readFile(path.resolve(file), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(manifest.status, "frozen-cohort-pending-ten-debate-canary-selection");
assert.deepEqual(manifest.scope, { corpusDebates: 195, dyadicProductionDebates: 179, multiSpeakerExcluded: 16, acceptedCalibrationDebates: 5, pendingReassessments: 174, firstCheckpointSize: 10 });
assert.equal(manifest.items.length, 195);
assert.equal(new Set(manifest.items.map((item) => item.debateId)).size, 195);
assert.equal(new Set(manifest.items.map((item) => item.debateNumber)).size, 195);
assert.equal(manifest.items.filter((item) => item.disposition === "excluded-multi-speaker" && item.speakerCount >= 3).length, 16);
assert.equal(manifest.items.filter((item) => item.disposition === "calibration-finalized-pending-production-promotion" && item.acceptedCalibration).length, 5);
assert.equal(manifest.items.filter((item) => item.disposition === "pending-reassessment" && item.speakerCount === 2).length, 174);
assert.equal(manifest.items.filter((item) => item.sourceChain.transcriptSha256 && item.sourceChain.eventsSha256 && item.sourceChain.manifestSha256).length, 195);
assert.ok(manifest.scheduling.projected179Hours <= manifest.scheduling.targetHours);
assert.equal(manifest.boundaries.modelAuthoredScoresMaximum, 0);
assert.equal(manifest.authorization.tenDebateCanarySelection, true);
assert.equal(manifest.authorization.modelExecution, false);
for (const [source, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(source))), digest, `source hash mismatch: ${source}`);
for (const item of manifest.items.filter((entry) => entry.acceptedCalibration)) {
  assert.equal(sha256(await readFile(path.resolve(item.acceptedCalibration.output))), item.acceptedCalibration.outputSha256);
  assert.equal(sha256(await readFile(path.resolve(item.acceptedCalibration.compiled))), item.acceptedCalibration.compiledSha256);
}
console.log(JSON.stringify({ status: "passed", corpus: 195, production: 179, excluded: 16, finalized: 5, pending: 174, projectedHours: manifest.scheduling.projected179Hours }, null, 2));
