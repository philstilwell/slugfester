#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_FINAL_LEDGER_ROOT,
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";
import {
  CHECKPOINT_V22_SCORE_ROOT,
  CHECKPOINT_V22_SCORE_STABILITY_THRESHOLDS
} from "./lib/assessment-production-checkpoint-v2.2-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ledgerPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledgerAnalysisPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/analysis.json`;
const preparationPath = `${CHECKPOINT_V22_SCORE_ROOT}/score-pass-preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_SCORE_ROOT}/score-pass-manifest.json`;
const scoresPath = `${CHECKPOINT_V22_SCORE_ROOT}/calculated-scores.json`;
const scoreAnalysisPath = `${CHECKPOINT_V22_SCORE_ROOT}/analysis.json`;
const exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) {
  for (const future of [
    preparationPath,
    activationPath,
    scoresPath,
    scoreAnalysisPath
  ]) {
    assertV4(!(await exists(future)), `${future} already exists`);
  }
}
const [ledger, ledgerAnalysis, inputs] = await Promise.all([
  readFile(path.resolve(ledgerPath), "utf8").then(JSON.parse),
  readFile(path.resolve(ledgerAnalysisPath), "utf8").then(JSON.parse),
  loadCheckpointV22FinalLedgerInputs()
]);
validateCheckpointV22FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
assertV4(
  ledgerAnalysis.status ===
      "production-checkpoint-v2.2-deterministic-final-ledger-gate-passed" &&
    ledgerAnalysis.authorization.scorePassManifestPreparation &&
    !ledgerAnalysis.authorization.scoreDerivation &&
    ledgerAnalysis.authorization.scorePassesMaximum === 1,
  "production-checkpoint v2.2 score-pass preparation is not authorized"
);

const activePolicyRecordPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const activePolicyRecord = JSON.parse(
  await readFile(activePolicyRecordPath, "utf8")
);
const activeEvaluatorPath = activePolicyRecord.productionScoreControl.library;
const activeTestPath = activePolicyRecord.productionScoreControl.test;
const normativePolicyPath = activePolicyRecord.activePolicy.normativeText;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  activePolicyRecord.status === "active-production-score-stability-policy-v2.2" &&
    activePolicyRecord.activePolicy.version === "v2.2" &&
    activePolicyRecord.productionScoreControl.scoreCalculationPasses === 1 &&
    activePolicyRecord.productionScoreControl.modelAuthoredScoresAllowed === false &&
    activePolicyRecord.productionScoreControl.thresholdMutationAllowed === false &&
    activePolicyRecord.productionScoreControl.resultDependentPolicyChangeAllowed === false &&
    activePolicyRecord.productionScoreControl.automaticRerunAllowed === false,
  "active production v2.2 score policy record is invalid"
);
const [normativeBytes, evaluatorBytes, activeTestBytes] = await Promise.all(
  [normativePolicyPath, activeEvaluatorPath, activeTestPath].map((file) =>
    readFile(path.resolve(file))
  )
);
assertV4(
  sha256(normativeBytes) === activePolicyRecord.activePolicy.normativeTextSha256 &&
    sha256(evaluatorBytes) ===
      activePolicyRecord.productionScoreControl.librarySha256 &&
    sha256(activeTestBytes) ===
      activePolicyRecord.productionScoreControl.testSha256,
  "active production v2.2 policy-control hash mismatch"
);
const activeTestResult = JSON.parse(
  execFileSync("node", [activeTestPath], { encoding: "utf8" })
);
assertV4(
  activeTestResult.status === "passed" &&
    activeTestResult.activePolicy === "v2.2" &&
    activeTestResult.integerRoundedTieCollapseAllowed &&
    activeTestResult.agreedInitialTieDirectionUnconstrained &&
    activeTestResult.oppositeSideReversalRejected &&
    activeTestResult.thresholdMutationRejected,
  "active production v2.2 policy-control test failed"
);

