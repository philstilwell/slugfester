#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");
const gateRoot = "docs/calibration/v3.8.4/held-out-score-reconstruction-gate";
const manifestPath = `${gateRoot}/gate-manifest.json`;

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

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

const manifest = await json(manifestPath);
const parent = await json("docs/calibration/v3.8.3/held-out-burden-contact-classification-gate/gate-analysis.json");
const scoringSchema = await json(manifest.contracts.scoringJudgmentSchema);
const adjudicationSchema = await json(manifest.contracts.scoringAdjudicationSchema);
const reconstructionSchema = await json(manifest.contracts.reconstructionSchema);
const dryFixture = await json(manifest.contracts.contractDryFixture);

assert(manifest.schemaVersion === "3.8.4-heldout-score-reconstruction-preregistration", "manifest schema mismatch");
assert(manifest.protocolId === "v3.8.4-heldout-score-reconstruction-gate", "protocol mismatch");
assert(manifest.status === "frozen-preregistration-construction-only", "manifest status is not frozen preregistration");
assert(manifest.calibrationOnly === true && manifest.AIOnly === true && manifest.dyadicOnly === true, "gate boundary mismatch");
assert(manifest.model.label === "5.6 Sol" && manifest.model.authentication === "ChatGPT subscription" && manifest.model.APIKeysRemoved === true, "model/authentication lock mismatch");
assert(parent.passed === true && parent.decision.scoreDerivationAndAssessmentReconstructionGatePreregistrationAuthorized === true, "parent authorization missing");
assert(parent.decision.numericalParticipantScoringAuthorized === false && parent.decision.assessmentProseAuthorized === false, "parent boundary changed");

assert(manifest.sample.debateCount === 3 && manifest.sample.debates.length === 3, "sample must contain three debates");
assert(JSON.stringify(manifest.sample.debates.map((entry) => entry.debateNumber)) === JSON.stringify(["103", "55", "161"]), "sample order changed");
assert(manifest.sample.inheritedClassifiedMoveCount === 12 && manifest.sample.acceptedSeedMoveCount === 24, "seed counts changed");
assert(manifest.sample.completeAssessmentMoveCount === null && manifest.sample.completeAssessmentMoveCountLockDeferredUntilCoveragePhase === true, "incomplete coverage must remain explicit");
for (const debate of manifest.sample.debates) {
  assert(debate.dyadic === true && debate.speakerCount === 2, `debate ${debate.debateNumber} is not dyadic`);
  assert(debate.resolvedSeedMoveCount === 8 && debate.inheritedV383MoveCount === 4, `debate ${debate.debateNumber} seed counts changed`);
  assert(debate.coverageStatusAtPreregistration === "known-incomplete-for-full-assessment", `debate ${debate.debateNumber} coverage warning missing`);
  for (const item of [debate.transcript, debate.events, debate.captionManifest]) {
    assert(item.sha256 === sha256(await read(item.path)), `${item.path} hash mismatch`);
  }
}

for (const [relativePath, expected] of Object.entries(manifest.sourceHashes)) {
  assert(expected === sha256(await read(relativePath)), `${relativePath} differs from preregistered hash`);
}

assert(manifest.coveragePolicy.inheritedSeedIsNotCompleteInventory === true, "coverage fail-close missing");
assert(manifest.coveragePolicy.acceptedBridgeCoverageRequired === 1, "accepted bridge coverage threshold changed");
assert(manifest.coveragePolicy.sectionsMinimum === 4 && manifest.coveragePolicy.sectionsMaximum === 7, "section range changed");
assert(manifest.coveragePolicy.coverageWeightsAndImportanceLockedBeforeScoring === true, "pre-score coverage lock missing");
assert(manifest.consensusPolicy.initialContextsPerDebate === 2 && manifest.consensusPolicy.thirdContextDisputedFieldsOnly === true, "consensus architecture changed");
assert(manifest.consensusPolicy.thirdContextMayChooseOnlyTwoInitialCandidates === true, "third-value exclusion missing");
assert(manifest.scoringPolicy.oneScoringPassSchema === true && manifest.scoringPolicy.sevenRawJudgmentFields.length === 7, "single scoring schema changed");
assert(manifest.scoringPolicy.scalarDisputeDeltaGreaterThan === 5 && manifest.scoringPolicy.diagnosticMoveTotalDisputeDeltaGreaterThan === 4, "score dispute thresholds changed");
assert(manifest.scoringPolicy.calculatedTotalsAllowedInInitialPasses === false && manifest.scoringPolicy.scoresDerivedOnlyAfterFinalJudgmentLock === true, "post-adjudication calculation boundary changed");

