#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { validatePostCanaryBatch01DisputeAdjudicationOutput } from "./lib/assessment-production-post-canary-batch-01-dispute-adjudication.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication";
const diagnosisPath = `${ROOT}/failure-diagnosis.json`;
const packetPath = `${ROOT}/packets/debate-195.json`;
const outputPath = `${ROOT}/outputs/debate-195.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const executionPath = `${ROOT}/model-execution.json`;
const analysisPath = `${ROOT}/analysis.json`;
const schemaPath = `${ROOT}/adjudication.schema.json`;
const runScriptPath =
  "scripts/run-assessment-production-post-canary-batch-01-dispute-adjudication.mjs";
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());

const sourcePaths = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-production/manifest-v1.json",
  `${ROOT}/preparation-manifest.json`,
  activationPath,
  executionPath,
  analysisPath,
  schemaPath,
  packetPath,
  outputPath,
  runScriptPath,
  "scripts/validate-assessment-production-post-canary-batch-01-dispute-adjudication-output.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-01-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-dispute-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-01-dispute-adjudication-failure.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-dispute-adjudication-failure-diagnosis.mjs"
];

const bytesByPath = new Map(
  await Promise.all(
    sourcePaths.map(async (file) => [file, await readFile(file)])
  )
);
const readJson = (file) => JSON.parse(bytesByPath.get(file).toString("utf8"));
const [packet, output, activation, execution, analysis, schema] = [
  packetPath,
  outputPath,
  activationPath,
  executionPath,
  analysisPath,
  schemaPath
].map(readJson);
const productionManifest = readJson("docs/assessment-production/manifest-v1.json");
const runScript = bytesByPath.get(runScriptPath).toString("utf8");

const context = activation.contexts.find(
  (item) => item.debateNumber === "195"
);
const result = execution.results.find(
  (item) => item.debateNumber === "195"
);
const productionItem = productionManifest.items.find(
  (item) => item.debateNumber === "195"
);

assert(context, "Debate 195 activation context missing");
assert(result, "Debate 195 execution result missing");
assert(productionItem, "Debate 195 production-manifest item missing");
assert.equal(packet.debateNumber, "195");
assert.equal(output.debateNumber, "195");
assert.equal(packet.debateId, "russell-copleston-existence-of-god-1948");
assert.equal(output.debateId, packet.debateId);
assert.equal(productionItem.debateId, packet.debateId);
assert.equal(productionItem.speakerCount, 2);
assert.equal(context.packetSha256, sha256(bytesByPath.get(packetPath)));
assert.equal(result.outputSha256, sha256(bytesByPath.get(outputPath)));
assert.equal(result.status, "output-validation-failed");
assert.equal(result.gateAcceptancePassed, false);
assert.equal(result.attemptCount, 1);
assert.equal(result.retryCount, 0);
assert.equal(result.timeoutExtensionCount, 0);
assert.equal(result.commandExitCode, 0);
assert.equal(result.timedOut, false);
assert.equal(result.model, "5.6 Sol");
assert.equal(result.modelSlug, "gpt-5.6-sol");
assert.equal(result.reasoningEffort, "low");
assert.equal(result.authentication, "ChatGPT subscription");
assert.equal(result.apiKeysRemoved, true);
assert.equal(result.scoreBlind, true);
assert.equal(result.paidServiceCalls, 0);
assert.equal(result.meteredApiCostUsd, 0);
assert.equal(execution.retries, 0);
assert.equal(execution.corrections, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(analysis.gate.validContexts, 9);
assert.equal(analysis.gate.semanticPass, false);
assert.equal(
  analysis.status,
  "post-canary-batch-01-dispute-only-adjudication-gate-failed-validation"
);

let validationFailure = null;
try {
  validatePostCanaryBatch01DisputeAdjudicationOutput(output, packet);
} catch (error) {
  validationFailure = error;
}
assert(validationFailure instanceof Error, "Debate 195 unexpectedly validated");
assert.equal(
  validationFailure.message,
  "burden adjustment decision count mismatch"
);
assert.match(
  result.validationMessage,
  /^Error: burden adjustment decision count mismatch\n/
);

const requiredMoveIds = packet.disputedMoves.map((move) => move.moveId);
const actualMoveIds = output.moveDecisions.map((move) => move.moveId);
assert.deepEqual(actualMoveIds, requiredMoveIds);
assert.equal(packet.disputedMoves.length, 18);
assert.equal(output.moveDecisions.length, 18);
assert.deepEqual(
  packet.burdenAdjustmentDisputes.map((item) => item.side),
  ["pro", "con"]
);
assert.equal(packet.burdenAdjustmentDisputes.length, 2);
assert.equal(output.burdenAdjustmentDecisions.length, 0);

const pairKeys = [
  "importancePair",
  "attributionPair",
  "responsePair",
  "charityPair",
  "assessmentConfidencePair"
];
const choiceKeys = [
  "importancePairChoice",
  "attributionPairChoice",
  "responsePairChoice",
  "charityPairChoice",
  "assessmentConfidencePairChoice"
];
const requiredMoveSelections = packet.disputedMoves.reduce(
  (total, move) =>
    total +
    pairKeys.filter((key) => move.candidates[key] !== null).length +
    Object.keys(move.candidates.scoringFields).length,
  0
);
const actualMoveSelections = output.moveDecisions.reduce(
  (total, move) =>
    total +
    choiceKeys.filter((key) => move[key] !== null).length +
    move.scoringFieldChoices.length,
  0
);
assert.equal(requiredMoveSelections, 41);
assert.equal(actualMoveSelections, requiredMoveSelections);
assert.equal(context.candidateSelections, 43);
assert.equal(
  requiredMoveSelections + packet.burdenAdjustmentDisputes.length,
  context.candidateSelections
);
assert.equal(
  context.candidateSelections - actualMoveSelections,
  2
);

const expectedAudit = {
  allDisputedMovesDecidedOnce: true,
  onlyCandidateValuesSelected: true,
  dependencyPairsKeptIndivisible: true,
  nondisputedFieldsUntouched: true,
  calculatedScoresAbsent: true,
  publicationProseAbsent: true
};
assert.equal(canonicalJson(output.audit), canonicalJson(expectedAudit));
assert.equal(
  schema.properties.burdenAdjustmentDecisions.minItems,
  0
);
assert.equal(
  schema.properties.burdenAdjustmentDecisions.maxItems,
  2
);
assert.match(
  runScript,
  /Decide every required anonymous candidate pair and scoring field exactly once/
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-dispute-adjudication-failure-diagnosis",
  protocolId:
    "assessment-production-post-canary-batch-01-dispute-adjudication-failure-diagnosis",
  status:
    "debate-195-required-burden-adjustment-decisions-omitted-confirmed-frozen-no-correction-authorized",
  frozenAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  userAuthorization: {
    scope: "deterministic diagnosis, validation, freezing, committing, and pushing of the preserved Debate 195 adjudication validation failure only",
    directIncrementalCostUsdMaximum: 0,
    modelExecution: false,
    retry: false,
    repair: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  preservedGate: {
    analysisPath,
    analysisStatus: analysis.status,
    validContexts: analysis.gate.validContexts,
    requiredValidContexts: analysis.gate.requiredValidContexts,
    debate195Accepted: false,
    erasedReclassifiedOrRepaired: false
  },
  debate: {
    debateNumber: "195",
    debateId: packet.debateId,
    speakerCount: productionItem.speakerCount,
    packetPath,
    packetSha256: sha256(bytesByPath.get(packetPath)),
    outputPath,
    outputSha256: sha256(bytesByPath.get(outputPath))
  },
  execution: {
    contextIndex: result.contextIndex,
    model: result.model,
    modelSlug: result.modelSlug,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    scoreBlind: result.scoreBlind,
    apiKeysRemoved: result.apiKeysRemoved,
    attemptCount: result.attemptCount,
    retryCount: result.retryCount,
    timeoutExtensionCount: result.timeoutExtensionCount,
    commandExitCode: result.commandExitCode,
    timedOut: result.timedOut,
    gateAcceptancePassed: result.gateAcceptancePassed,
    validationMessage: validationFailure.message
  },
  diagnosis: {
    failureClass:
      "required-burden-adjustment-decisions-omitted-with-non-instance-specific-transport-cardinality",
    packetDisputedMoves: packet.disputedMoves.length,
    outputMoveDecisions: output.moveDecisions.length,
    moveDecisionIdsMatchInRequiredOrder: true,
    requiredMoveCandidateSelections: requiredMoveSelections,
    outputMoveCandidateSelections: actualMoveSelections,
    requiredBurdenAdjustmentDecisions: packet.burdenAdjustmentDisputes.length,
    requiredBurdenAdjustmentSides: packet.burdenAdjustmentDisputes.map(
      (item) => item.side
    ),
    outputBurdenAdjustmentDecisions: output.burdenAdjustmentDecisions.length,
    missingBurdenAdjustmentDecisions: 2,
    requiredCandidateSelectionsTotal: context.candidateSelections,
    presentCandidateSelectionsBeforeFailure: actualMoveSelections,
    missingCandidateSelections: context.candidateSelections - actualMoveSelections,
    firstFailingDeterministicAssertion:
      "burden adjustment decision count mismatch",
    allMoveChecksPrecedingFailurePassed: true,
    outputAuditFieldsPresentAndTrue: true,
    transportInstructionRequiredEveryPair: true,
    transportSchemaBurdenAdjustmentMinimumItems: 0,
    transportSchemaBurdenAdjustmentMaximumItems: 2,
    emptyBurdenAdjustmentArrayPermittedByTransportSchemaCardinality: true,
    exactPacketCardinalityEnforcedByDeterministicValidator: true,
    immediateCause:
      "The preserved output supplied an empty burdenAdjustmentDecisions array although the frozen Debate 195 packet required pro and con decisions.",
    contributingCondition:
      "The shared frozen transport schema allowed zero through two burden-adjustment entries, so constrained generation did not structurally require Debate 195's packet-specific count of two; the deterministic validator correctly enforced that count after generation.",
    sourceFailureDetected: false,
    identityFailureDetected: false,
    isolationFailureDetected: false,
    timeoutFailureDetected: false,
    commandFailureDetected: false,
    scoreBlindnessFailureDetected: false,
    validatorFailureDetected: false
  },
  preservation: {
    outputBytesChanged: false,
    outputRevalidatedButNotAccepted: true,
    retryAttempted: false,
    repairAttempted: false,
    modelContextsExecuted: 0,
    paidServicesUsed: 0,
    ledgersAssembled: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0
  },
  sourceHashes: Object.fromEntries(
    sourcePaths.map((file) => [file, sha256(bytesByPath.get(file))])
  ),
  costs: {
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    scoresDerived: 0
  },
  authorization: {
    adjudicationCorrectionPacketPreparation: false,
    adjudicationModelExecution: false,
    judgmentModelExecution: false,
    retry: false,
    repair: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "user-approval-required-before-any-debate-195-adjudication-correction-preparation-or-downstream-work"
};

if (shouldWrite) {
  await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      debateNumber: "195",
      requiredBurdenAdjustmentDecisions: 2,
      outputBurdenAdjustmentDecisions: 0,
      missingCandidateSelections: 2,
      originalOutputPreserved: true,
      modelContexts: 0,
      paidServiceCalls: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction
    },
    null,
    2
  )
);
