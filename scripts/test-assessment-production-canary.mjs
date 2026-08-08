#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V424_TOPIC_FAMILIES } from "./lib/v424-source-classification.mjs";

const file = "docs/assessment-production/canary-v1.json";
const artifact = JSON.parse(await readFile(path.resolve(file), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(artifact.status, "frozen-ten-debate-canary-pending-packet-preparation");
assert.equal(artifact.debates.length, 10);
assert.equal(new Set(artifact.debates.map((item) => item.debateId)).size, 10);
assert.ok(artifact.debates.every((item) => item.sides.pro.speakers.length === 1 && item.sides.con.speakers.length === 1));
assert.ok(V424_TOPIC_FAMILIES.every((family) => artifact.observedCoverage.family[family] >= 1));
for (const dimension of ["durationBand", "sourceComplexityBand"]) assert.ok(Object.values(artifact.observedCoverage[dimension]).every((count) => count >= 2));
for (const kind of ["auto", "human", "api"]) assert.ok(artifact.observedCoverage.captionKind[kind] >= 1);
assert.deepEqual(artifact.cost, { modelContexts: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 });
assert.equal(artifact.authorization.packetPreparation, true);
assert.equal(artifact.authorization.modelExecution, false);
for (const [source, digest] of Object.entries(artifact.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(source))), digest, `source hash mismatch: ${source}`);
console.log(JSON.stringify({ status: "passed", debates: 10, topicFamilies: Object.keys(artifact.observedCoverage.family).length, captionKinds: Object.keys(artifact.observedCoverage.captionKind).length, modelContexts: 0, nextAuthorized: "canary-packet-preparation" }, null, 2));
