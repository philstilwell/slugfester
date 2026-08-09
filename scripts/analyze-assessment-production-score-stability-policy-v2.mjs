#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateProposedV2WinnerStability,
  numericStabilityPassed,
} from "./lib/assessment-production-score-stability-policy-v2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const outputPath =
  "docs/assessment-production/score-stability-policy-v2-retrospective-audit.json";
const hardRouteScoresPath =
  "docs/calibration/v4.2.21.17.30/hard-route-single-score-pass/calculated-scores.json";
const productionCanaryScoresPath =
  "docs/assessment-production/canary-v1-score-pass/calculated-scores.json";
const productionCanaryFailurePath =
  "docs/assessment-production/canary-v1-score-pass/failure-diagnosis.json";
const policyPath =
  "docs/assessment-production/score-stability-policy-v2-proposal.md";
const libraryPath =
  "scripts/lib/assessment-production-score-stability-policy-v2.mjs";
const analysisScriptPath =
  "scripts/analyze-assessment-production-score-stability-policy-v2.mjs";
const policyTestPath =
  "scripts/test-assessment-production-score-stability-policy-v2.mjs";
const auditTestPath =
  "scripts/test-assessment-production-score-stability-policy-v2-audit.mjs";
const sourcePaths = [
  hardRouteScoresPath,
  productionCanaryScoresPath,
  productionCanaryFailurePath,
  policyPath,
  libraryPath,
  analysisScriptPath,
  policyTestPath,
  auditTestPath,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const hardRoute = JSON.parse(sourceBytes[hardRouteScoresPath]);
const productionCanary = JSON.parse(sourceBytes[productionCanaryScoresPath]);
const failure = JSON.parse(sourceBytes[productionCanaryFailurePath]);
assertV4(
  hardRoute.status ===
    "hard-route-single-score-pass-stability-gate-passed" &&
    hardRoute.debates.length === 5 &&
    productionCanary.status ===
      "production-canary-single-score-pass-stability-gate-failed" &&
    productionCanary.debates.length === 10 &&
    failure.status ===
      "confirmed-single-rounding-edge-winner-preservation-failure",
  "retrospective score cohorts unavailable"
);

function evaluateCohort(id, scores) {
  const winnerStability = evaluateProposedV2WinnerStability(scores.debates);
  const numericPassed = numericStabilityPassed(scores.stability);
  return {
    id,
    debates: scores.debates.length,
    diagnosticOnly: true,
    numericPassed,
    v1ExactRoundedWinnerRulePassed:
      numericPassed &&
      winnerStability.v1ExactRoundedWinnersPreserved ===
        winnerStability.agreedWinnerDebates,
    proposedV2NoOppositeReversalRulePassed:
      numericPassed && winnerStability.passed,
    winnerStability,
  };
}

const cohorts = [
  evaluateCohort("five-debate-hard-route", hardRoute),
  evaluateCohort("ten-debate-production-canary-v1", productionCanary),
];
assertV4(
  cohorts[0].v1ExactRoundedWinnerRulePassed &&
    cohorts[0].proposedV2NoOppositeReversalRulePassed &&
    !cohorts[1].v1ExactRoundedWinnerRulePassed &&
    cohorts[1].proposedV2NoOppositeReversalRulePassed &&
    JSON.stringify(cohorts[1].winnerStability.allowedRoundedTieCollapses) ===
      JSON.stringify(["64"]) &&
    cohorts.every(
      (cohort) => cohort.winnerStability.oppositeSideReversals.length === 0
    ),
  "proposed v2 retrospective classification changed"
);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const audit = {
  schemaVersion: "1.0-score-stability-policy-v2-retrospective-audit",
  status:
    "retrospective-diagnostic-supports-v2-fresh-validation-still-required",
  proposal: policyPath,
  sourceHashes: Object.fromEntries(
    sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
  ),
  resultIntegrity: {
    existingScoreArtifactsReadOnly: true,
    scoresRecomputed: false,
    judgmentsChanged: false,
    thresholdsChanged: false,
    currentCanaryReclassified: false,
    postResultPromotionPerformed: false,
  },
  cohorts,
  aggregate: {
    debatesObserved: cohorts.reduce((sum, cohort) => sum + cohort.debates, 0),
    cohortsObserved: cohorts.length,
    v1PassingCohorts: cohorts.filter(
      (cohort) => cohort.v1ExactRoundedWinnerRulePassed
    ).length,
    proposedV2PassingCohorts: cohorts.filter(
      (cohort) => cohort.proposedV2NoOppositeReversalRulePassed
    ).length,
    allowedRoundedTieCollapses: cohorts.flatMap(
      (cohort) => cohort.winnerStability.allowedRoundedTieCollapses
    ),
    oppositeSideReversals: cohorts.flatMap(
      (cohort) => cohort.winnerStability.oppositeSideReversals
    ),
  },
  interpretation: {
    currentCanaryDisposition: "failed-under-frozen-v1-rule",
    retrospectiveFinding:
      "The proposed v2 rule preserves every non-reversal accepted by v1 and classifies Debate 64 as a rounded tie collapse because its final unrounded con advantage remains positive.",
    evidentialLimit:
      "Both cohorts were observed before this proposal was frozen, so this result is diagnostic and cannot validate or promote v2.",
  },
  authorization: {
    freshDisjointCohortSelection: true,
    freshValidationManifestPreparation: false,
    modelExecution: false,
    paidTranscription: false,
    scoreRerun: false,
    currentCanaryReclassification: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  recommendation: {
    sampleSize: 10,
    dyadicOnly: true,
    excludeAllObservedCalibrationAndCanaryDebates: true,
    freezeExactCohortAndPolicyBeforeExecution: true,
    preserveModelAndStopRules: true,
    nextAction:
      "Select and source-gate a fresh disjoint ten-debate validation cohort; do not execute any model or paid transcription stage until a separately frozen manifest and any required cost approval exist.",
  },
};
if (shouldWrite) {
  await writeFile(
    path.resolve(outputPath),
    `${JSON.stringify(audit, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: audit.status,
      cohorts: cohorts.map((cohort) => ({
        id: cohort.id,
        debates: cohort.debates,
        v1Passed: cohort.v1ExactRoundedWinnerRulePassed,
        proposedV2Passed: cohort.proposedV2NoOppositeReversalRulePassed,
        allowedRoundedTieCollapses:
          cohort.winnerStability.allowedRoundedTieCollapses,
        oppositeSideReversals:
          cohort.winnerStability.oppositeSideReversals,
      })),
      currentCanaryReclassified: false,
      nextAuthorized: "fresh-disjoint-cohort-selection-only",
    },
    null,
    2
  )
);
