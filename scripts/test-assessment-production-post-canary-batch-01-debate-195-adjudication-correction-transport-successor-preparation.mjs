#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_AUDIT,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ISOLATION,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_OUTPUT_VERSION,
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID,
  validatePostCanaryBatch01Debate195CorrectionOutput,
  validatePostCanaryBatch01Debate195CorrectionPacket
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const ADJ_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication";
const PREDECESSOR_ROOT = `${ADJ_ROOT}/correction-1`;
const ROOT = `${ADJ_ROOT}/correction-2`;
const manifestPath = `${ROOT}/execution-preparation-manifest.json`;
const schemaPath = `${ROOT}/schema.json`;
const packetPath = `${PREDECESSOR_ROOT}/packet.json`;
const manualPath = `${PREDECESSOR_ROOT}/manual.md`;
const predecessorSchemaPath = `${PREDECESSOR_ROOT}/schema.json`;
const predecessorOutputPath = `${PREDECESSOR_ROOT}/correction-output.json`;
const originalOutputPath = `${ADJ_ROOT}/outputs/debate-195.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [
  manifestBytes,
  schemaBytes,
  packetBytes,
  manualBytes,
  predecessorSchemaBytes,
  originalOutputBytes
] = await Promise.all(
  [
    manifestPath,
    schemaPath,
    packetPath,
    manualPath,
    predecessorSchemaPath,
    originalOutputPath
  ].map((file) => readFile(file))
);
const manifest = JSON.parse(manifestBytes);
const schema = JSON.parse(schemaBytes);
const packet = JSON.parse(packetBytes);
const predecessorSchema = JSON.parse(predecessorSchemaBytes);
const originalOutput = JSON.parse(originalOutputBytes);

assert.equal(
  manifest.status,
  "frozen-one-score-blind-debate-195-burden-adjustment-transport-successor-context-prepared-not-authorized"
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 1);
assert.equal(manifest.correctionNumber, 2);
assert.equal(manifest.predecessorCorrectionNumber, 1);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.userAuthorization.directIncrementalCostUsdMaximum, 0);
for (const key of [
  "packetPreparation",
  "packetMutation",
  "manualPreparation",
  "modelExecution",
  "correctionRetry",
  "paidServices",
  "outputMerge",
  "finalLedgerAssembly",
  "scoreDerivation",
  "publicationReconstruction",
  "productionMutation",
  "nextBatchSelection"
]) {
  assert.equal(manifest.userAuthorization[key], false, `${key} must be false`);
}

const packetValidation =
  validatePostCanaryBatch01Debate195CorrectionPacket(packet);
assert.equal(packetValidation.status, "passed");
assert.equal(packetValidation.burdenAdjustmentDisputes, 2);
assert.equal(packetValidation.candidateSelections, 2);
assert.equal(packetValidation.moveDecisions, 0);
assert.equal(packetValidation.calculatedScores, 0);
assert.equal(manifest.preservedInputs.packet, packetPath);
assert.equal(manifest.preservedInputs.packetSha256, sha256(packetBytes));
assert.equal(manifest.preservedInputs.packetReusedByteForByte, true);
assert.equal(manifest.preservedInputs.packetCopiedOrRewritten, false);
assert.equal(manifest.preservedInputs.manual, manualPath);
assert.equal(manifest.preservedInputs.manualSha256, sha256(manualBytes));
assert.equal(manifest.preservedInputs.manualReusedByteForByte, true);
assert.equal(manifest.preservedInputs.manualCopiedOrRewritten, false);
assert.equal(await exists(`${ROOT}/packet.json`), false);
assert.equal(await exists(`${ROOT}/manual.md`), false);

const predecessorDecisionSchema =
  predecessorSchema.properties.burdenAdjustmentDecisions;
const successorDecisionSchema = schema.properties.burdenAdjustmentDecisions;
assert.equal(predecessorDecisionSchema.items, false);
assert.equal(typeof predecessorDecisionSchema.items, "boolean");
assert.equal(predecessorDecisionSchema.prefixItems.length, 2);
assert.equal(successorDecisionSchema.type, "array");
assert.equal(successorDecisionSchema.minItems, 2);
assert.equal(successorDecisionSchema.maxItems, 2);
assert.equal(Object.hasOwn(successorDecisionSchema, "prefixItems"), false);
assert.equal(typeof successorDecisionSchema.items, "object");
assert.equal(Array.isArray(successorDecisionSchema.items), false);
assert.equal(successorDecisionSchema.items.additionalProperties, false);
assert.deepEqual(successorDecisionSchema.items.required, [
  "side",
  "choice",
  "rationale"
]);
assert.deepEqual(successorDecisionSchema.items.properties.side.enum, [
  "pro",
  "con"
]);
assert.deepEqual(successorDecisionSchema.items.properties.choice.enum, [1, 2]);
assert.equal(
  successorDecisionSchema.items.properties.rationale.minLength,
  40
);

const predecessorWithoutDecisionSchema = structuredClone(predecessorSchema);
const successorWithoutDecisionSchema = structuredClone(schema);
delete predecessorWithoutDecisionSchema.properties.burdenAdjustmentDecisions;
delete successorWithoutDecisionSchema.properties.burdenAdjustmentDecisions;
assert.equal(
  canonicalJson(predecessorWithoutDecisionSchema),
  canonicalJson(successorWithoutDecisionSchema)
);
const predecessorProItem = structuredClone(
  predecessorDecisionSchema.prefixItems[0]
);
delete predecessorProItem.properties.side;
const successorItemWithoutSide = structuredClone(successorDecisionSchema.items);
delete successorItemWithoutSide.properties.side;
assert.equal(
  canonicalJson(predecessorProItem),
  canonicalJson(successorItemWithoutSide)
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
const reversedSideFixture = structuredClone(validOutputFixture);
reversedSideFixture.burdenAdjustmentDecisions.reverse();
assert.throws(
  () =>
    validatePostCanaryBatch01Debate195CorrectionOutput(
      reversedSideFixture,
      packet
    ),
  /burdenAdjustmentDecisions\[0\] mismatch/
);

assert.equal(manifest.transportSuccessor.schema, schemaPath);
assert.equal(manifest.transportSuccessor.schemaSha256, sha256(schemaBytes));
assert.equal(
  manifest.transportSuccessor.predecessorSchemaSha256,
  sha256(predecessorSchemaBytes)
);
assert.equal(
  manifest.transportSuccessor.diagnosedItemsObjectRequirementAddressed,
  true
);
assert.equal(manifest.transportSuccessor.arrayItemsValueType, "object");
assert.equal(manifest.transportSuccessor.positionalKeywordOmitted, "prefixItems");
assert.equal(
  manifest.transportSuccessor.positionalKeywordCompatibilityClaimed,
  false
);
assert.equal(manifest.transportSuccessor.minimumItems, 2);
assert.equal(manifest.transportSuccessor.maximumItems, 2);
assert.deepEqual(manifest.transportSuccessor.itemSideEnum, ["pro", "con"]);
assert.equal(manifest.transportSuccessor.transportSchemaShapeChanged, true);
assert.equal(manifest.transportSuccessor.semanticOutputContractChanged, false);
assert.equal(
  manifest.transportSuccessor.deterministicSideOrderValidationRequired,
  true
);
assert.equal(manifest.transportSuccessor.staticValidationPassed, true);
assert.equal(manifest.transportSuccessor.APITransportAcceptanceProven, false);
assert.equal(
  manifest.transportSuccessor.modelExecutionRequiredForTransportProof,
  true
);

assert.equal(manifest.contexts.length, 1);
assert.equal(manifest.contexts[0].contextIndex, 0);
assert.equal(manifest.contexts[0].debateNumber, "195");
assert.equal(manifest.contexts[0].packet, packetPath);
assert.equal(manifest.contexts[0].packetSha256, sha256(packetBytes));
assert.equal(manifest.contexts[0].schema, schemaPath);
assert.equal(manifest.contexts[0].schemaSha256, sha256(schemaBytes));
assert.equal(manifest.contexts[0].manual, manualPath);
assert.equal(manifest.contexts[0].manualSha256, sha256(manualBytes));
assert.equal(manifest.contexts[0].burdenAdjustmentDisputes, 2);
assert.deepEqual(manifest.contexts[0].requiredSides, ["pro", "con"]);
assert.equal(manifest.contexts[0].candidateSelections, 2);
assert.equal(manifest.contexts[0].moveDecisions, 0);
assert.deepEqual(manifest.contexts[0].audioTranscriptInputs, []);
assert.equal(
  manifest.contexts[0].copiedInputBytes,
  packetBytes.length + schemaBytes.length + manualBytes.length
);

assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.scoreBlind, true);
assert.equal(manifest.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(manifest.model.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.activePolicy.version, "v2.2");
assert.equal(
  manifest.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(manifest.activePolicy.scoreCalculationAuthorizedThisStage, false);
for (const value of Object.values(manifest.isolation)) assert.equal(value, true);
for (const value of Object.values(manifest.stopRules)) assert.equal(value, true);

assert.equal(manifest.preservedOriginal.outputSha256, sha256(originalOutputBytes));
assert.equal(originalOutput.moveDecisions.length, 18);
assert.equal(originalOutput.burdenAdjustmentDecisions.length, 0);
assert.equal(manifest.preservedOriginal.moveDecisionCount, 18);
assert.equal(manifest.preservedOriginal.moveCandidateSelections, 41);
assert.equal(manifest.preservedOriginal.immutable, true);
assert.equal(manifest.preservedOriginal.unavailableToCorrectionModel, true);
assert.equal(manifest.preservedOriginal.mutationAuthorized, false);
assert.equal(await exists(predecessorOutputPath), false);

assert.equal(manifest.executionPolicy.contexts, 1);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 1);
assert.equal(manifest.executionPolicy.scheduler, "single-context");
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.executionPolicy.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.preparationStageDirectIncrementalCostUsd, 0);
assert.equal(manifest.costEstimate.futureDirectIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.paidServiceCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.equal(
  Object.values(manifest.authorization).every((value) => value === false),
  true
);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    digest,
    `source hash mismatch: ${file}`
  );
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, future), false);
  assert.equal(await exists(future), false, `future output exists: ${future}`);
}
assert.equal(
  manifest.nextAuthorizedAction,
  "user-approval-required-before-any-debate-195-transport-successor-activation-or-model-execution"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debateNumber: "195",
      correctionNumber: 2,
      contexts: 1,
      packetReusedByteForByte: true,
      transportSchemaItemsValueType: "object",
      prefixItemsOmitted: true,
      deterministicSideOrderValidated: true,
      transportAcceptanceProven: false,
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
