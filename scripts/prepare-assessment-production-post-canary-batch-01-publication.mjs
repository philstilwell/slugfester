#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates as productionDebates } from "../src/data/debates.js";
import {
  loadPostCanaryBatch01FinalLedgerInputs,
  validatePostCanaryBatch01FinalLedger
} from "./lib/assessment-production-post-canary-batch-01-final-ledger.mjs";
import {
  validatePostCanaryBatch01Scores
} from "./lib/assessment-production-post-canary-batch-01-score-gate.mjs";
import {
  buildPostCanaryBatch01PublicationPacket,
  buildPostCanaryBatch01PublicationSchema,
  postCanaryBatch01ReferenceCatalog,
  POST_CANARY_BATCH_01_PUBLICATION_DEBATES,
  POST_CANARY_BATCH_01_PUBLICATION_MODEL,
  POST_CANARY_BATCH_01_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_01_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-01-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_01_PUBLICATION_ROOT;
const EXECUTION_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const REFERENCE_CATALOG = `${ROOT}/reference-catalog.json`;
const MANUAL = `${ROOT}/manual.md`;
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const SELECTION =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/selection.json";
const FINAL_LEDGER =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/final-ledger/final-ledger.json";
const FINAL_LEDGER_MANIFEST =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/final-ledger/final-ledger-manifest.json";
const FINAL_LEDGER_ANALYSIS =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/final-ledger/analysis.json";
const SCORES =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/score-pass/calculated-scores.json";
const SCORE_MANIFEST =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/score-pass/score-pass-manifest.json";
const SCORE_PREPARATION =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/score-pass/score-pass-preparation-manifest.json";
const SCORE_ANALYSIS =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/score-pass/analysis.json";
const AUDIO_AUDIT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/audio-verification/audio-verification.json";
const SOURCE_PACKET_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/independent-judgments/source-packets";
const HARD_ROUTE_EXECUTION_PLAN =
  "docs/calibration/v4.2.21.17.32/hard-route-publication-reconstruction/execution-manifest.json";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const COPIED_INPUT_CEILING_BYTES = 400000;
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY"
];

