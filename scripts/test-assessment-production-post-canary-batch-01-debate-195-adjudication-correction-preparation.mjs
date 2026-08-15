#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_AUDIT,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_EVIDENCE_BOUNDARY,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ISOLATION,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_OUTPUT_VERSION,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT,
  validatePostCanaryBatch01Debate195CorrectionOutput,
  validatePostCanaryBatch01Debate195CorrectionPacket
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT;
const manifestPath = `${ROOT}/execution-preparation-manifest.json`;
const packetPath = `${ROOT}/packet.json`;
const schemaPath = `${ROOT}/schema.json`;
const manualPath = `${ROOT}/manual.md`;
const originalPacketPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/packets/debate-195.json";
const originalOutputPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/outputs/debate-195.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [manifestBytes, packetBytes, schemaBytes, manualBytes, originalPacketBytes, originalOutputBytes] =
  await Promise.all(
    [
      manifestPath,
      packetPath,
      schemaPath,
      manualPath,
      originalPacketPath,
      originalOutputPath
    ].map((file) => readFile(file))
  );
const manifest = JSON.parse(manifestBytes);
const packet = JSON.parse(packetBytes);
const schema = JSON.parse(schemaBytes);
const originalPacket = JSON.parse(originalPacketBytes);
const originalOutput = JSON.parse(originalOutputBytes);

assert.equal(
  manifest.status,
  "frozen-one-score-blind-debate-195-burden-adjustment-correction-context-prepared-not-authorized"
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 1);
assert.equal(manifest.correctionNumber, 1);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.contexts.length, 1);
assert.equal(manifest.contexts[0].contextIndex, 0);
assert.equal(manifest.contexts[0].debateNumber, "195");
assert.equal(manifest.contexts[0].burdenAdjustmentDisputes, 2);
assert.deepEqual(manifest.contexts[0].requiredSides, ["pro", "con"]);
assert.equal(manifest.contexts[0].candidateSelections, 2);
assert.equal(manifest.contexts[0].moveDecisions, 0);
assert.deepEqual(manifest.contexts[0].audioTranscriptInputs, []);
assert.equal(manifest.contexts[0].packetSha256, sha256(packetBytes));
assert.equal(manifest.contexts[0].schemaSha256, sha256(schemaBytes));
assert.equal(manifest.contexts[0].manualSha256, sha256(manualBytes));
assert.equal(
  manifest.contexts[0].copiedInputBytes,
  packetBytes.length + schemaBytes.length + manualBytes.length
);

const packetValidation =
  validatePostCanaryBatch01Debate195CorrectionPacket(packet);
assert.equal(packetValidation.status, "passed");
assert.equal(packetValidation.burdenAdjustmentDisputes, 2);
assert.equal(packetValidation.candidateSelections, 2);
assert.equal(packetValidation.moveDecisions, 0);
assert.equal(packetValidation.calculatedScores, 0);
assert.equal(
  canonicalJson(packet.burdenAdjustmentDisputes),
  canonicalJson(originalPacket.burdenAdjustmentDisputes)
);
assert.equal(
  canonicalJson(packet.evidenceBoundary),
  canonicalJson(POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_EVIDENCE_BOUNDARY)
);
assert.equal(Object.hasOwn(packet, "disputedMoves"), false);
assert.equal(Object.hasOwn(packet, "moveDecisions"), false);

const decisionSchema = schema.properties.burdenAdjustmentDecisions;
assert.equal(decisionSchema.minItems, 2);
assert.equal(decisionSchema.maxItems, 2);
assert.equal(decisionSchema.items, false);
assert.equal(decisionSchema.prefixItems.length, 2);
assert.equal(decisionSchema.prefixItems[0].properties.side.const, "pro");
assert.equal(decisionSchema.prefixItems[1].properties.side.const, "con");
assert.equal(
  decisionSchema.prefixItems[0].properties.rationale.minLength,
  40
);
assert.equal(
  decisionSchema.prefixItems[1].properties.rationale.minLength,
  40
);

