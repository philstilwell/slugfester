#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication-finalization.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const manifest = JSON.parse(
  await readFile(
    path.resolve(`${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/preparation-manifest.json`),
    "utf8"
  )
);
const compatibility = JSON.parse(
  await readFile(path.resolve(manifest.inputs.compatibilityAnalysis), "utf8")
);
assert.equal(manifest.status, "publication-finalization-plan-prepared-and-frozen");
assert.deepEqual(manifest.explicitOrder, CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER);
assert.equal(manifest.contexts.length, 10);
assert.equal(manifest.aggregateExpectations.sections, 51);
assert.equal(manifest.aggregateExpectations.moves, 188);
assert.equal(manifest.aggregateExpectations.overallBlunders, 56);
assert.equal(manifest.aggregateExpectations.emptyOverallReferenceLinks, 53);
assert.equal(manifest.aggregateExpectations.modelContexts, 0);
assert.equal(manifest.aggregateExpectations.modelAuthoredScores, 0);
assert.equal(manifest.costEstimate.directCostUsd, 0);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.participantJudgmentWasScoreBlind, true);
assert.equal(manifest.finalizationPolicy.onlyAllowedDisplayTransformation, "remove-stagingAudit");
assert.equal(manifest.finalizationPolicy.displayFieldsChanged, 0);
assert.equal(manifest.finalizationPolicy.participantScoresChanged, false);
assert.equal(manifest.finalizationPolicy.scoresRecalculated, false);
assert.equal(manifest.finalizationPolicy.productionFilesWritable, false);
assert.equal(manifest.finalizationPolicy.rankingFilesWritable, false);
assert.equal(manifest.finalizationPolicy.productionLedgerFilesWritable, false);
assert.equal(manifest.authorization.publicationFinalizationExecutionActivation, false);
assert.equal(manifest.authorization.publicationFinalization, false);
assert.equal(manifest.authorization.renderingVerification, false);
assert.equal(manifest.authorization.validatorMigration, false);
assert.equal(manifest.authorization.productionLedgerPublication, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(manifest.compatibilityBoundary.productionMutationBlocked, true);
assert.deepEqual(manifest.compatibilityBoundary.blockers, [
  "optional-overall-reference-links",
  "checkpoint-ledger-schema-adapter"
]);
assert.equal(compatibility.status, "production-mutation-compatibility-blockers-recorded");
assert.equal(compatibility.findings.length, 2);
assert.ok(compatibility.findings.every((finding) => finding.blocksProductionMutation));
assert.ok(compatibility.findings.every((finding) => !finding.blocksFinalizationStaging));
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(
    sha256(await readFile(path.resolve(file))),
    digest,
    `source hash mismatch: ${file}`
  );
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(file), false, `future output unexpectedly exists: ${file}`);
}
const appSource = await readFile(path.resolve("src/app.js"), "utf8");
assert.match(appSource, /export function renderPublicationStagingDebate\(/);
assert.match(appSource, /Publication staging preview:/);
console.log(JSON.stringify({
  status: "passed",
  planFrozen: true,
  debates: 10,
  sections: 51,
  moves: 188,
  compatibilityBlockers: 2,
  modelContexts: 0,
  directCostUsd: 0,
  finalCandidatesWritten: false,
  previewWritten: false,
  productionMutation: false
}, null, 2));
