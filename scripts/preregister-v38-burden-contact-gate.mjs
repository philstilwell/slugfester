#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";
const POOL = `${ROOT}/metadata-eligible-pool.json`;
const OUTPUT = `${ROOT}/gate-manifest.json`;
const seedIndex = process.argv.indexOf("--seed");
const timeIndex = process.argv.indexOf("--preregistered-at");
const seed = seedIndex >= 0 ? process.argv[seedIndex + 1] : null;
const preregisteredAt = timeIndex >= 0 ? process.argv[timeIndex + 1] : null;

if (!seed || !/^[a-f0-9]{32}$/.test(seed) || !preregisteredAt || Number.isNaN(Date.parse(preregisteredAt))) {
  console.error("Usage: node scripts/preregister-v38-burden-contact-gate.mjs --seed <32 lowercase hex> --preregistered-at <ISO timestamp>");
  process.exit(1);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const poolText = await readFile(path.resolve(POOL), "utf8");
const pool = JSON.parse(poolText);
if (pool.candidateRanksInspected !== false || pool.transcriptContentAccessed !== false) throw new Error("metadata pool is not selection-blind");
if (pool.eligibleDyadic.length < 3) throw new Error("fewer than three eligible dyadic debates");

const rank = (candidate) => sha256(`${seed}:v3.8-dyadic:${candidate.debateId}`);
const selected = [...pool.eligibleDyadic]
  .map((candidate) => ({ ...candidate, selectionRankSha256: rank(candidate) }))
  .sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256))
  .slice(0, 3);

const frozenPaths = [
  "docs/assessment-workflow-v3.8.md",
  "docs/reassessment-rubric-v3.8.md",
  `${ROOT}/classification-manual.md`,
  `${ROOT}/preregistration.md`,
  POOL,
  "scripts/build-v38-heldout-eligible-pool.mjs",
  "scripts/preregister-v38-burden-contact-gate.mjs",
  "scripts/validate-v38-burden-contact-preregistration.mjs",
  "docs/calibration/v3.7.6/case-disjoint-retired-burden-contact-test/test-analysis.json",
  "docs/calibration/v3.7.6/case-disjoint-retired-burden-contact-test/execution-assessment.md"
];
const frozenSources = {};
for (const file of frozenPaths) frozenSources[file] = sha256(await readFile(path.resolve(file), "utf8"));

const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const artifact = {
  schemaVersion: "3.8-heldout-burden-contact-integration-gate-manifest",
  gateId: "v3.8-heldout-burden-contact-integration-gate",
  status: "preregistered-heldout-access-blocked",
  preregisteredAt,
  preregistrationCheckpointCommit: checkpointCommit,
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  workflowVersion: "Slugfester Burden-Contact Integration Workflow v3.8",
  rubricVersion: "Slugfester Burden-Contact Integration Rubric v3.8",
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  selectionProtocol: {
    metadataOnly: true,
    transcriptsOpenedBeforeLock: false,
    audioOpenedBeforeLock: false,
    legacyAssessmentsOpenedBeforeLock: false,
    candidateRanksInspectedBeforeSeed: false,
    randomizationSeed: seed,
    eligiblePoolPath: POOL,
    eligiblePoolSha256: sha256(poolText),
    rankFunction: "SHA-256(seed + ':v3.8-dyadic:' + debateId), ascending",
    selectionStatement: "Select the first three eligible dyadic metadata records by committed SHA-256 rank after excluding all debate IDs and numbers appearing in prior calibration artifacts."
  },
  sample: {
    debateCount: 3,
    movesPerDebate: 4,
    compositeCaseCount: 12,
    debates: selected
  },
  modelInputPolicy: {
    invariantWorkflow: "docs/assessment-workflow-v3.8.md",
    invariantRubric: "docs/reassessment-rubric-v3.8.md",
    classificationManual: `${ROOT}/classification-manual.md`,
    gateManifestUnavailableToModel: true,
    thresholdsUnavailableToModel: true,
    priorResultsUnavailableToModel: true,
    provisionalLabelsUnavailableToModel: true,
    legacyAssessmentsUnavailableToModel: true
  },
  sourcePreparationPolicy: {
    fullLocalTranscriptRequired: true,
    timestampedEventsRequired: true,
    localManifestRequired: true,
    hashVerificationRequiredBeforeContentUse: true,
    AIProposalAndIndependentAIReviewRequired: true,
    disputedPreparationFieldsOnlyToIsolatedAdjudicator: true,
    motionCentralAndPropositionSpecificSubsidiaryBridgesRequired: true,
    genericSubsidiaryCatchAllProhibited: true,
    exactSourceCoordinatesRequired: true,
    contextualSufficiencyReviewRequired: true,
    provisionalLabelsDiagnosticOnly: true
  },
  assessmentPolicy: {
    twoIsolatedInitialContextsPerDebate: true,
    sameLockedTranscriptRouteMapAndMoveInventory: true,
    anonymousCompositeCandidates: true,
    candidateOrderCounterbalanced: true,
    oneCompleteTuplePerMove: true,
    deterministicSemanticDisagreementExtraction: true,
    thirdContextDisputedCasesOnly: true,
    thirdContextMaySelectOnlyInitialTuples: true,
    finalTupleRequiresMatchingVotes: 2,
    attemptsPerContext: 1,
    modelOutputRetriesMaximum: 0,
    sameRequestStreamRecoveriesMaximum: 0
  },
  audioPolicy: {
    highConfidenceRequiresAudioVerification: false,
    mediumOrLowConfidenceRequiresAudioVerification: true,
    unresolvedAttributionExcludedBeforePacketLock: true,
    requiredVerificationRate: 1
  },
  thresholds: {
    validInitialContexts: 6,
    compositeCases: 12,
    initialCompositeAgreementsMinimum: 11,
    initialDisagreementsMaximum: 1,
    initialInvalidBundlesMaximum: 0,
    finalTwoVoteBundlesRequired: 12,
    unresolvedBundlesMaximum: 0,
    requiredAudioVerificationRate: 1,
    finalCategoryMinimums: { noContact: 2, support: 2, attack: 2, motion: 1, central: 1, subsidiary: 4 },
    scoringFieldsMaximum: 0
  },
  costPolicy: {
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredModelApiCostUsdMaximum: 0,
    existingLocalTranscriptsRequired: true,
    transcriptionCostUsdMaximum: 0,
    newPaidTranscriptionRequiresFreshEstimate: true
  },
  passMeaning: "A pass may authorize preregistration of a separate end-to-end three-debate assessment gate only. It does not authorize numerical scoring, assessment prose, benchmark mutation, production mutation, or corpus-wide reassessment.",
  authorization: {
    heldOutTranscriptContentAccess: false,
    sourcePreparation: false,
    packetConstruction: false,
    modelExecution: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    benchmarkMutation: false,
    productionMutation: false,
    all195Debates: false
  },
  emptyBeforeAccess: {
    sourcesDirectory: `${ROOT}/sources`,
    packetsDirectory: `${ROOT}/packets`,
    outputsDirectory: `${ROOT}/outputs`
  },
  priorAuthorization: {
    analysisPath: "docs/calibration/v3.7.6/case-disjoint-retired-burden-contact-test/test-analysis.json",
    heldOutIntegrationGatePreregistrationAuthorized: true,
    heldOutAccessAuthorized: false
  },
  frozenSources
};

await writeFile(path.resolve(OUTPUT), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "preregistered", output: OUTPUT, checkpointCommit, selected: selected.map(({ debateId, number }) => ({ debateId, number })) }, null, 2));
