#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");

const cohortValidationPath =
  "docs/assessment-production/production-checkpoint-v2.2-1/publication-reconstruction/resumption-3/repair-1/successor-1/complete-cohort-validation.json";
const identityPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/production-identity-snapshot.json`;
const manifestPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/analysis.json`;
const auditPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/compilation-audit.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);

if (shouldWrite) {
  for (const file of [identityPath, manifestPath]) {
    assertV4(!(await exists(file)), `${file} already exists; preparation is immutable`);
  }
}

const cohortValidation = await parse(cohortValidationPath);
assertV4(
  cohortValidation.status === "passed" &&
    cohortValidation.explicitOrderLoop === true &&
    canonicalJson(cohortValidation.cohortOrder) === canonicalJson(CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER) &&
    cohortValidation.rows.length === 10 &&
    cohortValidation.totals.debates === 10 &&
    cohortValidation.totals.moves === 188 &&
    cohortValidation.totals.critiques === 188 &&
    cohortValidation.modelAuthoredScores === 0 &&
    cohortValidation.deterministicCompilationPerformed === false &&
    cohortValidation.publicationFinalizationPerformed === false &&
    cohortValidation.renderingVerificationPerformed === false &&
    cohortValidation.productionMutationPerformed === false,
  "passing explicit-order cohort validation is required"
);

const productionByNumber = new Map(debates.map((debate) => [debate.number, debate]));
const identityRows = [];
const contexts = [];
for (const debateNumber of CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER) {
  const row = cohortValidation.rows.find((item) => item.debateNumber === debateNumber);
  assertV4(row, `${debateNumber}: accepted cohort row missing`);
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(row.output)),
    readFile(path.resolve(row.packet))
  ]);
  assertV4(
    sha256(outputBytes) === row.outputSha256 && sha256(packetBytes) === row.packetSha256,
    `${debateNumber}: accepted publication input hash changed`
  );
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const validation = validateCheckpointV22PublicationOutput(output, packet);
  assertV4(
    validation.status === "passed" &&
      validation.lockedScoresUnchanged === true &&
      validation.calculatedScoresAuthoredByModel === 0,
    `${debateNumber}: accepted publication input replay failed`
  );
  const production = productionByNumber.get(debateNumber);
  assertV4(production?.id === packet.debateId, `${debateNumber}: current production identity mismatch`);
  const identity = { id: production.id, number: production.number };
  if (production.topicCategory) identity.topicCategory = production.topicCategory;
  identityRows.push(identity);
  contexts.push({
    debateNumber,
    debateId: packet.debateId,
    publicationOutput: row.output,
    publicationOutputSha256: row.outputSha256,
    publicationPacket: row.packet,
    publicationPacketSha256: row.packetSha256,
    plannedCompiledOutput: `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/compiled/debate-${debateNumber}.json`,
    expectedSections: packet.sections.length,
    expectedMoves: packet.moves.length,
    expectedOverallScores: {
      pro: packet.calculatedScores.overall.pro.score,
      con: packet.calculatedScores.overall.con.score
    },
    expectedWinner: packet.calculatedScores.winner,
    expectedWinningMargin: packet.calculatedScores.winningMargin,
    completePublicationValidation: validation
  });
}

const identitySnapshot = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-compilation-identity-snapshot",
  protocolId: CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "frozen-minimal-production-identity-only",
  frozenAt,
  allowedFields: ["id", "number", "topicCategory"],
  legacyScoresIncluded: false,
  legacyProseIncluded: false,
  legacyTagsIncluded: false,
  legacyWinnerIncluded: false,
  rows: identityRows
};
const identityBytes = Buffer.from(`${JSON.stringify(identitySnapshot, null, 2)}\n`);

