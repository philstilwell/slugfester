#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch10DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "invalid --frozen-at");
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-10";
const ADJ = `${ROOT}/dispute-only-adjudication`;
const RECOVERY = `${ADJ}/failure-recovery`;
const CORRECTION = `${RECOVERY}/correction-2`;
const preparationPath = `${CORRECTION}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const paths = {
  standingAuthorization: `${ROOT}/standing-authorization.json`,
  diagnosis: `${RECOVERY}/correction-failure-diagnosis.json`,
  originalActivation: `${ADJ}/execution-activation.json`,
  originalPacket: `${ADJ}/packets/debate-74.json`,
  firstCorrectionPreparation: `${RECOVERY}/correction-preparation-manifest.json`,
  firstCorrectionActivation: `${RECOVERY}/correction-execution-activation.json`,
  firstCorrectionExecution: `${RECOVERY}/correction-model-execution.json`,
  retainedShard01Packet: `${RECOVERY}/packets/debate-74-shard-01.json`,
  retainedShard01Output: `${RECOVERY}/outputs/debate-74-shard-01.json`,
  failedShard02Packet: `${RECOVERY}/packets/debate-74-shard-02.json`,
  failedShard02Output: `${RECOVERY}/outputs/debate-74-shard-02.json`,
  schema: `${ADJ}/adjudication.schema.json`
};
const tools = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-failure.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-2.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-2.mjs",
  "scripts/merge-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-2.mjs"
];
const inputBytes = Object.fromEntries(
  await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await readFile(file)]))
);
const standing = JSON.parse(inputBytes.standingAuthorization);
const diagnosis = JSON.parse(inputBytes.diagnosis);
const activation = JSON.parse(inputBytes.originalActivation);
const originalPacket = JSON.parse(inputBytes.originalPacket);
const firstCorrectionPreparation = JSON.parse(inputBytes.firstCorrectionPreparation);
const firstCorrectionActivation = JSON.parse(inputBytes.firstCorrectionActivation);
const firstCorrectionExecution = JSON.parse(inputBytes.firstCorrectionExecution);
const retainedShard01Packet = JSON.parse(inputBytes.retainedShard01Packet);
const retainedShard01Output = JSON.parse(inputBytes.retainedShard01Output);
const failedShard02Packet = JSON.parse(inputBytes.failedShard02Packet);
const failedShard02Output = JSON.parse(inputBytes.failedShard02Output);
const originalContext = activation.contexts.find(
  (item) => item.debateNumber === "74"
);
const shard01Result = firstCorrectionExecution.results.find(
  (item) => item.contextIndex === 0
);
const shard02Result = firstCorrectionExecution.results.find(
  (item) => item.contextIndex === 1
);
assertV4(
  standing.authorization.boundedCorrections === true &&
    diagnosis.status ===
      "blocked-batch-10-debate-74-bounded-correction-repeated-burden-decision-omission" &&
    diagnosis.standingAuthorizationDisposition.newUserAuthorizationRequired === true &&
    firstCorrectionPreparation.contexts.length === 2 &&
    firstCorrectionActivation.authorization.adjudicationModelContexts === true &&
    firstCorrectionExecution.status ===
      "batch-10-debate-74-adjudication-correction-gate-complete-with-failure" &&
    shard01Result.status === "completed-valid" &&
    shard01Result.outputSha256 === sha256(inputBytes.retainedShard01Output) &&
    shard02Result.status === "output-validation-failed" &&
    shard02Result.outputSha256 === sha256(inputBytes.failedShard02Output) &&
    failedShard02Packet.disputedMoves.length === 10 &&
    failedShard02Packet.burdenAdjustmentDisputes.length === 1 &&
    failedShard02Packet.burdenAdjustmentDisputes[0].side === "con" &&
    failedShard02Output.burdenAdjustmentDecisions.length === 0 &&
    validatePostCanaryBatch10DisputeAdjudicationOutput(
      retainedShard01Output,
      retainedShard01Packet
    ).status === "passed" &&
    originalContext.packetSha256 === sha256(inputBytes.originalPacket) &&
    originalContext.candidateSelections === 52,
  "Debate 74 correction-2 source boundary changed"
);
const shardDefinitions = [
  {
    moveIds: failedShard02Packet.disputedMoves
      .map((item) => item.moveId)
      .filter((moveId) => moveId !== "con-minimal-diagnosis-parsimony"),
    burdenAdjustmentSides: [],
    candidateSelections: 24
  },
  {
    moveIds: ["con-minimal-diagnosis-parsimony"],
    burdenAdjustmentSides: ["con"],
    candidateSelections: 2
  }
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
  const packet = structuredClone(failedShard02Packet);
  packet.disputedMoves = packet.disputedMoves.filter((move) => moveSet.has(move.moveId));
  packet.burdenAdjustmentDisputes = packet.burdenAdjustmentDisputes
    .filter((item) => burdenSet.has(item.side));
  assertV4(packet.disputedMoves.length === definition.moveIds.length,
    `${shardId}: move partition changed`);
  const packetPath = `${CORRECTION}/packets/debate-74-${shardId}.json`;
  const outputPath = `${CORRECTION}/outputs/debate-74-${shardId}.json`;
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
    productionCanary: false, batchNumber: 10, stagingOnly: true,
    developmentValidationOnly: false
  };
  const validation = validatePostCanaryBatch10DisputeAdjudicationOutput(synthetic, packet);
  assertV4(validation.status === "passed" &&
    validation.candidateSelections === definition.candidateSelections,
    `${shardId}: synthetic validation failed`);
  if (shouldWrite) {
    assertV4(!(await exists(packetPath)), `${packetPath} already exists`);
    await mkdir(path.dirname(packetPath), { recursive: true });
    await writeFile(packetPath, packetBytes);
  }
  contexts.push({
    contextIndex: index, shardId, debateNumber: "74", debateId: originalPacket.debateId,
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
assertV4(new Set(allMoves).size === 10 && allMoves.length === 10 &&
  new Set(allBurdens).size === 1 && allBurdens.length === 1 &&
  allBurdens[0] === "con" &&
  contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 26,
  "Debate 74 correction-2 shards are not field-disjoint and complete");
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-2-preparation",
  protocolId: originalPacket.protocolId,
  status: "frozen-two-batch-10-debate-74-field-disjoint-adjudication-correction-2-contexts-prepared",
  frozenAt, productionCanary: false, batchNumber: 10, stagingOnly: true,
  standingAuthorization: paths.standingAuthorization,
  diagnosis: paths.diagnosis,
  userAuthorization: {
    instruction:
      "I authorize one additional Debate 74 correction using two fresh, field-disjoint shards covering all 26 choices from failed shard 2. Retain passed shard 1, reuse none of failed shard 2, explicitly require the con burden-adjustment decision, and allow one attempt per shard with no retries or timeout extensions, using 5.6 Sol/low through the ChatGPT subscription at $0 direct incremental cost. After validation and merge, resume only the seven unattempted Batch 10 contexts.",
    retainedPassedShard01: true,
    failedShard02OutputReusable: false,
    contexts: 2,
    candidateSelections: 26,
    explicitConBurdenAdjustmentRequired: true,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
    sevenContextResumptionAuthorizedAfterPassingMerge: true
  },
  predecessor: {
    retainedShard01Packet: paths.retainedShard01Packet,
    retainedShard01PacketSha256: sha256(inputBytes.retainedShard01Packet),
    retainedShard01Output: paths.retainedShard01Output,
    retainedShard01OutputSha256: sha256(inputBytes.retainedShard01Output),
    retainedShard01CandidateSelections: 26,
    failedShard02Packet: paths.failedShard02Packet,
    failedShard02PacketSha256: sha256(inputBytes.failedShard02Packet),
    failedShard02Output: paths.failedShard02Output,
    failedShard02OutputSha256: sha256(inputBytes.failedShard02Output),
    failedShard02OutputReusable: false
  },
  model: structuredClone(activation.model),
  modelInputs,
  contexts,
  mergePlan: {
    originalPacket: paths.originalPacket,
    originalPacketSha256: sha256(inputBytes.originalPacket),
    mergedOutput: `${ADJ}/outputs/debate-74.json`,
    analysis: `${CORRECTION}/analysis.json`,
    originalMoveOrder: originalPacket.disputedMoves.map((move) => move.moveId),
    originalBurdenOrder: originalPacket.burdenAdjustmentDisputes.map((item) => item.side),
    retainedCandidateSelections: 26,
    replacementCandidateSelections: 26,
    requiredCandidateSelections: 52,
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
    activation: `${CORRECTION}/execution-activation.json`,
    execution: `${CORRECTION}/model-execution.json`,
    mergedOutput: `${ADJ}/outputs/debate-74.json`,
    analysis: `${CORRECTION}/analysis.json`
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [
    `${CORRECTION}/execution-activation.json`,
    `${CORRECTION}/model-execution.json`,
    ...contexts.map((context) => context.output),
    `${CORRECTION}/analysis.json`
  ],
  authorization: {
    executionActivation: true, adjudicationModelContexts: false,
    deterministicMergeAndValidation: false, paidServices: false,
    finalLedgerAssembly: false, scoreDerivation: false
  },
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: "activate-two-frozen-debate-74-adjudication-correction-2-shards"
};
if (shouldWrite) {
  assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
  await mkdir(CORRECTION, { recursive: true });
  await writeFile(preparationPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  contexts: contexts.map(({ shardId, disputedMoves, candidateSelections, audioTranscriptInputs, packetBytes, copiedInputBytes }) =>
    ({ shardId, disputedMoves, candidateSelections, audioTranscriptInputs: audioTranscriptInputs.length, packetBytes, copiedInputBytes })),
  totalCandidateSelections: 26, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
