#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateProposedV22WinnerStability,
  numericStabilityPassed,
} from "./lib/assessment-production-score-stability-policy-v2.2.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const selectionPath =
  "docs/assessment-production/score-stability-v2.2-validation-cohort/selection.json";
const policyPath =
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const policyLibraryPath =
  "scripts/lib/assessment-production-score-stability-policy-v2.2.mjs";
const policyTestPath =
  "scripts/test-assessment-production-score-stability-policy-v2.2.mjs";
const scoreManifestPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/score-pass-manifest.json";
const scoresPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/calculated-scores.json";
const scoreAnalysisPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/analysis.json";
const outputPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/policy-conformance-analysis.json";

if (shouldWrite) {
  await access(path.resolve(outputPath)).then(
    () => {
      throw new Error(`${outputPath} already exists`);
    },
    () => true
  );
}

const sourcePaths = [
  selectionPath,
  policyPath,
  policyLibraryPath,
  policyTestPath,
  scoreManifestPath,
  scoresPath,
  scoreAnalysisPath,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const selection = JSON.parse(sourceBytes[selectionPath]);
const scoreManifest = JSON.parse(sourceBytes[scoreManifestPath]);
const scores = JSON.parse(sourceBytes[scoresPath]);
const scoreAnalysis = JSON.parse(sourceBytes[scoreAnalysisPath]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assertV4(
  selection.status === "fresh-disjoint-v2.2-ten-debate-cohort-source-gate-passed" &&
    selection.policy.path === policyPath &&
    selection.policy.version === "v2.2-proposal" &&
    selection.policy.agreedWinningSideMayCollapseToIntegerRoundedTie &&
    selection.policy.agreedInitialTieImposesNoDirectionConstraint &&
    !selection.policy.numericalThresholdsChanged &&
    !selection.policy.promoted &&
    selection.selectionPolicy.acceptedCalibrationExcluded &&
    selection.selectionPolicy.productionCanaryExcluded &&
    selection.selectionPolicy.everyPriorValidationCohortExcluded &&
    !selection.selectionPolicy.scoreAccessed &&
    !selection.selectionPolicy.winnerAccessed,
  "prospective v2.2 cohort selection is unavailable"
);
assertV4(
  selection.policy.sha256 === sha256(sourceBytes[policyPath]) &&
    selection.sourceHashes[policyPath] === selection.policy.sha256,
  "selection-frozen v2.2 policy hash mismatch"
);
assertV4(
  scoreManifest.status === "frozen-v2.2.3-single-deterministic-score-pass" &&
    scoreManifest.scoringPolicy.proposal ===
      "docs/assessment-production/score-stability-policy-v2.1-proposal.md" &&
    scoreManifest.acceptanceRule.agreedInitialTieMustRemainTie === true &&
    scoreManifest.scoringPolicy.passes === 1 &&
    !scoreManifest.scoringPolicy.modelScoringAllowed &&
    !scoreManifest.scoringPolicy.formulaChangesAllowed &&
    !scoreManifest.scoringPolicy.postResultTuningAllowed &&
    !scoreManifest.scoringPolicy.automaticRerunAllowed,
  "frozen score-manifest mismatch is not the diagnosed v2.1 reference defect"
);
for (const [file, expected] of Object.entries(scoreManifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: frozen score source changed after calculation`
  );
}
assertV4(
  scores.status === "v2.2.3-single-score-pass-stability-gate-passed" &&
    scores.formulaBoundary.scoringPasses === 1 &&
    !scores.formulaBoundary.modelCalculatedScores &&
    scores.totals.retries === 0 &&
    scoreAnalysis.status ===
      "v2.2.3-prospective-score-stability-validation-passed" &&
    scoreAnalysis.resultIntegrity.singleDeterministicScoringPass &&
    scoreAnalysis.resultIntegrity.postResultTuningPerformed === false &&
    scoreAnalysis.resultIntegrity.automaticRerunPerformed === false,
  "immutable completed score pass is unavailable"
);

const selectionDebates = selection.selected
  .map((item) => item.debateNumber)
  .sort();
const scoredDebates = scores.debates
  .map((item) => item.debateNumber)
  .sort();
assertV4(
  canonicalJson(selectionDebates) === canonicalJson(scoredDebates),
  "selected and scored cohorts differ"
);

const checkpointLibrary = execFileSync(
  "git",
  ["show", `${selection.checkpointCommit}:${policyLibraryPath}`],
  { maxBuffer: 10 * 1024 * 1024 }
);
const checkpointTest = execFileSync(
  "git",
  ["show", `${selection.checkpointCommit}:${policyTestPath}`],
  { maxBuffer: 10 * 1024 * 1024 }
);
const evaluatorHashes = {
  selectionCheckpointLibrarySha256: sha256(checkpointLibrary),
  currentLibrarySha256: sha256(sourceBytes[policyLibraryPath]),
  selectionCheckpointTestSha256: sha256(checkpointTest),
  currentTestSha256: sha256(sourceBytes[policyTestPath]),
};
assertV4(
  evaluatorHashes.selectionCheckpointLibrarySha256 ===
      evaluatorHashes.currentLibrarySha256 &&
    evaluatorHashes.selectionCheckpointTestSha256 ===
      evaluatorHashes.currentTestSha256,
  "v2.2 evaluator or test changed after cohort selection"
);

const winnerStability = evaluateProposedV22WinnerStability(scores.debates);
const numericPassed = numericStabilityPassed(scores.stability);
const acceptancePassed = numericPassed && winnerStability.passed;
assertV4(
  acceptancePassed &&
    winnerStability.agreedWinningSideDebates === 8 &&
    winnerStability.agreedWinningSidesPreserved === 8 &&
    winnerStability.agreedInitialTieDebates === 0 &&
    winnerStability.publishedOppositeSideReversals.length === 0,
  "selection-frozen v2.2 acceptance rule did not pass"
);

const analysis = {
  schemaVersion: "1.0-score-stability-v2.2.3-policy-conformance-analysis",
  status:
    "v2.2-policy-conformance-passed-score-manifest-policy-reference-mismatch-nonmaterial",
  protocolId: scores.protocolId,
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  sourceHashes: Object.fromEntries(
    sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
  ),
  defect: {
    detectedAfterScorePass: true,
    kind: "score-pass-manifest-referenced-v2.1-instead-of-selection-frozen-v2.2",
    frozenScoreManifestMutated: false,
    calculatedScoresMutated: false,
    priorScoreAnalysisMutated: false,
    scoreRerunPerformed: false,
    formulaChangePerformed: false,
    thresholdChangePerformed: false,
    resultDependentPolicyChangePerformed: false,
    effectOnCalculatedScores: "none; score calculation is policy-independent",
    effectOnAcceptanceOutcome:
      "none; this cohort has no agreed-initial-tie debate, the only v2.1/v2.2 winner-rule difference",
  },
  prospectivePolicy: {
    path: policyPath,
    sha256: selection.policy.sha256,
    frozenAt: selection.frozenAt,
    checkpointCommit: selection.checkpointCommit,
    frozenBeforeModelExecution: true,
    exactEvaluatorAndTestUnchangedSinceSelection: true,
    evaluatorHashes,
  },
  conformance: {
    selectedAndScoredCohortsMatch: true,
    debates: scores.debates.length,
    numericalThresholdsChanged: false,
    numericPassed,
    winnerStability,
    acceptancePassed,
    originalV21AcceptancePassed: scoreAnalysis.validation.acceptancePassed,
    v21AndV22AcceptanceOutcomesMatch: true,
  },
  resultIntegrity: {
    originalArtifactsPreserved: true,
    existingScoresOnlyEvaluated: true,
    scoreValuesRecomputed: false,
    scoringPassesAdded: 0,
    modelContexts: 0,
    retries: 0,
    meteredApiCostUsd: 0,
  },
  authorization: {
    readinessDecision: true,
    scoreRerun: false,
    policyPromotion: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "make-explicit-v2.2.3-production-readiness-decision-with-policy-reference-mismatch-disclosed",
};

if (shouldWrite) {
  await writeFile(path.resolve(outputPath), `${JSON.stringify(analysis, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      numericPassed,
      v22WinnerStabilityPassed: winnerStability.passed,
      agreedWinningSideDebates: winnerStability.agreedWinningSideDebates,
      agreedWinningSidesPreserved:
        winnerStability.agreedWinningSidesPreserved,
      agreedInitialTieDebates: winnerStability.agreedInitialTieDebates,
      calculatedScoresChanged: false,
      scoreRerunPerformed: false,
      acceptanceOutcomeChanged: false,
      nextAuthorized: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
