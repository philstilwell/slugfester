#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { loadAndValidateRecoveryAuthorization } from
  "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "invalid --frozen-at");
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03";
const ADJ = `${ROOT}/dispute-only-adjudication`;
const RECOVERY = `${ADJ}/failure-recovery`;
const preparationPath = `${RECOVERY}/correction-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const paths = {
  recoveryAuthorization: `${ROOT}/failure-recovery-standing-authorization.json`,
  diagnosis: `${RECOVERY}/debate-124-timeout-diagnosis.json`,
  originalActivation: `${ADJ}/execution-activation.json`,
  originalExecution: `${ADJ}/model-execution.json`,
  originalAnalysis: `${ADJ}/analysis.json`,
  originalPacket: `${ADJ}/packets/debate-124.json`,
  schema: `${ADJ}/adjudication.schema.json`
};
const tools = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-debate-124-adjudication-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-debate-124-adjudication-correction.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-debate-124-adjudication-correction.mjs",
  "scripts/merge-assessment-production-post-canary-batch-03-debate-124-adjudication-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-gate.mjs"
];
const { record: recovery } = await loadAndValidateRecoveryAuthorization();
const inputBytes = Object.fromEntries(
  await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await readFile(file)]))
);
const diagnosis = JSON.parse(inputBytes.diagnosis);
const activation = JSON.parse(inputBytes.originalActivation);
const originalExecution = JSON.parse(inputBytes.originalExecution);
const originalPacket = JSON.parse(inputBytes.originalPacket);
const originalContext = activation.contexts[0];
assertV4(
  recovery.authorization.boundedFirstCorrection === true &&
    diagnosis.status === "frozen-diagnosed-batch-03-debate-124-timeout-before-schema-result" &&
    diagnosis.minimumBoundedCorrection.shardCount === 2 &&
    originalExecution.results[0].outputWritten === false &&
    originalContext.packetSha256 === sha256(inputBytes.originalPacket) &&
    originalContext.candidateSelections === 67,
  "Debate 124 correction source boundary changed"
);
const shardDefinitions = [
  diagnosis.minimumBoundedCorrection.shard01,
  diagnosis.minimumBoundedCorrection.shard02
];
const modelInputs = activation.modelInputs;
const sharedInputFiles = Object.values(modelInputs);
const sharedInputBytes = (await Promise.all(sharedInputFiles.map((file) => readFile(file))))
  .reduce((sum, bytes) => sum + bytes.length, 0);
const sourceHashes = {};
for (const [key, file] of Object.entries(paths)) sourceHashes[file] = sha256(inputBytes[key]);
for (const file of [...sharedInputFiles, ...tools]) sourceHashes[file] = sha256(await readFile(file));
const contexts = [];
for (let index = 0; index < shardDefinitions.length; index += 1) {
  const definition = shardDefinitions[index];
  const shardId = `shard-${String(index + 1).padStart(2, "0")}`;
  const moveSet = new Set(definition.moveIds);
  const burdenSet = new Set(definition.burdenAdjustmentSides);
  const packet = structuredClone(originalPacket);
  packet.disputedMoves = packet.disputedMoves.filter((move) => moveSet.has(move.moveId));
  packet.burdenAdjustmentDisputes = packet.burdenAdjustmentDisputes
    .filter((item) => burdenSet.has(item.side));
  assertV4(packet.disputedMoves.length === definition.moveIds.length,
    `${shardId}: move partition changed`);
  const packetPath = `${RECOVERY}/packets/debate-124-${shardId}.json`;
  const outputPath = `${RECOVERY}/outputs/debate-124-${shardId}.json`;
  const packetBytes = pretty(packet);
  const audioTranscriptInputs = originalContext.audioTranscriptInputs
    .filter((item) => moveSet.has(item.moveId));
  let audioBytes = 0;
  for (const input of audioTranscriptInputs) {
    const bytes = await readFile(input.sourcePath);
    assertV4(sha256(bytes) === input.sha256, `${shardId}: audio transcript drifted`);
    sourceHashes[input.sourcePath] = input.sha256;
    audioBytes += bytes.length;
  }
  const synthetic = {
    schemaVersion: originalPacket.schemaVersion.replace("packet", "output"),
    protocolId: originalPacket.protocolId,
    debateNumber: originalPacket.debateNumber,
    debateId: originalPacket.debateId,
    reviewerRole: "isolated-disputed-fields-only-adjudicator",
    assessmentModel: "5.6 Sol",
    isolation: {
      candidateOrderingAnonymous: true, passIdentitiesUnavailable: true,
      initialRationalesUnavailable: true, nondisputedFieldsUnavailable: true,
      fullInitialOutputsUnavailable: true, legacyAssessmentsUnavailable: true,
      calculatedScoresUnavailable: true, winnerLabelsUnavailable: true,
      publicationProseUnavailable: true, contaminationDetected: false
    },
    moveDecisions: packet.disputedMoves.map((move) => ({
      moveId: move.moveId,
      importancePairChoice: move.candidates.importancePair ? 1 : null,
      attributionPairChoice: move.candidates.attributionPair ? 1 : null,
      responsePairChoice: move.candidates.responsePair ? 1 : null,
      charityPairChoice: move.candidates.charityPair ? 1 : null,
      assessmentConfidencePairChoice: move.candidates.assessmentConfidencePair ? 1 : null,
      scoringFieldChoices: Object.keys(move.candidates.scoringFields)
        .map((fieldKey) => ({ fieldKey, choice: 1 })),
      rationale: "Synthetic preparation validation selects candidate one only to compile the frozen shard schema."
    })),
    burdenAdjustmentDecisions: packet.burdenAdjustmentDisputes.map((item) => ({
      side: item.side, choice: 1,
      rationale: "Synthetic preparation validation selects candidate one only to compile the frozen shard schema."
    })),
    audit: {
      allDisputedMovesDecidedOnce: true, onlyCandidateValuesSelected: true,
      dependencyPairsKeptIndivisible: true, nondisputedFieldsUntouched: true,
      calculatedScoresAbsent: true, publicationProseAbsent: true
    },
    productionCanary: false, batchNumber: 3, stagingOnly: true,
    developmentValidationOnly: false
  };
  const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(synthetic, packet);
  assertV4(validation.status === "passed" &&
    validation.candidateSelections === definition.candidateSelections,
    `${shardId}: synthetic validation failed`);
  if (shouldWrite) {
    assertV4(!(await exists(packetPath)), `${packetPath} already exists`);
    await mkdir(path.dirname(packetPath), { recursive: true });
    await writeFile(packetPath, packetBytes);
  }
  contexts.push({
    contextIndex: index, shardId, debateNumber: "124", debateId: originalPacket.debateId,
    packet: packetPath, packetSha256: sha256(packetBytes), output: outputPath,
    disputedMoves: packet.disputedMoves.length,
    burdenAdjustmentDisputes: packet.burdenAdjustmentDisputes.length,
    candidateSelections: definition.candidateSelections,
    audioTranscriptInputs, packetBytes: packetBytes.length,
    copiedInputBytes: sharedInputBytes + packetBytes.length + audioBytes,
    moveIds: definition.moveIds,
    burdenAdjustmentSides: definition.burdenAdjustmentSides
  });
}
const allMoves = contexts.flatMap((context) => context.moveIds);
const allBurdens = contexts.flatMap((context) => context.burdenAdjustmentSides);
assertV4(new Set(allMoves).size === 23 && allMoves.length === 23 &&
  new Set(allBurdens).size === 2 && allBurdens.length === 2 &&
  contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 67,
  "Debate 124 correction shards are not field-disjoint and complete");
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-preparation",
  protocolId: originalPacket.protocolId,
  status: "frozen-two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-prepared",
  frozenAt, productionCanary: false, batchNumber: 3, stagingOnly: true,
  recoveryAuthorization: paths.recoveryAuthorization,
  diagnosis: paths.diagnosis,
  originalFailure: {
    contextIndex: 0, acceptedOutputs: 0, failedPartialOutputReusable: false,
    originalPacket: paths.originalPacket, originalPacketSha256: sha256(inputBytes.originalPacket)
  },
  model: structuredClone(activation.model),
  modelInputs,
  contexts,
  mergePlan: {
    originalPacket: paths.originalPacket,
    originalPacketSha256: sha256(inputBytes.originalPacket),
    mergedOutput: `${ADJ}/outputs/debate-124.json`,
    analysis: `${RECOVERY}/correction-analysis.json`,
    originalMoveOrder: originalPacket.disputedMoves.map((move) => move.moveId),
    originalBurdenOrder: originalPacket.burdenAdjustmentDisputes.map((item) => item.side),
    requiredCandidateSelections: 67,
    everyOriginalFieldAcceptedExactlyOnce: true,
    validateMergedOutputAgainstOriginalPacket: true
  },
  executionPolicy: {
    contexts: 2, schedulerRamp: [1, 2], maximumParallelContexts: 2,
    rampPhases: [
      { phase: 1, contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: 2, contextIndexes: [1], expansionRequiresAllValid: true }
    ],
    attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    timeoutMsPerContext: activation.executionPolicy.timeoutMsPerContext,
    maximumMinutesPerContext: activation.executionPolicy.maximumMinutesPerContext,
    maximumMeanMinutes: activation.executionPolicy.maximumMeanMinutes,
    removedEnvironmentVariables: activation.executionPolicy.removedEnvironmentVariables,
    terminateIsolatedProcessGroupAtFrozenTimeout: true,
    failedPartialOutputReusable: false
  },
  artifacts: {
    preparation: preparationPath,
    activation: `${RECOVERY}/correction-execution-activation.json`,
    execution: `${RECOVERY}/correction-model-execution.json`,
    mergedOutput: `${ADJ}/outputs/debate-124.json`,
    analysis: `${RECOVERY}/correction-analysis.json`
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [
    `${RECOVERY}/correction-execution-activation.json`,
    `${RECOVERY}/correction-model-execution.json`,
    ...contexts.map((context) => context.output),
    `${ADJ}/outputs/debate-124.json`,
    `${RECOVERY}/correction-analysis.json`
  ],
  authorization: {
    executionActivation: true, adjudicationModelContexts: false,
    deterministicMergeAndValidation: false, paidServices: false,
    finalLedgerAssembly: false, scoreDerivation: false
  },
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: "activate-two-frozen-debate-124-adjudication-correction-shards"
};
if (shouldWrite) {
  assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
  await writeFile(preparationPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  contexts: contexts.map(({ shardId, disputedMoves, candidateSelections, audioTranscriptInputs, packetBytes, copiedInputBytes }) =>
    ({ shardId, disputedMoves, candidateSelections, audioTranscriptInputs: audioTranscriptInputs.length, packetBytes, copiedInputBytes })),
  totalCandidateSelections: 67, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
