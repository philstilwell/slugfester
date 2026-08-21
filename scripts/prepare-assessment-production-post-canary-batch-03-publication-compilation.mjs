#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_PROTOCOL_ID,
  POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication-compilation.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import {
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_INSTRUCTION,
  loadAndValidatePostCanaryBatch03StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-03-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ROOT;
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction";
const FINAL_REPAIR_ROOT = `${PUBLICATION_ROOT}/resumption-3/repair-1`;
const FINAL_REPAIR_ANALYSIS = `${FINAL_REPAIR_ROOT}/analysis.json`;
const COHORT_REPLAY = `${FINAL_REPAIR_ROOT}/ten-debate-cohort-replay.json`;
const IDENTITY = `${ROOT}/production-identity-snapshot.json`;
const MANIFEST = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const AUDIT = `${ROOT}/compilation-audit.json`;
const FINAL_LEDGER =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/final-ledger/final-ledger.json";
const CALCULATED_SCORES =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/score-pass/calculated-scores.json";

const ACCEPTED_OUTPUTS = Object.freeze({
  "124": `${PUBLICATION_ROOT}/repair-1/merged/debate-124.json`,
  "14": `${PUBLICATION_ROOT}/resumption-1/outputs/debate-14.json`,
  "58": `${PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-58.json`,
  "150": `${PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-150.json`,
  "157": `${PUBLICATION_ROOT}/resumption-2/repair-1/resumption-1/merged/debate-157.json`,
  "102": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-102.json`,
  "09": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-09.json`,
  "181": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-181.json`,
  "138": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-138.json`,
  "27": `${PUBLICATION_ROOT}/resumption-3/repair-1/merged/debate-27.json`
});
const PUBLICATION_PACKETS = Object.freeze(
  Object.fromEntries(
    POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER.map((debateNumber) => [
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
const standingAuthorization =
  await loadAndValidatePostCanaryBatch03StandingAuthorization();

if (shouldWrite) {
  for (const file of [IDENTITY, MANIFEST]) {
    assertV4(!(await exists(file)), `${file} already exists; preparation is immutable`);
  }
}

assertV4(
  canonicalJson(Object.keys(ACCEPTED_OUTPUTS).sort()) ===
    canonicalJson([...POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER].sort()) &&
    canonicalJson(Object.keys(PUBLICATION_PACKETS).sort()) ===
      canonicalJson([...POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER].sort()),
  "Batch 3 compilation inputs do not match the frozen cohort order"
);

const [finalRepairAnalysis, cohortReplay] = await Promise.all([
  parse(FINAL_REPAIR_ANALYSIS),
  parse(COHORT_REPLAY)
]);
assertV4(
  finalRepairAnalysis.status ===
      "batch-03-debate-27-repair-and-ten-debate-publication-cohort-passed" &&
    finalRepairAnalysis.gate?.completeDebate27ValidationPassed === true &&
    finalRepairAnalysis.gate?.completeTenDebateCohortReplayPassed === true &&
    finalRepairAnalysis.gate?.cohort?.debates === 10 &&
    finalRepairAnalysis.gate?.cohort?.moves === 200 &&
    finalRepairAnalysis.gate?.cohort?.critiques === 200 &&
    finalRepairAnalysis.gate?.cohort?.exactSourceQuotes === 20 &&
    finalRepairAnalysis.gate?.cohort?.overallCommentarySides === 20 &&
    finalRepairAnalysis.gate?.cohort?.aiExtensionSides === 20 &&
    finalRepairAnalysis.gate?.cohort?.modelAuthoredScores === 0 &&
    finalRepairAnalysis.gate?.cohort?.lockedScoresUnchanged === true &&
    finalRepairAnalysis.nextAuthorizedAction ===
      "prepare-validate-freeze-commit-and-push-one-deterministic-batch-03-publication-compilation-pass" &&
    cohortReplay.status === "passed" &&
    cohortReplay.totals?.debates === 10 &&
    cohortReplay.totals?.moves === 200 &&
    cohortReplay.totals?.critiques === 200 &&
    cohortReplay.totals?.modelAuthoredScores === 0 &&
    cohortReplay.totals?.lockedScoresUnchanged === true,
  "the passing Batch 3 publication-reconstruction checkpoint changed"
);

const productionByNumber = new Map(
  debates.map((debate) => [debate.number, debate])
);
const identityRows = [];
const contexts = [];
for (const debateNumber of POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER) {
  const outputPath = ACCEPTED_OUTPUTS[debateNumber];
  const packetPath = PUBLICATION_PACKETS[debateNumber];
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(outputPath)),
    readFile(path.resolve(packetPath))
  ]);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const validation = validatePostCanaryBatch03PublicationOutput(output, packet);
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
    contexts.reduce((sum, context) => sum + context.expectedMoves, 0) === 200,
  "the complete Batch 3 compilation cohort changed"
);

const identitySnapshot = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-publication-compilation-identity-snapshot",
  protocolId: POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_PROTOCOL_ID,
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
  FINAL_REPAIR_ANALYSIS,
  COHORT_REPLAY,
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
  FINAL_LEDGER,
  CALCULATED_SCORES,
  "docs/assessment-production/post-canary-continuation-v1/batch-03/score-pass/score-pass-manifest.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-03/score-pass/analysis.json",
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
  "scripts/lib/assessment-production-post-canary-batch-03-score-gate.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-compilation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-standing-authorization.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-publication-compilation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-publication-compilation.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-publication-compilation.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-publication-compilation-preparation.mjs",
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
    "1.0-assessment-production-post-canary-batch-03-deterministic-publication-compilation-preparation",
  protocolId: POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status:
    "frozen-post-canary-batch-03-deterministic-publication-compilation-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_INSTRUCTION,
    scopeReference:
      "the Batch 3 standing authorization for the remaining publication workflow",
    standingAuthorization: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
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
    finalRepairAnalysis: FINAL_REPAIR_ANALYSIS,
    tenDebateCohortReplay: COHORT_REPLAY,
    identitySnapshot: IDENTITY,
    finalLedger: FINAL_LEDGER,
    calculatedScores: CALCULATED_SCORES,
    acceptedPublicationOutputs: ACCEPTED_OUTPUTS,
    publicationPackets: PUBLICATION_PACKETS
  },
  explicitOrder: POST_CANARY_BATCH_03_PUBLICATION_COMPILATION_ORDER,
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
    moves: 200,
    critiques: 200,
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
    "activate-and-execute-one-frozen-batch-03-deterministic-publication-compilation-pass-under-standing-authorization"
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
        : "post-canary-batch-03-publication-compilation-preparation-preview",
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