const sourcePaths = [
  ledgerPath,
  ledgerAnalysisPath,
  "src/data/debates.js",
  activePolicyRecordPath,
  normativePolicyPath,
  activeEvaluatorPath,
  activeTestPath,
  "docs/reassessment-rubric-v2.1.md",
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "docs/assessment-production-workflow.md",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.1.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.2.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-final-ledger.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-score-gate.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-score-gate.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-score-pass-gate.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-score-pass.mjs",
  "scripts/activate-assessment-production-checkpoint-v2.2-score-pass.mjs",
  "scripts/derive-assessment-production-checkpoint-v2.2-scores.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-scores.mjs",
  "scripts/analyze-assessment-production-checkpoint-v2.2-scores.mjs"
];
const sourceHashes = {};
for (const file of [...new Set(sourcePaths)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const manifest = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-single-score-pass-preparation-manifest",
  protocolId: ledger.protocolId,
  status:
    "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-prepared-not-authorized",
  frozenAt,
  activatedAt: null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  inputs: {
    finalLedger: ledgerPath,
    finalLedgerAnalysis: ledgerAnalysisPath,
    productionReferenceDiagnosticOnly: "src/data/debates.js",
    debates: 10,
    finalSides: 20
  },
  activePolicyControl: {
    version: "v2.2",
    promotionRecord: activePolicyRecordPath,
    normativePolicy: normativePolicyPath,
    normativePolicySha256: sha256(normativeBytes),
    evaluator: activeEvaluatorPath,
    evaluatorSha256: sha256(evaluatorBytes),
    test: activeTestPath,
    testSha256: sha256(activeTestBytes),
    testPassedAtFreeze: true
  },
  scoringPolicy: {
    passes: 1,
    repositoryDerivedOnly: true,
    modelScoringAllowed: false,
    scoresDerivedAfterFinalLedgerLockOnly: true,
    initialPassScoresDerivedInSamePostAdjudicationPassForStabilityOnly: true,
    formulaChangesAllowed: false,
    postResultTuningAllowed: false,
    automaticRerunAllowed: false
  },
  acceptanceRule: {
    prospective: true,
    activePolicyVersion: "v2.2",
    productionScoresDiagnosticOnly: true,
    agreedInitialProOrConMayCollapseToIntegerRoundedTie: true,
    agreedInitialOppositeSideReversalAllowed: false,
    agreedInitialTieDirectionConstraint: "none",
    disagreedInitialWinnerDirectionConstraint: "none",
    unroundedDirectionDiagnosticOnly: true,
    ...structuredClone(CHECKPOINT_V22_SCORE_STABILITY_THRESHOLDS)
  },
  artifacts: {
    preparation: preparationPath,
    activation: activationPath,
    calculatedScores: scoresPath,
    analysis: scoreAnalysisPath
  },
  authorization: {
    scorePassActivation: true,
    scoreDerivation: false,
    scorePassesMaximum: 1,
    scoreAnalysis: false,
    scoreRerun: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  stopRules: {
    separateActivationRequired: true,
    sourceHashMismatchBlocks: true,
    preexistingOutputBlocks: true,
    exactlyOneRepositoryScorePass: true,
    modelAuthoredScoresForbidden: true,
    humanScoreAdjustmentForbidden: true,
    thresholdMutationForbidden: true,
    resultDependentPolicyChangeForbidden: true,
    automaticRerunForbidden: true
  },
  futureOutputPathsExcludedFromSourceHashes: [
    activationPath,
    scoresPath,
    scoreAnalysisPath
  ],
  sourceHashes,
  nextAuthorizedAction:
    "activate-single-deterministic-production-checkpoint-v2.2-score-pass-after-separate-user-authorization"
};
if (shouldWrite) {
  await mkdir(path.resolve(CHECKPOINT_V22_SCORE_ROOT), { recursive: true });
  await writeFile(
    path.resolve(preparationPath),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen-not-authorized" : "preview-not-authorized",
      scorePasses: 1,
      debates: 10,
      finalSides: 20,
      activePolicy: "v2.2",
      thresholds: CHECKPOINT_V22_SCORE_STABILITY_THRESHOLDS,
      integerRoundedTiesAllowed: true,
      agreedInitialTieDirectionConstraint: "none",
      productionScoresDiagnosticOnly: true,
      sourceFiles: Object.keys(sourceHashes).length,
      modelContexts: 0,
      meteredApiCostUsd: 0,
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
