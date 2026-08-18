#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch02FinalLedgerInputs,
  validatePostCanaryBatch02FinalLedger
} from "./lib/assessment-production-post-canary-batch-02-final-ledger.mjs";
import {
  POST_CANARY_BATCH_02_SCORE_ROOT,
  POST_CANARY_BATCH_02_SCORE_STABILITY_THRESHOLDS
} from "./lib/assessment-production-post-canary-batch-02-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ledgerPath = `${POST_CANARY_BATCH_02_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledgerAnalysisPath =
  `${POST_CANARY_BATCH_02_FINAL_LEDGER_ROOT}/analysis.json`;
const preparationPath =
  `${POST_CANARY_BATCH_02_SCORE_ROOT}/score-pass-preparation-manifest.json`;
const activationPath =
  `${POST_CANARY_BATCH_02_SCORE_ROOT}/score-pass-manifest.json`;
const scoresPath = `${POST_CANARY_BATCH_02_SCORE_ROOT}/calculated-scores.json`;
const scoreAnalysisPath = `${POST_CANARY_BATCH_02_SCORE_ROOT}/analysis.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
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
  loadPostCanaryBatch02FinalLedgerInputs()
]);
validatePostCanaryBatch02FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
assertV4(
  ledgerAnalysis.status ===
      "post-canary-batch-02-deterministic-final-ledger-gate-passed" &&
    ledgerAnalysis.validation.scoreDerivationAuthorized === false &&
    ledgerAnalysis.authorization.scorePassManifestPreparation === false &&
    ledgerAnalysis.authorization.scoreDerivation === false &&
    ledgerAnalysis.nextAuthorizedAction ===
      "user-approval-required-before-batch-02-single-deterministic-score-pass-preparation",
  "post-canary Batch 2 score-pass preparation gate is unavailable"
);

const activePolicyRecordPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const activePolicyRecord = JSON.parse(
  await readFile(activePolicyRecordPath, "utf8")
);
const activeEvaluatorPath = activePolicyRecord.productionScoreControl.library;
const activeTestPath = activePolicyRecord.productionScoreControl.test;
const normativePolicyPath = activePolicyRecord.activePolicy.normativeText;
const batchFixtureTestPath =
  "scripts/test-assessment-production-post-canary-batch-02-score-gate.mjs";
const judgmentActivationPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-02/independent-judgments/execution-activation.json";
const judgmentActivation = JSON.parse(
  await readFile(judgmentActivationPath, "utf8")
);
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
assertV4(
  judgmentActivation.model.label === "5.6 Sol" &&
    judgmentActivation.model.slug === "gpt-5.6-sol" &&
    judgmentActivation.model.reasoningEffort === "low" &&
    judgmentActivation.model.authentication === "ChatGPT subscription" &&
    judgmentActivation.model.scoreBlind === true &&
    judgmentActivation.model.roundedIntegerScoreTiesPermitted === true,
  "Batch 2 upstream judgment configuration changed"
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
const batchFixtureTestResult = JSON.parse(
  execFileSync("node", [batchFixtureTestPath], { encoding: "utf8" })
);
assertV4(
  batchFixtureTestResult.status === "passed" &&
    batchFixtureTestResult.activePolicy === "v2.2" &&
    batchFixtureTestResult.realScoresDerived === 0,
  "Batch 2 policy fixture test failed"
);

const sourcePaths = [
  ledgerPath,
  ledgerAnalysisPath,
  judgmentActivationPath,
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
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/assessment-production/manifest-v1.json",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.1.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.2.mjs",
  "scripts/lib/assessment-production-score-stability-policy-active.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-final-ledger.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-score-gate.mjs",
  batchFixtureTestPath,
  "scripts/test-assessment-production-post-canary-batch-02-score-pass-gate.mjs",
  "scripts/preregister-assessment-production-post-canary-batch-02-score-pass.mjs",
  "scripts/activate-assessment-production-post-canary-batch-02-score-pass.mjs",
  "scripts/derive-assessment-production-post-canary-batch-02-scores.mjs",
  "scripts/validate-assessment-production-post-canary-batch-02-scores.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-02-scores.mjs"
];
const sourceHashes = {};
for (const file of [...new Set(sourcePaths)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-single-score-pass-preparation-manifest",
  protocolId: ledger.protocolId,
  status:
    "frozen-post-canary-batch-02-single-deterministic-score-pass-prepared-not-authorized",
  frozenAt,
  activatedAt: null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    instruction: "I approve. Please continue.",
    scopeReference:
      "the immediately preceding recorded gate for preparation, validation, freezing, committing, and pushing of the Batch 2 single deterministic score-pass manifest only, at $0 and stopping before score derivation or model execution",
    directIncrementalCostUsdMaximum: 0,
    scoreManifestPreparation: true,
    scoreDerivation: false,
    modelExecution: false,
    paidServices: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  inputs: {
    finalLedger: ledgerPath,
    finalLedgerAnalysis: ledgerAnalysisPath,
    productionReferenceDiagnosticOnly: "src/data/debates.js",
    debates: 10,
    finalSides: 20,
    rawJudgmentsScoredInSinglePass: 30
  },
  upstreamJudgmentConfiguration: {
    model: judgmentActivation.model.label,
    modelSlug: judgmentActivation.model.slug,
    reasoningEffort: judgmentActivation.model.reasoningEffort,
    authentication: judgmentActivation.model.authentication,
    scoreBlind: judgmentActivation.model.scoreBlind,
    roundedIntegerScoreTiesPermitted:
      judgmentActivation.model.roundedIntegerScoreTiesPermitted
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
    activeTestPassedAtFreeze: true,
    batchFixtureTest: batchFixtureTestPath,
    batchFixtureTestSha256: sourceHashes[batchFixtureTestPath],
    batchFixtureTestPassedAtFreeze: true
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
    ...structuredClone(POST_CANARY_BATCH_02_SCORE_STABILITY_THRESHOLDS)
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
    modelExecution: false,
    paidServices: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
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
  totals: {
    scorePassesPrepared: 1,
    realScoresDerived: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "user-approval-required-before-activation-and-execution-of-the-single-deterministic-batch-02-score-pass"
};
if (shouldWrite) {
  await mkdir(path.resolve(POST_CANARY_BATCH_02_SCORE_ROOT), { recursive: true });
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
      thresholds: POST_CANARY_BATCH_02_SCORE_STABILITY_THRESHOLDS,
      integerRoundedTiesAllowed: true,
      agreedInitialTieDirectionConstraint: "none",
      productionScoresDiagnosticOnly: true,
      sourceFiles: Object.keys(sourceHashes).length,
      modelContexts: 0,
      paidServiceCalls: 0,
      realScoresDerived: 0,
      directIncrementalCostUsd: 0,
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
