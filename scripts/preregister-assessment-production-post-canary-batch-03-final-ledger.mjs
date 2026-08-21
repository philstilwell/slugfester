#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_03_FINAL_LEDGER_PROTOCOL_ID,
  POST_CANARY_BATCH_03_FINAL_LEDGER_ROOT,
  buildPostCanaryBatch03FinalLedger,
  loadPostCanaryBatch03FinalLedgerInputs,
  validatePostCanaryBatch03FinalLedger
} from "./lib/assessment-production-post-canary-batch-03-final-ledger.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const manifestPath =
  `${POST_CANARY_BATCH_03_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const ledgerPath = `${POST_CANARY_BATCH_03_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${POST_CANARY_BATCH_03_FINAL_LEDGER_ROOT}/analysis.json`;
if (shouldWrite) {
  for (const file of [manifestPath, ledgerPath, analysisPath]) {
    await access(file).then(
      () => {
        throw new Error(`${file} already exists`);
      },
      () => true
    );
  }
}

const inputs = await loadPostCanaryBatch03FinalLedgerInputs();
const preview = buildPostCanaryBatch03FinalLedger(
  inputs.debateInputs,
  inputs.sourceHashes
);
const validation = validatePostCanaryBatch03FinalLedger(
  preview,
  inputs.debateInputs,
  inputs.sourceHashes
);
const expected = {
  debates: 10,
  finalMoves: 200,
  disputedMoves: 190,
  candidateSelections: 586,
  pairSelections: 212,
  scoringFieldSelections: 356,
  burdenAdjustmentSelections: 18,
  roundedMeanPopulation: 419,
  dependencyMeanMergesSuppressed: 0,
  audioVerifiedMoves: 8,
  acceptedAdjudicationOutputsWithoutCorrection: 8,
  calculatedScores: 0
};
assertV4(
  validation.debates === expected.debates &&
    validation.finalMoves === expected.finalMoves &&
    validation.disputedMoves === expected.disputedMoves &&
    validation.candidateSelections === expected.candidateSelections &&
    preview.audit.pairSelections === expected.pairSelections &&
    preview.audit.scoringFieldSelections === expected.scoringFieldSelections &&
    preview.audit.burdenAdjustmentSelections ===
      expected.burdenAdjustmentSelections &&
    validation.roundedMeanMerges +
      validation.dependencyMeanMergesSuppressed ===
      expected.roundedMeanPopulation &&
    validation.dependencyMeanMergesSuppressed ===
      expected.dependencyMeanMergesSuppressed &&
    validation.audioVerifiedMoves === expected.audioVerifiedMoves &&
    validation.acceptedAdjudicationOutputsWithoutCorrection ===
      expected.acceptedAdjudicationOutputsWithoutCorrection &&
    validation.calculatedScores === 0 &&
    validation.scoreDerivationAuthorized === false,
  "post-canary Batch 3 final-ledger preview population mismatch"
);

const sourceFiles = [
  ...inputs.sourcePaths,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-03/standing-authorization.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-03/failure-recovery-standing-authorization.json",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v42211726-hard-route-disagreement.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-disagreement.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-final-ledger.mjs",
  "scripts/preregister-assessment-production-post-canary-batch-03-final-ledger.mjs",
  "scripts/assemble-assessment-production-post-canary-batch-03-final-ledger.mjs",
  "scripts/validate-assessment-production-post-canary-batch-03-final-ledger.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-03-final-ledger.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-final-ledger.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-final-ledger-assembly-manifest",
  protocolId: POST_CANARY_BATCH_03_FINAL_LEDGER_PROTOCOL_ID,
  status:
    "frozen-ten-debate-post-canary-batch-03-deterministic-final-ledger-assembly",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    instruction:
      "The frozen Batch 3 standing authorizations permit deterministic final-ledger assembly and the single repository score pass while every gate passes.",
    scopeReference:
      "docs/assessment-production/post-canary-continuation-v1/batch-03/standing-authorization.json and docs/assessment-production/post-canary-continuation-v1/batch-03/failure-recovery-standing-authorization.json",
    directIncrementalCostUsdMaximum: 0,
    finalLedgerAssembly: true,
    modelExecution: false,
    paidServices: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  expected,
  sourceHashes,
  replayRequirements: {
    bothIndependentPassesAgainstFullLocalTranscriptChain: true,
    deterministicDisagreements: true,
    anonymizedCandidateProvenance: true,
    disputeOnlyAdjudicationSelections: true,
    acceptedAdjudicationOutputsAndBoundedCorrectionsAuthenticated: true,
    locallySavedAudioTranscriptHashes: true,
    dependencyPairOwnershipPrecedesRoundedMean: true,
    calculatedScores: 0
  },
  artifacts: {
    finalLedger: ledgerPath,
    analysis: analysisPath
  },
  authorization: {
    finalLedgerAssembly: true,
    deterministicValidation: true,
    modelExecution: false,
    paidServices: false,
    scorePassManifestPreparation: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "assemble-and-validate-ten-post-canary-batch-03-final-ledgers-deterministically"
};
if (shouldWrite) {
  await mkdir(path.resolve(POST_CANARY_BATCH_03_FINAL_LEDGER_ROOT), {
    recursive: true
  });
  await writeFile(
    path.resolve(manifestPath),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      expected: manifest.expected,
      sourceFiles: Object.keys(sourceHashes).length,
      modelContexts: 0,
      paidServiceCalls: 0,
      calculatedScores: 0,
      directIncrementalCostUsd: 0,
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