const sourceFiles = [
  cohortValidationPath,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/production-checkpoint-v2.2-1/master-manifest.json",
  "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/final-ledger.json",
  "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/calculated-scores.json",
  "src/data/debates.js",
  "src/data/references.js",
  "src/app.js",
  "src/styles.css",
  "scripts/validate-debates.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-score-gate.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-publication-compilation.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-publication-compilation.mjs",
  "scripts/run-assessment-production-checkpoint-v2.2-publication-compilation.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-publication-compilation-preparation.mjs",
  ...contexts.flatMap((context) => [context.publicationOutput, context.publicationPacket])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
sourceHashes[identityPath] = sha256(identityBytes);

const futureOutputPaths = [
  activationPath,
  executionPath,
  analysisPath,
  auditPath,
  ...contexts.map((context) => context.plannedCompiledOutput)
];
for (const file of futureOutputPaths) assertV4(!(await exists(file)), `future compilation output already exists: ${file}`);

const manifest = {
  schemaVersion: "1.0-production-checkpoint-v2.2-deterministic-publication-compilation-preparation",
  protocolId: CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "deterministic-publication-compilation-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: true,
  stagingOnly: true,
  modelExecutionPlanned: false,
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    participantJudgmentWasScoreBlind: true
  },
  costEstimate: {
    directCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    expectedExecutionWallMinutes: [0, 1]
  },
  inputs: {
    acceptedCohortValidation: cohortValidationPath,
    identitySnapshot: identityPath,
    finalLedger: "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/final-ledger.json",
    calculatedScores: "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/calculated-scores.json"
  },
  explicitOrder: CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  contexts,
  compilationPolicy: {
    iterateExplicitOrderArrayDirectly: true,
    numericObjectKeyEnumerationProhibited: true,
    validateAcceptedPublicationOutputBeforeCompilation: true,
    validateCompiledRecordAgainstDeterministicReplay: true,
    allTenCandidatesBuiltAndValidatedBeforeAnyCompiledOutputWrite: true,
    sourceMetadataFromPublicationPacketOnly: true,
    currentProductionInputLimitedToFrozenIdentitySnapshot: true,
    allowedCurrentProductionIdentityFields: ["id", "number", "topicCategory"],
    legacyScoresUnavailable: true,
    legacyProseUnavailable: true,
    legacyTagsUnavailable: true,
    legacyWinnerUnavailable: true,
    participantScoresCopiedOnlyFromLockedPublicationPacket: true,
    scoresRecalculated: false,
    modelAuthoredScores: 0,
    aiExtensionExcludedFromParticipantScores: true,
    noveltyMapPreservedInStagingAudit: true,
    byline: "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.",
    nativeDetailsAccordionRequiredAtRenderingGate: true,
    productionFilesWritable: false,
    rankingFilesWritable: false
  },
  aggregateExpectations: {
    debates: 10,
    sections: contexts.reduce((sum, context) => sum + context.expectedSections, 0),
    moves: 188,
    critiques: 188,
    exactSourceQuotes: 20,
    overallCommentarySides: 20,
    aiExtensionSides: 20,
    modelContexts: 0,
    modelAuthoredScores: 0,
    directCostUsd: 0
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    explicitOrderMismatchBlocks: true,
    preexistingFutureOutputBlocks: true,
    publicationReplayFailureBlocksEntireCompilation: true,
    compiledRecordValidationFailureBlocksEntireCompilation: true,
    partialCompiledOutputWriteProhibited: true,
    identityFieldExpansionBlocks: true,
    legacyAssessmentLeakBlocks: true,
    scoreDifferenceBlocks: true,
    modelAuthoredScoreBlocks: true,
    modelExecutionBlocks: true,
    publicationFinalizationBlocks: true,
    renderingVerificationBlocks: true,
    productionMutationBlocks: true,
    remainingProductionBatchesBlock: true
  },
  artifacts: {
    preparation: manifestPath,
    identitySnapshot: identityPath,
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    compilationAudit: auditPath,
    compiledOutputs: contexts.map((context) => context.plannedCompiledOutput)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes,
  authorization: {
    deterministicCompilationExecutionActivation: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: "user-decision-on-deterministic-publication-compilation-execution-activation"
};

if (shouldWrite) {
  await mkdir(path.resolve(CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT), { recursive: true });
  await writeFile(path.resolve(identityPath), identityBytes);
  await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "deterministic-publication-compilation-plan-preview",
  explicitOrder: manifest.explicitOrder,
  debates: manifest.aggregateExpectations.debates,
  sections: manifest.aggregateExpectations.sections,
  moves: manifest.aggregateExpectations.moves,
  modelContexts: 0,
  directCostUsd: 0,
  compiledOutputsWritten: false,
  productionMutation: false,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