const STATIC_SOURCE_FILES = [
  PRODUCTION_MANIFEST,
  SELECTION,
  PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  OUTPUT_CONTRACT,
  MANUAL,
  FINAL_LEDGER,
  FINAL_LEDGER_MANIFEST,
  FINAL_LEDGER_ANALYSIS,
  SCORES,
  SCORE_MANIFEST,
  SCORE_PREPARATION,
  SCORE_ANALYSIS,
  AUDIO_AUDIT,
  HARD_ROUTE_EXECUTION_PLAN,
  "src/data/debates.js",
  "src/data/references.js",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-final-ledger.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-score-gate.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-validation.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-01-publication.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-publication-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-01-publication.mjs",
  "scripts/run-assessment-production-post-canary-batch-01-publication.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-01-publication.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

const filesToRead = [
  FINAL_LEDGER,
  FINAL_LEDGER_MANIFEST,
  FINAL_LEDGER_ANALYSIS,
  SCORES,
  SCORE_MANIFEST,
  SCORE_PREPARATION,
  SCORE_ANALYSIS,
  AUDIO_AUDIT,
  PRODUCTION_MANIFEST,
  SELECTION,
  PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW,
  OUTPUT_CONTRACT,
  MANUAL,
  HARD_ROUTE_EXECUTION_PLAN
];
const loadedBytes = Object.fromEntries(
  await Promise.all(
    filesToRead.map(async (file) => [file, await readFile(path.resolve(file))])
  )
);
const json = (file) => JSON.parse(loadedBytes[file]);
const ledger = json(FINAL_LEDGER);
const ledgerManifest = json(FINAL_LEDGER_MANIFEST);
const ledgerAnalysis = json(FINAL_LEDGER_ANALYSIS);
const scores = json(SCORES);
const scoreManifest = json(SCORE_MANIFEST);
const scorePreparation = json(SCORE_PREPARATION);
const scoreAnalysis = json(SCORE_ANALYSIS);
const audioAudit = json(AUDIO_AUDIT);
const productionManifest = json(PRODUCTION_MANIFEST);
const selection = json(SELECTION);
const hardRouteExecutionPlan = json(HARD_ROUTE_EXECUTION_PLAN);

assertV4(
  scoreAnalysis.status === "post-canary-batch-01-score-stability-gate-passed" &&
    scoreAnalysis.productionCanary === false &&
    scoreAnalysis.batchNumber === 1 &&
    scoreAnalysis.stagingOnly === true &&
    scoreAnalysis.validation?.acceptancePassed === true &&
    scoreAnalysis.validation?.scoringPasses === 1 &&
    scoreAnalysis.resultIntegrity?.singleDeterministicScoringPass === true &&
    scoreAnalysis.resultIntegrity?.automaticRerunPerformed === false &&
    scoreAnalysis.authorization?.publicationPacketPreparation === false &&
    scoreAnalysis.authorization?.publicationModelExecution === false &&
    scoreAnalysis.authorization?.productionMutation === false &&
    scoreAnalysis.nextAuthorizedAction ===
      "user-approval-required-before-batch-01-publication-packet-preparation",
  "the accepted Batch 1 score gate is unavailable or its stop boundary changed"
);
assertV4(
  scores.status === "post-canary-batch-01-single-score-pass-stability-gate-passed" &&
    scores.totals?.debates === 10 &&
    scores.totals?.scoringPasses === 1 &&
    scores.totals?.acceptancePassed === true &&
    scores.authorization?.scoreRerun === false &&
    scores.authorization?.publicationPacketPreparation === false,
  "the locked Batch 1 score artifact is unavailable"
);
assertV4(
  scoreManifest.status ===
      "frozen-post-canary-batch-01-single-deterministic-score-pass-authorized" &&
    scoreManifest.authorization?.scorePassesMaximum === 1 &&
    scoreManifest.authorization?.scoreRerun === false &&
    scoreManifest.authorization?.publicationModelExecution === false &&
    scoreManifest.authorization?.productionMutation === false &&
    scoreManifest.scoringPolicy?.modelScoringAllowed === false &&
    scorePreparation.status ===
      "frozen-post-canary-batch-01-single-deterministic-score-pass-prepared-not-authorized",
  "the frozen Batch 1 single-pass score controls changed"
);
assertV4(
  ledger.status ===
      "passed-post-canary-batch-01-deterministic-final-ledger-assembly" &&
    ledger.debates?.length === 10 &&
    ledger.audit?.finalMoves === 177 &&
    ledger.audit?.audioVerifiedMoves === 3 &&
    ledger.authorization?.publicationReconstruction === false &&
    ledger.authorization?.productionMutation === false &&
    ledgerManifest.status ===
      "frozen-ten-debate-post-canary-batch-01-deterministic-final-ledger-assembly" &&
    ledgerAnalysis.status ===
      "post-canary-batch-01-deterministic-final-ledger-gate-passed",
  "the locked Batch 1 final ledger changed"
);
assertV4(
  audioAudit.status ===
      "passed-all-three-post-canary-batch-01-confidence-moves-audio-verified" &&
    audioAudit.totals?.requiredMoves === 3 &&
    audioAudit.totals?.verified === 3 &&
    audioAudit.totals?.unresolved === 0,
  "the three required Batch 1 audio checks are incomplete"
);
assertV4(
  productionManifest.model?.label === POST_CANARY_BATCH_01_PUBLICATION_MODEL.label &&
    productionManifest.model?.slug === POST_CANARY_BATCH_01_PUBLICATION_MODEL.slug &&
    productionManifest.model?.reasoningEffort ===
      POST_CANARY_BATCH_01_PUBLICATION_MODEL.reasoningEffort &&
    productionManifest.model?.authentication ===
      POST_CANARY_BATCH_01_PUBLICATION_MODEL.authentication,
  "the frozen production model or authentication changed"
);
assertV4(
  selection.selected?.map((item) => item.debateNumber).join(",") ===
      POST_CANARY_BATCH_01_PUBLICATION_DEBATES.join(",") &&
    selection.selected.every((item) => item.speakerCount === 2) &&
    selection.authorization?.productionMutation === false,
  "the frozen Batch 1 selection changed"
);
assertV4(
  ledger.debates.map((debate) => debate.debateNumber).join(",") ===
      POST_CANARY_BATCH_01_PUBLICATION_DEBATES.join(",") &&
    scores.debates.map((debate) => debate.debateNumber).join(",") ===
      POST_CANARY_BATCH_01_PUBLICATION_DEBATES.join(","),
  "the Batch 1 ledger or score order changed"
);
assertV4(
  hardRouteExecutionPlan.status ===
      "frozen-five-isolated-hard-route-publication-contexts-authorized" &&
    hardRouteExecutionPlan.executionPolicy?.maximumConcurrency === 2 &&
    hardRouteExecutionPlan.executionPolicy?.retriesMaximum === 0 &&
    hardRouteExecutionPlan.executionPolicy?.correctionContextsMaximum === 0 &&
    hardRouteExecutionPlan.executionPolicy?.maximumCopiedInputBytes === 400000 &&
    hardRouteExecutionPlan.costEstimate?.authentication ===
      "ChatGPT subscription" &&
    hardRouteExecutionPlan.costEstimate?.meteredApiCostUsdMaximum === 0,
  "the proven publication execution plan changed"
);
for (const [file, digest] of Object.entries(scoreManifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: score source drifted`
  );
}

const finalLedgerInputs = await loadPostCanaryBatch01FinalLedgerInputs();
validatePostCanaryBatch01FinalLedger(
  ledger,
  finalLedgerInputs.debateInputs,
  finalLedgerInputs.sourceHashes
);
const requiredNumbers = new Set(
  ledger.debates.map((debate) => debate.debateNumber)
);
const productionReferences = productionDebates
  .filter((debate) => requiredNumbers.has(String(debate.number)))
  .map((debate) => ({
    debateNumber: String(debate.number),
    pro: debate.score.pro,
    con: debate.score.con
  }));
validatePostCanaryBatch01Scores(
  scores,
  ledger,
  finalLedgerInputs.debateInputs,
  productionReferences,
  {
    finalLedgerSha256: scoreManifest.sourceHashes[FINAL_LEDGER],
    productionReferenceSha256:
      scoreManifest.sourceHashes[
        scoreManifest.inputs.productionReferenceDiagnosticOnly
      ],
    activePolicySha256:
      scoreManifest.sourceHashes[scoreManifest.activePolicyControl.promotionRecord]
  }
);

const catalog = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-local-reference-catalog",
  references: postCanaryBatch01ReferenceCatalog()
};
const catalogBytes = prettyJsonBytes(catalog);
const sharedCopiedInputBytes =
  loadedBytes[PRODUCTION_WORKFLOW].length +
  loadedBytes[READINESS_WORKFLOW].length +
  loadedBytes[OUTPUT_CONTRACT].length +
  loadedBytes[MANUAL].length +
  catalogBytes.length;
const audioVerifiedMoveIds = new Set(
  audioAudit.debates.flatMap((debate) =>
    debate.moves
      .filter((move) => move.status === "verified")
      .map((move) => move.moveId)
  )
);
const renderDate = frozenAt.slice(0, 10);
const contexts = [];
const generated = [];

for (const debateNumber of POST_CANARY_BATCH_01_PUBLICATION_DEBATES) {
  const ledgerDebate = ledger.debates.find(
    (debate) => debate.debateNumber === debateNumber
  );
  const scoreDebate = scores.debates.find(
    (debate) => debate.debateNumber === debateNumber
  );
  const production = productionDebates.find(
    (debate) => String(debate.number) === debateNumber
  );
  const input = finalLedgerInputs.debateInputs.find(
    (item) => item.primaryA.debateNumber === debateNumber
  );
  const sourcePacketPath = `${SOURCE_PACKET_ROOT}/debate-${debateNumber}.json`;
  const sourcePacketBytes = await readFile(path.resolve(sourcePacketPath));
  const sourcePacket = JSON.parse(sourcePacketBytes);
  assertV4(
    ledgerDebate &&
      scoreDebate &&
      production &&
      input &&
      production.id === ledgerDebate.debateId &&
      scoreDebate.debateId === ledgerDebate.debateId &&
      sourcePacket.debateId === ledgerDebate.debateId,
    `Debate ${debateNumber}: publication source identity mismatch`
  );
  const [transcriptBytes, eventsBytes, localManifestBytes] = await Promise.all([
    readFile(path.resolve(sourcePacket.sourceChain.transcriptPath)),
    readFile(path.resolve(sourcePacket.sourceChain.eventsPath)),
    readFile(path.resolve(sourcePacket.sourceChain.localManifestPath))
  ]);
  assertV4(
    sha256(transcriptBytes) === sourcePacket.sourceChain.transcriptSha256 &&
      sha256(eventsBytes) === sourcePacket.sourceChain.eventsSha256 &&
      sha256(localManifestBytes) ===
        sourcePacket.sourceChain.localManifestSha256,
    `Debate ${debateNumber}: local canonical source hash mismatch`
  );
  const packet = buildPostCanaryBatch01PublicationPacket({
    ledgerDebate,
    scoreDebate,
    sourcePacket,
    eventsDocument: input.eventsDocument,
    production,
    audioVerifiedMoveIds,
    renderDate
  });
  const schema = buildPostCanaryBatch01PublicationSchema(packet);
  const packetPath = `${ROOT}/packets/debate-${debateNumber}.json`;
  const schemaPath = `${ROOT}/schemas/debate-${debateNumber}.schema.json`;
  const outputPath = `${ROOT}/outputs/debate-${debateNumber}.json`;
  const validationPath = `${ROOT}/validations/debate-${debateNumber}.json`;
  const provenancePath = `${ROOT}/provenance/debate-${debateNumber}.json`;
  const packetBytes = prettyJsonBytes(packet);
  const schemaBytes = prettyJsonBytes(schema);
  const copiedInputBytes =
    sharedCopiedInputBytes + packetBytes.length + schemaBytes.length;
  assertV4(
    copiedInputBytes <= COPIED_INPUT_CEILING_BYTES,
    `Debate ${debateNumber}: publication context exceeds 400 KB`
  );
  generated.push(
    [packetPath, packetBytes],
    [schemaPath, schemaBytes]
  );
  contexts.push({
    contextIndex: contexts.length,
    debateNumber,
    debateId: ledgerDebate.debateId,
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    sourcePacket: sourcePacketPath,
    sourcePacketSha256: sha256(sourcePacketBytes),
    transcript: sourcePacket.sourceChain.transcriptPath,
    transcriptSha256: sha256(transcriptBytes),
    events: sourcePacket.sourceChain.eventsPath,
    eventsSha256: sha256(eventsBytes),
    localManifest: sourcePacket.sourceChain.localManifestPath,
    localManifestSha256: sha256(localManifestBytes),
    moves: packet.moves.length,
    sections: packet.sections.length,
    quoteEligibleMoves: packet.moves.filter((move) => move.quoteEligible).length,
    audioVerifiedMoves: packet.moves.filter((move) => move.audioVerified).length,
    packetBytes: packetBytes.length,
    schemaBytes: schemaBytes.length,
    copiedInputBytes,
    rawOutput: outputPath,
    output: outputPath,
    validation: validationPath,
    provenance: provenancePath
  });
}

assertV4(contexts.length === 10, "exactly ten publication contexts required");
assertV4(
  contexts.reduce((sum, context) => sum + context.moves, 0) === 177,
  "Batch 1 publication move coverage changed"
);
assertV4(
  contexts.reduce((sum, context) => sum + context.sections, 0) === 50,
  "Batch 1 publication section coverage changed"
);
assertV4(
  contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0) === 3,
  "Batch 1 audio-verification coverage changed"
);
assertV4(
  contexts.every(
    (context) =>
      context.sections >= 4 &&
      context.sections <= 7 &&
      context.quoteEligibleMoves >= 2
  ),
  "Batch 1 publication section or quote eligibility is invalid"
);

const sourceHashes = {};
for (const file of [...new Set(STATIC_SOURCE_FILES)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[REFERENCE_CATALOG] = sha256(catalogBytes);
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
  sourceHashes[context.sourcePacket] = context.sourcePacketSha256;
  sourceHashes[context.transcript] = context.transcriptSha256;
  sourceHashes[context.events] = context.eventsSha256;
  sourceHashes[context.localManifest] = context.localManifestSha256;
}

const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const futureOutputs = [
  ...contexts.flatMap((context) => [
    context.rawOutput,
    context.validation,
    context.provenance
  ]),
  ACTIVATION,
  EXECUTION,
  ANALYSIS
];
for (const file of [
  EXECUTION_PREPARATION,
  REFERENCE_CATALOG,
  ...generated.map(([file]) => file),
  ...futureOutputs
]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}
for (const file of futureOutputs) {
  assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
}

const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
  encoding: "utf8"
}).trim();
const rampPhases = [
  {
    phase: "operational-canary-one",
    maximumParallelContexts: 1,
    contextIndexes: [0],
    expansionRequiresAllValid: true
  },
  {
    phase: "ramp-two",
    maximumParallelContexts: 2,
    contextIndexes: [1, 2],
    expansionRequiresAllValid: true
  },
  {
    phase: "steady-two",
    maximumParallelContexts: 2,
    contextIndexes: Array.from({ length: 7 }, (_, index) => index + 3),
    expansionRequiresAllValid: false
  }
];
const stopRules = {
  sourceHashMismatchBlocks: true,
  packetOrSchemaHashMismatchBlocks: true,
  localCanonicalSourceHashMismatchBlocks: true,
  preexistingFutureOutputBlocks: true,
  separateActivationRequired: true,
  nonSubscriptionAuthenticationBlocks: true,
  apiKeyVisibilityBlocks: true,
  legacyAssessmentVisibilityBlocks: true,
  otherDebateOrRankingVisibilityBlocks: true,
  mutableIdentityStructureMoveOrScoreFieldBlocks: true,
  modelAuthoredScoreBlocks: true,
  timeoutBlocksAtFrozenRampBoundary: true,
  invalidOutputBlocksAtFrozenRampBoundary: true,
  nonExactQuotationBlocks: true,
  critiqueIntegrityFailureBlocks: true,
  unexpectedCJKHangulOrReplacementCharacterBlocks: true,
  forcedOrUnknownReferenceTagBlocks: true,
  aiExtensionDisclosureOrNoveltyFailureBlocks: true,
  prohibitedLanguageBlocks: true,
  scoreMutationBlocks: true,
  automaticRetryBlocks: true,
  timeoutExtensionBlocks: true,
  correctionContextBlocks: true,
  publicationFinalizationBlocks: true,
  renderingVerificationBlocks: true,
  productionMutationBlocks: true,
  nextBatchSelectionBlocks: true
};

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-publication-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_01_PUBLICATION_PROTOCOL_ID,
  status:
    "frozen-ten-post-canary-batch-01-score-locked-publication-contexts-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    instruction:
      "I approve preparation, validation, freezing, committing, and pushing of exactly ten Batch 1 score-locked publication-reconstruction packets and their execution-preparation manifest only, with a direct incremental cost cap of $0. Do not execute publication models, use paid services, finalize publication, mutate production, or select the next batch.",
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 10,
    publicationModelExecution: false,
    paidServices: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: structuredClone(POST_CANARY_BATCH_01_PUBLICATION_MODEL),
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 10,
    expectedParallelWallMinutes: [24, 45],
    expectedAggregateModelMinutes: [42, 70],
    expectedAggregateComputeHours: [0.7, 1.17],
    absoluteGateTimeoutMinutes: 120,
    estimateBasis: {
      source: HARD_ROUTE_EXECUTION_PLAN,
      hardRouteContexts: hardRouteExecutionPlan.executionPolicy.contexts,
      hardRoutePlannedWallMinutes:
        hardRouteExecutionPlan.costEstimate.expectedWallMinutes,
      hardRoutePlannedAggregateModelMinutes:
        hardRouteExecutionPlan.costEstimate.expectedAggregateModelMinutes,
      batchContexts: 10,
      maximumConcurrency: 2,
      scalingRule: "two-times-five-context-plan"
    }
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true
  },
  inputs: {
    productionManifest: PRODUCTION_MANIFEST,
    selection: SELECTION,
    finalLedger: FINAL_LEDGER,
    finalLedgerManifest: FINAL_LEDGER_MANIFEST,
    finalLedgerAnalysis: FINAL_LEDGER_ANALYSIS,
    calculatedScores: SCORES,
    scoreManifest: SCORE_MANIFEST,
    scorePreparation: SCORE_PREPARATION,
    scoreAnalysis: SCORE_ANALYSIS,
    audioAudit: AUDIO_AUDIT,
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    referenceCatalog: REFERENCE_CATALOG
  },
  modelInputs: {
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    referenceCatalog: REFERENCE_CATALOG,
    filesPerContext: [
      "production-workflow.md",
      "readiness-workflow.md",
      "output-contract.md",
      "manual.md",
      "reference-catalog.json",
      "packet.json",
      "schema.json"
    ]
  },
  sourceHashes,
  contexts,
  isolation: {
    oneDebatePerContext: true,
    separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true,
    participantJudgmentClosed: true,
    participantJudgmentWasScoreBlind: true,
    ownDebateScoresAvailableOnlyAsImmutablePacketFields: true,
    modelCannotAuthorIdentityStructureMoveSelectionOrScores: true,
    legacyAssessmentsUnavailable: true,
    otherDebateOutputsUnavailable: true,
    failedProductionCanaryOutputsUnavailable: true,
    validationCohortOutputsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    aiExtensionPostScoringOnly: true
  },
  publicationContract: {
    summaryTargetWords: [18, 28],
    summaryAcceptanceWords: [8, 35],
    quotationTargetWords: [6, 14],
    quotationAcceptanceWords: [3, 18],
    quotationExactSourceSubstringRequired: true,
    critiqueTargetWords: [112, 118],
    critiqueAcceptanceWords: [105, 130],
    critiqueMinimumCharacters: 880,
    critiqueMaximumCharacters: null,
    critiqueSentences: 4,
    critiqueOrderedLabels: [
      "Strongest feature:",
      "Principal limitation:",
      "Live burden:",
      "Locked score:"
    ],
    terminalPunctuationRequired: true,
    unexpectedCJKHangulOrReplacementCharactersRejected: true,
    tagsOptionalAndMaterialOnly: true,
    overallCommentaryBothSidesRequired: true,
    aiExtensionDisclosureAndNoveltyMapRequired: true,
    aiExtensionExcludedFromScores: true,
    exactBylineRequired: true
  },
  transport: {
    sharedCopiedInputBytes,
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    provenCeilingBytes: COPIED_INPUT_CEILING_BYTES,
    critiqueMaximumCharacterConstraintAbsent: true,
    runtimeWordSentenceQuotationAndNoveltyValidationRequired: true
  },
  executionPolicy: {
    contexts: 10,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    correctionContextsMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    absoluteGateTimeoutMs: 7200000,
    copiedInputBytesMaximum: COPIED_INPUT_CEILING_BYTES,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    firstRealContextOperationalCanary: true,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  deterministicValidation: {
    exactSourceAndScoreReplayPassedAtFreeze: true,
    everyLockedMoveAuthoredExactlyOnce: true,
    exactQuoteSubstringRequired: true,
    summaryWordContractRequired: true,
    critiqueWordCharacterSentenceAndLabelContractRequired: true,
    terminalPunctuationRequired: true,
    localReferenceCatalogOnly: true,
    emptyReferenceTagsAllowed: true,
    overallCommentaryMinimumsRequired: true,
    aiExtensionDisclosureAndNoveltyMapComplete: true,
    introducedArgumentPerSideRequired: true,
    exactAccordionDisplayContractRequired: true,
    prohibitedLanguageAbsent: true,
    lockedScoresUnchanged: true,
    modelAuthoredScores: 0
  },
  acceptanceContract: {
    validContextsRequired: 10,
    movesAuthoredRequired: 177,
    critiquesRequired: 177,
    exactSourceQuotesRequired: 20,
    overallCommentarySidesRequired: 20,
    aiExtensionSidesRequired: 20,
    semanticRepairsMaximum: 0,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0,
    modelAuthoredScoresMaximum: 0,
    scorePassesExecutedThisStage: 0
  },
  stopRules,
  authorization: {
    executionActivationPreparation: true,
    modelContexts: false,
    publicationModelExecution: false,
    deterministicOutputValidation: false,
    deterministicAnalysis: false,
    retry: false,
    timeoutExtension: false,
    correctionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    debates: 10,
    contexts: 10,
    moves: contexts.reduce((sum, context) => sum + context.moves, 0),
    sections: contexts.reduce((sum, context) => sum + context.sections, 0),
    quoteEligibleMoves: contexts.reduce(
      (sum, context) => sum + context.quoteEligibleMoves,
      0
    ),
    audioVerifiedMoves: contexts.reduce(
      (sum, context) => sum + context.audioVerifiedMoves,
      0
    ),
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    modelContextsExecuted: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  artifacts: {
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    rawOutputs: contexts.map((context) => context.rawOutput),
    validations: contexts.map((context) => context.validation),
    provenance: contexts.map((context) => context.provenance)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction:
    "user-approval-required-before-activation-and-execution-of-the-ten-frozen-batch-01-publication-contexts"
};

if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(REFERENCE_CATALOG), catalogBytes);
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(
    path.resolve(EXECUTION_PREPARATION),
    prettyJsonBytes(manifest)
  );
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: contexts.map((context) => ({
        debateNumber: context.debateNumber,
        moves: context.moves,
        sections: context.sections,
        quoteEligibleMoves: context.quoteEligibleMoves,
        audioVerifiedMoves: context.audioVerifiedMoves,
        copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000)
      })),
      totals: manifest.totals,
      model: manifest.model,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      modelContextsAuthorized: false,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
