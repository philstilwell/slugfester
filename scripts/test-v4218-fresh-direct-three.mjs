#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { access, readFile } from "node:fs/promises";
import { V4218_ROOT } from "./lib/v4218-fresh-direct-three.mjs";

const [sample, screening] = await Promise.all(["source-only-sample.json", "sample-screening.json"].map((file) => readFile(`${V4218_ROOT}/${file}`, "utf8").then(JSON.parse)));
assert.equal(sample.debates.length, 3); assert.equal(sample.audit.distinctTopicFamilies, 3); assert.equal(sample.audit.priorFreshGateOverlap, 0); assert.equal(sample.selectionBoundary.transcriptContentAccessed, false); assert.equal(sample.selectionBoundary.legacyAssessmentContentAccessed, false);
assert.equal(screening.status, "sample-rejected-before-packet-preparation"); assert.equal(screening.audit.substantiveAnchorPassed, 2); assert.equal(screening.disposition.revisedSourceOnlySelectorAuthorized, true); assert.equal(screening.authorization.compactSourcePacketPreparation, false);
for (const future of [`${V4218_ROOT}/preparation-manifest.json`, `${V4218_ROOT}/execution-manifest.json`, `${V4218_ROOT}/model-execution.json`, `${V4218_ROOT}/analysis.json`, `${V4218_ROOT}/packets`]) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
console.log(JSON.stringify({ status: "passed-rejected-sample-preserved", debates: 3, substantiveAnchorsPassed: 2, packetPreparationAuthorized: false, revisedSelectorAuthorized: true, futureArtifactsAbsent: 5, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
