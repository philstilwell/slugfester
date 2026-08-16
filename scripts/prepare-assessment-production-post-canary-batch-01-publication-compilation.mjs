#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_PROTOCOL_ID,
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ROOT
} from "./lib/assessment-production-post-canary-batch-01-publication-compilation.mjs";
import { validatePostCanaryBatch01PublicationOutput } from "./lib/assessment-production-post-canary-batch-01-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ROOT;
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction";
const RESUMPTION_ROOT = `${PUBLICATION_ROOT}/resumption-1`;
const REPAIR_ROOT = `${RESUMPTION_ROOT}/repair-1`;
const REPAIR_ANALYSIS = `${REPAIR_ROOT}/analysis.json`;
const REPAIR_EXECUTION = `${REPAIR_ROOT}/model-execution.json`;
const REPAIR_AUDIT = `${REPAIR_ROOT}/merge-audit.json`;
const IDENTITY = `${ROOT}/production-identity-snapshot.json`;
const MANIFEST = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const AUDIT = `${ROOT}/compilation-audit.json`;
const FINAL_LEDGER =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/final-ledger/final-ledger.json";
const CALCULATED_SCORES =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/score-pass/calculated-scores.json";

const ACCEPTED_OUTPUTS = Object.freeze({
  "31": `${PUBLICATION_ROOT}/repair-1/merged/debate-31.json`,
  "94": `${RESUMPTION_ROOT}/outputs/debate-94.json`,
  "52": `${RESUMPTION_ROOT}/outputs/debate-52.json`,
  "146": `${RESUMPTION_ROOT}/outputs/debate-146.json`,
  "91": `${REPAIR_ROOT}/merged/debate-91.json`,
  "175": `${RESUMPTION_ROOT}/outputs/debate-175.json`,
  "75": `${RESUMPTION_ROOT}/outputs/debate-75.json`,
  "72": `${RESUMPTION_ROOT}/outputs/debate-72.json`,
  "13": `${REPAIR_ROOT}/merged/debate-13.json`,
  "195": `${RESUMPTION_ROOT}/outputs/debate-195.json`
});
const PUBLICATION_PACKETS = Object.freeze(
  Object.fromEntries(
    POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER.map((debateNumber) => [
      debateNumber,
      `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`
    ])
  )
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);

if (shouldWrite) {
  for (const file of [IDENTITY, MANIFEST]) {
    assertV4(!(await exists(file)), `${file} already exists; preparation is immutable`);
  }
}

assertV4(
  canonicalJson(Object.keys(ACCEPTED_OUTPUTS).sort()) ===
    canonicalJson([...POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER].sort()) &&
    canonicalJson(Object.keys(PUBLICATION_PACKETS).sort()) ===
      canonicalJson([...POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER].sort()),
  "Batch 1 compilation inputs do not match the frozen cohort order"
);

const [repairAnalysis, repairExecution, repairAudit] = await Promise.all([
  parse(REPAIR_ANALYSIS),
  parse(REPAIR_EXECUTION),
  parse(REPAIR_AUDIT)
]);
assertV4(
  repairAnalysis.status ===
      "batch-01-publication-resumption-bounded-repair-and-complete-cohort-validation-passed" &&
    repairAnalysis.gate?.completeDebate91ValidationPassed === true &&
    repairAnalysis.gate?.completeDebate13ValidationPassed === true &&
    repairAnalysis.gate?.completeCohortValidationPassed === true &&
    repairAnalysis.gate?.correctedFieldCount === 4 &&
    repairAnalysis.gate?.immutableFieldsChanged === 0 &&
    repairAnalysis.gate?.cohort?.debates === 10 &&
    repairAnalysis.gate?.cohort?.moves === 177 &&
    repairAnalysis.gate?.cohort?.critiques === 177 &&
    repairAnalysis.gate?.cohort?.lockedScoresUnchanged === true &&
    repairAnalysis.totals?.modelContexts === 3 &&
    repairAnalysis.totals?.meteredApiCostUsd === 0 &&
    repairAnalysis.totals?.publicationCompilationPasses === 0 &&
    repairAnalysis.totals?.productionMutations === 0 &&
    repairAnalysis.nextAuthorizedAction ===
      "user-approval-required-before-batch-01-publication-compilation-preparation-only",
  "the passing Batch 1 publication-repair checkpoint changed"
);
assertV4(
  repairExecution.status ===
      "batch-01-publication-resumption-three-context-repair-gate-passed" &&
    repairExecution.contextsAttempted === 3 &&
    repairExecution.validContexts === 3 &&
    repairExecution.attempts === 3 &&
    repairExecution.retries === 0 &&
    repairExecution.modelAuthoredScores === 0 &&
    repairAudit.status === "passed" &&
    repairAudit.authorizedFieldsChanged === 4 &&
    repairAudit.immutableFieldsChanged === 0 &&
    repairAudit.lockedScoresUnchanged === true,
  "the accepted Batch 1 repair execution or merge audit changed"
);

