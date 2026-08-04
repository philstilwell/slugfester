#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const write = process.argv.includes("--write");
const root = path.resolve(".");
const gateRoot = "docs/calibration/v3.8.4/held-out-score-reconstruction-gate";
const outputPath = path.join(root, gateRoot, "gate-manifest.json");
const parentRoot = "docs/calibration/v3.8.3/held-out-burden-contact-classification-gate";
const sourceRoot = "docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation";
const sampleRoot = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";

const contractPaths = [
  "docs/assessment-workflow-v3.8.4.md",
  "docs/reassessment-rubric-v3.8.4.md",
  `${gateRoot}/preregistration.md`,
  `${gateRoot}/scoring-manual.md`,
  `${gateRoot}/reconstruction-manual.md`,
  `${gateRoot}/scoring-judgment-schema.json`,
  `${gateRoot}/scoring-adjudication-schema.json`,
  `${gateRoot}/reconstruction-schema.json`,
  `${gateRoot}/contract-dry-fixture.json`,
  "scripts/lib/v384-score-consensus.mjs",
  "scripts/test-v384-score-reconstruction-contracts.mjs",
  "scripts/preregister-v384-score-reconstruction-gate.mjs",
  "scripts/validate-v384-score-reconstruction-preregistration.mjs"
];