const scoringProperties = scoringSchema.properties;
assert(scoringProperties.schemaVersion.const === "3.8.4-scoring-judgment-pass", "scoring schema version mismatch");
assert(JSON.stringify(scoringProperties.pass.enum) === JSON.stringify(["A", "B"]), "scoring schema must serve both passes");
assert(JSON.stringify(Object.keys(scoringSchema.$defs.ratings.properties)) === JSON.stringify(manifest.scoringPolicy.sevenRawJudgmentFields), "scoring rating fields differ from manifest");
for (const prohibited of ["moveScore", "sectionScore", "sectionScores", "overall", "winner", "critique", "aiExtension"]) {
  assert(!Object.hasOwn(scoringProperties, prohibited), `initial scoring schema exposes prohibited top-level field ${prohibited}`);
}
assert(adjudicationSchema.properties.resolutions.items.properties.selectedCandidate.enum.length === 2, "adjudication schema permits a third candidate");
assert(JSON.stringify(adjudicationSchema.properties.resolutions.items.properties.selectedCandidate.enum) === JSON.stringify(["candidate-1", "candidate-2"]), "adjudication candidate labels changed");

const display = reconstructionSchema.properties.displayContract.properties;
assert(display.sectionTitle.const === "AI Extension", "AI Extension title changed");
assert(display.placement.const === "immediately-after-overall-commentary" && display.defaultCollapsed.const === true && display.visualVariant.const === "ai-distinct", "AI Extension display contract changed");
assert(display.byline.const === "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.", "exact byline changed");
assert(dryFixture.status === "passed" && Object.values(dryFixture.checks).every(Boolean), "contract dry fixture did not pass");

const expectedThresholds = {
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
};
assert(JSON.stringify(manifest.thresholds) === JSON.stringify(expectedThresholds), "frozen gate thresholds changed");
assert(manifest.executionPolicy.liveModelExecutionAuthorized === false && manifest.executionPolicy.executionPhaseLockRequiredBeforeModelCalls === true, "execution is not locked closed");
assert(manifest.authorization.deterministicPacketConstruction === true, "packet construction authorization missing");
assert(manifest.authorization.schemaFixtureAndValidatorConstruction === true, "contract construction authorization missing");
for (const key of [
  "coverageProposalModelExecution",
  "burdenContactModelExecution",
  "scoringModelExecution",
  "scoreAdjudicationModelExecution",
  "numericalParticipantScoring",
  "assessmentProse",
  "renderingClaim",
  "benchmarkMutation",
  "productionMutation",
  "tenDebateGate",
  "all195Debates"
]) {
  assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
}

for (const prohibitedPath of [
  `${gateRoot}/model-execution.json`,
  `${gateRoot}/score-ledgers`,
  `${gateRoot}/scorecards`,
  `${gateRoot}/rendering-audit.json`,
  `${gateRoot}/gate-analysis.json`
]) {
  assert(!(await exists(prohibitedPath)), `unauthorized execution artifact exists: ${prohibitedPath}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      protocolId: manifest.protocolId,
      sourceHashesValidated: Object.keys(manifest.sourceHashes).length,
      sourceChainsValidated: manifest.sample.debateCount,
      acceptedSeeds: manifest.sample.acceptedSeedMoveCount,
      inheritedClassifications: manifest.sample.inheritedClassifiedMoveCount,
      completeCoverageLocked: false,
      liveModelExecutionAuthorized: false,
      numericalScoringAuthorized: false,
      assessmentProseAuthorized: false,
      productionMutationAuthorized: false,
      all195DebatesAuthorized: false
    },
    null,
    2
  )
);
