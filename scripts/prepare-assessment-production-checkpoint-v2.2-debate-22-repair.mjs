#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CHECKPOINT_V22_PUBLICATION_MODEL } from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import {
  CHECKPOINT_V22_COMPLETE_COHORT_OUTPUTS,
  CHECKPOINT_V22_COMPLETE_COHORT_PACKETS,
  CHECKPOINT_V22_DEBATE_22_BASE_OUTPUT,
  CHECKPOINT_V22_DEBATE_22_PUBLICATION_PACKET,
  CHECKPOINT_V22_DEBATE_22_REPAIR_PACKET_VERSION,
  CHECKPOINT_V22_DEBATE_22_REPAIR_PARTITIONS,
  CHECKPOINT_V22_DEBATE_22_REPAIR_PROTOCOL_ID,
  CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT,
  buildDebate22RepairSchema,
  debate22RepairMoveId
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair.mjs";
import { CHECKPOINT_V22_RESUMPTION_3_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption-3.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const preparationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const wordCount = (value) => String(value).trim().split(/\s+/).filter(Boolean).length;
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const diagnosisPath = `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/failure-diagnosis.json`;
const executionPath = `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/model-execution.json`;
const analysisPath = `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/analysis.json`;
const [diagnosis, execution, analysis, baseOutput, publicationPacket] = await Promise.all([
  diagnosisPath,
  executionPath,
  analysisPath,
  CHECKPOINT_V22_DEBATE_22_BASE_OUTPUT,
  CHECKPOINT_V22_DEBATE_22_PUBLICATION_PACKET
].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
assertV4(
  diagnosis.status === "diagnosed-resumption-3-steady-context-thirteen-critique-word-overruns" &&
    diagnosis.failedContext.debateNumber === "22" &&
    diagnosis.failureBoundary.failedFieldCount === 13 &&
    diagnosis.failureBoundary.excessWordsTotal === 46 &&
    diagnosis.diagnosticReplay.result.status === "passed" &&
    execution.contextsAttempted === 7 &&
    execution.validContexts === 6 &&
    execution.invalidContexts === 1 &&
    execution.results.find(({ debateNumber }) => debateNumber === "22")?.attemptCount === 1 &&
    execution.results.find(({ debateNumber }) => debateNumber === "22")?.gateAcceptancePassed === false &&
    analysis.status === "production-checkpoint-v2.2-publication-resumption-failed-validation",
  "Debate 22 repair source state mismatch"
);
const diagnosedPartitions = diagnosis.prospectiveRecoveryOnly.proposedRepairPackets.map(({ writableFields }) => writableFields);
assertV4(
  JSON.stringify(diagnosedPartitions) === JSON.stringify(CHECKPOINT_V22_DEBATE_22_REPAIR_PARTITIONS),
  "authorized repair partitions changed"
);

const acceptedCohortOutputs = Object.fromEntries(
  Object.entries(CHECKPOINT_V22_COMPLETE_COHORT_OUTPUTS).filter(([debateNumber]) => debateNumber !== "22")
);
const acceptedCohortReplay = [];
for (const [debateNumber, outputPath] of Object.entries(acceptedCohortOutputs)) {
  const packetPath = CHECKPOINT_V22_COMPLETE_COHORT_PACKETS[debateNumber];
  const [output, packet] = await Promise.all([
    readFile(path.resolve(outputPath), "utf8").then(JSON.parse),
    readFile(path.resolve(packetPath), "utf8").then(JSON.parse)
  ]);
  const validation = validateCheckpointV22PublicationOutput(output, packet);
  acceptedCohortReplay.push({ debateNumber, output: outputPath, packet: packetPath, validation });
}
assertV4(
  acceptedCohortReplay.length === 9 &&
    acceptedCohortReplay.reduce((sum, row) => sum + row.validation.moves, 0) === 169 &&
    acceptedCohortReplay.every((row) => row.validation.status === "passed" && row.validation.lockedScoresUnchanged === true),
  "the nine accepted publication outputs no longer pass deterministic replay"
);

const contexts = [];
for (let packetIndex = 0; packetIndex < CHECKPOINT_V22_DEBATE_22_REPAIR_PARTITIONS.length; packetIndex += 1) {
  const writableFields = CHECKPOINT_V22_DEBATE_22_REPAIR_PARTITIONS[packetIndex];
  const corrections = writableFields.map((field) => {
    const moveId = debate22RepairMoveId(field);
    const lockedMove = publicationPacket.moves.find((move) => move.moveId === moveId);
    const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
    const diagnosisField = diagnosis.failureBoundary.failedFields.find((item) => item.path === field);
    assertV4(lockedMove && originalCritique && diagnosisField, `${field}: repair source missing`);
    assertV4(
      wordCount(originalCritique) === diagnosisField.words && originalCritique.length === diagnosisField.characters,
      `${field}: failed critique changed`
    );
    return {
      field,
      moveId,
      originalCritique,
      originalWords: wordCount(originalCritique),
      originalCharacters: originalCritique.length,
      lockedMove
    };
  });
  const packet = {
    schemaVersion: CHECKPOINT_V22_DEBATE_22_REPAIR_PACKET_VERSION,
    protocolId: CHECKPOINT_V22_DEBATE_22_REPAIR_PROTOCOL_ID,
    packetIndex,
    debateNumber: "22",
    debateId: publicationPacket.debateId,
    repairType: "critique-word-boundary",
    immutableBaseOutput: CHECKPOINT_V22_DEBATE_22_BASE_OUTPUT,
    publicationPacket: CHECKPOINT_V22_DEBATE_22_PUBLICATION_PACKET,
    participantJudgmentWasScoreBlind: true,
    scoresRepositoryOwnedAndImmutable: true,
    constraints: {
      writableFields,
      labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
      generationTargetWords: [112, 118],
      acceptanceWords: [105, 130],
      preferredMinimumCharacters: 900,
      acceptanceMinimumCharacters: 880,
      exactSentenceCount: 4,
      terminalPunctuation: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      scoresUnavailableAsOutputFields: true
    },
    corrections
  };
  const schema = buildDebate22RepairSchema(packet);
  const packetPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const outputPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/repair-outputs/packet-${packetIndex}.json`;
  const validationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/validations/packet-${packetIndex}.json`;
  const provenancePath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/provenance/packet-${packetIndex}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
  await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
  await mkdir(path.dirname(path.resolve(schemaPath)), { recursive: true });
  await writeFile(path.resolve(packetPath), packetBytes);
  await writeFile(path.resolve(schemaPath), schemaBytes);
  contexts.push({
    contextIndex: packetIndex,
    packetIndex,
    debateNumber: "22",
    debateId: publicationPacket.debateId,
    packet: packetPath,
    schema: schemaPath,
    repairOutput: outputPath,
    validation: validationPath,
    provenance: provenancePath,
    writableFields,
    correctedFieldCount: writableFields.length,
    copiedInputBytes: packetBytes.length + schemaBytes.length
  });
}

const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-publication-repair-preparation",
  protocolId: CHECKPOINT_V22_DEBATE_22_REPAIR_PROTOCOL_ID,
  status: "seven-isolated-thirteen-field-debate-22-publication-repair-packets-prepared-and-frozen",
  preparedAt: new Date().toISOString(),
  productionCanary: true,
  stagingOnly: true,
  model: CHECKPOINT_V22_PUBLICATION_MODEL,
  inputs: {
    productionWorkflow: "docs/assessment-production-workflow.md",
    readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
    rubric: "docs/reassessment-rubric-v2.1.md",
    outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
    manual: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/manual.md`,
    diagnosis: diagnosisPath,
    failedExecution: executionPath,
    failedAnalysis: analysisPath,
    immutableBaseOutput: CHECKPOINT_V22_DEBATE_22_BASE_OUTPUT,
    publicationPacket: CHECKPOINT_V22_DEBATE_22_PUBLICATION_PACKET
  },
  acceptedCohortOutputs,
  cohortPackets: CHECKPOINT_V22_COMPLETE_COHORT_PACKETS,
  acceptedCohortReplay,
  contexts,
  policy: {
    contexts: 7,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    furtherCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000,
    absoluteGateTimeoutMs: 3360000,
    maximumParallelContexts: 2,
    rampPhases: [
      { phase: "repair-operational-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "repair-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
      { phase: "repair-steady-four", maximumParallelContexts: 2, contextIndexes: [3, 4, 5, 6], expansionRequiresAllValid: false }
    ],
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    modelAuthoredScores: 0
  },
  totals: {
    modelContexts: 7,
    repairPackets: 7,
    writableFields: 13,
    acceptedCohortDebatesBeforeRepair: 9,
    acceptedCohortMovesBeforeRepair: 169,
    expectedCompleteCohortDebates: 10,
    expectedCompleteCohortMoves: 188,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  artifacts: {
    mergedOutput: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/merged/debate-22.json`,
    completeValidation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/complete-debate-validation.json`,
    mergeAudit: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/merge-audit.json`,
    completeCohortValidation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/complete-cohort-validation.json`
  },
  authorization: {
    executionActivationPreparation: true,
    repairModelExecution: false,
    deterministicMergeAndFullValidation: false,
    deterministicCompleteCohortValidation: false,
    retry: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
await mkdir(path.resolve(CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({
  status: preparation.status,
  packets: contexts.map(({ packetIndex, writableFields }) => ({ packetIndex, writableFields })),
  acceptedCohortDebates: 9,
  acceptedCohortMoves: 169,
  model: preparation.model,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  maximumParallelContexts: 2,
  meteredApiCostUsdMaximum: 0,
  productionMutation: false
}, null, 2));