const inheritedPaths = [
  `${parentRoot}/gate-analysis.json`,
  `${parentRoot}/execution-manifest.json`,
  `${sourceRoot}/source-preparation-analysis.json`,
  `${sourceRoot}/final-source-inventory.json`,
  `${sourceRoot}/resolved/debate-103.json`,
  `${sourceRoot}/resolved/debate-55.json`,
  `${sourceRoot}/resolved/debate-161.json`,
  `${sampleRoot}/gate-manifest.json`
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function read(relativePath) {
  return readFile(path.join(root, relativePath));
}

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

const parentAnalysis = await json(`${parentRoot}/gate-analysis.json`);
const parentManifest = await json(`${parentRoot}/execution-manifest.json`);
const sourceAnalysis = await json(`${sourceRoot}/source-preparation-analysis.json`);
const finalSeedInventory = await json(`${sourceRoot}/final-source-inventory.json`);
const sampleManifest = await json(`${sampleRoot}/gate-manifest.json`);

assert(parentAnalysis.passed === true, "parent v3.8.3 gate did not pass");
assert(
  parentAnalysis.decision.scoreDerivationAndAssessmentReconstructionGatePreregistrationAuthorized === true,
  "parent gate did not authorize this preregistration"
);
assert(parentAnalysis.decision.numericalParticipantScoringAuthorized === false, "parent gate unexpectedly authorized scores");
assert(parentAnalysis.decision.assessmentProseAuthorized === false, "parent gate unexpectedly authorized prose");
assert(sourceAnalysis.sourcePreparationPassed === true, "v3.8.2 source preparation did not pass");
assert(finalSeedInventory.selectedMoveCount === 12, "expected 12 inherited selected moves");

const sampleNumbers = ["103", "55", "161"];
const sample = [];
for (const debateNumber of sampleNumbers) {
  const debate = sampleManifest.sample.debates.find((entry) => entry.number === debateNumber);
  const resolvedPath = `${sourceRoot}/resolved/debate-${debateNumber}.json`;
  const resolved = await json(resolvedPath);
  const inherited = finalSeedInventory.debates.find((entry) => entry.debateNumber === debateNumber);
  assert(debate && debate.speakerCount === 2, `debate ${debateNumber} is not a locked dyad`);
  assert(resolved.moves.length === 8 && resolved.moves.every((move) => move.accepted === true), `debate ${debateNumber} seed inventory must contain eight accepted moves`);
  assert(inherited.moves.length === 4, `debate ${debateNumber} must inherit four v3.8.3 moves`);
  assert(resolved.moves.every((move) => move.attributionConfidence === "high"), `debate ${debateNumber} seed attribution changed`);
  assert(resolved.moves.every((move) => move.audioVerificationRequired === false), `debate ${debateNumber} has unexpected pending audio`);

  const captionRoot = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${captionRoot}/transcript.txt`;
  const eventsPath = `${captionRoot}/events.json`;
  const captionManifestPath = `${captionRoot}/manifest.json`;
  const [transcriptSource, eventsSource, captionManifestSource] = await Promise.all([
    read(transcriptPath),
    read(eventsPath),
    read(captionManifestPath)
  ]);

  assert(parentManifest.sourceHashes[transcriptPath] === sha256(transcriptSource), `debate ${debateNumber} transcript differs from parent lock`);
  assert(parentManifest.sourceHashes[eventsPath] === sha256(eventsSource), `debate ${debateNumber} events differ from parent lock`);
  assert(parentManifest.sourceHashes[captionManifestPath] === sha256(captionManifestSource), `debate ${debateNumber} caption manifest differs from parent lock`);

  sample.push({
    debateNumber,
    debateId: debate.debateId,
    videoId: debate.videoId,
    motion: debate.motion,
    sides: debate.sides,
    speakerCount: debate.speakerCount,
    dyadic: true,
    resolvedSeedInventoryPath: resolvedPath,
    resolvedSeedMoveCount: resolved.moves.length,
    inheritedV383MoveIds: inherited.moves.map((move) => move.moveId),
    inheritedV383MoveCount: inherited.moves.length,
    coverageStatusAtPreregistration: "known-incomplete-for-full-assessment",
    transcript: { path: transcriptPath, sha256: sha256(transcriptSource) },
    events: { path: eventsPath, sha256: sha256(eventsSource) },
    captionManifest: { path: captionManifestPath, sha256: sha256(captionManifestSource) }
  });
}

const sourceHashes = {};
for (const relativePath of [...contractPaths, ...inheritedPaths]) {
  sourceHashes[relativePath] = sha256(await read(relativePath));
}

const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8"
}).trim();

const manifest = {
  schemaVersion: "3.8.4-heldout-score-reconstruction-preregistration",
  protocolId: "v3.8.4-heldout-score-reconstruction-gate",
  parentProtocolId: "v3.8.3-heldout-burden-contact-classification-gate",
  status: "frozen-preregistration-construction-only",
  frozenAt: new Date().toISOString(),
  checkpointCommit,
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "high",
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true
  },
  sample: {
    debateCount: 3,
    debates: sample,
    newHeldoutDebatesOpened: 0,
    inheritedClassifiedMoveCount: 12,
    acceptedSeedMoveCount: 24,
    completeAssessmentMoveCount: null,
    completeAssessmentMoveCountLockDeferredUntilCoveragePhase: true
  },
  contracts: {
    workflow: "docs/assessment-workflow-v3.8.4.md",
    rubric: "docs/reassessment-rubric-v3.8.4.md",
    preregistration: `${gateRoot}/preregistration.md`,
    scoringManual: `${gateRoot}/scoring-manual.md`,
    reconstructionManual: `${gateRoot}/reconstruction-manual.md`,
    scoringJudgmentSchema: `${gateRoot}/scoring-judgment-schema.json`,
    scoringAdjudicationSchema: `${gateRoot}/scoring-adjudication-schema.json`,
    reconstructionSchema: `${gateRoot}/reconstruction-schema.json`,
    contractDryFixture: `${gateRoot}/contract-dry-fixture.json`
  },
  coveragePolicy: {
    inheritedSeedIsNotCompleteInventory: true,
    fullTranscriptReviewRequired: true,
    acceptedBridgeCoverageRequired: 1,
    loadBearingConstructiveCoverageRequired: 1,
    majorDirectReplyCoverageRequired: 1,
    materialConcessionCoverageRequired: 1,
    consequentialOmissionAccountingRequired: 1,
    sectionsMinimum: 4,
    sectionsMaximum: 7,
    moveAssignedExactlyOnce: true,
    eachScoredSectionRequiresBothSides: true,
    sectionWeightsIntegerTotal: 100,
    moveImportanceMinimum: 1,
    moveImportanceMaximum: 3,
    coverageWeightsAndImportanceLockedBeforeScoring: true
  },
  consensusPolicy: {
    initialContextsPerDebate: 2,
    initialModel: "5.6 Sol",
    deterministicDisagreementExtraction: true,
    thirdContextDisputedFieldsOnly: true,
    thirdContextMayChooseOnlyTwoInitialCandidates: true,
    finalSemanticChoiceRequiresMatchingVotes: 2,
    unresolvedFieldsBlockDownstreamWork: true
  },
  scoringPolicy: {
    oneScoringPassSchema: true,
    sevenRawJudgmentFields: [
      "logicalCoherence",
      "evidenceWarrant",
      "responsiveness",
      "relevanceBurden",
      "precisionClarity",
      "epistemicCalibration",
      "representationalCharity"
    ],
    scalarDisputeDeltaGreaterThan: 5,
    diagnosticMoveTotalDisputeDeltaGreaterThan: 4,
    responseClassMismatchAlwaysDisputed: true,
    burdenAdjustmentSemanticMismatchAlwaysDisputed: true,
    nondisputedScalarMerge: "rounded-mean",
    disputedScalarMerge: "adjudicator-selected-initial-candidate",
    calculatedTotalsAllowedInInitialPasses: false,
    scoresDerivedOnlyAfterFinalJudgmentLock: true,
    calculator: "scripts/lib/reassessment-scoring.mjs",
    burdenAdjustmentDefault: 0,
    burdenAdjustmentMinimum: -5,
    burdenAdjustmentMaximum: 5
  },
  compositionPolicy: {
    compositionBlockedUntilScoringGatePasses: true,
    isolatedReconstructionContexts: 3,
    legacyAssessmentUnavailable: true,
    participantArgumentWords: { minimum: 8, maximum: 55 },
    critiqueWords: { minimum: 105, maximum: 130 },
    overallStrengthsMinimumPerSide: 3,
    overallBlundersMinimumPerSide: 1,
    representativeQuotesRequireAudioVerification: true,
    aiExtensionTitle: "AI Extension",
    aiExtensionClearlyAIGenerated: true,
    aiExtensionPlacement: "immediately-after-overall-commentary",
    aiExtensionDefaultCollapsed: true,
    aiExtensionVisualVariant: "ai-distinct",
    aiExtensionPremisesPerSide: { minimum: 4, maximum: 6 },
    aiExtensionNewArgumentsPerSide: { minimum: 2, maximum: 4 },
    aiExtensionNewArgumentWords: { minimum: 45, maximum: 130 },
    aiExtensionNoveltyClasses: ["extends", "repairs", "introduces"],
    exactByline: "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.",
    prohibitedLanguageHitsMaximum: 0
  },
  thresholds: {
    validSourceChains: 3,
    requiredAudioVerificationRate: 1,
    passedCoverageAudits: 3,
    acceptedBridgeCoverageRate: 1,
    validInitialScoringContexts: 6,
    contaminatedContextsMaximum: 0,
    modelSuppliedCalculatedTotalsMaximum: 0,
    meanAbsoluteScalarDeltaMaximum: 5,
    materialScalarDisputeRateMaximum: 0.25,
    unresolvedScoringFieldsMaximum: 0,
    nondisputedFieldMutationsMaximum: 0,
    maximumDiagnosticOverallPassDelta: 5,
    diagnosticWinnerAgreementsRequired: 3,
    spearmanRankCorrelationMinimum: 0.9,
    burdenAdjustmentExclusionViolationsMaximum: 0,
    calculatorMismatchesMaximum: 0,
    completeReconstructionArtifacts: 3,
    scoreProseIdentityRate: 1,
    representativeQuoteVerificationRate: 1,
    aiExtensionNoveltyCoverageRate: 1,
    aiExtensionBalancedArtifacts: 3,
    displayContractArtifacts: 3,
    prohibitedLanguageHitsMaximum: 0,
    renderingChecksRequired: ["desktop", "mobile", "keyboard", "reduced-motion"],
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  executionPolicy: {
    liveModelExecutionAuthorized: false,
    executionPhaseLockRequiredBeforeModelCalls: true,
    estimatedIsolatedContextsMinimum: 18,
    estimatedIsolatedContextsMaximum: 30,
    estimatedWallClockHoursMinimum: 4,
    estimatedWallClockHoursMaximum: 10,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    publicSourceAudioOnly: true
  },
  authorization: {
    deterministicPacketConstruction: true,
    schemaFixtureAndValidatorConstruction: true,
    coverageProposalModelExecution: false,
    burdenContactModelExecution: false,
    scoringModelExecution: false,
    scoreAdjudicationModelExecution: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    renderingClaim: false,
    benchmarkMutation: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false
  },
  passMeaning: "A complete later execution pass may authorize only preregistration of a disjoint ten-debate end-to-end gate.",
  sourceHashes
};

if (write) {
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      protocolId: manifest.protocolId,
      sampleDebates: manifest.sample.debateCount,
      inheritedClassifiedMoves: manifest.sample.inheritedClassifiedMoveCount,
      acceptedSeedMoves: manifest.sample.acceptedSeedMoveCount,
      coverageStatus: "known-incomplete-and-fail-closed",
      liveModelExecutionAuthorized: false,
      financialCostEstimateUsd: 0,
      output: path.relative(root, outputPath).split(path.sep).join("/"),
      written: write
    },
    null,
    2
  )
);
