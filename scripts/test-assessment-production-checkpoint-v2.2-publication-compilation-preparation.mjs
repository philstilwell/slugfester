#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const manifest = JSON.parse(
  await readFile(path.resolve(`${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/preparation-manifest.json`), "utf8")
);
const identity = JSON.parse(await readFile(path.resolve(manifest.artifacts.identitySnapshot), "utf8"));

assert.equal(manifest.status, "deterministic-publication-compilation-plan-prepared-and-frozen");
assert.deepEqual(manifest.explicitOrder, CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER);
assert.equal(manifest.contexts.length, 10);
assert.equal(manifest.aggregateExpectations.moves, 188);
assert.equal(manifest.aggregateExpectations.critiques, 188);
assert.equal(manifest.aggregateExpectations.modelContexts, 0);
assert.equal(manifest.aggregateExpectations.modelAuthoredScores, 0);
assert.equal(manifest.costEstimate.directCostUsd, 0);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.participantJudgmentWasScoreBlind, true);
assert.equal(manifest.authorization.deterministicCompilationExecutionActivation, false);
assert.equal(manifest.authorization.deterministicCompilation, false);
assert.equal(manifest.authorization.publicationFinalization, false);
assert.equal(manifest.authorization.renderingVerification, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(manifest.compilationPolicy.iterateExplicitOrderArrayDirectly, true);
assert.equal(manifest.compilationPolicy.numericObjectKeyEnumerationProhibited, true);
assert.equal(manifest.compilationPolicy.currentProductionInputLimitedToFrozenIdentitySnapshot, true);
assert.equal(manifest.compilationPolicy.legacyScoresUnavailable, true);
assert.equal(manifest.compilationPolicy.legacyProseUnavailable, true);
assert.equal(manifest.compilationPolicy.legacyTagsUnavailable, true);
assert.equal(manifest.compilationPolicy.legacyWinnerUnavailable, true);
assert.equal(manifest.compilationPolicy.scoresRecalculated, false);
assert.equal(manifest.compilationPolicy.modelAuthoredScores, 0);
assert.equal(manifest.stopRules.partialCompiledOutputWriteProhibited, true);
assert.equal(identity.status, "frozen-minimal-production-identity-only");
assert.deepEqual(identity.allowedFields, ["id", "number", "topicCategory"]);
assert.equal(identity.rows.length, 10);
assert.deepEqual(identity.rows.map((row) => row.number), CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER);
for (const row of identity.rows) {
  assert.ok(Object.keys(row).every((key) => ["id", "number", "topicCategory"].includes(key)));
}
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(file), false, `future output unexpectedly exists: ${file}`);
}
console.log(JSON.stringify({
  status: "passed",
  planFrozen: true,
  debates: manifest.contexts.length,
  explicitOrder: manifest.explicitOrder,
  modelContexts: 0,
  directCostUsd: 0,
  compiledOutputsWritten: false,
  productionMutation: false
}, null, 2));
