#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ACTIVE_SCORE_STABILITY_POLICY_PATH,
  ACTIVE_SCORE_STABILITY_POLICY_VERSION,
  ACTIVE_SCORE_STABILITY_THRESHOLDS,
  evaluateActiveProductionScoreStability,
} from "./lib/assessment-production-score-stability-policy-active.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const effectiveIndex = process.argv.indexOf("--effective-at");
const effectiveAt =
  effectiveIndex >= 0 ? process.argv[effectiveIndex + 1] : null;
assertV4(
  effectiveAt && !Number.isNaN(Date.parse(effectiveAt)),
  "--effective-at requires an ISO timestamp"
);
const readinessPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/readiness-decision.json";
const conformancePath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/policy-conformance-analysis.json";
const scoresPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/calculated-scores.json";
const workflowPath = "docs/assessment-production-workflow.md";
const activeLibraryPath =
  "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const activeTestPath =
  "scripts/test-assessment-production-score-stability-policy-active.mjs";
const promotionScriptPath =
  "scripts/promote-assessment-production-score-stability-v2.2.mjs";
const outputPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";

if (shouldWrite) {
  await access(path.resolve(outputPath)).then(
    () => {
      throw new Error(`${outputPath} already exists`);
    },
    () => true
  );
}
const sourcePaths = [
  ACTIVE_SCORE_STABILITY_POLICY_PATH,
  readinessPath,
  conformancePath,
  scoresPath,
  workflowPath,
  "scripts/lib/assessment-production-score-stability-policy-v2.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.1.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.2.mjs",
  "scripts/test-assessment-production-score-stability-policy-v2.2.mjs",
  activeLibraryPath,
  activeTestPath,
  promotionScriptPath,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const readiness = JSON.parse(sourceBytes[readinessPath]);
const conformance = JSON.parse(sourceBytes[conformancePath]);
const scores = JSON.parse(sourceBytes[scoresPath]);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
assertV4(
  readiness.status ===
      "v2.2-policy-ready-for-promotion-with-nonmaterial-score-manifest-reference-defect-disclosed" &&
    readiness.policy.version === "v2.2" &&
    readiness.policy.proposal === ACTIVE_SCORE_STABILITY_POLICY_PATH &&
    readiness.policy.sha256 ===
      sha256(sourceBytes[ACTIVE_SCORE_STABILITY_POLICY_PATH]) &&
    readiness.policy.readyForPromotion &&
    !readiness.policy.promotedByThisDecision &&
    readiness.decision.validationPassed &&
    readiness.decision.policyReadyForPromotion &&
    !readiness.decision.productionCampaignReady &&
    readiness.authorization.policyPromotion &&
    readiness.authorization.productionScoreControlCorrectionPreparation &&
    !readiness.authorization.publicationPacketPreparation &&
    !readiness.authorization.productionMutation,
  "positive v2.2 readiness decision is unavailable"
);
assertV4(
  conformance.status ===
      "v2.2-policy-conformance-passed-score-manifest-policy-reference-mismatch-nonmaterial" &&
    conformance.conformance.acceptancePassed &&
    !conformance.defect.calculatedScoresMutated &&
    !conformance.defect.scoreRerunPerformed &&
    !conformance.defect.resultDependentPolicyChangePerformed,
  "v2.2 conformance diagnosis is unavailable"
);
const activeEvaluation = evaluateActiveProductionScoreStability(
  scores.debates,
  scores.stability
);
assertV4(
  activeEvaluation.policyVersion ===
      ACTIVE_SCORE_STABILITY_POLICY_VERSION &&
    activeEvaluation.numericPassed &&
    activeEvaluation.winnerStability.passed &&
    activeEvaluation.acceptancePassed,
  "active v2.2 production score control does not accept the validation evidence"
);

const sourceHashes = Object.fromEntries(
  sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
);
const promotion = {
  schemaVersion: "1.0-score-stability-policy-v2.2-production-promotion",
  status: "active-production-score-stability-policy-v2.2",
  effectiveAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  activePolicy: {
    version: ACTIVE_SCORE_STABILITY_POLICY_VERSION,
    normativeText: ACTIVE_SCORE_STABILITY_POLICY_PATH,
    normativeTextSha256: sourceHashes[ACTIVE_SCORE_STABILITY_POLICY_PATH],
    thresholds: structuredClone(ACTIVE_SCORE_STABILITY_THRESHOLDS),
    winnerRule: {
      agreedProMayPublish: ["pro", "tie"],
      agreedConMayPublish: ["con", "tie"],
      agreedInitialTieDirectionConstraint: "none",
      disagreedInitialWinnerDirectionConstraint: "none",
      unroundedDirectionDiagnosticOnly: true,
      oppositeSideReversalWhenWinningSideAgreed: "reject",
    },
  },
  validationEvidence: {
    readinessDecision: readinessPath,
    readinessDecisionSha256: sourceHashes[readinessPath],
    policyConformance: conformancePath,
    policyConformanceSha256: sourceHashes[conformancePath],
    freshValidationPassed: true,
    scoreManifestReferenceDefectDisclosed: true,
    defectMaterialToScores: false,
    defectMaterialToAcceptanceOutcome: false,
  },
  productionScoreControl: {
    library: activeLibraryPath,
    librarySha256: sourceHashes[activeLibraryPath],
    test: activeTestPath,
    testSha256: sourceHashes[activeTestPath],
    scoreCalculationPasses: 1,
    scoreCalculationAfterFinalLedgerLockOnly: true,
    modelAuthoredScoresAllowed: false,
    thresholdMutationAllowed: false,
    resultDependentPolicyChangeAllowed: false,
    automaticRerunAllowed: false,
    futureFrozenManifestsMustReferenceActivePolicyAndControlHashes: true,
  },
  historicalDisposition: {
    failedV1CanaryReclassified: false,
    failedValidationCohortsReclassified: false,
    frozenHistoricalScoreArtifactsMutated: false,
  },
  authorization: {
    activePolicyUseInNewProductionCheckpointPreparation: true,
    productionCheckpointSelection: true,
    productionPacketPreparation: false,
    modelExecution: false,
    paidTranscription: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "select-and-source-gate-new-ten-debate-production-checkpoint-model-free-only",
  sourceHashes,
};
if (shouldWrite) {
  await writeFile(
    path.resolve(outputPath),
    `${JSON.stringify(promotion, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: promotion.status,
      activePolicy: promotion.activePolicy.version,
      validationPassed: activeEvaluation.acceptancePassed,
      scoreControlCorrected: true,
      failedV1CanaryReclassified: false,
      productionCheckpointSelectionAuthorized: true,
      publicationPreparationAuthorized: false,
      productionMutationAuthorized: false,
      nextAuthorized: promotion.nextAuthorizedAction,
    },
    null,
    2
  )
);
