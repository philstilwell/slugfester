#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateProposedV22WinnerStability,
  numericStabilityPassed,
} from "./lib/assessment-production-score-stability-policy-v2.2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const outputPath =
  "docs/assessment-production/score-stability-policy-v2.2-retrospective-audit.json";
const scoresPath =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/score-pass/calculated-scores.json";
const analysisPath =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/score-pass/analysis.json";
const diagnosisPath =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/score-pass/failure-diagnosis.json";
const policyPath =
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const libraryPath =
  "scripts/lib/assessment-production-score-stability-policy-v2.2.mjs";
const analysisScriptPath =
  "scripts/analyze-assessment-production-score-stability-policy-v2.2.mjs";
const policyTestPath =
  "scripts/test-assessment-production-score-stability-policy-v2.2.mjs";
const auditTestPath =
  "scripts/test-assessment-production-score-stability-policy-v2.2-audit.mjs";
const sourcePaths = [
  scoresPath,
  analysisPath,
  diagnosisPath,
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
const scores = JSON.parse(sourceBytes[scoresPath]);
const analysis = JSON.parse(sourceBytes[analysisPath]);
const diagnosis = JSON.parse(sourceBytes[diagnosisPath]);
assertV4(
  scores.status === "v2.1.3-single-score-pass-stability-gate-failed" &&
    analysis.status ===
      "v2.1.3-prospective-score-stability-validation-failed" &&
    diagnosis.status === "confirmed-single-agreed-initial-tie-drift-failure" &&
    diagnosis.controlCorrection.effectiveValue === false &&
    !diagnosis.decision.automaticRerunAuthorized &&
    !diagnosis.decision.policyPromotionAuthorized,
  "closed v2.1.3 score failure unavailable"
);

const winnerStability = evaluateProposedV22WinnerStability(scores.debates);
const numericPassed = numericStabilityPassed(scores.stability);
assertV4(
  numericPassed &&
    winnerStability.passed &&
    winnerStability.allowedAgreedInitialTieDrifts.join(",") === "172" &&
    winnerStability.publishedOppositeSideReversals.length === 0,
  "proposed v2.2 retrospective classification changed"
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const audit = {
  schemaVersion: "1.0-score-stability-policy-v2.2-retrospective-audit",
  status:
    "retrospective-diagnostic-supports-v2.2-fresh-validation-still-required",
  proposal: policyPath,
  sourceHashes: Object.fromEntries(
    sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
  ),
  resultIntegrity: {
    v213ArtifactsReadOnly: true,
    v213FailurePreserved: true,
    scoresRecomputed: false,
    judgmentsChanged: false,
    adjudicationsChanged: false,
    thresholdsChanged: false,
    postResultPromotionPerformed: false,
    rerunPerformed: false,
    analysisAuthorizationDefectEffectiveValueFalse: true,
  },
  retrospectiveCohort: {
    id: "v2.1.3-ten-debate-validation",
    debates: scores.debates.length,
    diagnosticOnly: true,
    frozenV21GatePassed: false,
    numericPassed,
    proposedV22WinnerStabilityPassed: winnerStability.passed,
    winnerStability,
  },
  interpretation: {
    currentV213Disposition: "failed-under-frozen-v2.1-rule",
    retrospectiveFinding:
      "The proposed v2.2 rule treats Debate 172's two initial rounded ties as lacking an agreed winning direction, while all unchanged numerical thresholds pass.",
    evidentialLimit:
      "The v2.2 rule was proposed after this result was observed, so the cohort cannot validate or promote it.",
  },
  authorization: {
    freshDisjointCohortSelection: true,
    freshValidationManifestPreparation: false,
    modelExecution: false,
    paidTranscription: false,
    scoreRerun: false,
    v213Reclassification: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  recommendation: {
    sampleSize: 10,
    dyadicOnly: true,
    excludeAllObservedCalibrationCanaryAndValidationDebates: true,
    freezeExactCohortAndPolicyBeforeExecution: true,
    preserveModelAndStopRules: true,
    nextAction:
      "Select and source-gate a fresh disjoint ten-debate v2.2 validation cohort; do not execute a model or paid transcription stage until separately frozen and authorized.",
  },
};
if (shouldWrite) {
  await writeFile(path.resolve(outputPath), `${JSON.stringify(audit, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: audit.status,
      v213FailurePreserved: true,
      numericPassed,
      proposedV22WinnerStabilityPassed: winnerStability.passed,
      allowedAgreedInitialTieDrifts:
        winnerStability.allowedAgreedInitialTieDrifts,
      v213Reclassified: false,
      nextAuthorized: "fresh-disjoint-v2.2-cohort-selection-only",
    },
    null,
    2
  )
);