const validOutputFixture = {
  schemaVersion: POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_OUTPUT_VERSION,
  protocolId: POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID,
  debateNumber: "195",
  debateId: "russell-copleston-existence-of-god-1948",
  reviewerRole: "isolated-burden-adjustment-correction-adjudicator",
  assessmentModel: "5.6 Sol",
  correctionOnly: true,
  isolation: structuredClone(
    POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ISOLATION
  ),
  burdenAdjustmentDecisions: [
    {
      side: "pro",
      choice: 1,
      rationale:
        "Fixture rationale long enough to validate the required pro decision contract."
    },
    {
      side: "con",
      choice: 2,
      rationale:
        "Fixture rationale long enough to validate the required con decision contract."
    }
  ],
  audit: structuredClone(POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_AUDIT),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false
};
const validOutputResult =
  validatePostCanaryBatch01Debate195CorrectionOutput(validOutputFixture, packet);
assert.equal(validOutputResult.status, "passed");
assert.equal(validOutputResult.burdenAdjustmentDecisions, 2);
assert.equal(validOutputResult.preservedMoveDecisions, 18);
assert.equal(validOutputResult.calculatedScores, 0);
const incompleteOutputFixture = structuredClone(validOutputFixture);
incompleteOutputFixture.burdenAdjustmentDecisions.pop();
assert.throws(
  () =>
    validatePostCanaryBatch01Debate195CorrectionOutput(
      incompleteOutputFixture,
      packet
    ),
  /must contain exactly two burden-adjustment decisions/
);

assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.scoreBlind, true);
assert.equal(manifest.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(manifest.activePolicy.version, "v2.2");
assert.equal(
  manifest.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(manifest.activePolicy.scoreCalculationAuthorizedThisStage, false);

assert.deepEqual(Object.values(manifest.modelInputs), [
  manualPath,
  packetPath,
  schemaPath
]);
assert.equal(
  Object.values(manifest.modelInputs).includes(originalPacketPath),
  false
);
assert.equal(
  Object.values(manifest.modelInputs).includes(originalOutputPath),
  false
);
for (const value of Object.values(manifest.isolation)) assert.equal(value, true);
for (const value of Object.values(manifest.stopRules)) assert.equal(value, true);

assert.equal(manifest.preservedOriginal.outputSha256, sha256(originalOutputBytes));
assert.equal(manifest.preservedOriginal.moveDecisionCount, 18);
assert.equal(originalOutput.moveDecisions.length, 18);
assert.equal(originalOutput.burdenAdjustmentDecisions.length, 0);
assert.equal(
  manifest.preservedOriginal.moveDecisionsSha256,
  sha256(Buffer.from(canonicalJson(originalOutput.moveDecisions)))
);
assert.equal(manifest.preservedOriginal.moveCandidateSelections, 41);
assert.equal(manifest.preservedOriginal.gateAcceptancePassed, false);
assert.equal(manifest.preservedOriginal.immutable, true);
assert.equal(manifest.preservedOriginal.unavailableToCorrectionModel, true);
assert.equal(manifest.preservedOriginal.mutationAuthorized, false);

assert.equal(manifest.executionPolicy.contexts, 1);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 1);
assert.equal(manifest.executionPolicy.scheduler, "single-context");
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.preparationStageDirectIncrementalCostUsd, 0);
assert.equal(manifest.costEstimate.futureDirectIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.paidServiceCostUsdMaximum, 0);
assert.equal(manifest.deterministicValidation.exactPacketDisputes, 2);
assert.equal(manifest.deterministicValidation.exactOutputDecisionsRequired, 2);
assert.equal(manifest.deterministicValidation.transportSchemaMinimumItems, 2);
assert.equal(manifest.deterministicValidation.transportSchemaMaximumItems, 2);
assert.equal(manifest.deterministicValidation.calculatedScores, 0);
assert.equal(manifest.deterministicValidation.deterministicMergeAuthorized, false);
assert.equal(
  Object.values(manifest.authorization).every((value) => value === false),
  true
);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, future), false);
  assert.equal(await exists(future), false, `future output exists: ${future}`);
}
assert.equal(
  manifest.nextAuthorizedAction,
  "user-approval-required-before-exactly-one-debate-195-burden-adjustment-correction-context-activation-or-any-model-execution"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debateNumber: "195",
      contexts: 1,
      burdenAdjustmentDisputes: 2,
      candidateSelections: 2,
      preservedMoveDecisions: 18,
      transportSchemaItems: [2, 2],
      attemptsPerContext: 1,
      retriesMaximum: 0,
      modelExecutionAuthorized: false,
      paidServicesAuthorized: false,
      scoresDerived: 0,
      directIncrementalCostUsdMaximum: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
