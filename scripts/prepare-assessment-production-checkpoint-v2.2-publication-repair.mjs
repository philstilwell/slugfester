#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_MODEL,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import {
  CHECKPOINT_V22_REPAIR_FIELDS,
  CHECKPOINT_V22_REPAIR_PACKET_VERSION,
  CHECKPOINT_V22_REPAIR_PROTOCOL_ID,
  CHECKPOINT_V22_REPAIR_ROOT,
  buildCheckpointV22RepairSchema,
  repairMoveId
} from "./lib/assessment-production-checkpoint-v2.2-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const outputPath = `${CHECKPOINT_V22_REPAIR_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const wordCount = (value) => String(value).trim().split(/\s+/).filter(Boolean).length;
assertV4(!(await exists(outputPath)), `${outputPath} already exists`);

const diagnosisPath = `${ROOT}/failure-diagnosis.json`;
const executionPath = `${ROOT}/model-execution.json`;
const analysisPath = `${ROOT}/analysis.json`;
const baseOutputPath = `${ROOT}/outputs/debate-50.json`;
const publicationPacketPath = `${ROOT}/packets/debate-50.json`;
const [diagnosis, execution, analysis, baseOutput, publicationPacket] = await Promise.all(
  [diagnosisPath, executionPath, analysisPath, baseOutputPath, publicationPacketPath]
    .map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse))
);
assertV4(
  diagnosis.status === "diagnosed-operational-publication-context-two-critique-word-overruns" &&
    diagnosis.failedContext.debateNumber === "50" &&
    diagnosis.failureBoundary.failedFieldCount === 2 &&
    diagnosis.diagnosticReplay.result.status === "passed" &&
    execution.contextsAttempted === 1 &&
    execution.results[0].attemptCount === 1 &&
    execution.results[0].gateAcceptancePassed === false &&
    analysis.status === "production-checkpoint-v2.2-publication-gate-failed-validation",
  "publication repair source state mismatch"
);
const diagnosedFields = diagnosis.failureBoundary.failedFields.map(({ path: field }) => field).sort();
assertV4(
  JSON.stringify(diagnosedFields) === JSON.stringify([...CHECKPOINT_V22_REPAIR_FIELDS].sort()),
  "diagnosed repair field set changed"
);

const corrections = CHECKPOINT_V22_REPAIR_FIELDS.map((field) => {
  const moveId = repairMoveId(field);
  const move = publicationPacket.moves.find((item) => item.moveId === moveId);
  const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
  assertV4(move && originalCritique, `${moveId}: repair source missing`);
  return {
    field,
    moveId,
    originalCritique,
    originalWords: wordCount(originalCritique),
    originalCharacters: originalCritique.length,
    lockedMove: move
  };
});
assertV4(
  corrections.map(({ originalWords }) => originalWords).join("|") === "131|133",
  "repair defect no longer matches the frozen diagnosis"
);

const repairPacket = {
  schemaVersion: CHECKPOINT_V22_REPAIR_PACKET_VERSION,
  protocolId: CHECKPOINT_V22_REPAIR_PROTOCOL_ID,
  debateNumber: "50",
  debateId: publicationPacket.debateId,
  repairType: "critique-word-boundary",
  immutableBaseOutput: baseOutputPath,
  publicationPacket: publicationPacketPath,
  participantJudgmentWasScoreBlind: true,
  scoresRepositoryOwnedAndImmutable: true,
  constraints: {
    writableFields: CHECKPOINT_V22_REPAIR_FIELDS,
    labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
    generationTargetWords: [112, 118],
    acceptanceWords: [105, 130],
    preferredMinimumCharacters: 900,
    acceptanceMinimumCharacters: 880,
    exactSentenceCount: 4,
    terminalPunctuation: true,
    unexpectedCJKHangulKanaAndReplacementCharactersRejected: true,
    preserveAdjudicatedSubstanceAndLockedScoreBand: true,
    scoresUnavailableAsOutputFields: true
  },
  corrections
};
const schema = buildCheckpointV22RepairSchema(repairPacket);
const packetPath = `${CHECKPOINT_V22_REPAIR_ROOT}/packet.json`;
const schemaPath = `${CHECKPOINT_V22_REPAIR_ROOT}/schema.json`;
const repairOutput = `${CHECKPOINT_V22_REPAIR_ROOT}/repair-output.json`;
const mergedOutput = `${CHECKPOINT_V22_REPAIR_ROOT}/merged/debate-50.json`;
const packetBytes = Buffer.from(`${JSON.stringify(repairPacket, null, 2)}\n`);
const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
await mkdir(path.resolve(CHECKPOINT_V22_REPAIR_ROOT), { recursive: true });
await writeFile(path.resolve(packetPath), packetBytes);
await writeFile(path.resolve(schemaPath), schemaBytes);

const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-repair-preparation",
  protocolId: CHECKPOINT_V22_REPAIR_PROTOCOL_ID,
  status: "one-isolated-two-field-debate-50-publication-repair-prepared-and-frozen",
  preparedAt: new Date().toISOString(),
  productionCanary: true,
  stagingOnly: true,
  model: CHECKPOINT_V22_PUBLICATION_MODEL,
  inputs: {
    productionWorkflow: "docs/assessment-production-workflow.md",
    readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
    outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
    manual: `${CHECKPOINT_V22_REPAIR_ROOT}/manual.md`,
    diagnosis: diagnosisPath,
    failedExecution: executionPath,
    failedAnalysis: analysisPath,
    immutableBaseOutput: baseOutputPath,
    publicationPacket: publicationPacketPath
  },
  context: {
    contextIndex: 0,
    debateNumber: "50",
    debateId: publicationPacket.debateId,
    packet: packetPath,
    schema: schemaPath,
    repairOutput,
    mergedOutput,
    validation: `${CHECKPOINT_V22_REPAIR_ROOT}/repair-validation.json`,
    completeValidation: `${CHECKPOINT_V22_REPAIR_ROOT}/complete-debate-validation.json`,
    provenance: `${CHECKPOINT_V22_REPAIR_ROOT}/provenance.json`,
    mergeAudit: `${CHECKPOINT_V22_REPAIR_ROOT}/merge-audit.json`,
    writableFields: CHECKPOINT_V22_REPAIR_FIELDS,
    copiedInputBytes: packetBytes.length + schemaBytes.length
  },
  policy: {
    contexts: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    furtherCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000,
    maximumMinutesPerContext: 8,
    maximumParallelContexts: 1,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    modelAuthoredScores: 0
  },
  totals: {
    modelContexts: 1,
    writableFields: 2,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    executionActivationPreparation: true,
    repairModelExecution: false,
    deterministicMergeAndFullValidation: false,
    publicationGateResumption: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
await writeFile(path.resolve(outputPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({
  status: preparation.status,
  debateNumber: "50",
  writableFields: CHECKPOINT_V22_REPAIR_FIELDS,
  contexts: 1,
  attemptsMaximum: 1,
  retriesMaximum: 0,
  model: preparation.model,
  meteredApiCostUsdMaximum: 0,
  productionMutation: false
}, null, 2));