const productionByNumber = new Map(
  debates.map((debate) => [debate.number, debate])
);
const identityRows = [];
const contexts = [];
for (const debateNumber of POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER) {
  const outputPath = ACCEPTED_OUTPUTS[debateNumber];
  const packetPath = PUBLICATION_PACKETS[debateNumber];
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(outputPath)),
    readFile(path.resolve(packetPath))
  ]);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const validation = validatePostCanaryBatch01PublicationOutput(output, packet);
  assertV4(
    output.debateNumber === debateNumber &&
      packet.debateNumber === debateNumber &&
      output.debateId === packet.debateId &&
      validation.status === "passed" &&
      validation.lockedScoresUnchanged === true &&
      validation.calculatedScoresAuthoredByModel === 0,
    `Debate ${debateNumber}: accepted publication input replay failed`
  );
  const production = productionByNumber.get(debateNumber);
  assertV4(
    production?.id === packet.debateId,
    `Debate ${debateNumber}: current production identity mismatch`
  );
  const identity = { id: production.id, number: production.number };
  if (production.topicCategory) identity.topicCategory = production.topicCategory;
  identityRows.push(identity);
  contexts.push({
    debateNumber,
    debateId: packet.debateId,
    publicationOutput: outputPath,
    publicationOutputSha256: sha256(outputBytes),
    publicationPacket: packetPath,
    publicationPacketSha256: sha256(packetBytes),
    plannedCompiledOutput: `${ROOT}/compiled/debate-${debateNumber}.json`,
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

assertV4(
  contexts.length === 10 &&
    contexts.reduce((sum, context) => sum + context.expectedMoves, 0) === 177,
  "the complete Batch 1 compilation cohort changed"
);

const identitySnapshot = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-publication-compilation-identity-snapshot",
  protocolId: POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "frozen-minimal-production-identity-only",
  frozenAt,
  allowedFields: ["id", "number", "topicCategory"],
  legacyScoresIncluded: false,
  legacyProseIncluded: false,
  legacyTagsIncluded: false,
  legacyWinnerIncluded: false,
  rows: identityRows
};
const identityBytes = Buffer.from(
  `${JSON.stringify(identitySnapshot, null, 2)}\n`
);

const sourceFiles = [
  REPAIR_ANALYSIS,
  REPAIR_EXECUTION,
  REPAIR_AUDIT,
  FINAL_LEDGER,
  CALCULATED_SCORES,
  "docs/assessment-production/post-canary-continuation-v1/batch-01/score-pass/score-pass-manifest.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-01/score-pass/analysis.json",
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json",
  "src/data/debates.js",
  "src/data/references.js",
  "src/app.js",
  "src/styles.css",
  "scripts/validate-debates.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/assessment-production-score-stability-policy-active.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-score-gate.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-compilation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-01-publication-compilation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-01-publication-compilation.mjs",
  "scripts/run-assessment-production-post-canary-batch-01-publication-compilation.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-publication-compilation-preparation.mjs",
  ...Object.values(ACCEPTED_OUTPUTS),
  ...Object.values(PUBLICATION_PACKETS)
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[IDENTITY] = sha256(identityBytes);

const futureOutputPaths = [
  ACTIVATION,
  EXECUTION,
  ANALYSIS,
  AUDIT,
  ...contexts.map((context) => context.plannedCompiledOutput)
];
for (const file of futureOutputPaths) {
  assertV4(!(await exists(file)), `future compilation output exists: ${file}`);
}

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-deterministic-publication-compilation-preparation",
  protocolId: POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status:
    "frozen-post-canary-batch-01-deterministic-publication-compilation-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: "Approval granted. Continue.",
    scopeReference:
      "the immediately preceding request to prepare, validate, freeze, commit, and push the Batch 1 publication-compilation manifest only",
    directIncrementalCostUsdMaximum: 0,
    compilationPreparation: true,
    deterministicCompilation: false,
    modelExecution: false,
    paidServices: false,
    renderingVerification: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    participantJudgmentWasScoreBlind: true,
    contextsPlannedThisStage: 0
  },
  costEstimate: {
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    expectedFutureDeterministicExecutionWallMinutes: [0, 1]
  },
  inputs: {
    repairAnalysis: REPAIR_ANALYSIS,
    repairExecution: REPAIR_EXECUTION,
    repairMergeAudit: REPAIR_AUDIT,
    identitySnapshot: IDENTITY,
    finalLedger: FINAL_LEDGER,
    calculatedScores: CALCULATED_SCORES,
    acceptedPublicationOutputs: ACCEPTED_OUTPUTS,
    publicationPackets: PUBLICATION_PACKETS
  },
  explicitOrder: POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER,
  contexts,
  executionPolicy: {
    deterministicRepositoryCompilationPassesMaximum: 1,
    rerunsMaximum: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    separateActivationRequired: true
  },
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
    scorePassesMaximum: 0,
    modelAuthoredScores: 0,
    aiExtensionExcludedFromParticipantScores: true,
    noveltyMapPreservedInStagingAudit: true,
    byline:
      "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.",
    nativeDetailsAccordionRequiredAtRenderingGate: true,
    productionFilesWritable: false,
    rankingFilesWritable: false
  },
  aggregateExpectations: {
    debates: 10,
    sections: contexts.reduce(
      (sum, context) => sum + context.expectedSections,
      0
    ),
    moves: 177,
    critiques: 177,
    exactSourceQuotes: 20,
    overallCommentarySides: 20,
    aiExtensionSides: 20,
    modelContexts: 0,
    modelAuthoredScores: 0,
    scorePasses: 0,
    directIncrementalCostUsd: 0
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    explicitOrderMismatchBlocks: true,
    preexistingFutureOutputBlocks: true,
    separateActivationRequired: true,
    publicationReplayFailureBlocksEntireCompilation: true,
    compiledRecordValidationFailureBlocksEntireCompilation: true,
    partialCompiledOutputWriteProhibited: true,
    identityFieldExpansionBlocks: true,
    legacyAssessmentLeakBlocks: true,
    scoreDifferenceBlocks: true,
    scoreRecalculationBlocks: true,
    modelAuthoredScoreBlocks: true,
    modelExecutionBlocks: true,
    paidServiceBlocks: true,
    publicationFinalizationBlocks: true,
    renderingVerificationBlocks: true,
    productionMutationBlocks: true,
    nextBatchSelectionBlocks: true
  },
  artifacts: {
    preparation: MANIFEST,
    identitySnapshot: IDENTITY,
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    compilationAudit: AUDIT,
    compiledOutputs: contexts.map((context) => context.plannedCompiledOutput)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes,
  authorization: {
    compilationPreparation: true,
    deterministicCompilationActivation: false,
    deterministicCompilation: false,
    modelExecution: false,
    paidServices: false,
    scoreRecalculation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    preparationManifests: 1,
    identitySnapshots: 1,
    deterministicCompilationPasses: 0,
    compiledOutputsWritten: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    productionMutations: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "user-approval-required-before-activation-and-execution-of-one-frozen-batch-01-deterministic-publication-compilation-pass"
};

if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(IDENTITY), identityBytes);
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite
        ? manifest.status
        : "post-canary-batch-01-publication-compilation-preparation-preview",
      explicitOrder: manifest.explicitOrder,
      debates: manifest.aggregateExpectations.debates,
      sections: manifest.aggregateExpectations.sections,
      moves: manifest.aggregateExpectations.moves,
      modelContexts: 0,
      deterministicCompilationPasses: 0,
      directIncrementalCostUsd: 0,
      compiledOutputsWritten: 0,
      productionMutation: false,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
