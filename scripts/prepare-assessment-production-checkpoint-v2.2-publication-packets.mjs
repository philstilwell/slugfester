#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates as productionDebates } from "../src/data/debates.js";
import {
  buildCheckpointV22PublicationPacket,
  buildCheckpointV22PublicationSchema,
  checkpointV22ReferenceCatalog,
  CHECKPOINT_V22_PUBLICATION_DEBATES,
  CHECKPOINT_V22_PUBLICATION_MODEL,
  CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const REFERENCE_CATALOG = `${ROOT}/reference-catalog.json`;
const MANUAL = `${ROOT}/manual.md`;
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const COHORT_SELECTION =
  "docs/assessment-production/production-checkpoint-v2.2-1/selection.json";
const FINAL_LEDGER =
  "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/final-ledger.json";
const FINAL_LEDGER_MANIFEST =
  "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/final-ledger-manifest.json";
const FINAL_LEDGER_ANALYSIS =
  "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/analysis.json";
const SCORES =
  "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/calculated-scores.json";
const SCORE_MANIFEST =
  "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/score-pass-manifest.json";
const SCORE_PREPARATION =
  "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/score-pass-preparation-manifest.json";
const SCORE_ANALYSIS =
  "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/analysis.json";
const AUDIO_AUDIT =
  "docs/assessment-production/production-checkpoint-v2.2-1/audio-verification/audio-verification.json";
const SOURCE_PACKET_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/independent-judgments/source-packets";
const COPIED_INPUT_CEILING_BYTES = 400000;

const STATIC_SOURCE_FILES = [
  PRODUCTION_MANIFEST,
  COHORT_SELECTION,
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
  "src/data/debates.js",
  "src/data/references.js",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-publication-packets.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-publication-preparation.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

async function mustNotExist(file) {
  assertV4(
    !(await exists(file)),
    `${file} already exists; production publication packet preparation is immutable`
  );
}

const [
  ledgerBytes,
  ledgerManifestBytes,
  ledgerAnalysisBytes,
  scoreBytes,
  scoreManifestBytes,
  scorePreparationBytes,
  scoreAnalysisBytes,
  audioAuditBytes,
  productionManifestBytes,
  cohortSelectionBytes,
  productionWorkflowBytes,
  readinessWorkflowBytes,
  outputContractBytes,
  manualBytes
] = await Promise.all(
  [
    FINAL_LEDGER,
    FINAL_LEDGER_MANIFEST,
    FINAL_LEDGER_ANALYSIS,
    SCORES,
    SCORE_MANIFEST,
    SCORE_PREPARATION,
    SCORE_ANALYSIS,
    AUDIO_AUDIT,
    PRODUCTION_MANIFEST,
    COHORT_SELECTION,
    PRODUCTION_WORKFLOW,
    READINESS_WORKFLOW,
    OUTPUT_CONTRACT,
    MANUAL
  ].map((file) => readFile(path.resolve(file)))
);

const ledger = JSON.parse(ledgerBytes);
const ledgerManifest = JSON.parse(ledgerManifestBytes);
const ledgerAnalysis = JSON.parse(ledgerAnalysisBytes);
const scores = JSON.parse(scoreBytes);
const scoreManifest = JSON.parse(scoreManifestBytes);
const scorePreparation = JSON.parse(scorePreparationBytes);
const scoreAnalysis = JSON.parse(scoreAnalysisBytes);
const audioAudit = JSON.parse(audioAuditBytes);
const productionManifest = JSON.parse(productionManifestBytes);
const cohortSelection = JSON.parse(cohortSelectionBytes);

assertV4(
  scoreAnalysis.status === "production-checkpoint-v2.2-score-stability-gate-passed" &&
    scoreAnalysis.productionCanary === true &&
    scoreAnalysis.stagingOnly === true &&
    scoreAnalysis.developmentValidationOnly === false &&
    scoreAnalysis.validation?.acceptancePassed === true &&
    scoreAnalysis.validation?.scoringPasses === 1 &&
    scoreAnalysis.resultIntegrity?.singleDeterministicScoringPass === true &&
    scoreAnalysis.resultIntegrity?.automaticRerunPerformed === false &&
    scoreAnalysis.authorization?.publicationPacketPreparation === true &&
    scoreAnalysis.authorization?.publicationModelExecution === false &&
    scoreAnalysis.authorization?.productionMutation === false &&
    scoreAnalysis.nextAuthorizedAction ===
      "prepare-and-freeze-ten-production-checkpoint-v2.2-publication-packets-model-free-only",
  "the score analysis does not authorize production publication packet preparation"
);
assertV4(
  scores.status === "production-checkpoint-v2.2-single-score-pass-stability-gate-passed" &&
    scores.totals?.debates === 10 &&
    scores.totals?.scoringPasses === 1 &&
    scores.totals?.modelContexts === 0 &&
    scores.totals?.acceptancePassed === true &&
    scores.authorization?.scoreRerun === false &&
    scores.authorization?.publicationPacketPreparation === false,
  "the locked score artifact is unavailable or its stop rules changed"
);
assertV4(
  scoreManifest.status ===
      "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-authorized" &&
    scoreManifest.authorization?.scorePassesMaximum === 1 &&
    scoreManifest.authorization?.scoreRerun === false &&
    scoreManifest.authorization?.productionMutation === false &&
    scoreManifest.scoringPolicy?.modelScoringAllowed === false &&
    scorePreparation.status ===
      "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-prepared-not-authorized",
  "the frozen single-pass score controls changed"
);
assertV4(
  ledger.status === "passed-production-checkpoint-v2.2-deterministic-final-ledger-assembly" &&
    ledger.debates?.length === 10 &&
    ledger.authorization?.scoreDerivation === true &&
    ledger.authorization?.scorePassesMaximum === 1 &&
    ledger.authorization?.productionMutation === false &&
    ledgerManifest.status ===
      "frozen-ten-debate-production-checkpoint-v2.2-deterministic-final-ledger-assembly" &&
    ledgerAnalysis.status ===
      "production-checkpoint-v2.2-deterministic-final-ledger-gate-passed" &&
    ledgerAnalysis.totals?.audioVerifiedMoves === 2,
  "the locked final ledger or its gate changed"
);
assertV4(
  audioAudit.status ===
      "passed-both-production-checkpoint-v2.2-confidence-moves-audio-verified" &&
    audioAudit.totals?.requiredMoves === 2 &&
    audioAudit.totals?.verified === 2 &&
    audioAudit.totals?.unresolved === 0,
  "the required audio-verification audit is incomplete"
);
assertV4(
  productionManifest.model?.label === CHECKPOINT_V22_PUBLICATION_MODEL.label &&
    productionManifest.model?.slug === CHECKPOINT_V22_PUBLICATION_MODEL.slug &&
    productionManifest.model?.reasoningEffort ===
      CHECKPOINT_V22_PUBLICATION_MODEL.reasoningEffort &&
    productionManifest.model?.authentication ===
      CHECKPOINT_V22_PUBLICATION_MODEL.authentication,
  "the frozen production model or authentication changed"
);
assertV4(
  cohortSelection.selected?.map((item) => item.debateNumber).join(",") ===
      CHECKPOINT_V22_PUBLICATION_DEBATES.join(",") &&
    cohortSelection.authorization?.productionMutation === false,
  "the frozen production checkpoint cohort changed"
);
assertV4(
  ledger.debates.map((debate) => debate.debateNumber).join(",") ===
      CHECKPOINT_V22_PUBLICATION_DEBATES.join(",") &&
    scores.debates.map((debate) => debate.debateNumber).join(",") ===
      CHECKPOINT_V22_PUBLICATION_DEBATES.join(","),
  "the ledger or score debate order changed"
);
for (const [file, digest] of Object.entries(scoreManifest.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: score source drifted`);
}
if (shouldWrite) {
  await mustNotExist(PREPARATION);
  await mustNotExist(REFERENCE_CATALOG);
}

const catalog = {
  schemaVersion: "1.0-production-checkpoint-v2.2-local-reference-catalog",
  references: checkpointV22ReferenceCatalog()
};
const catalogBytes = prettyJsonBytes(catalog);
const sharedCopiedInputBytes =
  productionWorkflowBytes.length +
  readinessWorkflowBytes.length +
  outputContractBytes.length +
  manualBytes.length +
  catalogBytes.length;
const audioVerifiedMoveIds = new Set(
  audioAudit.debates.flatMap((debate) =>
    debate.moves.filter((move) => move.status === "verified").map((move) => move.moveId)
  )
);
const renderDate = frozenAt.slice(0, 10);
const contexts = [];

for (const debateNumber of CHECKPOINT_V22_PUBLICATION_DEBATES) {
  const ledgerDebate = ledger.debates.find((debate) => debate.debateNumber === debateNumber);
  const scoreDebate = scores.debates.find((debate) => debate.debateNumber === debateNumber);
  const production = productionDebates.find(
    (debate) => String(debate.number) === debateNumber
  );
  const sourcePacketPath = `${SOURCE_PACKET_ROOT}/debate-${debateNumber}.json`;
  const sourcePacketBytes = await readFile(path.resolve(sourcePacketPath));
  const sourcePacket = JSON.parse(sourcePacketBytes);
  assertV4(
    ledgerDebate &&
      scoreDebate &&
      production &&
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
      sha256(localManifestBytes) === sourcePacket.sourceChain.localManifestSha256,
    `Debate ${debateNumber}: local canonical source hash mismatch`
  );
  const eventsDocument = JSON.parse(eventsBytes);
  const packet = buildCheckpointV22PublicationPacket({
    ledgerDebate,
    scoreDebate,
    sourcePacket,
    eventsDocument,
    production,
    audioVerifiedMoveIds,
    renderDate
  });
  const schema = buildCheckpointV22PublicationSchema(packet);
  const packetPath = `${ROOT}/packets/debate-${debateNumber}.json`;
  const schemaPath = `${ROOT}/schemas/debate-${debateNumber}.schema.json`;
  const outputPath = `${ROOT}/outputs/debate-${debateNumber}.json`;
  const compiledPath = `${ROOT}/compiled/debate-${debateNumber}.json`;
  const packetBytes = prettyJsonBytes(packet);
  const schemaBytes = prettyJsonBytes(schema);
  const copiedInputBytes = sharedCopiedInputBytes + packetBytes.length + schemaBytes.length;
  assertV4(
    copiedInputBytes <= COPIED_INPUT_CEILING_BYTES,
    `Debate ${debateNumber}: publication context exceeds the proven 400 KB transport ceiling`
  );

  if (shouldWrite) {
    await mustNotExist(packetPath);
    await mustNotExist(schemaPath);
    await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(schemaPath)), { recursive: true });
    await writeFile(path.resolve(packetPath), packetBytes);
    await writeFile(path.resolve(schemaPath), schemaBytes);
  }

  contexts.push({
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
    output: outputPath,
    compiled: compiledPath
  });
}

assertV4(contexts.length === 10, "publication preparation must contain ten contexts");
assertV4(
  contexts.reduce((sum, context) => sum + context.moves, 0) === 188,
  "publication preparation move coverage drifted"
);
assertV4(
  contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0) === 2,
  "publication preparation audio-verification coverage drifted"
);
assertV4(
  contexts.every(
    (context) =>
      context.sections >= 4 &&
      context.sections <= 6 &&
      context.quoteEligibleMoves >= 2
  ),
  "publication preparation section or quotation population mismatch"
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

const futureOutputPaths = contexts.flatMap((context) => [context.output, context.compiled]);
const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-preparation",
  protocolId: CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
  status: shouldWrite
    ? "ten-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  model: {
    ...CHECKPOINT_V22_PUBLICATION_MODEL,
    meteredApiCostUsdMaximum: 0
  },
  inputs: {
    productionManifest: PRODUCTION_MANIFEST,
    productionManifestSha256: sha256(productionManifestBytes),
    cohortSelection: COHORT_SELECTION,
    cohortSelectionSha256: sha256(cohortSelectionBytes),
    finalLedger: FINAL_LEDGER,
    finalLedgerSha256: sha256(ledgerBytes),
    finalLedgerManifest: FINAL_LEDGER_MANIFEST,
    finalLedgerManifestSha256: sha256(ledgerManifestBytes),
    finalLedgerAnalysis: FINAL_LEDGER_ANALYSIS,
    finalLedgerAnalysisSha256: sha256(ledgerAnalysisBytes),
    calculatedScores: SCORES,
    calculatedScoresSha256: sha256(scoreBytes),
    scoreManifest: SCORE_MANIFEST,
    scoreManifestSha256: sha256(scoreManifestBytes),
    scorePreparation: SCORE_PREPARATION,
    scorePreparationSha256: sha256(scorePreparationBytes),
    scoreAnalysis: SCORE_ANALYSIS,
    scoreAnalysisSha256: sha256(scoreAnalysisBytes),
    audioAudit: AUDIO_AUDIT,
    audioAuditSha256: sha256(audioAuditBytes),
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    outputContract: OUTPUT_CONTRACT,
    outputContractSha256: sha256(outputContractBytes),
    manual: MANUAL,
    manualSha256: sha256(manualBytes),
    referenceCatalog: REFERENCE_CATALOG,
    referenceCatalogSha256: sha256(catalogBytes)
  },
  sourceHashes,
  contexts,
  isolation: {
    oneDebatePerFutureContext: true,
    separateFreshModelContextPerDebateRequired: true,
    onlyWorkflowOutputContractManualPacketCatalogAndSchemaAllowed: true,
    participantJudgmentClosed: true,
    participantJudgmentWasScoreBlind: true,
    lockedScoresAvailableOnlyAsImmutableOwnDebateInputs: true,
    modelCannotAuthorIdentityStructureMoveSelectionOrScores: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    failedProductionCanaryOutputsUnavailable: true,
    validationCohortOutputsUnavailable: true,
    rankingsUnavailable: true,
    winnerComparisonsUnavailable: true,
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
    copiedInputsPerContext: [
      "productionWorkflow",
      "readinessWorkflow",
      "outputContract",
      "manual",
      "referenceCatalog",
      "packet",
      "schema"
    ],
    sharedCopiedInputBytes,
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    provenCeilingBytes: COPIED_INPUT_CEILING_BYTES,
    critiqueMaximumCharacterConstraintAbsent: true,
    runtimeWordSentenceQuotationAndNoveltyValidationRequired: true
  },
  executionPolicyToFreezeSeparately: {
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true,
    attemptsPerContextMaximum: 1,
    retriesMaximum: 0,
    correctionContextsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    timeoutMsPerContext: 600000,
    maximumMinutesPerContext: 8,
    maximumMeanMinutes: 6
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
    copiedInputBytes: contexts.reduce(
      (sum, context) => sum + context.copiedInputBytes,
      0
    ),
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    meanCopiedInputBytes: Math.round(
      contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0) /
        contexts.length
    ),
    modelContextsExecuted: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    audioCallsThisStage: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  authorization: {
    deterministicValidation: true,
    publicationExecutionManifestPreparation: true,
    publicationModelExecution: false,
    retry: false,
    correctionModelExecution: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "prepare-production-checkpoint-v2.2-publication-execution-manifest-model-free-only"
};

if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(REFERENCE_CATALOG), catalogBytes);
  await writeFile(path.resolve(PREPARATION), prettyJsonBytes(preparation));
}

console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => ({
        debateNumber: context.debateNumber,
        moves: context.moves,
        sections: context.sections,
        quoteEligibleMoves: context.quoteEligibleMoves,
        audioVerifiedMoves: context.audioVerifiedMoves,
        copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000)
      })),
      totals: preparation.totals,
      authentication: preparation.model.authentication,
      publicationModelExecutionAuthorized: false,
      productionMutationAuthorized: false,
      nextAuthorized: "publication-execution-manifest-preparation"
    },
    null,
    2
  )
);
