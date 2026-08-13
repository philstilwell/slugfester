#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CHECKPOINT_V22_PUBLICATION_MODEL } from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import {
  CHECKPOINT_V22_DEBATE_192_BASE_OUTPUT,
  CHECKPOINT_V22_DEBATE_192_PUBLICATION_PACKET,
  CHECKPOINT_V22_DEBATE_192_REPAIR_PACKET_VERSION,
  CHECKPOINT_V22_DEBATE_192_REPAIR_PARTITIONS,
  CHECKPOINT_V22_DEBATE_192_REPAIR_PROTOCOL_ID,
  CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT,
  buildDebate192RepairSchema,
  debate192RepairMoveId
} from "./lib/assessment-production-checkpoint-v2.2-debate-192-repair.mjs";
import { CHECKPOINT_V22_RESUMPTION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const preparationPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const wordCount = (value) => String(value).trim().split(/\s+/).filter(Boolean).length;
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const diagnosisPath = `${CHECKPOINT_V22_RESUMPTION_ROOT}/failure-diagnosis.json`;
const executionPath = `${CHECKPOINT_V22_RESUMPTION_ROOT}/model-execution.json`;
const analysisPath = `${CHECKPOINT_V22_RESUMPTION_ROOT}/analysis.json`;
const [diagnosis, execution, analysis, baseOutput, publicationPacket] = await Promise.all([
  diagnosisPath,
  executionPath,
  analysisPath,
  CHECKPOINT_V22_DEBATE_192_BASE_OUTPUT,
  CHECKPOINT_V22_DEBATE_192_PUBLICATION_PACKET
].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
assertV4(
  diagnosis.status === "diagnosed-resumption-operational-context-seven-critique-word-overruns" &&
    diagnosis.failedContext.debateNumber === "192" &&
    diagnosis.failureBoundary.failedFieldCount === 7 &&
    diagnosis.failureBoundary.excessWordsTotal === 12 &&
    diagnosis.diagnosticReplay.result.status === "passed" &&
    execution.contextsAttempted === 1 &&
    execution.results[0].attemptCount === 1 &&
    execution.results[0].gateAcceptancePassed === false &&
    analysis.status === "production-checkpoint-v2.2-publication-resumption-failed-validation",
  "Debate 192 repair source state mismatch"
);
const diagnosedPartitions = diagnosis.prospectiveRecoveryOnly.proposedRepairPackets.map(({ writableFields }) => writableFields);
assertV4(JSON.stringify(diagnosedPartitions) === JSON.stringify(CHECKPOINT_V22_DEBATE_192_REPAIR_PARTITIONS), "authorized repair partitions changed");

const contexts = [];
for (let packetIndex = 0; packetIndex < CHECKPOINT_V22_DEBATE_192_REPAIR_PARTITIONS.length; packetIndex += 1) {
  const writableFields = CHECKPOINT_V22_DEBATE_192_REPAIR_PARTITIONS[packetIndex];
  const corrections = writableFields.map((field) => {
    const moveId = debate192RepairMoveId(field);
    const lockedMove = publicationPacket.moves.find((move) => move.moveId === moveId);
    const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
    const diagnosisField = diagnosis.failureBoundary.failedFields.find((item) => item.path === field);
    assertV4(lockedMove && originalCritique && diagnosisField, `${field}: repair source missing`);
    assertV4(wordCount(originalCritique) === diagnosisField.words && originalCritique.length === diagnosisField.characters, `${field}: failed critique changed`);
    return { field, moveId, originalCritique, originalWords: wordCount(originalCritique), originalCharacters: originalCritique.length, lockedMove };
  });
  const packet = {
    schemaVersion: CHECKPOINT_V22_DEBATE_192_REPAIR_PACKET_VERSION,
    protocolId: CHECKPOINT_V22_DEBATE_192_REPAIR_PROTOCOL_ID,
    packetIndex,
    debateNumber: "192",
    debateId: publicationPacket.debateId,
    repairType: "critique-word-boundary",
    immutableBaseOutput: CHECKPOINT_V22_DEBATE_192_BASE_OUTPUT,
    publicationPacket: CHECKPOINT_V22_DEBATE_192_PUBLICATION_PACKET,
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
  const schema = buildDebate192RepairSchema(packet);
  const packetPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const outputPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/repair-outputs/packet-${packetIndex}.json`;
  const validationPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/validations/packet-${packetIndex}.json`;
  const provenancePath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/provenance/packet-${packetIndex}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
  await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
  await mkdir(path.dirname(path.resolve(schemaPath)), { recursive: true });
  await writeFile(path.resolve(packetPath), packetBytes);
  await writeFile(path.resolve(schemaPath), schemaBytes);
  contexts.push({
    contextIndex: packetIndex,
    packetIndex,
    debateNumber: "192",
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
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-192-publication-repair-preparation",
  protocolId: CHECKPOINT_V22_DEBATE_192_REPAIR_PROTOCOL_ID,
  status: "four-isolated-seven-field-debate-192-publication-repair-packets-prepared-and-frozen",
  preparedAt: new Date().toISOString(),
  productionCanary: true,
  stagingOnly: true,
  model: CHECKPOINT_V22_PUBLICATION_MODEL,
  inputs: {
    productionWorkflow: "docs/assessment-production-workflow.md",
    readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
    outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
    manual: `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/manual.md`,
    diagnosis: diagnosisPath,
    failedExecution: executionPath,
    failedAnalysis: analysisPath,
    immutableBaseOutput: CHECKPOINT_V22_DEBATE_192_BASE_OUTPUT,
    publicationPacket: CHECKPOINT_V22_DEBATE_192_PUBLICATION_PACKET
  },
  contexts,
  policy: {
    contexts: 4,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    furtherCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000,
    absoluteGateTimeoutMs: 1920000,
    maximumParallelContexts: 2,
    rampPhases: [
      { phase: "repair-operational-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "repair-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
      { phase: "repair-final-one", maximumParallelContexts: 1, contextIndexes: [3], expansionRequiresAllValid: false }
    ],
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    modelAuthoredScores: 0
  },
  totals: { modelContexts: 4, repairPackets: 4, writableFields: 7, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  artifacts: {
    mergedOutput: `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/merged/debate-192.json`,
    completeValidation: `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/complete-debate-validation.json`,
    mergeAudit: `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/merge-audit.json`
  },
  authorization: {
    executionActivationPreparation: true,
    repairModelExecution: false,
    deterministicMergeAndFullValidation: false,
    eightContextResumption: false,
    retry: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
await mkdir(path.resolve(CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, packets: contexts.map(({ packetIndex, writableFields }) => ({ packetIndex, writableFields })), model: preparation.model, attemptsPerContext: 1, retriesMaximum: 0, maximumParallelContexts: 2, meteredApiCostUsdMaximum: 0, productionMutation: false }, null, 2));
